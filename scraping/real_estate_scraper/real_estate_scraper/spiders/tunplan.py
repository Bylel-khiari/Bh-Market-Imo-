import scrapy


class TunplanSpider(scrapy.Spider):
    name = "tunplan"
    allowed_domains = ["tunplan.com"]
    start_urls = ["https://tunplan.com"]

    def parse(self, response):
        pass
