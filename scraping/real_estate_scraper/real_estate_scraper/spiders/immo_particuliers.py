import scrapy
import re


class ImmoParticuliersSpider(scrapy.Spider):
    name = "immo_particuliers"
    allowed_domains = ["tunisie.immo-entre-particuliers.com"]
    start_urls = [
        "https://tunisie.immo-entre-particuliers.com/annonces/",
    ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._seen_pages = set()
        self._seen_details = set()

    def parse(self, response):
        self._seen_pages.add(response.url)

        for href in response.css("a[href*='/annonce-tunisie/']::attr(href)").getall():
            detail_url = response.urljoin(href)
            if detail_url in self._seen_details:
                continue
            self._seen_details.add(detail_url)
            yield response.follow(detail_url, callback=self.parse_detail)

        for href in response.css("a[href*='/annonces/']::attr(href)").getall():
            next_url = response.urljoin(href)
            if "/annonce-tunisie/" in next_url:
                continue
            if next_url in self._seen_pages:
                continue
            self._seen_pages.add(next_url)
            yield response.follow(next_url, callback=self.parse)

    def parse_detail(self, response):
        title = (
            response.css("meta[property='og:title']::attr(content)").get()
            or response.css("h1::text").get()
            or response.css("title::text").get()
        )
        if isinstance(title, str):
            title = re.sub(r"\s+", " ", title).strip()

        visible_text = " ".join(
            t.strip()
            for t in response.xpath("//body//*[not(self::script) and not(self::style)]/text()").getall()
            if t and t.strip()
        )
        visible_text = re.sub(r"\s+", " ", visible_text)
        top_block = visible_text.split("CARACT", 1)[0]

        price = None
        eur_match = re.search(r"([0-9][0-9\s.,]*)\s*€", top_block)
        if not eur_match:
            eur_match = re.search(r"€\s*([0-9][0-9\s.,]*)", top_block)
        if eur_match:
            price = f"{eur_match.group(1).strip()} EUR"
        else:
            tnd_match = re.search(r"([0-9][0-9\s.,]*)\s*TND", top_block, flags=re.IGNORECASE)
            if tnd_match:
                price = f"{tnd_match.group(1).strip()} TND"

        location = "Tunisie"

        description = None
        desc_match = re.search(r"Description\s+(.*?)\s+Aper[çc]u", visible_text, flags=re.IGNORECASE)
        if desc_match:
            description = desc_match.group(1)
        if not description:
            description = response.css("meta[property='og:description']::attr(content)").get()
        if isinstance(description, str):
            description = re.sub(r"\s+", " ", description).strip()
        image = (
            response.css("meta[property='og:image']::attr(content)").get()
            or response.css("meta[name='twitter:image']::attr(content)").get()
            or response.css("img::attr(src)").get()
        )

        yield {
            "title": title,
            "price": price,
            "location": location,
            "description": description,
            "image": response.urljoin(image.strip()) if isinstance(image, str) and image.strip() else None,
            "url": response.url,
        }
