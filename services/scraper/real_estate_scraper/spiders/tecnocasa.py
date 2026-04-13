import scrapy
import re
import html


class TecnocasaSpider(scrapy.Spider):
    name = "tecnocasa"
    allowed_domains = ["www.tecnocasa.tn", "tecnocasa.tn"]
    start_urls = [
        "https://www.tecnocasa.tn/vendre/immeubles/nord-est-ne/grand-tunis.html",
    ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._seen_pages = set()
        self._seen_details = set()

    def parse(self, response):
        self._seen_pages.add(response.url)

        encoded_urls = re.findall(
            r'&quot;detail_url&quot;:&quot;(https:\\/\\/www\.tecnocasa\.tn\\/vendre\\/[^&]+?\.html)&quot;',
            response.text,
            flags=re.IGNORECASE,
        )
        for raw_url in encoded_urls:
            detail_url = html.unescape(raw_url).replace("\\/", "/")
            if detail_url in self._seen_details:
                continue
            self._seen_details.add(detail_url)
            yield response.follow(detail_url, callback=self.parse_detail)

        for href in response.css("a[href*='/vendre/immeubles/']::attr(href)").getall():
            next_url = response.urljoin(href)
            if "/vendre/immeubles/" not in next_url:
                continue
            if next_url in self._seen_pages:
                continue
            self._seen_pages.add(next_url)
            yield response.follow(next_url, callback=self.parse)

    def parse_detail(self, response):
        title = response.css("h1::text").get()
        if isinstance(title, str):
            title = re.sub(r"\s+", " ", title).strip()

        location = response.css("h2::text").get()
        if isinstance(location, str):
            location = re.sub(r"\s+", " ", location).strip()

        og_title = response.css("meta[property='og:title']::attr(content)").get()
        if isinstance(og_title, str):
            og_title = re.sub(r"\s+", " ", og_title).strip()

        price = None
        if og_title:
            og_price_match = re.search(r"([0-9][0-9\s.,]*)\s*(DT|TND|EUR)", og_title, flags=re.IGNORECASE)
            if og_price_match:
                amount = og_price_match.group(1).strip()
                currency = og_price_match.group(2).upper()
                price = f"{amount} {currency}"

        if not price:
            page_text = " ".join(
                t.strip()
                for t in response.xpath("//body//*[not(self::script) and not(self::style)]/text()").getall()
                if t and t.strip()
            )
            page_text = re.sub(r"\s+", " ", page_text)
            text_price_match = re.search(r"Prix:\s*([0-9][0-9\s.,]*)\s*(DT|TND|EUR)", page_text, flags=re.IGNORECASE)
            if text_price_match:
                amount = text_price_match.group(1).strip()
                currency = text_price_match.group(2).upper()
                price = f"{amount} {currency}"

        description = response.css("meta[property='og:description']::attr(content)").get()
        if not description:
            description = response.css("meta[name='description']::attr(content)").get()
        if isinstance(description, str):
            description = re.sub(r"\s+", " ", description).strip()

        if not description:
            page_text = " ".join(
                t.strip()
                for t in response.xpath("//body//*[not(self::script) and not(self::style)]/text()").getall()
                if t and t.strip()
            )
            page_text = re.sub(r"\s+", " ", page_text)
            if isinstance(location, str) and location in page_text:
                start = page_text.find(location) + len(location)
                end = page_text.find("REF.:")
                if end > start:
                    description = page_text[start:end].strip()
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
