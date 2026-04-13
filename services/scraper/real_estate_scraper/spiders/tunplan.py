import scrapy
import re


class TunplanSpider(scrapy.Spider):
    name = "tunplan"
    allowed_domains = ["www.tunplan.com", "tunplan.com"]
    start_urls = [
        "https://tunplan.com/index.php/listing-category/immobilier/",
    ]

    _real_estate_category_slugs = {
        "immobilier",
        "ventes-immobilieres",
        "locations",
        "bureaux-commerces",
        "terrain",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._seen_pages = set()
        self._seen_details = set()

    def parse(self, response):
        self._seen_pages.add(response.url)

        for href in response.css("a[href*='/index.php/listing/']::attr(href)").getall():
            detail_url = response.urljoin(href)
            if detail_url in self._seen_details:
                continue
            self._seen_details.add(detail_url)
            yield response.follow(detail_url, callback=self.parse_detail)

        for href in response.css("a[href*='/index.php/listing-category/']::attr(href)").getall():
            next_url = response.urljoin(href)
            slug_match = re.search(r"/index\.php/listing-category/([^/]+)/?", next_url, flags=re.IGNORECASE)
            if not slug_match:
                continue
            slug = slug_match.group(1).lower()
            if slug not in self._real_estate_category_slugs:
                continue
            if next_url in self._seen_pages:
                continue
            self._seen_pages.add(next_url)
            yield response.follow(next_url, callback=self.parse)

    def parse_detail(self, response):
        title = response.xpath("normalize-space(//h1)").get()
        if isinstance(title, str):
            title = re.sub(r"\s+", " ", title).strip()

        visible_text = " ".join(
            t.strip()
            for t in response.xpath("//body//*[not(self::script) and not(self::style)]/text()").getall()
            if t and t.strip()
        )
        visible_text = re.sub(r"\s+", " ", visible_text)
        main_block = visible_text.split("Annonces similaires", 1)[0]

        price = None
        price_section_match = re.search(
            r"Prix\s*\(\s*DT\s*\)\s*:\s*(.*?)(?:R[eé]pondre\s+[aà]\s+l['’]annonce|Membre\s+depuis|Annonces\s+similaires|Tunplan\.com:|$)",
            main_block,
            flags=re.IGNORECASE,
        )
        if price_section_match:
            price_section = price_section_match.group(1)
            price_section = re.sub(r"\b\d{2}(?:\s*\d{3}){2,}\b", " ", price_section)
            price_section = re.sub(r"\b\d+\s*\(\s*m2\s*\)", " ", price_section, flags=re.IGNORECASE)
            amount_match = re.search(r"([0-9][0-9\s.,]*)", price_section)
            if amount_match:
                price = f"{amount_match.group(1).strip()} DT"

        location = None
        location_match = re.search(r"D[eé]tails\s+(.*?)\s+Prix\s*\(\s*DT\s*\)", main_block, flags=re.IGNORECASE)
        if location_match:
            location = re.sub(r"\s+", " ", location_match.group(1)).strip()

        description = response.css("meta[property='og:description']::attr(content)").get()
        if isinstance(description, str):
            description = re.sub(r"\s+", " ", description).strip()
        if not description:
            desc_match = re.search(
                r"Prix\s*\(\s*DT\s*\)\s*:\s*[0-9\s.,]+\s+[0-9\s]{6,}\s+(.*?)\s+R[eé]pondre\s+[aà]\s+l['’]annonce",
                main_block,
                flags=re.IGNORECASE,
            )
            if desc_match:
                description = re.sub(r"\s+", " ", desc_match.group(1)).strip()
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
