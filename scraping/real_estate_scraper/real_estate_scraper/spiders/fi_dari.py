import scrapy


class FiDariSpider(scrapy.Spider):
    name = "fi_dari"
    allowed_domains = ["fi-dari.t"]
    start_urls = ["https://fi-dari.t"]

    def parse(self, response):
        pass
