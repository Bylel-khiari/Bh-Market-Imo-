import os

import mysql.connector
from scrapy import signals


class ActiveScrapeSiteGuardExtension:
    def __init__(self, db_config):
        self.db_config = db_config

    @classmethod
    def from_crawler(cls, crawler):
        extension = cls(
            {
                "host": os.getenv("SCRAPER_DB_HOST", os.getenv("MYSQL_HOST", "localhost")),
                "user": os.getenv("SCRAPER_DB_USER", os.getenv("MYSQL_USER", "root")),
                "password": os.getenv("SCRAPER_DB_PASSWORD", os.getenv("MYSQL_PASSWORD", "")),
                "database": os.getenv("SCRAPER_DB_NAME", os.getenv("MYSQL_DATABASE", "database")),
            }
        )
        crawler.signals.connect(extension.spider_opened, signal=signals.spider_opened)
        return extension

    def spider_opened(self, spider):
        connection = None
        cursor = None

        try:
            connection = mysql.connector.connect(**self.db_config)
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SHOW TABLES LIKE 'scrape_sites'")
            if cursor.fetchone() is None:
                spider.logger.info(
                    "Table scrape_sites absente: le spider %s continue avec la configuration locale.",
                    spider.name,
                )
                return

            cursor.execute(
                "SELECT name, is_active FROM scrape_sites WHERE spider_name = %s LIMIT 1",
                (spider.name,),
            )
            row = cursor.fetchone()

            if row is None:
                spider.logger.warning(
                    "Spider %s non configure dans le dashboard admin: arret de la collecte.",
                    spider.name,
                )
                spider.crawler.engine.close_spider(spider, "site_non_configure_admin")
                return

            if not bool(row.get("is_active")):
                spider.logger.warning(
                    "Spider %s desactive depuis le dashboard admin: arret de la collecte.",
                    spider.name,
                )
                spider.crawler.engine.close_spider(spider, "site_desactive_admin")
        except mysql.connector.Error as error:
            spider.logger.warning(
                "Impossible de verifier le statut admin du spider %s: %s",
                spider.name,
                error,
            )
        finally:
            if cursor is not None:
                cursor.close()
            if connection is not None and connection.is_connected():
                connection.close()
