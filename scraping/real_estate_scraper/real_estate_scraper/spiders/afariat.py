import scrapy


class AfariatSpider(scrapy.Spider):
    name = "afariat"
    allowed_domains = ["afariat.com"]
    start_urls = ["https://afariat.com/appartements"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._seen_listing_urls = set()
        self._seen_pages = set()

    def parse(self, response):
        self._seen_pages.add(response.url)

        listing_links = response.css("a[href*='/annonce-'][href*='/Immobilier/']::attr(href)").getall()
        for href in listing_links:
            url = response.urljoin(href)
            if url in self._seen_listing_urls:
                continue
            self._seen_listing_urls.add(url)
            yield response.follow(url, callback=self.parse_detail)

        # Follow additional listing pages for the same category.
        for href in response.css("a::attr(href)").getall():
            if not href:
                continue

            href_lower = href.lower()
            is_listing_page = (
                "/appartements" in href_lower
                or "/categorie/immobilier/appartements" in href_lower
                or "charger-plus" in href_lower
            )

            if not is_listing_page:
                continue

            next_url = response.urljoin(href)
            if next_url in self._seen_pages:
                continue
            self._seen_pages.add(next_url)
            yield response.follow(next_url, callback=self.parse)

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

        yield {
            "title": title.strip() if isinstance(title, str) else title,
            "price": price,
            "location": location,
            "description": description.strip() if isinstance(description, str) else description,
            "url": response.url,
        }
