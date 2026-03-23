import scrapy


class ImmobilierTnSpider(scrapy.Spider):
    name = "immobilier_tn"
    allowed_domains = ["immobilier.com.tn"]
    start_urls = ["https://immobilier.com.tn"]

    def parse(self, response):
        pass
