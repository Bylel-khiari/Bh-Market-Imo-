import scrapy

class PropertySpider(scrapy.Spider):
    name = "property"
    allowed_domains = ["tayara.tn"]
    start_urls = ["https://www.tayara.tn/ads/c/Immobilier/"]

    def parse(self, response):
        ads = response.css("div.card")

        for ad in ads:
            image = (
                ad.css("img::attr(src)").get()
                or ad.css("img::attr(data-src)").get()
                or ad.css("img::attr(data-lazy-src)").get()
            )
            yield {
                "title": ad.css("h2::text").get(),
                "price": ad.css(".price::text").get(),
                "location": ad.css(".location::text").get(),
                "image": response.urljoin(image.strip()) if isinstance(image, str) and image.strip() else None,
                "url": response.url,
            }

        # pagination (page suivante)
        next_page = response.css("a[rel='next']::attr(href)").get()
        if next_page:
            yield response.follow(next_page, callback=self.parse)