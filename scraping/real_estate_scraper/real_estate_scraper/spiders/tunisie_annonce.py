import scrapy


class TunisieAnnonceSpider(scrapy.Spider):
    name = "tunisie_annonce"
    allowed_domains = ["tunisie-annonce.com"]
    start_urls = ["https://tunisie-annonce.com"]

    def parse(self, response):
        pass
