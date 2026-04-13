import re
from urllib.parse import urldefrag

import scrapy


class MubawabSpider(scrapy.Spider):
    name = "mubawab"
    allowed_domains = ["mubawab.tn"]
    start_urls = [
        "https://www.mubawab.tn/fr/sc/appartements-a-vendre",
        "https://www.mubawab.tn/fr/sc/appartements-a-louer",
    ]
    custom_settings = {
        "CONCURRENT_REQUESTS": 16,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 8,
        "DOWNLOAD_DELAY": 0.15,
        "AUTOTHROTTLE_ENABLED": True,
        "AUTOTHROTTLE_TARGET_CONCURRENCY": 4.0,
    }

    PAGE_RE = re.compile(r":p:\d+", re.IGNORECASE)

    def __init__(self, max_pages=120, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.max_pages = max(1, int(max_pages))
        self._seen_pages = set()
        self._seen_details = set()
        self._consecutive_no_listing_pages = 0

    def _normalize_url(self, value):
        if not value:
            return None
        absolute = self._response_urljoin(value)
        if not absolute:
            return None
        normalized = urldefrag(absolute)[0].rstrip("/")
        return normalized

    def _response_urljoin(self, value):
        if not hasattr(self, "_current_response"):
            return None
        return self._current_response.urljoin(value)

    def _is_listing_scope_page(self, url):
        if not url:
            return False
        lower = url.lower()
        if not lower.startswith("https://www.mubawab.tn/fr/sc/"):
            return False
        if "?/" in lower:
            return False
        return True

    def _extract_page_number(self, url):
        match = self.PAGE_RE.search(url or "")
        if not match:
            return 1
        try:
            return int(match.group(0).split(":")[-1])
        except (TypeError, ValueError):
            return 1

    def parse(self, response):
        self._current_response = response

        current_url = self._normalize_url(response.url)
        if current_url in self._seen_pages:
            return
        self._seen_pages.add(current_url)

        page_number = self._extract_page_number(current_url)
        if page_number > self.max_pages:
            return

        cards = response.css(".listingBox")
        new_details = 0
        for card in cards:
            href = card.css(".listingTit a::attr(href), a[href*='/fr/a/']::attr(href)").get()
            detail_url = self._normalize_url(href)
            if not detail_url:
                continue
            if "/fr/a/" not in detail_url.lower():
                continue
            if detail_url in self._seen_details:
                continue
            self._seen_details.add(detail_url)
            new_details += 1
            yield response.follow(detail_url, callback=self.parse_detail)

        if new_details == 0:
            self._consecutive_no_listing_pages += 1
        else:
            self._consecutive_no_listing_pages = 0

        if self._consecutive_no_listing_pages >= 3:
            return

        next_candidates = response.css(
            "a[rel='next']::attr(href), a[href*=':p:']::attr(href), .pagination a::attr(href)"
        ).getall()

        emitted_next = False
        for href in next_candidates:
            next_url = self._normalize_url(href)
            if not self._is_listing_scope_page(next_url):
                continue
            if next_url in self._seen_pages:
                continue
            next_page = self._extract_page_number(next_url)
            if next_page <= page_number:
                continue
            if next_page > self.max_pages:
                continue
            emitted_next = True
            yield response.follow(next_url, callback=self.parse)

        if not emitted_next and page_number < self.max_pages:
            fallback_next = current_url
            if self.PAGE_RE.search(current_url):
                fallback_next = self.PAGE_RE.sub(f":p:{page_number + 1}", current_url)
            else:
                fallback_next = f"{current_url}:p:{page_number + 1}"

            if self._is_listing_scope_page(fallback_next) and fallback_next not in self._seen_pages:
                yield response.follow(fallback_next, callback=self.parse)

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

        darkblue_parts = [
            t.strip()
            for t in response.css(".darkblue::text").getall()
            if t and t.strip()
        ]
        filtered = []
        for part in darkblue_parts:
            lower = part.lower()
            if lower in {"se connecter", "favori", "partager", "appelez", "voir la carte"}:
                continue
            if lower.startswith("immobilier"):
                continue
            filtered.append(part)
        location = filtered[-1] if filtered else None
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
