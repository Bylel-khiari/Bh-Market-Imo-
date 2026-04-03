import json

import scrapy


class TayaraSpider(scrapy.Spider):
    name = "tayara"
    allowed_domains = ["tayara.tn"]
    start_urls = ["https://www.tayara.tn/ads/c/Immobilier/"]

    def parse(self, response):
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
        seen_ids = set()

        for ad in ads:
            ad_id = ad.get("id")
            if ad_id in seen_ids:
                continue
            seen_ids.add(ad_id)

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

            yield {
                "title": ad.get("title"),
                "price": str(ad.get("price")) if ad.get("price") is not None else None,
                "location": location or None,
                "description": ad.get("description"),
                "image": image,
                "url": response.url,
            }
