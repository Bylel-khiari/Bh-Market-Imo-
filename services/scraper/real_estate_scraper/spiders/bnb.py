import scrapy

from real_estate_scraper.image_extraction import extract_listing_images, first_image
from real_estate_scraper.source_dates import extract_source_date_from_response


class BnbSpider(scrapy.Spider):
    name = "bnb"
    allowed_domains = ["bnb.tn"]
    start_urls = ["https://www.bnb.tn/contract/vente/"]
    custom_settings = {
        "ROBOTSTXT_OBEY": False,
        "CONCURRENT_REQUESTS": 20,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 10,
        "DOWNLOAD_DELAY": 0.1,
        "AUTOTHROTTLE_ENABLED": True,
        "AUTOTHROTTLE_TARGET_CONCURRENCY": 6.0,
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._seen_pages = set()
        self._seen_details = set()

    def parse(self, response):
        self._seen_pages.add(response.url)

        # Follow pagination only inside the vente section.
        for href in response.css("a.page-numbers::attr(href), a.next::attr(href), a[href*='/contract/vente/page/']::attr(href)").getall():
            url = response.urljoin(href)
            if "/contract/vente/page/" in url:
                if url in self._seen_pages:
                    continue
                self._seen_pages.add(url)
                yield response.follow(url, callback=self.parse)

        # Extract detail links from listing cards only (faster than broad site discovery).
        detail_selectors = [
            ".property-item a::attr(href)",
            ".property-wrap a::attr(href)",
            ".listing-item a::attr(href)",
            "article a::attr(href)",
        ]
        detail_links = []
        for selector in detail_selectors:
            detail_links.extend(response.css(selector).getall())

        for href in detail_links:
            url = response.urljoin(href)
            clean = url.rstrip("/")
            if not clean.startswith("https://www.bnb.tn/properties/"):
                continue
            if clean in {"https://www.bnb.tn/properties", "https://www.bnb.tn/properties/page"}:
                continue
            if "/properties/page/" in clean or "?" in clean:
                continue
            if clean in self._seen_details:
                continue
            self._seen_details.add(clean)
            yield response.follow(url, callback=self.parse_detail)

    def parse_detail(self, response):
        title = response.css("h1[itemprop='name']::text").get() or response.css("h1::text").get()
        price = " ".join(t.strip() for t in response.css(".property-price::text").getall() if t.strip()) or None
        location = " ".join(t.strip() for t in response.css(".property-detail-subtitle a::text").getall() if t.strip()) or None
        images = extract_listing_images(response)

        description = (
            response.css("meta[property='og:description']::attr(content)").get()
            or response.css("meta[name='description']::attr(content)").get()
        )

        if not description:
            description = " ".join(
                t.strip()
                for t in response.xpath(
                    "//h2[contains(normalize-space(.), 'Description')]/following::*[self::p or self::div][1]//text()"
                ).getall()
                if t.strip()
            ) or None

        yield {
            "title": title.strip() if isinstance(title, str) else title,
            "price": price,
            "location": location,
            "description": description.strip() if isinstance(description, str) else description,
            "image": first_image(images),
            "images": images,
            "url": response.url,
            "source_published_at": extract_source_date_from_response(response),
        }
