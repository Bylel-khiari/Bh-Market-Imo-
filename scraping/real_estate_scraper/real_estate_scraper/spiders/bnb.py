import json

import scrapy


class BnbSpider(scrapy.Spider):
    name = "bnb"
    allowed_domains = ["bnb.tn"]
    start_urls = ["https://www.bnb.tn/contract/vente/"]
    custom_settings = {
        "ROBOTSTXT_OBEY": False,
        "CONCURRENT_REQUESTS": 32,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 16,
        "DOWNLOAD_DELAY": 0,
        "AUTOTHROTTLE_ENABLED": False,
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._seen_pages = set()

    def parse(self, response):
        self._seen_pages.add(response.url)

        # Follow pagination only inside the vente section.
        for href in response.css("a.page-numbers::attr(href), a.next::attr(href), a[href*='/contract/vente/page/']::attr(href)").getall():
            url = response.urljoin(href)
            if "/contract/vente/page/" in url:
                if url in self._seen_pages:
                    continue
                self._seen_pages.add(url)
                yield response.follow(url, callback=self.parse)

        # Extract detail links from listing cards only (faster than broad site discovery).
        detail_selectors = [
            ".property-item a::attr(href)",
            ".property-wrap a::attr(href)",
            ".listing-item a::attr(href)",
            "article a::attr(href)",
        ]
        detail_links = []
        for selector in detail_selectors:
            detail_links.extend(response.css(selector).getall())

        for href in detail_links:
            url = response.urljoin(href)
            clean = url.rstrip("/")
            if not clean.startswith("https://www.bnb.tn/properties/"):
                continue
            if clean in {"https://www.bnb.tn/properties", "https://www.bnb.tn/properties/page"}:
                continue
            if "/properties/page/" in clean or "?" in clean:
                continue
            yield response.follow(url, callback=self.parse_detail)

    def _extract_image(self, response):
        image = (
            response.css("meta[property='og:image']::attr(content)").get()
            or response.css("meta[name='twitter:image']::attr(content)").get()
            or response.css("meta[itemprop='image']::attr(content)").get()
            or response.css("img[itemprop='image']::attr(src)").get()
            or response.css("img[itemprop='image']::attr(data-src)").get()
            or response.css(".property-gallery img::attr(src)").get()
            or response.css(".property-gallery img::attr(data-src)").get()
            or response.css(".swiper-slide img::attr(src)").get()
            or response.css(".swiper-slide img::attr(data-src)").get()
            or response.css(".property-slider img::attr(src)").get()
            or response.css(".property-slider img::attr(data-src)").get()
            or response.css("article img::attr(src)").get()
            or response.css("article img::attr(data-src)").get()
            or response.css("article img::attr(data-lazy-src)").get()
        )

        if image:
            return response.urljoin(image.strip())

        srcset = (
            response.css(".property-gallery img::attr(srcset)").get()
            or response.css(".swiper-slide img::attr(srcset)").get()
            or response.css("article img::attr(srcset)").get()
        )
        if srcset:
            first_src = srcset.split(",")[0].strip().split(" ")[0].strip()
            if first_src:
                return response.urljoin(first_src)

        for raw in response.css("script[type='application/ld+json']::text").getall():
            raw = (raw or "").strip()
            if not raw:
                continue
            try:
                payload = json.loads(raw)
            except Exception:
                continue

            blocks = payload if isinstance(payload, list) else [payload]
            for block in blocks:
                if not isinstance(block, dict):
                    continue
                candidate = block.get("image")
                if isinstance(candidate, str) and candidate.strip():
                    return response.urljoin(candidate.strip())
                if isinstance(candidate, list) and candidate:
                    first = candidate[0]
                    if isinstance(first, str) and first.strip():
                        return response.urljoin(first.strip())
                    if isinstance(first, dict):
                        nested = first.get("url") or first.get("contentUrl")
                        if isinstance(nested, str) and nested.strip():
                            return response.urljoin(nested.strip())
                if isinstance(candidate, dict):
                    nested = candidate.get("url") or candidate.get("contentUrl")
                    if isinstance(nested, str) and nested.strip():
                        return response.urljoin(nested.strip())

                graph = block.get("@graph")
                if isinstance(graph, list):
                    for node in graph:
                        if not isinstance(node, dict):
                            continue
                        graph_img = node.get("image")
                        if isinstance(graph_img, str) and graph_img.strip():
                            return response.urljoin(graph_img.strip())
                        if isinstance(graph_img, dict):
                            nested = graph_img.get("url") or graph_img.get("contentUrl")
                            if isinstance(nested, str) and nested.strip():
                                return response.urljoin(nested.strip())

        return None

    def parse_detail(self, response):
        title = response.css("h1[itemprop='name']::text").get() or response.css("h1::text").get()
        price = " ".join(t.strip() for t in response.css(".property-price::text").getall() if t.strip()) or None
        location = " ".join(t.strip() for t in response.css(".property-detail-subtitle a::text").getall() if t.strip()) or None
        image = self._extract_image(response)

        description = (
            response.css("meta[property='og:description']::attr(content)").get()
            or response.css("meta[name='description']::attr(content)").get()
        )

        if not description:
            description = " ".join(
                t.strip()
                for t in response.xpath(
                    "//h2[contains(normalize-space(.), 'Description')]/following::*[self::p or self::div][1]//text()"
                ).getall()
                if t.strip()
            ) or None

        yield {
            "title": title.strip() if isinstance(title, str) else title,
            "price": price,
            "location": location,
            "description": description.strip() if isinstance(description, str) else description,
            "image": image,
            "url": response.url,
        }
