import os
import re
import hashlib
from dataclasses import dataclass
from typing import Optional, Tuple, List, Dict, Any

import mysql.connector
from mysql.connector import Error
from rapidfuzz import fuzz


# =========================
# CONFIG
# =========================
DB_CONFIG = {
    "host": os.getenv("MYSQL_HOST", "127.0.0.1"),
    "port": int(os.getenv("MYSQL_PORT", "3306")),
    "user": os.getenv("MYSQL_USER", "root"),
    "password": os.getenv("MYSQL_PASSWORD", ""),
    "database": os.getenv("MYSQL_DATABASE", "raw_db"),
    "autocommit": False,
}

RAW_TABLE = os.getenv("RAW_TABLE", "raw_properties")

# Optional startup check. Set DB_VALIDATE_ON_START=0 to skip.
DB_VALIDATE_ON_START = os.getenv("DB_VALIDATE_ON_START", "1") == "1"

# Country filter
TARGET_COUNTRY = "tunisia"

# Optional city filter:
# None = all Tunisia
# "tunis", "sousse", "sfax", ...
TARGET_CITY = None


# =========================
# LOCATION HELPERS
# =========================
COUNTRY_ALIASES = {
    "tunisia": ["tunisia", "tunisie", "تونس"],
}

CITY_ALIASES = {
    "tunis": ["tunis", "le bardo", "bardo", "lac", "centre ville tunis", "تونس", "باردو"],
    "gabes": ["gabes", "gabès", "قابس"],
    "sfax": ["sfax", "صفاقس"],
    "sousse": ["sousse", "سوسة"],
    "nabeul": ["nabeul", "نابل"],
    "hammamet": ["hammamet", "الحمامات"],
    "ariana": ["ariana", "أريانة"],
    "monastir": ["monastir", "المنستير"],
    "mahdia": ["mahdia", "المهدية"],
    "bizerte": ["bizerte", "بنزرت"],
    "medenine": ["medenine", "مدنين"],
    "djerba": ["djerba", "jerba", "جربة"],
}


# =========================
# DATA MODEL
# =========================
@dataclass
class Candidate:
    raw_id: int
    source: str
    title: str
    normalized_title: str
    price_raw: str
    price_value: Optional[float]
    location_raw: str
    normalized_location: str
    country: Optional[str]
    city: Optional[str]
    description: str
    normalized_description: str
    image: str
    url: str
    dedupe_key: str
    scraped_at: Optional[str]


# =========================
# TEXT HELPERS
# =========================
def clean_spaces(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def normalize_text(value: Any) -> str:
    value = clean_spaces(value).lower()
    value = re.sub(r"[^\w\s]", " ", value, flags=re.UNICODE)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def parse_price(value: Any) -> Optional[float]:
    if not value:
        return None

    s = str(value).strip().lower()
    s = s.replace("tnd", "").replace("dt", "").replace("دينار", "").strip()

    multiplier = 1.0
    if re.search(r"\b(m|mn|million)\b", s):
        multiplier = 1_000_000.0
    elif re.search(r"\b(k|thousand)\b", s):
        multiplier = 1_000.0

    match = re.search(r"\d+(?:[.,]\d+)?", s)
    if not match:
        return None

    num = match.group(0)

    if "," in num and "." not in num:
        num = num.replace(",", ".")
    else:
        num = num.replace(",", "")

    try:
        return round(float(num) * multiplier, 2)
    except ValueError:
        return None


def safe_round(value: Optional[float]) -> str:
    return "" if value is None else str(int(round(value)))


def hash_key(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()


# =========================
# LOCATION DETECTION
# =========================
def detect_country_city(text: str) -> Tuple[Optional[str], Optional[str]]:
    text_norm = normalize_text(text)

    detected_country = None
    detected_city = None

    for country, aliases in COUNTRY_ALIASES.items():
        for alias in aliases:
            if normalize_text(alias) in text_norm:
                detected_country = country
                break
        if detected_country:
            break

    for city, aliases in CITY_ALIASES.items():
        for alias in aliases:
            if normalize_text(alias) in text_norm:
                detected_city = city
                break
        if detected_city:
            break

    if detected_city and not detected_country:
        detected_country = "tunisia"

    return detected_country, detected_city


def build_normalized_location(country: Optional[str], city: Optional[str], location_raw: str) -> str:
    parts = []
    if city:
        parts.append(city)
    if country:
        parts.append(country)
    if not parts:
        parts.append(normalize_text(location_raw))
    return " | ".join(parts)


def candidate_matches_target(country: Optional[str], city: Optional[str]) -> bool:
    if country != TARGET_COUNTRY:
        return False
    if TARGET_CITY and city != TARGET_CITY:
        return False
    return True


# =========================
# DUPLICATE LOGIC
# =========================
def same_exact_key(a: Candidate, b: Candidate) -> bool:
    return a.dedupe_key == b.dedupe_key


def same_image_and_price(a: Candidate, b: Candidate) -> bool:
    if not a.image or not b.image:
        return False
    if a.image.strip() != b.image.strip():
        return False

    if a.city != b.city:
        return False

    if a.price_value is None or b.price_value is None:
        return False

    return abs(a.price_value - b.price_value) <= max(a.price_value, b.price_value) * 0.03


def title_similarity(a: Candidate, b: Candidate) -> float:
    return float(fuzz.token_set_ratio(a.normalized_title, b.normalized_title))


def desc_similarity(a: Candidate, b: Candidate) -> float:
    return float(fuzz.token_set_ratio(a.normalized_description, b.normalized_description))


def same_price(a: Candidate, b: Candidate, tolerance_ratio: float = 0.03) -> bool:
    if a.price_value is None or b.price_value is None:
        return True
    diff = abs(a.price_value - b.price_value)
    return diff <= max(a.price_value, b.price_value) * tolerance_ratio


def is_duplicate(candidate: Candidate, existing: Candidate) -> Tuple[bool, str, Optional[float]]:
    if same_exact_key(candidate, existing):
        return True, "same_exact_key", 100.0

    if same_image_and_price(candidate, existing):
        return True, "same_image_price_city", 98.0

    if candidate.city == existing.city and same_price(candidate, existing):
        t_score = title_similarity(candidate, existing)
        d_score = desc_similarity(candidate, existing)

        if t_score >= 93:
            return True, "fuzzy_title", round(t_score, 2)

        if t_score >= 85 and d_score >= 88:
            return True, "fuzzy_title_description", round((t_score + d_score) / 2, 2)

    return False, "", None


# =========================
# DB HELPERS
# =========================
def get_connection():
    return mysql.connector.connect(**DB_CONFIG)


def validate_db_connection() -> None:
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.fetchone()
        cur.close()
        print("Database connection OK")
    except Error as exc:
        raise RuntimeError(
            "Unable to connect to MySQL. Check MYSQL_HOST, MYSQL_PORT, MYSQL_USER, "
            "MYSQL_PASSWORD, MYSQL_DATABASE."
        ) from exc
    finally:
        if conn is not None and conn.is_connected():
            conn.close()


def fetch_raw_rows(conn) -> List[Dict[str, Any]]:
    cur = conn.cursor(dictionary=True)
    cur.execute(f"""
        SELECT
            id,
            title,
            price,
            location,
            description,
            image,
            url,
            source,
            processed,
            scraped_at
        FROM {RAW_TABLE}
        WHERE processed = 0
        ORDER BY id ASC
    """)
    rows = cur.fetchall()
    cur.close()
    return rows


def load_existing_clean(conn) -> List[Tuple[int, Candidate]]:
    cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT
            id,
            raw_id,
            source,
            title,
            normalized_title,
            price_raw,
            price_value,
            location_raw,
            normalized_location,
            country,
            city,
            description,
            normalized_description,
            image,
            url,
            dedupe_key,
            scraped_at
        FROM clean_listings
        WHERE country = %s
    """, (TARGET_COUNTRY,))
    rows = cur.fetchall()
    cur.close()

    items = []
    for row in rows:
        candidate = Candidate(
            raw_id=row["raw_id"],
            source=row["source"] or "",
            title=row["title"] or "",
            normalized_title=row["normalized_title"] or "",
            price_raw=row["price_raw"] or "",
            price_value=float(row["price_value"]) if row["price_value"] is not None else None,
            location_raw=row["location_raw"] or "",
            normalized_location=row["normalized_location"] or "",
            country=row["country"],
            city=row["city"],
            description=row["description"] or "",
            normalized_description=row["normalized_description"] or "",
            image=row["image"] or "",
            url=row["url"] or "",
            dedupe_key=row["dedupe_key"] or "",
            scraped_at=str(row["scraped_at"]) if row["scraped_at"] else None,
        )
        items.append((row["id"], candidate))

    return items


def insert_clean_listing(conn, c: Candidate) -> int:
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO clean_listings (
            raw_id, source, title, normalized_title,
            price_raw, price_value,
            location_raw, normalized_location, country, city,
            description, normalized_description,
            image, url, dedupe_key, scraped_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        c.raw_id, c.source, c.title, c.normalized_title,
        c.price_raw, c.price_value,
        c.location_raw, c.normalized_location, c.country, c.city,
        c.description, c.normalized_description,
        c.image, c.url, c.dedupe_key, c.scraped_at
    ))
    new_id = cur.lastrowid
    cur.close()
    return new_id


def insert_duplicate_log(conn, raw_row: Dict[str, Any], reason: str, matched_clean_id: Optional[int], score: Optional[float]):
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO duplicates_log (
            raw_id, source, title, location_raw, price_raw, image, url,
            reason, matched_clean_id, similarity_score
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        raw_row["id"],
        raw_row.get("source", ""),
        raw_row.get("title", ""),
        raw_row.get("location", ""),
        raw_row.get("price", ""),
        raw_row.get("image", ""),
        raw_row.get("url", ""),
        reason,
        matched_clean_id,
        score
    ))
    cur.close()


def mark_raw_processed(conn, raw_id: int):
    cur = conn.cursor()
    cur.execute(f"UPDATE {RAW_TABLE} SET processed = 1 WHERE id = %s", (raw_id,))
    cur.close()


# =========================
# BUILD CANDIDATE
# =========================
def build_candidate(raw_row: Dict[str, Any]) -> Candidate:
    title = clean_spaces(raw_row.get("title", ""))
    location = clean_spaces(raw_row.get("location", ""))
    description = clean_spaces(raw_row.get("description", ""))
    image = clean_spaces(raw_row.get("image", ""))
    url = clean_spaces(raw_row.get("url", ""))
    source = clean_spaces(raw_row.get("source", ""))
    price_raw = clean_spaces(raw_row.get("price", ""))

    combined_geo_text = f"{title} {location} {description}"
    country, city = detect_country_city(combined_geo_text)

    normalized_title = normalize_text(title)
    normalized_description = normalize_text(description)
    normalized_location = build_normalized_location(country, city, location)
    price_value = parse_price(price_raw)

    dedupe_source = "|".join([
        normalized_title,
        normalized_location,
        safe_round(price_value),
        normalize_text(image),
    ])
    dedupe_key = hash_key(dedupe_source)

    return Candidate(
        raw_id=int(raw_row["id"]),
        source=source,
        title=title,
        normalized_title=normalized_title,
        price_raw=price_raw,
        price_value=price_value,
        location_raw=location,
        normalized_location=normalized_location,
        country=country,
        city=city,
        description=description,
        normalized_description=normalized_description,
        image=image,
        url=url,
        dedupe_key=dedupe_key,
        scraped_at=str(raw_row["scraped_at"]) if raw_row.get("scraped_at") else None,
    )


# =========================
# MAIN
# =========================
def main():
    if DB_VALIDATE_ON_START:
        validate_db_connection()

    conn = get_connection()

    try:
        raw_rows = fetch_raw_rows(conn)
        existing_clean = load_existing_clean(conn)

        accepted = 0
        duplicates = 0
        skipped = 0

        for raw_row in raw_rows:
            candidate = build_candidate(raw_row)

            if not candidate_matches_target(candidate.country, candidate.city):
                mark_raw_processed(conn, candidate.raw_id)
                skipped += 1
                continue

            found_duplicate = False

            for clean_id, existing in existing_clean:
                dup, reason, score = is_duplicate(candidate, existing)
                if dup:
                    insert_duplicate_log(conn, raw_row, reason, clean_id, score)
                    mark_raw_processed(conn, candidate.raw_id)
                    duplicates += 1
                    found_duplicate = True
                    break

            if found_duplicate:
                continue

            new_clean_id = insert_clean_listing(conn, candidate)
            existing_clean.append((new_clean_id, candidate))
            mark_raw_processed(conn, candidate.raw_id)
            accepted += 1

        conn.commit()

        print(f"Read raw rows: {len(raw_rows)}")
        print(f"Accepted: {accepted}")
        print(f"Duplicates: {duplicates}")
        print(f"Skipped (outside Tunisia filter): {skipped}")

    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
