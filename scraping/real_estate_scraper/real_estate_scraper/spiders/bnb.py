import scrapy


class BnbSpider(scrapy.Spider):
    name = "bnb"
    allowed_domains = ["bnb.tn"]
    start_urls = ["https://www.bnb.tn/properties/"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._seen_pages = set()
        self._seen_details = set()

    def parse(self, response):
        self._seen_pages.add(response.url)

        for href in response.css("a[href*='/properties/']::attr(href)").getall():
            url = response.urljoin(href)
            if "/properties/page/" in url:
                if url in self._seen_pages:
                    continue
                self._seen_pages.add(url)
                yield response.follow(url, callback=self.parse)
                continue

            # Keep only detail pages (exclude listing root and filtered URLs).
            if not url.rstrip("/").startswith("https://www.bnb.tn/properties/"):
                continue
            if url.rstrip("/") == "https://www.bnb.tn/properties":
                continue
            if "?" in url:
                continue

            if url in self._seen_details:
                continue
            self._seen_details.add(url)
            yield response.follow(url, callback=self.parse_detail)

    def parse_detail(self, response):
        title = response.css("h1[itemprop='name']::text").get() or response.css("h1::text").get()
        price = " ".join(t.strip() for t in response.css(".property-price::text").getall() if t.strip()) or None
        location = " ".join(t.strip() for t in response.css(".property-detail-subtitle a::text").getall() if t.strip()) or None

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
            "url": response.url,
        }
