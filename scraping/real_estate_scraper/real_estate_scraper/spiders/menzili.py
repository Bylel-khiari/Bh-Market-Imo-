import re
from datetime import datetime, timedelta
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

import mysql.connector
import scrapy


class MenziliSpider(scrapy.Spider):
    name = "menzili"
    allowed_domains = ["menzili.tn", "www.menzili.tn"]
    custom_settings = {
        "CONCURRENT_REQUESTS": 16,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 8,
        "DOWNLOAD_DELAY": 0.2,
        "AUTOTHROTTLE_ENABLED": True,
        "AUTOTHROTTLE_TARGET_CONCURRENCY": 4.0,
        "AUTOTHROTTLE_MAX_DELAY": 6.0,
    }

    STREAM_TEMPLATES = {
        "sale": "https://www.menzili.tn/immo/vente-immobilier-tunisie?l=0&page={page}",
        "rent": "https://www.menzili.tn/immo/location-immobilier-tunisie?l=0&page={page}",
    }

    PERMALINK_RE = re.compile(r"/annonce/[^?#]*-(?P<id>\d+)(?:/)?$", re.IGNORECASE)

    def __init__(
        self,
        mode="incremental",
        streams="sale,rent",
        max_pages_incremental=25,
        max_pages_backfill=700,
        freshness_days=14,
        known_seen_stop=140,
        *args,
        **kwargs,
    ):
        super().__init__(*args, **kwargs)
        self.mode = str(mode).strip().lower()
        if self.mode not in {"incremental", "backfill"}:
            self.mode = "incremental"

        requested_streams = [x.strip().lower() for x in str(streams).split(",") if x.strip()]
        self.streams = [x for x in requested_streams if x in self.STREAM_TEMPLATES]
        if not self.streams:
            self.streams = ["sale", "rent"]

        self.max_pages_incremental = max(1, int(max_pages_incremental))
        self.max_pages_backfill = max(1, int(max_pages_backfill))
        self.freshness_days = max(1, int(freshness_days))
        self.known_seen_stop = max(10, int(known_seen_stop))

        self._seen_listing_ids = set()
        self._seen_detail_urls = set()
        self._state = {
            stream: {
                "pages_checked": 0,
                "last_page_checked": 0,
                "consecutive_zero_new": 0,
                "consecutive_known_only": 0,
                "consecutive_empty_pages": 0,
                "consecutive_stale_pages": 0,
                "known_seen_total": 0,
                "newest_seen_listing_date": None,
            }
            for stream in self.streams
        }

        self.db_conn = None
        self.db_cursor = None

    def open_spider(self, spider):
        self._open_db()
        self._ensure_state_table()

    def close_spider(self, spider):
        for stream in self.streams:
            self._save_state(stream)
        if self.db_cursor:
            self.db_cursor.close()
        if self.db_conn:
            self.db_conn.close()

    def _open_db(self):
        try:
            self.db_conn = mysql.connector.connect(
                host=self.settings.get("SCRAPER_DB_HOST", "localhost"),
                user=self.settings.get("SCRAPER_DB_USER", "root"),
                password=self.settings.get("SCRAPER_DB_PASSWORD", ""),
                database=self.settings.get("SCRAPER_DB_NAME", "database"),
                autocommit=False,
            )
            self.db_cursor = self.db_conn.cursor()
        except Exception as exc:
            self.logger.warning("Menzili DB connection unavailable, running without DB-aware incrementality: %s", exc)
            self.db_conn = None
            self.db_cursor = None

    def _ensure_state_table(self):
        if not self.db_cursor:
            return

        self.db_cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS scraper_crawl_state (
                source VARCHAR(80) NOT NULL,
                stream VARCHAR(32) NOT NULL,
                last_page_checked INT NOT NULL DEFAULT 0,
                last_successful_run DATETIME NULL,
                newest_seen_listing_date DATE NULL,
                no_new_pages_counter INT NOT NULL DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (source, stream)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """
        )
        self.db_conn.commit()

    def _save_state(self, stream):
        if not self.db_cursor:
            return

        state = self._state.get(stream, {})
        newest_seen = state.get("newest_seen_listing_date")

        self.db_cursor.execute(
            """
            INSERT INTO scraper_crawl_state (
                source,
                stream,
                last_page_checked,
                last_successful_run,
                newest_seen_listing_date,
                no_new_pages_counter
            ) VALUES (%s, %s, %s, NOW(), %s, %s)
            ON DUPLICATE KEY UPDATE
                last_page_checked = VALUES(last_page_checked),
                last_successful_run = VALUES(last_successful_run),
                newest_seen_listing_date = VALUES(newest_seen_listing_date),
                no_new_pages_counter = VALUES(no_new_pages_counter)
            """,
            (
                self.name,
                stream,
                int(state.get("last_page_checked", 0)),
                newest_seen,
                int(state.get("consecutive_zero_new", 0)),
            ),
        )
        self.db_conn.commit()

    async def start(self):
        for stream in self.streams:
            page = 1
            yield scrapy.Request(
                self._build_page_url(stream, page),
                callback=self.parse_list,
                meta={"stream": stream, "page": page},
                dont_filter=True,
            )

    def _build_page_url(self, stream, page):
        template = self.STREAM_TEMPLATES[stream]
        return template.format(page=page)

    def _normalize_url(self, response, value):
        if not value:
            return None

        absolute = response.urljoin(str(value)).strip()
        parsed = urlparse(absolute)

        query = parse_qs(parsed.query)
        clean_query = {}
        for key, val in query.items():
            key_l = key.lower()
            if key_l.startswith("utm_") or key_l in {"fbclid", "gclid", "yclid"}:
                continue
            clean_query[key] = val

        normalized_query = urlencode(
            [(key, item) for key, values in clean_query.items() for item in values],
            doseq=True,
        )

        normalized = parsed._replace(
            scheme="https",
            netloc="www.menzili.tn",
            query=normalized_query,
            fragment="",
        )
        return urlunparse(normalized).rstrip("/")

    def _extract_listing_id(self, url):
        if not url:
            return None
        match = self.PERMALINK_RE.search(url)
        if not match:
            return None
        return match.group("id")

    def _extract_date_from_text(self, text):
        if not text:
            return None

        lowered = text.lower()
        today = datetime.utcnow().date()
        if "aujourd" in lowered:
            return today
        if "hier" in lowered:
            return today - timedelta(days=1)

        slash_match = re.search(r"(\d{1,2})\s*[/-]\s*(\d{1,2})\s*[/-]\s*(\d{2,4})", lowered)
        if slash_match:
            day = int(slash_match.group(1))
            month = int(slash_match.group(2))
            year = int(slash_match.group(3))
            if year < 100:
                year = 2000 + year
            try:
                return datetime(year, month, day).date()
            except ValueError:
                return None

        months = {
            "janvier": 1,
            "fevrier": 2,
            "février": 2,
            "mars": 3,
            "avril": 4,
            "mai": 5,
            "juin": 6,
            "juillet": 7,
            "aout": 8,
            "août": 8,
            "septembre": 9,
            "octobre": 10,
            "novembre": 11,
            "decembre": 12,
            "décembre": 12,
        }

        month_match = re.search(r"(\d{1,2})\s+([a-zéûôîàè]+)\s+(\d{4})", lowered)
        if month_match:
            day = int(month_match.group(1))
            month_name = month_match.group(2)
            year = int(month_match.group(3))
            month = months.get(month_name)
            if month:
                try:
                    return datetime(year, month, day).date()
                except ValueError:
                    return None

        return None

    def _extract_listing_candidates(self, response):
        candidates = []
        seen_ids = set()

        anchors = response.xpath("//a[contains(@href, '/annonce/')]")
        for anchor in anchors:
            href = anchor.xpath("@href").get()
            url = self._normalize_url(response, href)
            listing_id = self._extract_listing_id(url)
            if not listing_id:
                continue
            if listing_id in seen_ids:
                continue

            text_blob = " ".join(
                t.strip()
                for t in anchor.xpath(
                    "ancestor::*[contains(@class,'annonce') or contains(@class,'item') or contains(@class,'card')][1]//text()"
                ).getall()
                if t and t.strip()
            )
            posted_date = self._extract_date_from_text(text_blob)

            candidates.append(
                {
                    "listing_id": listing_id,
                    "url": url,
                    "posted_date": posted_date,
                }
            )
            seen_ids.add(listing_id)

        return candidates

    def _fetch_existing_urls(self, urls):
        if not self.db_cursor or not urls:
            return set()

        existing = set()
        chunk_size = 200
        for idx in range(0, len(urls), chunk_size):
            chunk = urls[idx : idx + chunk_size]
            placeholders = ",".join(["%s"] * len(chunk))
            sql = (
                f"SELECT url FROM raw_properties WHERE source = %s "
                f"AND url IN ({placeholders})"
            )
            self.db_cursor.execute(sql, [self.name] + chunk)
            for row in self.db_cursor.fetchall():
                if row and row[0]:
                    existing.add(str(row[0]).rstrip("/"))
        return existing

    def _fetch_missing_critical_urls(self, urls):
        if not self.db_cursor or not urls:
            return set()

        missing = set()
        chunk_size = 200
        for idx in range(0, len(urls), chunk_size):
            chunk = urls[idx : idx + chunk_size]
            placeholders = ",".join(["%s"] * len(chunk))
            sql = (
                f"SELECT url FROM raw_properties WHERE source = %s "
                f"AND url IN ({placeholders}) "
                "AND (title IS NULL OR title = '' OR price IS NULL OR price = '' "
                "OR location IS NULL OR location = '' OR description IS NULL OR description = '' "
                "OR image IS NULL OR image = '')"
            )
            self.db_cursor.execute(sql, [self.name] + chunk)
            for row in self.db_cursor.fetchall():
                if row and row[0]:
                    missing.add(str(row[0]).rstrip("/"))
        return missing

    def _should_stop(self, stream):
        state = self._state[stream]

        if self.mode == "incremental":
            if state["consecutive_zero_new"] >= 3:
                return True
            if state["known_seen_total"] >= self.known_seen_stop:
                return True
            if state["consecutive_stale_pages"] >= 2:
                return True
            if state["consecutive_empty_pages"] >= 2:
                return True
            return False

        if state["consecutive_empty_pages"] >= 2:
            return True
        if state["consecutive_known_only"] >= 8:
            return True
        return False

    def parse_list(self, response):
        stream = response.meta["stream"]
        page = int(response.meta["page"])

        state = self._state[stream]
        state["pages_checked"] += 1
        state["last_page_checked"] = page

        max_pages = self.max_pages_incremental if self.mode == "incremental" else self.max_pages_backfill
        if page > max_pages:
            self._save_state(stream)
            return

        if self._should_stop(stream):
            self._save_state(stream)
            return

        candidates = self._extract_listing_candidates(response)
        if not candidates:
            state["consecutive_empty_pages"] += 1
            self._save_state(stream)
            if self._should_stop(stream):
                return
            if page < max_pages:
                next_page = page + 1
                yield response.follow(
                    self._build_page_url(stream, next_page),
                    callback=self.parse_list,
                    meta={"stream": stream, "page": next_page},
                    dont_filter=True,
                )
            return

        state["consecutive_empty_pages"] = 0

        candidate_urls = [c["url"] for c in candidates if c.get("url")]
        existing_urls = self._fetch_existing_urls(candidate_urls)
        missing_critical_urls = self._fetch_missing_critical_urls(candidate_urls)

        freshness_cutoff = datetime.utcnow().date() - timedelta(days=self.freshness_days)
        known_on_page = 0
        new_on_page = 0
        dated_candidates = 0
        stale_candidates = 0

        for candidate in candidates:
            listing_id = candidate["listing_id"]
            listing_url = candidate["url"]
            posted_date = candidate.get("posted_date")

            if posted_date:
                dated_candidates += 1
                if posted_date < freshness_cutoff:
                    stale_candidates += 1
                if state["newest_seen_listing_date"] is None or posted_date > state["newest_seen_listing_date"]:
                    state["newest_seen_listing_date"] = posted_date

            if listing_id in self._seen_listing_ids:
                continue
            if listing_url in self._seen_detail_urls:
                continue

            self._seen_listing_ids.add(listing_id)

            if listing_url in existing_urls and listing_url not in missing_critical_urls:
                known_on_page += 1
                continue

            self._seen_detail_urls.add(listing_url)
            new_on_page += 1
            yield response.follow(
                listing_url,
                callback=self.parse_detail,
                meta={"stream": stream, "listing_id": listing_id, "source_page": page},
                dont_filter=True,
            )

        if new_on_page == 0:
            state["consecutive_zero_new"] += 1
        else:
            state["consecutive_zero_new"] = 0

        if candidates and known_on_page >= len(candidates):
            state["consecutive_known_only"] += 1
        else:
            state["consecutive_known_only"] = 0

        state["known_seen_total"] += known_on_page

        if dated_candidates > 0 and stale_candidates == dated_candidates:
            state["consecutive_stale_pages"] += 1
        else:
            state["consecutive_stale_pages"] = 0

        self._save_state(stream)

        if self._should_stop(stream):
            return

        if page >= max_pages:
            return

        next_page = page + 1
        yield response.follow(
            self._build_page_url(stream, next_page),
            callback=self.parse_list,
            meta={"stream": stream, "page": next_page},
            dont_filter=True,
        )

    def _normalize_whitespace(self, value):
        if value is None:
            return None
        text = " ".join(str(value).split()).strip()
        return text or None

    def _first_text(self, response, xpaths):
        for xp in xpaths:
            value = response.xpath(xp).get()
            clean = self._normalize_whitespace(value)
            if clean:
                return clean
        return None

    def _extract_numeric_detail(self, text, patterns):
        if not text:
            return None
        for pattern in patterns:
            match = re.search(pattern, text, flags=re.IGNORECASE)
            if match:
                return self._normalize_whitespace(match.group(1))
        return None

    def _extract_amenities(self, response):
        raw = response.xpath(
            "//*[contains(@class,'amenit') or contains(@class,'equip') or contains(@class,'option') or contains(@class,'feature')]//text()"
        ).getall()
        values = []
        seen = set()
        for item in raw:
            clean = self._normalize_whitespace(item)
            if not clean:
                continue
            if len(clean) < 3:
                continue
            key = clean.lower()
            if key in seen:
                continue
            seen.add(key)
            values.append(clean)
        return values

    def _extract_images(self, response):
        candidates = []
        selectors = [
            "//meta[@property='og:image']/@content",
            "//meta[contains(@name,'twitter:image')]/@content",
            "//img[contains(@class,'gallery') or contains(@class,'slider') or contains(@class,'photo') or contains(@class,'annonce')]/@src",
            "//img[contains(@class,'gallery') or contains(@class,'slider') or contains(@class,'photo') or contains(@class,'annonce')]/@data-src",
            "//img/@src",
        ]

        seen = set()
        for selector in selectors:
            for value in response.xpath(selector).getall():
                url = self._normalize_url(response, value)
                if not url:
                    continue
                if url in seen:
                    continue
                seen.add(url)
                candidates.append(url)

        return candidates

    def parse_detail(self, response):
        listing_url = self._normalize_url(response, response.url)
        listing_id = response.meta.get("listing_id") or self._extract_listing_id(listing_url)
        stream = response.meta.get("stream")

        title = self._first_text(
            response,
            [
                "normalize-space((//h1)[1])",
                "normalize-space((//meta[@property='og:title']/@content)[1])",
                "normalize-space((//title)[1])",
            ],
        )

        location = self._first_text(
            response,
            [
                "normalize-space((//*[contains(@class,'location')])[1])",
                "normalize-space((//*[contains(@class,'adresse')])[1])",
                "normalize-space((//*[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'localisation')]/following::*[1])[1])",
            ],
        )

        price = self._first_text(
            response,
            [
                "normalize-space((//*[contains(@class,'price')])[1])",
                "normalize-space((//*[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'prix')])[1])",
                "normalize-space((//*[contains(.,'DT') or contains(.,'TND')])[1])",
            ],
        )

        posted_text = self._first_text(
            response,
            [
                "normalize-space((//*[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'publi')])[1])",
                "normalize-space((//*[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'mise a jour')])[1])",
            ],
        )
        posted_date = self._extract_date_from_text(posted_text) if posted_text else None

        description = self._first_text(
            response,
            [
                "normalize-space((//*[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'description')]/following::*[self::p or self::div][1])[1])",
                "normalize-space((//meta[@property='og:description']/@content)[1])",
                "normalize-space((//p)[1])",
            ],
        )

        page_text = " ".join(
            self._normalize_whitespace(x)
            for x in response.xpath("//body//text()").getall()
            if self._normalize_whitespace(x)
        )

        chambres = self._extract_numeric_detail(
            page_text,
            [
                r"(?:chambres?|ch)\s*[:\-]?\s*(\d+)",
                r"(\d+)\s*chambres?",
            ],
        )
        salles_bain = self._extract_numeric_detail(
            page_text,
            [
                r"(?:salles?\s*de\s*bain|sdb)\s*[:\-]?\s*(\d+)",
                r"(\d+)\s*(?:salles?\s*de\s*bain|sdb)",
            ],
        )
        pieces_totales = self._extract_numeric_detail(
            page_text,
            [
                r"(?:pi[eè]ces?)\s*[:\-]?\s*(\d+)",
                r"(\d+)\s*pi[eè]ces?",
            ],
        )
        surface_habitable = self._extract_numeric_detail(
            page_text,
            [
                r"surface\s*habitable\s*[:\-]?\s*([\d\s.,]+\s*m²?)",
                r"(\d+[\d\s.,]*)\s*m²\s*habitable",
            ],
        )
        surface_terrain = self._extract_numeric_detail(
            page_text,
            [
                r"surface\s*terrain\s*[:\-]?\s*([\d\s.,]+\s*m²?)",
                r"terrain\s*[:\-]?\s*([\d\s.,]+\s*m²?)",
            ],
        )

        amenities = self._extract_amenities(response)
        images = self._extract_images(response)
        image = images[0] if images else None

        agent_name = self._first_text(
            response,
            [
                "normalize-space((//*[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'agence')])[1])",
                "normalize-space((//*[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'annonceur')])[1])",
            ],
        )

        phone_match = re.search(r"(?:\+216\s*)?\d{2}[\s.-]?\d{3}[\s.-]?\d{3}", page_text)
        contact_phone = phone_match.group(0) if phone_match else None

        yield {
            "title": title,
            "location": location,
            "price": price,
            "listing_id": listing_id,
            "posted_date": posted_date.isoformat() if posted_date else None,
            "description": description,
            "chambres": chambres,
            "salle_de_bain": salles_bain,
            "pieces_totales": pieces_totales,
            "surface_habitable": surface_habitable,
            "surface_terrain": surface_terrain,
            "amenities": amenities,
            "images": images,
            "agent_name": agent_name,
            "contact_phone": contact_phone,
            "image": image,
            "stream": stream,
            "url": listing_url,
        }
