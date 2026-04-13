import scrapy
import re


class ImmobilierTnSpider(scrapy.Spider):
    name = "immobilier_tn"
    allowed_domains = ["www.immobilier.com.tn", "immobilier.com.tn"]
    start_urls = [
        "https://www.immobilier.com.tn/annonces/particulier/vente/1",
        "https://www.immobilier.com.tn/annonces/particulier/location/2",
    ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._seen_pages = set()
        self._seen_details = set()

    def parse(self, response):
        self._seen_pages.add(response.url)

        for href in response.css("a[href*='/annonce/']::attr(href)").getall():
            detail_url = response.urljoin(href)
            if not re.search(r"/annonce/\d+", detail_url):
                continue
            if detail_url in self._seen_details:
                continue
            self._seen_details.add(detail_url)
            yield response.follow(detail_url, callback=self.parse_detail)

        for href in response.css("a[href*='/annonces/particulier/']::attr(href)").getall():
            next_url = response.urljoin(href)
            if "/annonce/" in next_url:
                continue
            if next_url in self._seen_pages:
                continue
            self._seen_pages.add(next_url)
            yield response.follow(next_url, callback=self.parse)

    def parse_detail(self, response):
        title_parts = [
            re.sub(r"\s+", " ", t).strip()
            for t in response.xpath("//*[contains(@class,'title')]//text()").getall()
            if t and t.strip()
        ]

        title = title_parts[0] if title_parts else None
        if not title:
            title = response.css("title::text").get()
            if isinstance(title, str):
                title = re.sub(r"\s+", " ", title).strip()

        location = None
        if len(title_parts) > 1:
            location = title_parts[1]

        if not location:
            location = response.css("meta[property='og:locality']::attr(content)").get()
        if isinstance(location, str):
            location = re.sub(r"\s+", " ", location).strip()

        price_bits = [
            re.sub(r"\s+", " ", t).strip()
            for t in response.xpath("//*[contains(@class,'price')]//text()").getall()
            if t and t.strip()
        ]

        price = None
        if price_bits:
            joined_price = " ".join(price_bits)
            dt_match = re.search(r"([0-9][0-9\s.,]*)\s*DT", joined_price, flags=re.IGNORECASE)
            if dt_match:
                price = f"{dt_match.group(1).strip()} DT"
            else:
                tnd_match = re.search(r"([0-9][0-9\s.,]*)\s*TND", joined_price, flags=re.IGNORECASE)
                if tnd_match:
                    price = f"{tnd_match.group(1).strip()} TND"

        description = response.xpath("normalize-space(//*[contains(@class,'description')])").get()
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
