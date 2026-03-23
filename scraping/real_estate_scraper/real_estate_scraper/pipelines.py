# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: https://docs.scrapy.org/en/latest/topics/item-pipeline.html


# useful for handling different item types with a single interface
from itemadapter import ItemAdapter
import mysql.connector


class RealEstateScraperPipeline:
    def process_item(self, item, spider):
        return item


class RawPipeline:

    def open_spider(self, spider):
        self.conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="",
            database="raw_db"
        )
        self.cursor = self.conn.cursor()

    def process_item(self, item, spider):
        self.cursor.execute("""
        INSERT INTO raw_properties (title, price, location, description, url, source)
        VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            item.get("title"),
            item.get("price"),
            item.get("location"),
            item.get("description"),
            item.get("url"),
            spider.name
        ))

        self.conn.commit()
        return item
