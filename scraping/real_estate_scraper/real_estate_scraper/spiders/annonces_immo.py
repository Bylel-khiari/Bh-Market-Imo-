import scrapy


class AnnoncesImmoSpider(scrapy.Spider):
    name = "annonces_immo"
    allowed_domains = ["annonces-immobilieres.tn"]
    start_urls = ["https://annonces-immobilieres.tn"]

    def parse(self, response):
        pass
