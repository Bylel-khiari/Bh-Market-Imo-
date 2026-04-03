import re

import scrapy


class MubawabSpider(scrapy.Spider):
    name = "mubawab"
    allowed_domains = ["mubawab.tn"]
    start_urls = ["https://www.mubawab.tn/fr/"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._seen_pages = set()
        self._seen_details = set()

    def parse(self, response):
        self._seen_pages.add(response.url)

        cards = response.css(".listingBox")
        for card in cards:
            url = card.css(".listingTit a::attr(href)").get()
            if url:
                detail_url = response.urljoin(url)
                if detail_url in self._seen_details:
                    continue
                self._seen_details.add(detail_url)
                yield response.follow(detail_url, callback=self.parse_detail)

        hrefs = response.css("a::attr(href)").getall()
        for href in hrefs:
            link = href.lower()
            if "/fr/a/" in link or "/fr/sc/" in link or "/fr/st/" in link:
                next_url = response.urljoin(href)
                if next_url in self._seen_pages:
                    continue
                self._seen_pages.add(next_url)
                yield response.follow(next_url, callback=self.parse)

        # Mubawab stores pagination URLs inside script text (e.g. :p:2).
        body = response.text
        paginated = set(re.findall(r"https://www\\.mubawab\\.tn/fr/sc/[^\"&\\s]+:p:\\d+", body))
        for url in paginated:
            if url in self._seen_pages:
                continue
            self._seen_pages.add(url)
            yield response.follow(url, callback=self.parse)

    def parse_detail(self, response):
        title = (
            response.css("h1::text").get()
            or response.css("meta[property='og:title']::attr(content)").get()
            or response.css("title::text").get()
        )
        description = (
            response.css("meta[property='og:description']::attr(content)").get()
            or " ".join(t.strip() for t in response.css("p::text").getall() if t.strip())
        )
        price = " ".join(t.strip() for t in response.css(".orangeTit::text, .priceTag::text").getall() if t.strip()) or None

        darkblue_parts = [
            t.strip()
            for t in response.css(".darkblue::text").getall()
            if t and t.strip()
        ]
        filtered = []
        for part in darkblue_parts:
            lower = part.lower()
            if lower in {"se connecter", "favori", "partager", "appelez", "voir la carte"}:
                continue
            if lower.startswith("immobilier"):
                continue
            filtered.append(part)
        location = filtered[-1] if filtered else None
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
