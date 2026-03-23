import scrapy


class AfariatSpider(scrapy.Spider):
    name = "afariat"
    allowed_domains = ["afariat.com"]
    start_urls = ["https://afariat.com"]

    def parse(self, response):
        pass
