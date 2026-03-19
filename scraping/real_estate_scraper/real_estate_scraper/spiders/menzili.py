import scrapy
class MenziliSpider(scrapy.Spider):
    name = "menzili"
    allowed_domains = ["menzili.tn"]
    start_urls = ["https://menzili.tn"]

    def parse(self, response):
        pass
