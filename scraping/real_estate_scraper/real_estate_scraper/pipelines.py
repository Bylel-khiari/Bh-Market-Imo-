# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: https://docs.scrapy.org/en/latest/topics/item-pipeline.html


# useful for handling different item types with a single interface
from itemadapter import ItemAdapter
import mysql.connector
import re
from urllib.parse import urljoin
from urllib.request import Request, urlopen


class RealEstateScraperPipeline:
    def process_item(self, item, spider):
        return item


class RawPipeline:

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

    def open_spider(self, spider):
        self.conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="",
            database="data_base"
        )
        self.cursor = self.conn.cursor()
        self._image_cache = {}

    def _extract_image_from_url(self, url):
        if not url:
            return None

        if url in self._image_cache:
            return self._image_cache[url]

        image = None
        try:
            req = Request(
                url,
                headers={"User-Agent": "Mozilla/5.0"},
            )
            with urlopen(req, timeout=12) as resp:
                html = resp.read(512000).decode("utf-8", errors="ignore")

            patterns = [
                r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)',
                r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
                r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)',
                r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']twitter:image["\']',
                r'<img[^>]+src=["\']([^"\']+)',
            ]

            for pattern in patterns:
                m = re.search(pattern, html, flags=re.IGNORECASE)
                if not m:
                    continue
                candidate = (m.group(1) or "").strip()
                if not candidate:
                    continue
                if candidate.startswith("data:"):
                    continue
                image = urljoin(url, candidate)
                break
        except Exception:
            image = None

        self._image_cache[url] = image
        return image

    def close_spider(self, spider):
        try:
            self.cursor.close()
        finally:
            self.conn.close()

    def _extract_image_from_item(self, item):
        for key in self.IMAGE_KEYS:
            value = item.get(key)
            if not value:
                continue

            if isinstance(value, dict):
                candidate = value.get("url") or value.get("src")
                if candidate:
                    return candidate

            if isinstance(value, (list, tuple)):
                if not value:
                    continue
                first = value[0]
                if isinstance(first, dict):
                    candidate = first.get("url") or first.get("src")
                    if candidate:
                        return candidate
                elif isinstance(first, str) and first.strip():
                    return first.strip()

            if isinstance(value, str) and value.strip():
                return value.strip()

        return None

    def process_item(self, item, spider):
        url = item.get("url")
        source = spider.name
        image = self._extract_image_from_item(item)

        if not image and url:
            image = self._extract_image_from_url(url)

        if url:
            self.cursor.execute(
                "SELECT id, image FROM raw_properties WHERE source = %s AND url = %s LIMIT 1",
                (source, url),
            )
            existing = self.cursor.fetchone()
            if existing:
                existing_id, existing_image = existing
                if (not existing_image or not str(existing_image).strip()) and image:
                    self.cursor.execute(
                        "UPDATE raw_properties SET image = %s WHERE id = %s",
                        (image, existing_id),
                    )
                    self.conn.commit()
                return item

        self.cursor.execute("""
        INSERT INTO raw_properties (title, price, location, description, image, url, source)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            item.get("title"),
            item.get("price"),
            item.get("location"),
            item.get("description"),
            image,
            url,
            source
        ))

        self.conn.commit()
        return item
