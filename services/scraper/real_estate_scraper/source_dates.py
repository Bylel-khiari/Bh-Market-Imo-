import json
import re
import unicodedata
from datetime import datetime, timedelta
from typing import Any, Iterable, Optional


RAW_SOURCE_DATE_KEYS = {
    "source_published_at",
    "source_published_raw",
    "published_at",
    "publishedat",
    "date_published",
    "datepublished",
    "date_posted",
    "dateposted",
    "date_created",
    "datecreated",
    "date_added",
    "dateadded",
    "date",
    "created_at",
    "createdat",
    "posted_at",
    "postedat",
    "publication_date",
    "publicationdate",
    "upload_date",
    "uploaddate",
}

MONTHS = {
    "janvier": 1,
    "jan": 1,
    "fevrier": 2,
    "fev": 2,
    "mars": 3,
    "avril": 4,
    "avr": 4,
    "mai": 5,
    "juin": 6,
    "juillet": 7,
    "juil": 7,
    "aout": 8,
    "septembre": 9,
    "sept": 9,
    "octobre": 10,
    "oct": 10,
    "novembre": 11,
    "nov": 11,
    "decembre": 12,
    "dec": 12,
}


def clean_spaces(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def normalize_key(value: Any) -> str:
    return re.sub(r"[^a-z0-9]", "", str(value or "").lower())


SOURCE_DATE_KEYS = {normalize_key(key) for key in RAW_SOURCE_DATE_KEYS}


def normalize_for_match(value: Any) -> str:
    text = clean_spaces(value).lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    return text


def parse_source_datetime(value: Any, now: Optional[datetime] = None) -> Optional[datetime]:
    if value is None:
        return None

    if isinstance(value, datetime):
        return value.replace(tzinfo=None)

    if isinstance(value, (int, float)):
        timestamp = float(value)
        if timestamp > 10_000_000_000:
            timestamp = timestamp / 1000
        try:
            return datetime.fromtimestamp(timestamp)
        except (OSError, OverflowError, ValueError):
            return None

    raw = clean_spaces(value)
    if not raw:
        return None

    if re.fullmatch(r"\d{10,13}", raw):
        return parse_source_datetime(int(raw), now=now)

    iso_candidate = raw.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(iso_candidate).replace(tzinfo=None)
    except ValueError:
        pass

    for fmt in (
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
        "%d/%m/%Y %H:%M",
        "%d/%m/%Y",
        "%d-%m-%Y %H:%M",
        "%d-%m-%Y",
        "%d.%m.%Y",
    ):
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            pass

    normalized = normalize_for_match(raw)
    month_match = re.search(
        r"\b(\d{1,2})\s+([a-z]+)\s+(\d{4})(?:\s+a?\s*(\d{1,2})[:h](\d{2}))?",
        normalized,
    )
    if month_match:
        month = MONTHS.get(month_match.group(2))
        if month:
            hour = int(month_match.group(4) or 0)
            minute = int(month_match.group(5) or 0)
            try:
                return datetime(int(month_match.group(3)), month, int(month_match.group(1)), hour, minute)
            except ValueError:
                return None

    relative_match = re.search(
        r"\b(?:il y a|depuis|publie(?:e)? il y a|mise en ligne il y a|posted)\s+"
        r"(\d+)\s+"
        r"(minute|minutes|heure|heures|jour|jours|semaine|semaines|mois|an|ans|annee|annees)\b",
        normalized,
    )
    if relative_match:
        amount = int(relative_match.group(1))
        unit = relative_match.group(2)
        base = now or datetime.now()
        if unit.startswith("minute"):
            return base - timedelta(minutes=amount)
        if unit.startswith("heure"):
            return base - timedelta(hours=amount)
        if unit.startswith("jour"):
            return base - timedelta(days=amount)
        if unit.startswith("semaine"):
            return base - timedelta(days=amount * 7)
        if unit.startswith("mois"):
            return base - timedelta(days=amount * 30)
        return base - timedelta(days=amount * 365)

    return None


def normalize_source_datetime(value: Any) -> Optional[str]:
    parsed = parse_source_datetime(value)
    if parsed is None:
        return None
    return parsed.strftime("%Y-%m-%d %H:%M:%S")


def is_older_than_days(value: Any, max_age_days: int, now: Optional[datetime] = None) -> bool:
    if not max_age_days or max_age_days <= 0:
        return False

    parsed = parse_source_datetime(value)
    if parsed is None:
        return False

    base = now or datetime.now()
    return parsed < base - timedelta(days=max_age_days)


def iter_mapping_date_values(value: Any, depth: int = 0) -> Iterable[Any]:
    if depth > 4 or value is None:
        return

    if isinstance(value, str):
        stripped = value.strip()
        if stripped.startswith(("{", "[")):
            try:
                yield from iter_mapping_date_values(json.loads(stripped), depth + 1)
            except json.JSONDecodeError:
                return
        return

    if isinstance(value, dict):
        for key, nested_value in value.items():
            if normalize_key(key) in SOURCE_DATE_KEYS:
                yield nested_value
            if isinstance(nested_value, (dict, list, tuple)):
                yield from iter_mapping_date_values(nested_value, depth + 1)
        return

    if isinstance(value, (list, tuple)):
        for item in value:
            yield from iter_mapping_date_values(item, depth + 1)


def find_source_date_in_mapping(value: Any) -> Optional[Any]:
    for candidate in iter_mapping_date_values(value):
        if parse_source_datetime(candidate):
            return candidate
    return None


def extract_source_date_from_response(response) -> Optional[str]:
    selectors = [
        "meta[property='article:published_time']::attr(content)",
        "meta[property='article:modified_time']::attr(content)",
        "meta[itemprop='datePublished']::attr(content)",
        "meta[itemprop='datePosted']::attr(content)",
        "meta[name='date']::attr(content)",
        "meta[name='publishdate']::attr(content)",
        "meta[name='publish_date']::attr(content)",
        "meta[name='DC.date.issued']::attr(content)",
        "time::attr(datetime)",
        "time::text",
    ]

    for selector in selectors:
        for candidate in response.css(selector).getall():
            if parse_source_datetime(candidate):
                return clean_spaces(candidate)

    for script in response.css("script[type='application/ld+json']::text").getall():
        try:
            payload = json.loads(script)
        except json.JSONDecodeError:
            continue
        candidate = find_source_date_in_mapping(payload)
        if candidate:
            return clean_spaces(candidate)

    return None
