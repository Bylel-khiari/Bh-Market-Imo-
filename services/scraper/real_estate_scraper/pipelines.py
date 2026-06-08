# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: https://docs.scrapy.org/en/latest/topics/item-pipeline.html

import json
import mysql.connector
import os
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from mysql.connector import errorcode
from scrapy.exceptions import DropItem

from real_estate_scraper.source_dates import (
    find_source_date_in_mapping,
    is_older_than_days,
    normalize_source_datetime,
)


class RealEstateScraperPipeline:
    def process_item(self, item, spider=None):
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
        "source_published_at",
        "source_published_raw",
        "published_at",
        "date_published",
        "datePosted",
        "datePublished",
        "created_at",
    }

    def __init__(self):
        self.batch_size = 300
        self.max_source_listing_age_days = 0
        self.pending_rows = []
        self.conn = None
        self.cursor = None

    @classmethod
    def from_crawler(cls, crawler):
        pipeline = cls()
        pipeline.crawler = crawler
        return pipeline

    def open_spider(self, spider=None):
        self.batch_size = max(50, int(os.getenv("SCRAPER_DB_BATCH_SIZE", "300")))
        self.max_source_listing_age_days = max(
            0,
            int(
                os.getenv("SOURCE_LISTING_MAX_AGE_DAYS")
                or os.getenv("MAX_LISTING_AGE_DAYS")
                or "0"
            ),
        )
        self.pending_rows = []

        self.conn = self._connect()
        self.cursor = self.conn.cursor(buffered=True)
        self._ensure_schema()

    def close_spider(self, spider=None):
        cursor = self.cursor
        conn = self.conn
        try:
            if cursor is not None and conn is not None:
                self._flush_rows(force=True)
        finally:
            self.cursor = None
            self.conn = None
            try:
                if cursor is not None:
                    cursor.close()
            finally:
                if conn is not None and conn.is_connected():
                    conn.close()

    @staticmethod
    def _quote_mysql_identifier(value):
        text = str(value or "").strip()
        if not text:
            raise ValueError("Database name cannot be empty.")
        return f"`{text.replace('`', '``')}`"

    def _db_config(self, include_database=True):
        config = {
            "host": os.getenv("SCRAPER_DB_HOST") or os.getenv("MYSQL_HOST") or "localhost",
            "port": int(os.getenv("SCRAPER_DB_PORT") or os.getenv("MYSQL_PORT") or "3306"),
            "user": os.getenv("SCRAPER_DB_USER") or os.getenv("MYSQL_USER") or "root",
            "password": os.getenv("SCRAPER_DB_PASSWORD") or os.getenv("MYSQL_PASSWORD") or "root",
        }

        if include_database:
            config["database"] = os.getenv("SCRAPER_DB_NAME") or os.getenv("MYSQL_DATABASE") or "bh_market"

        return config

    def _connect(self):
        config = self._db_config(include_database=True)
        try:
            return mysql.connector.connect(**config, autocommit=False)
        except mysql.connector.Error as exc:
            if getattr(exc, "errno", None) != errorcode.ER_BAD_DB_ERROR:
                raise

            bootstrap_conn = mysql.connector.connect(**self._db_config(include_database=False), autocommit=True)
            try:
                bootstrap_cursor = bootstrap_conn.cursor()
                try:
                    bootstrap_cursor.execute(
                        "CREATE DATABASE IF NOT EXISTS "
                        f"{self._quote_mysql_identifier(config['database'])} "
                        "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                    )
                finally:
                    bootstrap_cursor.close()
            finally:
                if bootstrap_conn.is_connected():
                    bootstrap_conn.close()

            return mysql.connector.connect(**config, autocommit=False)

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
        self._ensure_column("images_json", "LONGTEXT NULL")
        self._ensure_column("extra_json", "LONGTEXT NULL")
        self._ensure_column("first_seen_at", "DATETIME NULL")
        self._ensure_column("last_seen_at", "DATETIME NULL")
        self._ensure_column("last_crawled_at", "DATETIME NULL")
        self._ensure_column("source_published_at", "DATETIME NULL")
        self._ensure_column("source_published_raw", "VARCHAR(255) NULL")

        self.cursor.execute("SHOW INDEX FROM raw_properties WHERE Key_name = 'ux_raw_properties_source_url'")
        existing_indexes = self.cursor.fetchall()
        if not existing_indexes:
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

    def _iter_image_values(self, value):
        if value is None:
            return

        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return
            if stripped.startswith(("[", "{")):
                try:
                    parsed = json.loads(stripped)
                except json.JSONDecodeError:
                    yield stripped
                else:
                    yield from self._iter_image_values(parsed)
                return
            yield stripped
            return

        if isinstance(value, dict):
            for key in ("url", "src", "contentUrl", "image", "images", "thumbnailUrl"):
                yield from self._iter_image_values(value.get(key))
            return

        if isinstance(value, (list, tuple, set)):
            for element in value:
                yield from self._iter_image_values(element)

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

            for candidate in self._iter_image_values(value):
                add_candidate(candidate)

        return images

    def _flush_rows(self, force=False):
        if not self.pending_rows:
            return

        if not force and len(self.pending_rows) < self.batch_size:
            return

        if self.cursor is None or self.conn is None:
            raise RuntimeError("RawPipeline is not connected to MySQL.")

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
            images_json,
            extra_json,
            first_seen_at,
            last_seen_at,
            last_crawled_at,
            source_published_at,
            source_published_raw
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            NOW(), NOW(), NOW(), %s, %s
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
            images_json = COALESCE(VALUES(images_json), images_json),
            extra_json = COALESCE(VALUES(extra_json), extra_json),
            source_published_at = COALESCE(VALUES(source_published_at), source_published_at),
            source_published_raw = COALESCE(VALUES(source_published_raw), source_published_raw),
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

    def process_item(self, item, spider=None):
        url = self._normalize_url(item.get("url"))
        if not url:
            return item

        source = None
        if spider is not None:
            source = spider.name
        elif getattr(self, "crawler", None) is not None and getattr(self.crawler, "spider", None) is not None:
            source = self.crawler.spider.name
        if not source:
            source = item.get("source") or "unknown"

        listing_id = self._clean_text(item.get("listing_id"))
        stream = self._clean_text(item.get("stream"))
        source_published_raw = self._clean_text(
            item.get("source_published_at")
            or item.get("source_published_raw")
            or find_source_date_in_mapping(dict(item))
        )
        source_published_at = normalize_source_datetime(source_published_raw)

        if (
            source_published_at
            and self.max_source_listing_age_days > 0
            and is_older_than_days(source_published_at, self.max_source_listing_age_days)
        ):
            raise DropItem(
                f"Source listing is older than {self.max_source_listing_age_days} days: {source_published_raw}"
            )

        images = self._extract_images_from_item(item)
        image = images[0] if images else None
        images_json = json.dumps(images, ensure_ascii=True, default=str) if images else None

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
                images_json,
                extra_json,
                source_published_at,
                source_published_raw,
            )
        )

        self._flush_rows(force=False)
        return item
