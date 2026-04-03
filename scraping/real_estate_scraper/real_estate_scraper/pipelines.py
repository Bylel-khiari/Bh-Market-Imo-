# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: https://docs.scrapy.org/en/latest/topics/item-pipeline.html


import mysql.connector


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
        self._pending_writes = 0
        self._commit_every = 50
        self._existing_by_source = {}
        self.cursor.execute(
            "SELECT id, url, image FROM raw_properties WHERE source = %s",
            (spider.name,),
        )
        self._existing_by_source[spider.name] = {
            (row[1] or ""): {"id": row[0], "image": row[2]}
            for row in self.cursor.fetchall()
            if row and row[1]
        }

    def close_spider(self, spider):
        try:
            if self._pending_writes:
                self.conn.commit()
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

        source_cache = self._existing_by_source.get(source, {})
        if url:
            existing = source_cache.get(url)
            if existing:
                if (not existing.get("image") or not str(existing.get("image")).strip()) and image:
                    self.cursor.execute(
                        "UPDATE raw_properties SET image = %s WHERE id = %s",
                        (image, existing["id"]),
                    )
                    existing["image"] = image
                    self._pending_writes += 1
                    if self._pending_writes >= self._commit_every:
                        self.conn.commit()
                        self._pending_writes = 0
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

        if url:
            source_cache[url] = {"id": self.cursor.lastrowid, "image": image}

        self._pending_writes += 1
        if self._pending_writes >= self._commit_every:
            self.conn.commit()
            self._pending_writes = 0
        return item
