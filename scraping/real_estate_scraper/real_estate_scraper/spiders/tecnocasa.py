import scrapy


class TecnocasaSpider(scrapy.Spider):
    name = "tecnocasa"
    allowed_domains = ["tecnocasa.tn"]
    start_urls = ["https://tecnocasa.tn"]

    def parse(self, response):
        pass
