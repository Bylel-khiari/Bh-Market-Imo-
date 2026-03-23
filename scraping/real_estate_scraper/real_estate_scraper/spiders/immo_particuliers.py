import scrapy


class ImmoParticuliersSpider(scrapy.Spider):
    name = "immo_particuliers"
    allowed_domains = ["tunisie.immo-entre-particuliers.com"]
    start_urls = ["https://tunisie.immo-entre-particuliers.com"]

    def parse(self, response):
        pass
