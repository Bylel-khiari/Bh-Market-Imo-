import scrapy
class LkeriaSpider(scrapy.Spider):
    name = "lkeria"
    allowed_domains = ["lkeria.com"]
    start_urls = ["https://lkeria.com"]

    def parse(self, response):
        pass
