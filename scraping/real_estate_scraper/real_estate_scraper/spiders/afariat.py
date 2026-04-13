import re
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

import scrapy


class AfariatSpider(scrapy.Spider):
    name = "afariat"
    allowed_domains = ["afariat.com"]
    start_urls = ["https://afariat.com/appartements"]
    custom_settings = {
        "CONCURRENT_REQUESTS": 10,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 5,
        "DOWNLOAD_DELAY": 0.35,
        "AUTOTHROTTLE_ENABLED": True,
        "AUTOTHROTTLE_TARGET_CONCURRENCY": 2.0,
    }

    DETAIL_RE = re.compile(r"/annonce-[^?#]*/immobilier/", re.IGNORECASE)

    def __init__(self, max_pages=150, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.max_pages = max(1, int(max_pages))
        self._seen_listing_urls = set()
        self._seen_pages = set()
        self._consecutive_zero_new_pages = 0

    def _normalize_url(self, value):
        if not value:
            return None
        absolute = self._response.urljoin(value)
        parsed = urlparse(absolute)
        query = parse_qs(parsed.query)
        normalized = parsed._replace(fragment="")
        if "page" in query:
            normalized_query = urlencode({"page": query.get("page", [""])[0]})
            normalized = normalized._replace(query=normalized_query)
        return urlunparse(normalized).rstrip("/")

    def _is_valid_listing_page(self, url):
        if not url:
            return False
        lower = url.lower()
        if not lower.startswith("https://afariat.com"):
            return False
        return (
            "/appartements" in lower
            or "/categorie/immobilier/appartements" in lower
        )

    def _extract_page_number(self, url):
        parsed = urlparse(url)
        page = parse_qs(parsed.query).get("page", ["1"])[0]
        try:
            return int(page)
        except ValueError:
            return 1

    def parse(self, response):
        self._response = response

        normalized_page_url = self._normalize_url(response.url)
        if normalized_page_url in self._seen_pages:
            return
        self._seen_pages.add(normalized_page_url)

        page_number = self._extract_page_number(normalized_page_url)
        if page_number > self.max_pages:
            return

        listing_links = response.css("a[href*='/annonce-'][href*='/Immobilier/']::attr(href)").getall()
        new_details = 0
        for href in listing_links:
            url = self._normalize_url(href)
            if not url or not self.DETAIL_RE.search(url):
                continue
            if url in self._seen_listing_urls:
                continue
            self._seen_listing_urls.add(url)
            new_details += 1
            yield response.follow(url, callback=self.parse_detail)

        if new_details == 0:
            self._consecutive_zero_new_pages += 1
        else:
            self._consecutive_zero_new_pages = 0

        if self._consecutive_zero_new_pages >= 3:
            return

        next_links = response.css(
            "a[rel='next']::attr(href), a[href*='?page=']::attr(href), a[href*='&page=']::attr(href), a.pagination-next::attr(href)"
        ).getall()

        emitted_next = False
        for href in next_links:
            next_url = self._normalize_url(href)
            if not self._is_valid_listing_page(next_url):
                continue
            if next_url in self._seen_pages:
                continue
            next_page_number = self._extract_page_number(next_url)
            if next_page_number <= page_number:
                continue
            if next_page_number > self.max_pages:
                continue
            emitted_next = True
            yield response.follow(next_url, callback=self.parse)

        if not emitted_next and page_number < self.max_pages:
            parsed = urlparse(normalized_page_url)
            query = parse_qs(parsed.query)
            query["page"] = [str(page_number + 1)]
            next_query = urlencode({key: values[0] for key, values in query.items()})
            fallback_next = urlunparse(parsed._replace(query=next_query))
            if self._is_valid_listing_page(fallback_next) and fallback_next not in self._seen_pages:
                yield response.follow(fallback_next, callback=self.parse)

    def parse_detail(self, response):
        title = (
            response.css("h1::text").get()
            or response.css("meta[property='og:title']::attr(content)").get()
            or response.css("title::text").get()
        )

        price = response.xpath("normalize-space((//h3[contains(., 'DT')])[1])").get()
        if not price:
            price = response.xpath("normalize-space((//h6[contains(., 'DT')])[1])").get()
        if not price:
            price = None

        location_parts = [
            t.strip()
            for t in response.css("a[href*='/ville/']::text, a[href*='/annonces-']::text").getall()
            if t and t.strip()
        ]
        location = ", ".join(dict.fromkeys(location_parts)) if location_parts else None

        description = (
            response.css("meta[property='og:description']::attr(content)").get()
            or " ".join(t.strip() for t in response.css("p::text").getall() if t.strip())
            or None
        )
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
