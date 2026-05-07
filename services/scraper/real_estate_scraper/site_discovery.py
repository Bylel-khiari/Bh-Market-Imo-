import argparse
import json
import os
import re
import socket
from dataclasses import dataclass
from html import unescape
from typing import Any, Dict, Iterable, List, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, quote_plus, urlencode, urlparse, urlunparse
from urllib.request import Request, urlopen

import mysql.connector


DB_CONFIG = {
    "host": os.getenv("MYSQL_HOST", os.getenv("SCRAPER_DB_HOST", "127.0.0.1")),
    "port": int(os.getenv("MYSQL_PORT", "3306")),
    "user": os.getenv("MYSQL_USER", os.getenv("SCRAPER_DB_USER", "root")),
    "password": os.getenv("MYSQL_PASSWORD") or os.getenv("SCRAPER_DB_PASSWORD") or "root",
    "database": os.getenv("MYSQL_DATABASE", os.getenv("SCRAPER_DB_NAME", "database")),
    "autocommit": False,
}

DEFAULT_QUERIES = [
    "site immobilier Tunisie",
    "annonces immobilieres Tunisie",
    "acheter appartement Tunisie",
    "vente maison Tunisie annonces",
    "portail immobilier tunisien",
]

STATIC_SEED_CANDIDATES = [
    {
        "name": "ImmoTN",
        "url": "https://www.immotn.com/",
        "snippet": "Annonces immobilieres de vente et location en Tunisie.",
    },
    {
        "name": "TounesImmo",
        "url": "https://www.tounesimmo.com/",
        "snippet": "Plateforme immobilier Tunisie avec annonces verifiees.",
    },
    {
        "name": "Annonce.tn",
        "url": "https://www.annonce.tn/",
        "snippet": "Petites annonces gratuites en Tunisie avec categorie immobilier.",
    },
    {
        "name": "TAFTAF",
        "url": "https://www.taftaf.tn/",
        "snippet": "Petites annonces en Tunisie, immobilier a vendre et a louer.",
    },
    {
        "name": "Immobiliers.tn",
        "url": "https://immobiliers.tn/",
        "snippet": "Hub immobilier pour acheter, vendre et louer en Tunisie.",
    },
    {
        "name": "Dyar.tn",
        "url": "https://dyar.tn/",
        "snippet": "Portail moderne de petites annonces immobilier Tunisie.",
    },
    {
        "name": "Vendu.tn",
        "url": "https://vendu.tn/",
        "snippet": "Annonces de vente et location: appartements, villas, terrains.",
    },
    {
        "name": "Diarkoum",
        "url": "https://www.diarkoum.tn/",
        "snippet": "Portail immobilier en Tunisie pour particuliers et professionnels.",
    },
    {
        "name": "Affare.tn",
        "url": "https://www.affare.tn/",
        "snippet": "Petites annonces Tunisie avec rubrique immobilier.",
    },
]

REAL_ESTATE_KEYWORDS = [
    "immobilier",
    "annonce immobiliere",
    "annonces immobilieres",
    "appartement",
    "maison",
    "villa",
    "terrain",
    "a vendre",
    "vente",
    "location",
    "acheter",
    "louer",
    "agence immobiliere",
    "promoteur",
]

TUNISIA_SIGNALS = [
    "tunisie",
    "tunis",
    "ariana",
    "ben arous",
    "nabeul",
    "sousse",
    "sfax",
    "monastir",
    "hammamet",
    "djerba",
    "la marsa",
]

PRICE_RE = re.compile(r"\b\d[\d\s.,']{2,}\s*(?:dt|tnd|dinar)", re.IGNORECASE)


@dataclass
class Candidate:
    name: str
    base_url: str
    sample_url: str
    domain: str
    confidence_score: int
    evidence: Dict[str, Any]


def clean_spaces(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def strip_html(value: str) -> str:
    text = re.sub(r"<script\b[^<]*(?:(?!</script>)<[^<]*)*</script>", " ", value, flags=re.I)
    text = re.sub(r"<style\b[^<]*(?:(?!</style>)<[^<]*)*</style>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    return clean_spaces(unescape(text))


def normalize_url(value: Any) -> Optional[str]:
    raw = clean_spaces(value)
    if not raw:
        return None

    parsed = urlparse(raw if "://" in raw else f"https://{raw}")
    if not parsed.netloc:
        return None

    normalized = parsed._replace(
        scheme=(parsed.scheme or "https").lower(),
        netloc=parsed.netloc.lower(),
        params="",
        fragment="",
    )
    return urlunparse(normalized)


def normalize_domain(value: Any) -> Optional[str]:
    normalized_url = normalize_url(value)
    if not normalized_url:
        return None

    hostname = urlparse(normalized_url).hostname or ""
    hostname = hostname.lower().strip(".")
    if hostname.startswith("www."):
        hostname = hostname[4:]
    return hostname or None


def normalize_base_url(value: Any) -> Optional[str]:
    domain = normalize_domain(value)
    if not domain:
        return None

    parsed = urlparse(normalize_url(value) or "")
    scheme = parsed.scheme or "https"
    return f"{scheme}://{domain}"


def parse_seed_urls(value: str) -> List[Dict[str, str]]:
    seeds = []
    for raw_url in str(value or "").split(","):
        url = normalize_url(raw_url)
        if url:
            seeds.append({"name": normalize_domain(url) or url, "url": url, "snippet": "Seed manuel"})
    return seeds


def fetch_text(url: str, timeout: int = 8) -> str:
    request = Request(
        url,
        headers={
            "User-Agent": "BH-Market-Imo-SiteDiscovery/1.0 (+admin dashboard)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
    )
    with urlopen(request, timeout=timeout) as response:
        content_type = response.headers.get("Content-Type", "")
        if "text" not in content_type and "html" not in content_type and "xml" not in content_type:
            return ""
        payload = response.read(250_000)
    return payload.decode("utf-8", errors="ignore")


def fetch_json(url: str, headers: Optional[Dict[str, str]] = None, timeout: int = 12) -> Dict[str, Any]:
    request = Request(url, headers=headers or {})
    with urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8", errors="ignore"))


def search_bing(api_key: str, query: str, limit: int) -> List[Dict[str, str]]:
    params = urlencode({"q": query, "mkt": "fr-TN", "count": str(limit)})
    payload = fetch_json(
        f"https://api.bing.microsoft.com/v7.0/search?{params}",
        headers={"Ocp-Apim-Subscription-Key": api_key},
    )
    return [
        {
            "name": item.get("name") or "",
            "url": item.get("url") or "",
            "snippet": item.get("snippet") or "",
        }
        for item in payload.get("webPages", {}).get("value", [])
    ]


def search_serpapi(api_key: str, query: str, limit: int) -> List[Dict[str, str]]:
    params = urlencode({"engine": "google", "q": query, "api_key": api_key, "num": str(limit), "hl": "fr"})
    payload = fetch_json(f"https://serpapi.com/search.json?{params}")
    return [
        {
            "name": item.get("title") or "",
            "url": item.get("link") or "",
            "snippet": item.get("snippet") or "",
        }
        for item in payload.get("organic_results", [])
    ]


def run_search(provider: str, api_key: str, queries: Iterable[str], limit_per_query: int) -> List[Dict[str, str]]:
    provider = (provider or "static").strip().lower()
    results: List[Dict[str, str]] = []

    if provider == "static":
        return [*STATIC_SEED_CANDIDATES, *parse_seed_urls(os.getenv("SITE_DISCOVERY_SEED_URLS", ""))]

    if not api_key:
        raise RuntimeError("SITE_DISCOVERY_API_KEY is required for this search provider.")

    for query in queries:
        if provider == "bing":
            results.extend(search_bing(api_key, query, limit_per_query))
        elif provider == "serpapi":
            results.extend(search_serpapi(api_key, query, limit_per_query))
        else:
            raise RuntimeError(f"Unsupported SITE_DISCOVERY_SEARCH_PROVIDER: {provider}")

    return results


def score_candidate(result: Dict[str, str], homepage_text: str = "") -> Candidate:
    sample_url = normalize_url(result.get("url"))
    if not sample_url:
        raise ValueError("Candidate URL is required")

    base_url = normalize_base_url(sample_url)
    domain = normalize_domain(sample_url)
    if not base_url or not domain:
        raise ValueError("Candidate domain is required")

    title = clean_spaces(result.get("name")) or domain
    snippet = clean_spaces(result.get("snippet"))
    text = f"{title} {snippet} {strip_html(homepage_text)}".lower()
    path = urlparse(sample_url).path.lower()

    matched_keywords = [keyword for keyword in REAL_ESTATE_KEYWORDS if keyword in text or keyword in path]
    matched_tunisia = [signal for signal in TUNISIA_SIGNALS if signal in text or signal in domain]
    price_signal = bool(PRICE_RE.search(text))
    category_signal = any(part in path for part in ["immo", "appartement", "maison", "vente", "location"])
    domain_signal = domain.endswith(".tn") or "tunisie" in domain or "tounes" in domain
    reachable = bool(homepage_text)

    score = 0
    score += min(35, len(matched_keywords) * 7)
    score += min(25, len(matched_tunisia) * 5)
    score += 15 if price_signal else 0
    score += 10 if category_signal else 0
    score += 10 if domain_signal else 0
    score += 5 if reachable else 0

    evidence = {
        "matched_keywords": matched_keywords[:12],
        "matched_tunisia_signals": matched_tunisia[:12],
        "price_signal": price_signal,
        "category_signal": category_signal,
        "domain_signal": domain_signal,
        "reachable": reachable,
        "search_title": title,
        "search_snippet": snippet,
    }

    return Candidate(
        name=title[:160],
        base_url=base_url,
        sample_url=sample_url,
        domain=domain,
        confidence_score=min(100, score),
        evidence=evidence,
    )


def dedupe_candidates(candidates: Iterable[Candidate]) -> List[Candidate]:
    by_domain: Dict[str, Candidate] = {}
    for candidate in candidates:
        previous = by_domain.get(candidate.domain)
        if previous is None or candidate.confidence_score > previous.confidence_score:
            by_domain[candidate.domain] = candidate
    return sorted(by_domain.values(), key=lambda item: item.confidence_score, reverse=True)


def ensure_suggestion_schema(conn):
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS scrape_site_suggestions (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            name VARCHAR(160) NOT NULL,
            domain VARCHAR(190) NOT NULL,
            base_url VARCHAR(255) NOT NULL,
            sample_url VARCHAR(500) NULL,
            evidence_json LONGTEXT NULL,
            confidence_score TINYINT UNSIGNED NOT NULL DEFAULT 0,
            status VARCHAR(24) NOT NULL DEFAULT 'pending',
            discovered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            reviewed_at DATETIME NULL,
            admin_note TEXT NULL,
            accepted_scrape_site_id BIGINT UNSIGNED NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uniq_scrape_site_suggestions_domain (domain),
            KEY idx_scrape_site_suggestions_status (status)
        )
        """
    )
    cur.close()


def load_existing_domains(conn) -> set:
    domains = set()
    cur = conn.cursor(dictionary=True)
    cur.execute("SHOW TABLES LIKE 'scrape_sites'")
    if cur.fetchone():
        cur.execute("SELECT base_url, start_url FROM scrape_sites")
        for row in cur.fetchall():
            for value in (row.get("base_url"), row.get("start_url")):
                domain = normalize_domain(value)
                if domain:
                    domains.add(domain)
    cur.close()
    return domains


def upsert_suggestions(conn, candidates: Iterable[Candidate]) -> int:
    cur = conn.cursor()
    written = 0
    for candidate in candidates:
        cur.execute(
            """
            INSERT INTO scrape_site_suggestions (
                name,
                domain,
                base_url,
                sample_url,
                evidence_json,
                confidence_score,
                status,
                discovered_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, 'pending', NOW())
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                base_url = VALUES(base_url),
                sample_url = VALUES(sample_url),
                evidence_json = VALUES(evidence_json),
                confidence_score = GREATEST(confidence_score, VALUES(confidence_score)),
                status = IF(status IN ('accepted', 'rejected'), status, 'pending'),
                discovered_at = NOW()
            """,
            (
                candidate.name,
                candidate.domain,
                candidate.base_url,
                candidate.sample_url,
                json.dumps(candidate.evidence, ensure_ascii=True),
                candidate.confidence_score,
            ),
        )
        written += 1
    cur.close()
    return written


def discover_candidates(provider: str, api_key: str, threshold: int, limit_per_query: int) -> List[Candidate]:
    queries = [
        clean_spaces(query)
        for query in os.getenv("SITE_DISCOVERY_QUERIES", ",".join(DEFAULT_QUERIES)).split(",")
        if clean_spaces(query)
    ]
    results = run_search(provider, api_key, queries, limit_per_query)
    candidates = []

    for result in results:
        sample_url = normalize_url(result.get("url"))
        if not sample_url:
            continue

        homepage_text = ""
        base_url = normalize_base_url(sample_url)
        try:
            homepage_text = fetch_text(base_url or sample_url)
        except (HTTPError, URLError, TimeoutError, socket.timeout, OSError):
            homepage_text = ""

        try:
            candidate = score_candidate(result, homepage_text)
        except ValueError:
            continue

        if candidate.confidence_score >= threshold:
            candidates.append(candidate)

    return dedupe_candidates(candidates)


def run_discovery(trigger: str = "manual") -> Dict[str, Any]:
    provider = os.getenv("SITE_DISCOVERY_SEARCH_PROVIDER", "static").strip().lower()
    api_key = os.getenv("SITE_DISCOVERY_API_KEY", "").strip()
    threshold = int(os.getenv("SITE_DISCOVERY_CONFIDENCE_THRESHOLD", "45"))
    limit_per_query = max(1, min(20, int(os.getenv("SITE_DISCOVERY_LIMIT_PER_QUERY", "8"))))

    candidates = discover_candidates(provider, api_key, threshold, limit_per_query)
    conn = mysql.connector.connect(**DB_CONFIG)

    try:
        ensure_suggestion_schema(conn)
        existing_domains = load_existing_domains(conn)
        new_candidates = [candidate for candidate in candidates if candidate.domain not in existing_domains]
        written = upsert_suggestions(conn, new_candidates)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    return {
        "trigger": trigger,
        "provider": provider,
        "scanned": len(candidates),
        "excluded_existing": len(candidates) - len(new_candidates),
        "suggestions_written": written,
        "domains": [candidate.domain for candidate in new_candidates],
    }


def main():
    parser = argparse.ArgumentParser(description="Discover Tunisian real-estate sites.")
    parser.add_argument("--trigger", default="manual")
    args = parser.parse_args()
    print(json.dumps(run_discovery(trigger=args.trigger), ensure_ascii=True))


if __name__ == "__main__":
    main()
