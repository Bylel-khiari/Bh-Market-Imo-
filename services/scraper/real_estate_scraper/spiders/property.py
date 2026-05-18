import scrapy

from real_estate_scraper.image_extraction import first_image, normalize_image_url


class PropertySpider(scrapy.Spider):
    name = "property"
    allowed_domains = ["tayara.tn"]
    start_urls = ["https://www.tayara.tn/ads/c/Immobilier/"]

    def parse(self, response):
        ads = response.css("div.card")

        for ad in ads:
            images = []
            seen = set()
            for candidate in ad.css("img::attr(src), img::attr(data-src), img::attr(data-lazy-src), img::attr(srcset)").getall():
                if "," in candidate:
                    candidate = candidate.split(",")[-1].strip().split(" ")[0]
                normalized = normalize_image_url(response, candidate)
                if normalized and normalized not in seen:
                    seen.add(normalized)
                    images.append(normalized)

            yield {
                "title": ad.css("h2::text").get(),
                "price": ad.css(".price::text").get(),
                "location": ad.css(".location::text").get(),
                "image": first_image(images),
                "images": images,
                "url": response.url,
            }

        # pagination (page suivante)
        next_page = response.css("a[rel='next']::attr(href)").get()
        if next_page:
            yield response.follow(next_page, callback=self.parse)
