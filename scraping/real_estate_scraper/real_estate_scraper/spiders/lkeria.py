import re

import scrapy


class LkeriaSpider(scrapy.Spider):
    name = "lkeria"
    allowed_domains = ["lkeria.com"]
    start_urls = [
        "https://www.lkeria.com/annonces/immobilier/vente",
        "https://www.lkeria.com/annonces/immobilier/location",
    ]
    custom_settings = {
        "ROBOTSTXT_OBEY": False,
    }

    def parse(self, response):
        hrefs = response.css("a::attr(href)").getall()
        for href in hrefs:
            lower = href.lower()
            if "/annonces/immobilier/" in lower and lower.endswith(".html"):
                yield response.follow(href, callback=self.parse_detail)
            elif "/annonces/immobilier/" in lower:
                yield response.follow(href, callback=self.parse)

        # Some pages expose protocol-relative detail URLs.
        protocol_relative = set(re.findall(r"//www\\.lkeria\\.com/annonces/immobilier/[^\"\s]+\\.html", response.text, re.IGNORECASE))
        for href in protocol_relative:
            yield response.follow("https:" + href, callback=self.parse_detail)

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
        price = response.css("[itemprop='price']::attr(content)").get()

        location = None
        match = re.search(r"-([^-]+)-\d+-\d+-\d+\.html", response.url, re.IGNORECASE)
        if match:
            location = match.group(1).replace("-", " ")

        yield {
            "title": title.strip() if isinstance(title, str) else title,
            "price": str(price).strip() if price is not None else None,
            "location": location,
            "description": description.strip() if isinstance(description, str) else description,
            "url": response.url,
        }
