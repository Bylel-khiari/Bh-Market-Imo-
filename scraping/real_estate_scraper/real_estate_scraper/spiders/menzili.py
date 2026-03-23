import re

import scrapy


class MenziliSpider(scrapy.Spider):
    name = "menzili"
    allowed_domains = ["menzili.tn"]
    start_urls = ["https://www.menzili.tn/"]
    custom_settings = {
        "ROBOTSTXT_OBEY": False,
        "USER_AGENT": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    }

    def parse(self, response):
        detail_links = response.css("a[href*='annonce/']::attr(href)").getall()
        for href in detail_links:
            yield response.follow(href, callback=self.parse_detail)

        # Keep discovering internal real-estate pages to cover the site.
        discover_links = response.css("a::attr(href)").getall()
        for href in discover_links:
            link = href.lower()
            if any(token in link for token in ["annonce", "immobilier", "vente", "location", "appartement", "villa", "terrain"]):
                yield response.follow(href, callback=self.parse)

    def parse_detail(self, response):
        title = (
            response.css("meta[property='og:title']::attr(content)").get()
            or response.css("h1::text").get()
            or response.css("title::text").get()
        )
        description = (
            response.css("meta[property='og:description']::attr(content)").get()
            or response.css("meta[name='description']::attr(content)").get()
        )

        text_blob = " ".join(response.css("*::text").getall())
        price_match = re.search(r"(\d[\d\s\.,]*)\s*(dt|dinar|tnd)", text_blob, re.IGNORECASE)
        price = price_match.group(1).strip() if price_match else None

        location = None
        path = response.url.lower()
        if "-" in path:
            location = path.rsplit("-", 1)[-1].replace(".html", "").replace("/", " ")

        yield {
            "title": title.strip() if isinstance(title, str) else title,
            "price": price,
            "location": location,
            "description": description.strip() if isinstance(description, str) else description,
            "url": response.url,
        }
