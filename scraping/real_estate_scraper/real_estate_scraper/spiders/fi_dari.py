import scrapy
import re


class FiDariSpider(scrapy.Spider):
    name = "fi_dari"
    allowed_domains = ["fi-dari.tn"]
    start_urls = [
        "https://fi-dari.tn/sitemap.xml",
        "https://fi-dari.tn/en/immobilier/neuf",
    ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._seen_pages = set()
        self._seen_details = set()

    def parse(self, response):
        self._seen_pages.add(response.url)

        # Fi-Dari listing pages are heavily JS-rendered. The sitemap contains
        # server-side project detail URLs that can be crawled reliably.
        if "sitemap.xml" in response.url:
            for loc in response.xpath("//*[local-name()='loc']/text()").getall():
                if "/en/projet/" not in loc:
                    continue
                if loc in self._seen_details:
                    continue
                self._seen_details.add(loc)
                yield response.follow(loc, callback=self.parse_detail)

        for href in response.css("a[href*='/en/bien/']::attr(href)").getall():
            detail_url = response.urljoin(href)
            if detail_url in self._seen_details:
                continue
            self._seen_details.add(detail_url)
            yield response.follow(detail_url, callback=self.parse_detail)

        for href in response.css("a[href*='/en/projet/']::attr(href)").getall():
            detail_url = response.urljoin(href)
            if detail_url in self._seen_details:
                continue
            self._seen_details.add(detail_url)
            yield response.follow(detail_url, callback=self.parse_detail)

        # Some pages are loaded with query-string pagination.
        for href in response.css("a[href]::attr(href)").getall():
            if not href:
                continue
            next_url = response.urljoin(href)
            if "/en/buy" not in next_url and "/en/rent" not in next_url and "/en/immobilier/neuf" not in next_url:
                continue
            if "/en/bien/" in next_url:
                continue
            if next_url in self._seen_pages:
                continue
            self._seen_pages.add(next_url)
            yield response.follow(next_url, callback=self.parse)

    def parse_detail(self, response):
        title = response.css("meta[property='og:title']::attr(content)").get() or response.css("h1::text").get()
        if isinstance(title, str):
            title = title.replace("| Fidari", "").strip()

        # Ignore script/style text nodes to avoid Next.js hydration payload noise.
        visible_text = " ".join(
            t.strip()
            for t in response.xpath("//body//*[not(self::script) and not(self::style)]/text()").getall()
            if t and t.strip()
        )
        visible_text = re.sub(r"\s+", " ", visible_text)

        price = None
        price_patterns = [
            r"Starting\s+from\s*([0-9][0-9\s.,]*\s*TND)",
            r"Prix\s*[:\-]?\s*([0-9][0-9\s.,]*\s*TND)",
            r"Price\s*[:\-]?\s*([0-9][0-9\s.,]*\s*TND)",
            r"([0-9][0-9\s.,]*\s*TND)",
        ]
        for pattern in price_patterns:
            match = re.search(pattern, visible_text, flags=re.IGNORECASE)
            if match:
                price = re.sub(r"\s+", " ", match.group(1)).strip()
                break

        lower_visible_text = visible_text.lower()
        if not price and (
            "price on request" in lower_visible_text
            or "price upon request" in lower_visible_text
            or "prix sur demande" in lower_visible_text
        ):
            price = "Price on request"

        location = None
        if isinstance(title, str):
            if " - " in title:
                location = title.split(" - ", 1)[1].strip()
            elif "-" in title:
                location = title.split("-", 1)[1].strip()

        description = (
            response.css("meta[property='og:description']::attr(content)").get()
            or response.css("meta[name='description']::attr(content)").get()
        )
        if not description:
            description = " ".join(t.strip() for t in response.css("p::text").getall() if t.strip()) or None

        yield {
            "title": title.strip() if isinstance(title, str) else title,
            "price": price.strip() if isinstance(price, str) else price,
            "location": location,
            "description": description.strip() if isinstance(description, str) else description,
            "url": response.url,
        }
