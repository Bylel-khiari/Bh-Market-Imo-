import re

import scrapy


class MubawabSpider(scrapy.Spider):
    name = "mubawab"
    allowed_domains = ["mubawab.tn"]
    start_urls = ["https://www.mubawab.tn/fr/"]

    def parse(self, response):
        cards = response.css(".listingBox")
        for card in cards:
            url = card.css(".listingTit a::attr(href)").get()
            yield {
                "title": " ".join(t.strip() for t in card.css(".listingTit a::text").getall() if t.strip()) or None,
                "price": " ".join(t.strip() for t in card.css(".priceTag *::text").getall() if t.strip()) or None,
                "location": " ".join(t.strip() for t in card.css(".listingH3::text").getall() if t.strip()) or None,
                "description": None,
                "url": response.urljoin(url) if url else response.url,
            }
            if url:
                yield response.follow(url, callback=self.parse_detail)

        hrefs = response.css("a::attr(href)").getall()
        for href in hrefs:
            link = href.lower()
            if "/fr/a/" in link or "/fr/sc/" in link or "/fr/st/" in link:
                yield response.follow(href, callback=self.parse)

        # Mubawab stores pagination URLs inside script text (e.g. :p:2).
        body = response.text
        paginated = set(re.findall(r"https://www\\.mubawab\\.tn/fr/sc/[^\"&\\s]+:p:\\d+", body))
        for url in paginated:
            yield response.follow(url, callback=self.parse)

    def parse_detail(self, response):
        title = (
            response.css("h1::text").get()
            or response.css("meta[property='og:title']::attr(content)").get()
            or response.css("title::text").get()
        )
        description = (
            response.css("meta[property='og:description']::attr(content)").get()
            or " ".join(t.strip() for t in response.css("p::text").getall() if t.strip())
        )
        price = " ".join(t.strip() for t in response.css(".orangeTit::text, .priceTag::text").getall() if t.strip()) or None
        location = " ".join(t.strip() for t in response.css(".darkblue::text, .adMainFeatureContentValue::text").getall() if t.strip()) or None

        yield {
            "title": title.strip() if isinstance(title, str) else title,
            "price": price,
            "location": location,
            "description": description.strip() if isinstance(description, str) else description,
            "url": response.url,
        }
