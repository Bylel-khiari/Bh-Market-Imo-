import scrapy
import re


class TunisiapromoSpider(scrapy.Spider):
    name = "tunisiapromo"
    allowed_domains = ["www.tunisiapromo.com", "tunisiapromo.com"]
    start_urls = ["https://www.tunisiapromo.com/"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._seen_pages = set()
        self._seen_details = set()

    def parse(self, response):
        self._seen_pages.add(response.url)

        detail_matches = re.findall(
            r'href\s*=\s*["\']?([^"\'\s>]*annonce/[^"\'\s>]+-z\d+\.html)',
            response.text,
            flags=re.IGNORECASE,
        )
        for href in detail_matches:
            detail_url = response.urljoin(href)
            if detail_url in self._seen_details:
                continue
            self._seen_details.add(detail_url)
            yield response.follow(detail_url, callback=self.parse_detail)

        pagination_matches = re.findall(
            r'href\s*=\s*["\']?([^"\'\s>]*nouvelles-pp\d+/?)',
            response.text,
            flags=re.IGNORECASE,
        )
        for href in pagination_matches:
            next_url = response.urljoin(href)
            if next_url in self._seen_pages:
                continue
            self._seen_pages.add(next_url)
            yield response.follow(next_url, callback=self.parse)

    def parse_detail(self, response):
        title = response.css("h1::text").get()
        if not title:
            title = response.css("title::text").get()
            if isinstance(title, str):
                title = title.split(" - ", 1)[0]
        if isinstance(title, str):
            title = re.sub(r"\s+", " ", title).strip()

        visible_text = " ".join(
            t.strip()
            for t in response.xpath("//body//*[not(self::script) and not(self::style)]/text()").getall()
            if t and t.strip()
        )
        visible_text = re.sub(r"\s+", " ", visible_text)

        price = None
        price_match = re.search(r"Prix\s*:\s*([0-9][0-9\s.,]*)\s*(DT|TND|EUR)", visible_text, flags=re.IGNORECASE)
        if price_match:
            amount = price_match.group(1).strip()
            currency = price_match.group(2).upper()
            price = f"{amount} {currency}"

        location = None
        location_match = re.search(
            r"Adresse\s*:\s*(.*?)\s+(?:Villa|Appartement|Maison|Terrain|Bureau|Local|Studio|Duplex|Immeuble|Ferme|Fond)\s+[aà]\s+(?:vendre|louer)",
            visible_text,
            flags=re.IGNORECASE,
        )
        if location_match:
            location = re.sub(r"\s+", " ", location_match.group(1)).strip()

        description = response.css("meta[name='description']::attr(content)").get()
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
