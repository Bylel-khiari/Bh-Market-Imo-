import scrapy


class TunisiapromoSpider(scrapy.Spider):
    name = "tunisiapromo"
    allowed_domains = ["tunisiapromo.com"]
    start_urls = ["https://tunisiapromo.com"]

    def parse(self, response):
        pass
