import json

import scrapy


class TayaraSpider(scrapy.Spider):
    name = "tayara"
    allowed_domains = ["tayara.tn"]
    start_urls = ["https://www.tayara.tn/ads/c/Immobilier/"]

    def __init__(self, max_pages=200, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.max_pages = max(1, int(max_pages))
        self._seen_pages = set()
        self._seen_ids = set()

    def _normalize_url(self, response, value):
        if not value:
            return None
        return response.urljoin(str(value)).split("#", 1)[0]

    def _extract_listing_url(self, ad):
        return (
            ad.get("url")
            or ad.get("slug")
            or ad.get("link")
            or ad.get("canonicalUrl")
        )

    def _extract_next_page_url(self, response, listing_action):
        candidate = listing_action.get("nextPage") or listing_action.get("next")
        if isinstance(candidate, str) and candidate.strip():
            return self._normalize_url(response, candidate.strip())

        current_page = listing_action.get("page") or listing_action.get("currentPage")
        total_pages = listing_action.get("totalPages") or listing_action.get("lastPage")
        try:
            current_page = int(current_page)
            total_pages = int(total_pages)
        except (TypeError, ValueError):
            return None

        if current_page >= total_pages:
            return None
        if current_page + 1 > self.max_pages:
            return None

        parsed_url = response.url.split("?", 1)[0]
        return f"{parsed_url}?page={current_page + 1}"

    def parse(self, response):
        normalized_page_url = self._normalize_url(response, response.url)
        if normalized_page_url in self._seen_pages:
            return
        self._seen_pages.add(normalized_page_url)

        next_data_text = response.css("script#__NEXT_DATA__::text").get()
        if not next_data_text:
            self.logger.warning("No __NEXT_DATA__ payload found on %s", response.url)
            return

        try:
            payload = json.loads(next_data_text)
        except json.JSONDecodeError:
            self.logger.warning("Could not decode __NEXT_DATA__ payload on %s", response.url)
            return

        listing_action = (
            payload.get("props", {})
            .get("pageProps", {})
            .get("searchedListingsAction", {})
        )
        ads = listing_action.get("newHits", []) + listing_action.get("premiumHits", [])

        for ad in ads:
            ad_id = ad.get("id")
            if ad_id is not None and ad_id in self._seen_ids:
                continue
            if ad_id is not None:
                self._seen_ids.add(ad_id)

            location_data = ad.get("location") or {}
            governorate = location_data.get("governorate")
            delegation = location_data.get("delegation")
            location = ", ".join([part for part in [delegation, governorate] if part])
            image = (
                ad.get("image")
                or ad.get("imageUrl")
                or ad.get("thumbnail")
                or ad.get("thumbnailUrl")
            )
            if not image:
                images = ad.get("images")
                if isinstance(images, list) and images:
                    first = images[0]
                    if isinstance(first, dict):
                        image = first.get("url") or first.get("src")
                    elif isinstance(first, str):
                        image = first

            ad_url = self._normalize_url(response, self._extract_listing_url(ad))
            if not ad_url and ad_id is not None:
                ad_url = self._normalize_url(response, f"/item/{ad_id}")
            if not ad_url:
                ad_url = response.url

            yield {
                "title": ad.get("title"),
                "price": str(ad.get("price")) if ad.get("price") is not None else None,
                "location": location or None,
                "description": ad.get("description"),
                "image": image,
                "url": ad_url,
                "listing_id": str(ad_id) if ad_id is not None else None,
            }

        next_page_url = self._extract_next_page_url(response, listing_action)
        if next_page_url and next_page_url not in self._seen_pages:
            yield response.follow(next_page_url, callback=self.parse)
