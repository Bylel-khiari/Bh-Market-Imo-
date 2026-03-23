import scrapy


class BnbSpider(scrapy.Spider):
    name = "bnb"
    allowed_domains = ["bnb.tn"]
    start_urls = ["https://bnb.tn"]

    def parse(self, response):
        pass
