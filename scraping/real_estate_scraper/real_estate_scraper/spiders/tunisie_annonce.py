import re

import scrapy


class TunisieAnnonceSpider(scrapy.Spider):
    name = "tunisie_annonce"
    allowed_domains = ["tunisie-annonce.com"]
    start_urls = ["http://www.tunisie-annonce.com/AnnoncesImmobilier.asp"]

    def parse(self, response):
        detail_links = response.css("a[href*='Details_Annonces_Immobilier.asp']::attr(href)").getall()
        for href in detail_links:
            yield response.follow(href, callback=self.parse_detail)

        page_links = response.css("a[href*='AnnoncesImmobilier.asp']::attr(href)").getall()
        for href in page_links:
            if "rech_page_num" in href.lower() or "rech_cod_cat" in href.lower():
                yield response.follow(href, callback=self.parse)

    def parse_detail(self, response):
        og_title = response.css("meta[property='og:title']::attr(content)").get()
        meta_desc = response.css("meta[name='description']::attr(content)").get()
        title = og_title or response.css("title::text").get()
        description = meta_desc

        price = None
        if title:
            price_match = re.search(r"(\d[\d\s\.,]*)\s*(dt|dinar|tnd)", title, re.IGNORECASE)
            if price_match:
                price = price_match.group(1).strip()

        location = None
        if og_title:
            parts = og_title.split("-")
            if len(parts) >= 2:
                location = parts[-2].strip()

        yield {
            "title": title.strip() if isinstance(title, str) else title,
            "price": price,
            "location": location,
            "description": description.strip() if isinstance(description, str) else description,
            "url": response.url,
        }
