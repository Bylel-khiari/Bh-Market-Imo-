import re
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

import scrapy


class TunisieAnnonceSpider(scrapy.Spider):
    name = "tunisie_annonce"
    allowed_domains = ["tunisie-annonce.com"]
    start_urls = ["http://www.tunisie-annonce.com/AnnoncesImmobilier.asp"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._seen_pagination = set()
        raw_max_page = kwargs.get("max_page")
        try:
            self.max_page = int(raw_max_page) if raw_max_page is not None else None
        except (TypeError, ValueError):
            self.max_page = None

    def parse(self, response):
        detail_links = response.css("a[href*='Details_Annonces_Immobilier.asp']::attr(href)").getall()
        for href in detail_links:
            yield response.follow(href, callback=self.parse_detail)

        current_category = self._query_value(response.url, "rech_cod_cat")
        page_links = response.css("a[href*='AnnoncesImmobilier.asp']::attr(href)").getall()
        for href in page_links:
            next_url = self._normalized_pagination_url(response.urljoin(href), current_category)
            if not next_url:
                continue

            page_num = self._query_value(next_url, "rech_page_num")
            page_key = (current_category or "root", page_num)
            if page_key in self._seen_pagination:
                continue

            self._seen_pagination.add(page_key)
            yield response.follow(next_url, callback=self.parse)

    def _query_value(self, url, key):
        values = parse_qs(urlparse(url).query).get(key)
        if not values:
            return None
        value = values[0].strip()
        return value or None

    def _normalized_pagination_url(self, url, current_category):
        parsed = urlparse(url)
        if "annoncesimmobilier.asp" not in parsed.path.lower():
            return None

        query = parse_qs(parsed.query)
        page_num = (query.get("rech_page_num") or [None])[0]
        if not page_num or not str(page_num).isdigit():
            return None
        page_num_int = int(page_num)

        if self.max_page is not None and page_num_int > self.max_page:
            return None

        candidate_category = (query.get("rech_cod_cat") or [None])[0]

        # Keep crawling in the same listing stream and avoid category branching.
        if current_category:
            if candidate_category and candidate_category != current_category:
                return None
        elif candidate_category:
            return None

        normalized_query = {"rech_page_num": str(page_num_int)}
        if current_category:
            normalized_query["rech_cod_cat"] = current_category

        return urlunparse((parsed.scheme, parsed.netloc, parsed.path, "", urlencode(normalized_query), ""))

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
