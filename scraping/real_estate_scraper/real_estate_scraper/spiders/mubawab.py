import scrapy
class MubawabSpider(scrapy.Spider):
    name = "mubawab"
    allowed_domains = ["mubawab.tn"]
    start_urls = ["https://mubawab.tn"]

    def parse(self, response):
        pass
