import json
import re
from urllib.parse import parse_qs, urlparse

import scrapy


class AnnoncesImmoSpider(scrapy.Spider):
    name = "annonces_immo"
    allowed_domains = ["annonces-immobilieres.tn"]
    start_urls = ["https://annonces-immobilieres.tn/annonces"]
    custom_settings = {
        "CONCURRENT_REQUESTS": 10,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 5,
        "DOWNLOAD_DELAY": 0.3,
        "AUTOTHROTTLE_ENABLED": True,
        "AUTOTHROTTLE_TARGET_CONCURRENCY": 2.0,
    }

    PAGE_PATH_RE = re.compile(r"/annonces/(\d+)$", re.IGNORECASE)

    def __init__(self, max_pages=200, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.max_pages = max(1, int(max_pages))
        self._seen_pages = set()
        self._seen_listings = set()
        self._consecutive_zero_new_pages = 0

    def _normalize_url(self, value):
        if not value:
            return None
        return self._response.urljoin(value).split("#", 1)[0].rstrip("/")

    def _extract_page_number(self, url):
        parsed = urlparse(url)
        match = self.PAGE_PATH_RE.search(parsed.path.rstrip("/"))
        if match:
            try:
                return int(match.group(1))
            except ValueError:
                return 1

        query_page = parse_qs(parsed.query).get("page", ["1"])[0]
        try:
            return int(query_page)
        except ValueError:
            return 1

    def _is_listing_scope_page(self, url):
        if not url:
            return False
        lower = url.lower()
        if not lower.startswith("https://annonces-immobilieres.tn/annonces"):
            return False
        parsed = urlparse(url)
        if self.PAGE_PATH_RE.search(parsed.path.rstrip("/")):
            return True
        if parsed.path.rstrip("/") == "/annonces":
            return True
        return "page=" in parsed.query

    def parse(self, response):
        self._response = response

        normalized_page_url = self._normalize_url(response.url)
        if normalized_page_url in self._seen_pages:
            return
        self._seen_pages.add(normalized_page_url)

        page_number = self._extract_page_number(normalized_page_url)
        if page_number > self.max_pages:
            return

        new_details = 0
        for href in response.css("a[href*='/annonce/details/']::attr(href)").getall():
            detail_url = self._normalize_url(href)
            if not detail_url:
                continue
            if detail_url in self._seen_listings:
                continue
            self._seen_listings.add(detail_url)
            new_details += 1
            yield response.follow(detail_url, callback=self.parse_detail)

        if new_details == 0:
            self._consecutive_zero_new_pages += 1
        else:
            self._consecutive_zero_new_pages = 0

        if self._consecutive_zero_new_pages >= 3:
            return

        next_links = response.css(
            "a[rel='next']::attr(href), .pagination a::attr(href), a[href*='/annonces/']::attr(href), a[href*='?page=']::attr(href)"
        ).getall()

        emitted_next = False
        for href in next_links:
            next_page = self._normalize_url(href)
            if not self._is_listing_scope_page(next_page):
                continue

            next_page_number = self._extract_page_number(next_page)
            if next_page_number <= page_number:
                continue
            if next_page_number > self.max_pages:
                continue
            if next_page in self._seen_pages:
                continue

            emitted_next = True
            yield response.follow(next_page, callback=self.parse)

        if not emitted_next and page_number < self.max_pages:
            fallback_next = f"https://annonces-immobilieres.tn/annonces/{page_number + 1}"
            if fallback_next not in self._seen_pages:
                yield response.follow(fallback_next, callback=self.parse)

    def parse_detail(self, response):
        title = None
        price = None
        location = None
        description = None
        image = None

        for script in response.css("script[type='application/ld+json']::text").getall():
            try:
                payload = json.loads(script)
            except json.JSONDecodeError:
                continue

            if not isinstance(payload, dict):
                continue

            title = title or payload.get("name")
            description = description or payload.get("description")
            image = image or payload.get("image")

            raw_price = payload.get("price")
            currency = payload.get("priceCurrency")
            if raw_price is not None:
                if currency:
                    price = f"{raw_price} {currency}"
                else:
                    price = str(raw_price)

            locality = (
                payload.get("itemOffered", {})
                .get("address", {})
                .get("addressLocality")
            )
            if locality:
                location = locality

            if title and price and description and location:
                break

        title = title or response.css("h1::text").get() or response.css("title::text").get()

        if not price:
            price_text = response.xpath("normalize-space((//*[contains(., 'DT') or contains(., 'TND')])[1])").get()
            if price_text:
                price = " ".join(price_text.split())

        if not location:
            locality = response.css("a[href*='/annonces/region/']::text").get()
            location = locality.strip() if isinstance(locality, str) else locality

        if not description:
            description = " ".join(t.strip() for t in response.css("p::text").getall() if t.strip()) or None

        if not image:
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
