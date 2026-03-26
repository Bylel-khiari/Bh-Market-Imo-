import scrapy
import json
import re


class ImmobiliereSallouhaSpider(scrapy.Spider):
    name = "immobiliere_sallouha"
    allowed_domains = ["www.immobilieresallouha.com", "immobilieresallouha.com"]
    start_urls = [
        "https://www.immobilieresallouha.com/properties",
        "https://www.immobilieresallouha.com/",
    ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._seen_pages = set()
        self._seen_details = set()

    def parse(self, response):
        self._seen_pages.add(response.url)

        for href in response.css("a[href*='/properties/']::attr(href)").getall():
            detail_url = response.urljoin(href)
            if not re.search(r"/properties/[a-zA-Z0-9_-]+", detail_url):
                continue
            if detail_url.endswith("/properties"):
                continue
            if "/properties?" in detail_url:
                continue
            if detail_url in self._seen_details:
                continue
            self._seen_details.add(detail_url)
            yield response.follow(detail_url, callback=self.parse_detail)

        for href in response.css("a[href*='/properties']::attr(href)").getall():
            next_url = response.urljoin(href)
            if "/properties/" in next_url and not next_url.endswith("/properties"):
                continue
            if next_url in self._seen_pages:
                continue
            self._seen_pages.add(next_url)
            yield response.follow(next_url, callback=self.parse)

    def parse_detail(self, response):
        title = response.css("h1::text").get()
        if isinstance(title, str):
            title = re.sub(r"\s+", " ", title).strip()

        description = response.css("meta[name='description']::attr(content)").get()
        if not description:
            description = response.xpath("normalize-space(//*[contains(text(),'Description')]/following::*[1])").get()
        if isinstance(description, str):
            description = re.sub(r"\s+", " ", description).strip()

        location = None
        if isinstance(title, str):
            loc_match = re.search(r"[-–]\s*([^\-–]+,[^\-–]+)$", title)
            if loc_match:
                location = loc_match.group(1).strip()

        if not location:
            visible_text = " ".join(
                t.strip()
                for t in response.xpath("//body//*[not(self::script) and not(self::style)]/text()").getall()
                if t and t.strip()
            )
            visible_text = re.sub(r"\s+", " ", visible_text)
            loc_from_text = re.search(r"\b([A-Za-zÀ-ÿ'\-\s]+,\s*[A-Za-zÀ-ÿ'\-\s]+)\b", visible_text)
            if loc_from_text:
                location = loc_from_text.group(1).strip()

        price = None
        jsonld_blocks = response.xpath("//script[@type='application/ld+json']/text()").getall()
        for raw in jsonld_blocks:
            try:
                data = json.loads(raw)
            except Exception:
                continue
            if not isinstance(data, dict):
                continue
            if data.get("@type") != "Product":
                continue
            offers = data.get("offers")
            if isinstance(offers, dict):
                raw_price = offers.get("price")
                currency = offers.get("priceCurrency")
                if raw_price not in (None, "", "0", 0):
                    raw_price = re.sub(r"\s+", " ", str(raw_price)).strip()
                    if currency:
                        price = f"{raw_price} {str(currency).strip()}"
                    else:
                        price = raw_price
            break

        if not price:
            page_text = " ".join(
                t.strip()
                for t in response.xpath("//body//*[not(self::script) and not(self::style)]/text()").getall()
                if t and t.strip()
            )
            page_text = re.sub(r"\s+", " ", page_text)
            if "Contacter pour le prix" in page_text:
                price = "Contacter pour le prix"
            else:
                match = re.search(r"([0-9][0-9\s.,]*)\s*(DT|TND|EUR)", page_text, flags=re.IGNORECASE)
                if match:
                    amount = match.group(1).strip()
                    currency = match.group(2).upper()
                    price = f"{amount} {currency}"

        yield {
            "title": title,
            "price": price,
            "location": location,
            "description": description,
            "url": response.url,
        }
