# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: https://docs.scrapy.org/en/latest/topics/item-pipeline.html

import json
import mysql.connector
import os
from datetime import datetime
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse


class RealEstateScraperPipeline:
    def process_item(self, item, spider):
        return item


class RawPipeline:

    TRACKING_QUERY_KEYS = {
        "fbclid",
        "gclid",
        "yclid",
        "mc_cid",
        "mc_eid",
    }

    IMAGE_KEYS = (
        "image",
        "image_url",
        "image_urls",
        "images",
        "img",
        "photo",
        "thumbnail",
        "cover",
        "gallery",
    )

    BASE_FIELDS = {
        "title",
        "price",
        "location",
        "description",
        "image",
        "images",
        "url",
        "source",
        "listing_id",
        "stream",
    }

    def open_spider(self, spider):
        self.batch_size = max(50, int(os.getenv("SCRAPER_DB_BATCH_SIZE", "300")))
        self.pending_rows = []

        self.conn = mysql.connector.connect(
            host=os.getenv("SCRAPER_DB_HOST", "localhost"),
            user=os.getenv("SCRAPER_DB_USER", "root"),
            password=os.getenv("SCRAPER_DB_PASSWORD", ""),
            database=os.getenv("SCRAPER_DB_NAME", "database"),
            autocommit=False,
        )
        self.cursor = self.conn.cursor()
        self._ensure_schema()

    def close_spider(self, spider):
        try:
            self._flush_rows(force=True)
            self.cursor.close()
        finally:
            self.conn.close()

    def _ensure_schema(self):
        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS raw_properties (
                id BIGINT PRIMARY KEY AUTO_INCREMENT,
                title TEXT NULL,
                price VARCHAR(255) NULL,
                location VARCHAR(255) NULL,
                description LONGTEXT NULL,
                image TEXT NULL,
                url TEXT NOT NULL,
                source VARCHAR(80) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """
        )

        self._ensure_column("listing_id", "VARCHAR(128) NULL")
        self._ensure_column("stream", "VARCHAR(32) NULL")
        self._ensure_column("extra_json", "LONGTEXT NULL")
        self._ensure_column("first_seen_at", "DATETIME NULL")
        self._ensure_column("last_seen_at", "DATETIME NULL")
        self._ensure_column("last_crawled_at", "DATETIME NULL")

        self.cursor.execute("SHOW INDEX FROM raw_properties WHERE Key_name = 'ux_raw_properties_source_url'")
        if not self.cursor.fetchone():
            try:
                self.cursor.execute(
                    "ALTER TABLE raw_properties ADD UNIQUE INDEX ux_raw_properties_source_url (source, url(255))"
                )
            except mysql.connector.Error as exc:
                message = str(exc).lower()
                if "duplicate" not in message:
                    raise

        self.conn.commit()

    def _ensure_column(self, column_name, definition):
        self.cursor.execute("SHOW COLUMNS FROM raw_properties LIKE %s", (column_name,))
        if self.cursor.fetchone():
            return
        self.cursor.execute(f"ALTER TABLE raw_properties ADD COLUMN {column_name} {definition}")

    def _normalize_url(self, value):
        if value is None:
            return None

        raw = str(value).strip()
        if not raw:
            return None

        parsed = urlparse(raw)
        if not parsed.scheme:
            parsed = urlparse(f"https://{raw.lstrip('/')}" if not raw.startswith("/") else raw)

        query_pairs = []
        for key, val in parse_qsl(parsed.query, keep_blank_values=False):
            key_lower = key.lower()
            if key_lower.startswith("utm_") or key_lower in self.TRACKING_QUERY_KEYS:
                continue
            query_pairs.append((key, val))

        normalized_query = urlencode(query_pairs, doseq=True)
        normalized_path = parsed.path.rstrip("/")
        if not normalized_path:
            normalized_path = "/"

        normalized = parsed._replace(
            scheme=(parsed.scheme or "https").lower(),
            netloc=parsed.netloc.lower(),
            path=normalized_path,
            params="",
            query=normalized_query,
            fragment="",
        )
        return urlunparse(normalized)

    def _clean_text(self, value):
        if value is None:
            return None
        text = " ".join(str(value).split()).strip()
        return text or None

    def _extract_images_from_item(self, item):
        images = []
        seen = set()

        def add_candidate(candidate):
            candidate = self._normalize_url(candidate)
            if not candidate or candidate in seen:
                return
            seen.add(candidate)
            images.append(candidate)

        for key in self.IMAGE_KEYS:
            value = item.get(key)
            if not value:
                continue

            if isinstance(value, str):
                add_candidate(value)
                continue

            if isinstance(value, dict):
                add_candidate(value.get("url") or value.get("src") or value.get("contentUrl"))
                continue

            if isinstance(value, (list, tuple, set)):
                for element in value:
                    if isinstance(element, str):
                        add_candidate(element)
                    elif isinstance(element, dict):
                        add_candidate(element.get("url") or element.get("src") or element.get("contentUrl"))

        return images

    def _flush_rows(self, force=False):
        if not self.pending_rows:
            return

        if not force and len(self.pending_rows) < self.batch_size:
            return

        sql = """
        INSERT INTO raw_properties (
            title,
            price,
            location,
            description,
            image,
            url,
            source,
            listing_id,
            stream,
            extra_json,
            first_seen_at,
            last_seen_at,
            last_crawled_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            NOW(), NOW(), NOW()
        )
        ON DUPLICATE KEY UPDATE
            title = CASE
                WHEN VALUES(title) IS NULL OR VALUES(title) = '' THEN title
                ELSE VALUES(title)
            END,
            price = CASE
                WHEN VALUES(price) IS NULL OR VALUES(price) = '' THEN price
                ELSE VALUES(price)
            END,
            location = CASE
                WHEN VALUES(location) IS NULL OR VALUES(location) = '' THEN location
                ELSE VALUES(location)
            END,
            description = CASE
                WHEN VALUES(description) IS NULL OR VALUES(description) = '' THEN description
                ELSE VALUES(description)
            END,
            image = CASE
                WHEN VALUES(image) IS NULL OR VALUES(image) = '' THEN image
                ELSE VALUES(image)
            END,
            listing_id = COALESCE(VALUES(listing_id), listing_id),
            stream = COALESCE(VALUES(stream), stream),
            extra_json = COALESCE(VALUES(extra_json), extra_json),
            last_seen_at = NOW(),
            last_crawled_at = NOW()
        """

        try:
            self.cursor.executemany(sql, self.pending_rows)
            self.conn.commit()
            self.pending_rows.clear()
        except mysql.connector.Error:
            self.conn.rollback()
            raise

    def process_item(self, item, spider):
        url = self._normalize_url(item.get("url"))
        if not url:
            return item

        source = spider.name
        listing_id = self._clean_text(item.get("listing_id"))
        stream = self._clean_text(item.get("stream"))

        images = self._extract_images_from_item(item)
        image = images[0] if images else None

        extra_payload = {}
        for key, value in dict(item).items():
            if key in self.BASE_FIELDS:
                continue
            extra_payload[key] = value

        if images:
            extra_payload.setdefault("images", images)

        extra_json = json.dumps(extra_payload, ensure_ascii=True, default=str) if extra_payload else None

        self.pending_rows.append(
            (
                self._clean_text(item.get("title")),
                self._clean_text(item.get("price")),
                self._clean_text(item.get("location")),
                self._clean_text(item.get("description")),
                image,
                url,
                source,
                listing_id,
                stream,
                extra_json,
            )
        )

        self._flush_rows(force=False)
        return item
