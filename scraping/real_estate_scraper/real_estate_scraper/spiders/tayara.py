import scrapy


class TayaraSpider(scrapy.Spider):
    name = "tayara"
    allowed_domains = ["tayara.tn"]
    start_urls = ["https://tayara.tn"]

    def parse(self, response):
        pass
