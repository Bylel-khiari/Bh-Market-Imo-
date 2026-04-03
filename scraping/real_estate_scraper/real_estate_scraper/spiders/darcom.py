import scrapy


class DarcomSpider(scrapy.Spider):
    name = "darcom"
    allowed_domains = ["darcomtunisia.com"]
    start_urls = [
        "https://www.darcomtunisia.com/louer",
        "https://www.darcomtunisia.com/vente",
        "https://www.darcomtunisia.com/terrain",
        "https://www.darcomtunisia.com/opportunites",
        "https://www.darcomtunisia.com/prestiges",
        "https://www.darcomtunisia.com/bureaux-et-commerces",
    ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._seen_pages = set()
        self._seen_details = set()

    def parse(self, response):
        self._seen_pages.add(response.url)

        for href in response.css("a[href*='/bien/details/']::attr(href)").getall():
            detail_url = response.urljoin(href)
            if detail_url in self._seen_details:
                continue
            self._seen_details.add(detail_url)
            yield response.follow(detail_url, callback=self.parse_detail)

        for href in response.css("a[href]::attr(href)").getall():
            if not href:
                continue

            next_url = response.urljoin(href)
            lower = next_url.lower()
            is_listing_page = (
                "/louer" in lower
                or "/vente" in lower
                or "/terrain" in lower
                or "/opportunites" in lower
                or "/prestiges" in lower
                or "/bureaux-et-commerces" in lower
            )

            if not is_listing_page:
                continue
            if "/bien/details/" in lower:
                continue

            if next_url in self._seen_pages:
                continue
            self._seen_pages.add(next_url)
            yield response.follow(next_url, callback=self.parse)

    def parse_detail(self, response):
        title = response.css("h1.breadcrumbs-title::text").get()
        if not title:
            title = response.css("meta[property='og:title']::attr(content)").get()

        price = response.xpath("normalize-space((//div[contains(@class,'pro-details-condition-inner')]//li[contains(@class,'price')][2])[1])").get()
        if not price:
            price = None

        location = response.xpath(
            "normalize-space((//div[contains(@class,'pro-details-condition-inner')]//p[.//img[contains(@alt,'Localisation')]])[1])"
        ).get()
        if not location:
            location = response.css("h1 .breadcrumbs-sub-title::text").get()
            if isinstance(location, str):
                location = location.replace("\n", " ").strip()

        description = (
            response.css("meta[property='og:description']::attr(content)").get()
            or response.css("meta[name='description']::attr(content)").get()
        )
        if not description:
            description = " ".join(
                t.strip()
                for t in response.css(".pro-details-description *::text").getall()
                if t.strip()
            ) or None
        image = (
            response.css("meta[property='og:image']::attr(content)").get()
            or response.css("meta[name='twitter:image']::attr(content)").get()
            or response.css(".pro-details-slider img::attr(src)").get()
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
