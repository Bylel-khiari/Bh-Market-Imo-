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

        page_text = " ".join(
            t.strip()
            for t in response.xpath("//body//*[not(self::script) and not(self::style)]/text()").getall()
            if t and t.strip()
        )
        page_text = re.sub(r"\s+", " ", page_text)

        price = None
        price_match = re.search(r"Prix\s+([0-9][0-9\s\.,]*)\s*(?:Dinar|DT|TND)", page_text, re.IGNORECASE)
        if not price_match and title:
            price_match = re.search(r"(\d[\d\s\.,]*)\s*(dt|dinar|tnd)", title, re.IGNORECASE)
        if price_match:
            price = price_match.group(1).strip()

        location = None
        loc_match = re.search(r"Localisation\s+Tunisie\s*>\s*(.*?)\s+Surface", page_text, re.IGNORECASE)
        if loc_match:
            parts = [p.strip() for p in loc_match.group(1).split(">") if p.strip()]
            if len(parts) >= 2:
                location = f"{parts[-2]}, {parts[-1]}"
            elif parts:
                location = parts[-1]

        if not location and og_title:
            parts = og_title.split("-")
            if len(parts) >= 2:
                location = parts[-2].strip()
        image = (
            response.css("meta[property='og:image']::attr(content)").get()
            or response.css("meta[name='twitter:image']::attr(content)").get()
            or response.css("img::attr(src)").get()
        )

        yield {
            "title": title.strip() if isinstance(title, str) else title,
            "price": price,
            "location": location,
            "description": description.strip() if isinstance(description, str) else description,
            "image": response.urljoin(image.strip()) if isinstance(image, str) and image.strip() else None,
            "url": response.url,
        }
