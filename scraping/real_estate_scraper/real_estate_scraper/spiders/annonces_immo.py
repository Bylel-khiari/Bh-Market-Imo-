import scrapy
import json


class AnnoncesImmoSpider(scrapy.Spider):
    name = "annonces_immo"
    allowed_domains = ["annonces-immobilieres.tn"]
    start_urls = ["https://annonces-immobilieres.tn/annonces"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._seen_pages = set()
        self._seen_listings = set()

    def parse(self, response):
        self._seen_pages.add(response.url)

        for href in response.css("a[href*='/annonce/details/']::attr(href)").getall():
            detail_url = response.urljoin(href)
            if detail_url in self._seen_listings:
                continue
            self._seen_listings.add(detail_url)
            yield response.follow(detail_url, callback=self.parse_detail)

        # Follow numeric pagination pages (e.g. /annonces/2).
        for href in response.css("a[href]::attr(href)").getall():
            if not href:
                continue
            if "/annonces/" not in href:
                continue

            next_page = response.urljoin(href)
            if next_page in self._seen_pages:
                continue
            self._seen_pages.add(next_page)
            yield response.follow(next_page, callback=self.parse)

    def parse_detail(self, response):
        title = None
        price = None
        location = None
        description = None

        # Primary extraction from structured data.
        for script in response.css("script[type='application/ld+json']::text").getall():
            try:
                payload = json.loads(script)
            except json.JSONDecodeError:
                continue

            if not isinstance(payload, dict):
                continue

            title = title or payload.get("name")
            description = description or payload.get("description")

            raw_price = payload.get("price")
            currency = payload.get("priceCurrency")
            if raw_price is not None:
                if currency:
                    price = f"{raw_price} {currency}"
                else:
                    price = str(raw_price)

            locality = (
                payload.get("itemOffered", {})
                .get("address", {})
                .get("addressLocality")
            )
            if locality:
                location = locality

            if title and price and description and location:
                break

        # Fallback extraction from page markup.
        title = title or response.css("h1::text").get() or response.css("title::text").get()

        if not price:
            price_text = response.xpath("normalize-space((//*[contains(., 'DT') or contains(., 'TND')])[1])").get()
            if price_text:
                price = " ".join(price_text.split())

        if not location:
            locality = response.css("a[href*='/annonces/region/']::text").get()
            location = locality.strip() if isinstance(locality, str) else locality

        if not description:
            description = " ".join(t.strip() for t in response.css("p::text").getall() if t.strip()) or None

        yield {
            "title": title.strip() if isinstance(title, str) else title,
            "price": price,
            "location": location,
            "description": description.strip() if isinstance(description, str) else description,
            "url": response.url,
        }
