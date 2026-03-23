import scrapy


class ImmobiliereSallouhaSpider(scrapy.Spider):
    name = "immobiliere_sallouha"
    allowed_domains = ["immobilieresallouha.com"]
    start_urls = ["https://immobilieresallouha.com"]

    def parse(self, response):
        pass
