import scrapy


class DarcomSpider(scrapy.Spider):
    name = "darcom"
    allowed_domains = ["darcomtunisia.com"]
    start_urls = ["https://darcomtunisia.com"]

    def parse(self, response):
        pass
