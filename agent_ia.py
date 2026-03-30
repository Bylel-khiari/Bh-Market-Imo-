import os
import re
import hashlib
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional, Tuple, List, Dict, Any

import mysql.connector
from rapidfuzz import fuzz


# =========================
# CONFIG
# =========================
DB_CONFIG = {
    "host": os.getenv("MYSQL_HOST", "127.0.0.1"),
    "port": int(os.getenv("MYSQL_PORT", "3306")),
    "user": os.getenv("MYSQL_USER", "root"),
    "password": os.getenv("MYSQL_PASSWORD", ""),
    "database": os.getenv("MYSQL_DATABASE", "data_base"),
    "autocommit": False,
}

RAW_TABLE = os.getenv("RAW_TABLE", "raw_properties")

TARGET_COUNTRY = "tunisia"
TARGET_GOVERNORATE = None  # e.g. "tunis" or None for all Tunisia

STATUS_NEW = 0
STATUS_ACCEPTED = 1
STATUS_DUPLICATE = 2
STATUS_RENT = 3
STATUS_OUTSIDE_TUNISIA = 4
STATUS_TOO_OLD = 5

MAX_AGE_DAYS = 365 * 3

DELETE_OLD_RAW_ROWS = True
PURGE_OLD_CLEAN_LISTINGS = False
PURGE_OLD_DUPLICATE_LOGS = False


# =========================
# RENT FILTER
# =========================
RENT_KEYWORDS = [
    "for rent",
    "rent",
    "rental",
    "to rent",
    "location",
    "a louer",
    "a loué",
    "à louer",
    "louer",
    "loyer",
    "par mois",
    "per month",
    "monthly",
    "day rent",
    "daily rent",
    "location vacances",
    "vacances",
    "studio a louer",
    "studio à louer",
    "appartement a louer",
    "appartement à louer",
    "maison a louer",
    "maison à louer",
    "villa a louer",
    "villa à louer",
    "كراء",
    "للكراء",
    "إيجار",
    "للايجار",
    "للإيجار",
    "سومة شهرية",
]


# =========================
# TUNISIA LOCATION HELPERS
# =========================
COUNTRY_ALIASES = {
    "tunisia": ["tunisia", "tunisie", "تونس"],
}

GOVERNORATE_ALIASES = {
    "tunis": [
        "tunis", "تونس", "tunis centre", "centre ville tunis",
        "lac 1", "lac 2", "la marsa", "carthage", "le bardo", "bardo"
    ],
    "ariana": [
        "ariana", "أريانة", "ennasr", "ennaser", "soukra",
        "la soukra", "raoued"
    ],
    "ben_arous": [
        "ben arous", "بن عروس", "rades", "ezzahra",
        "hammam lif", "mornag", "megrine", "mégrine"
    ],
    "manouba": [
        "manouba", "منوبة", "douar hicher", "oued ellil",
        "denden", "tebourba"
    ],
    "nabeul": [
        "nabeul", "نابل", "hammamet", "الحمامات",
        "kelibia", "kélibia", "korba", "soliman"
    ],
    "bizerte": [
        "bizerte", "بنزرت", "mateur", "ras jebel",
        "ras jbel", "menzel bourguiba"
    ],
    "beja": [
        "beja", "béja", "باجة", "testour",
        "medjez el bab", "majaz al bab"
    ],
    "jendouba": [
        "jendouba", "جندوبة", "tabarka", "ain draham",
        "aïn draham", "fernana"
    ],
    "kef": [
        "kef", "le kef", "الكاف", "tajerouine", "dahmani"
    ],
    "siliana": [
        "siliana", "سليانة", "makthar", "gaafour", "rouhia"
    ],
    "zaghouan": [
        "zaghouan", "زغوان", "bir mcherga", "zriba", "fahs", "el fahs"
    ],
    "sousse": [
        "sousse", "سوسة", "chott meriem", "kantaoui",
        "port el kantaoui", "akouda", "hergla", "sahloul"
    ],
    "monastir": [
        "monastir", "المنستير", "moknine", "ksar hellal",
        "sahline", "jemmal"
    ],
    "mahdia": [
        "mahdia", "المهدية", "ksour essaf", "chebba", "la chebba"
    ],
    "sfax": [
        "sfax", "صفاقس", "sakiet ezzit", "mahres", "mharza"
    ],
    "kairouan": [
        "kairouan", "القيروان", "bou hajla", "hajeb el ayoun", "chebika"
    ],
    "kasserine": [
        "kasserine", "القصرين", "sbeitla", "sbiba", "feriana", "fériana"
    ],
    "sidi_bouzid": [
        "sidi bouzid", "سيدي بوزيد", "meknassy", "regueb", "jilma", "jelma"
    ],
    "gafsa": [
        "gafsa", "قفصة", "metlaoui", "métlaoui", "redeyef", "moulares"
    ],
    "tozeur": [
        "tozeur", "توزر", "nefta", "degache", "deggache"
    ],
    "kebili": [
        "kebili", "قبلي", "douz", "souk lahad"
    ],
    "gabes": [
        "gabes", "gabès", "قابس", "mareth", "matmata", "el hamma", "hamma"
    ],
    "medenine": [
        "medenine", "مدنين", "djerba", "jerba", "جربة",
        "houmt souk", "zarzis", "ben gardane"
    ],
    "tataouine": [
        "tataouine", "تطاوين", "remada", "dehiba", "dhéhiba"
    ],
}


# =========================
# DESCRIPTION DEDUPE NORMALIZATION
# =========================
COMMON_REAL_ESTATE_WORDS = {
    "appartement", "villa", "maison", "studio", "terrain", "immeuble",
    "vente", "vendre", "a", "à", "de", "du", "des", "dans", "avec",
    "pour", "sur", "luxe", "standing", "moderne", "haut", "gamme",
    "s1", "s2", "s3", "s4", "s5", "tnd", "dt", "immobiliere",
    "immobilière", "agence", "bien", "propose", "proposer", "offre",
    "annonce", "prix", "superbe", "magnifique"
}

DESCRIPTION_NOISE_PHRASES = [
    "agence immobiliere",
    "agence immobilière",
    "pour plus d informations",
    "pour plus d'information",
    "pour plus d infos",
    "contactez nous",
    "contactez-nous",
    "opportunite a ne pas rater",
    "opportunité à ne pas rater",
    "nous mettons en vente",
    "a vendre chez",
    "à vendre chez",
    "découvrez ce bien",
    "decouvrez ce bien",
    "a saisir",
    "à saisir",
    "pour plus de renseignements",
]


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
    governorate: Optional[str]
    description: str
    normalized_description: str
    image: str
    url: str
    dedupe_key: str
    scraped_at: Optional[str]


# =========================
# BASIC HELPERS
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
# DATETIME HELPERS
# =========================
def parse_datetime(value: Any) -> Optional[datetime]:
    if value is None:
        return None

    if isinstance(value, datetime):
        return value

    value = str(value).strip()
    if not value:
        return None

    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            pass

    return None


def cutoff_datetime() -> datetime:
    return datetime.utcnow() - timedelta(days=MAX_AGE_DAYS)


def is_too_old(scraped_at: Any) -> bool:
    dt = parse_datetime(scraped_at)
    if dt is None:
        return False
    return dt < cutoff_datetime()


# =========================
# RENT DETECTION
# =========================
def is_for_rent(title: str, description: str, price_raw: str = "") -> bool:
    text = normalize_text(f"{title} {description} {price_raw}")
    for word in RENT_KEYWORDS:
        if normalize_text(word) in text:
            return True
    return False


# =========================
# COUNTRY / GOVERNORATE DETECTION
# =========================
def detect_country_governorate(text: str) -> Tuple[Optional[str], Optional[str]]:
    text_norm = normalize_text(text)

    detected_country = None
    detected_governorate = None

    for country, aliases in COUNTRY_ALIASES.items():
        for alias in aliases:
            if normalize_text(alias) in text_norm:
                detected_country = country
                break
        if detected_country:
            break

    for governorate, aliases in GOVERNORATE_ALIASES.items():
        for alias in aliases:
            if normalize_text(alias) in text_norm:
                detected_governorate = governorate
                break
        if detected_governorate:
            break

    if detected_governorate and not detected_country:
        detected_country = "tunisia"

    return detected_country, detected_governorate


def build_normalized_location(country: Optional[str], governorate: Optional[str], location_raw: str) -> str:
    parts = []
    if governorate:
        parts.append(governorate)
    if country:
        parts.append(country)
    if not parts:
        parts.append(normalize_text(location_raw))
    return " | ".join(parts)


def candidate_matches_target(country: Optional[str], governorate: Optional[str]) -> bool:
    if country != TARGET_COUNTRY:
        return False
    if TARGET_GOVERNORATE and governorate != TARGET_GOVERNORATE:
        return False
    return True


# =========================
# DESCRIPTION DEDUPE HELPERS
# =========================
def normalize_description_for_dedupe(text: str) -> str:
    text = normalize_text(text)

    for phrase in DESCRIPTION_NOISE_PHRASES:
        text = text.replace(normalize_text(phrase), " ")

    words = text.split()
    filtered = []

    for w in words:
        if len(w) <= 2:
            continue
        if w in COMMON_REAL_ESTATE_WORDS:
                continue
        filtered.append(w)

    return " ".join(filtered)


def desc_similarity_strict(a: Candidate, b: Candidate) -> float:
    da = normalize_description_for_dedupe(a.description)
    db = normalize_description_for_dedupe(b.description)

    if not da or not db:
        return 0.0

    score_ratio = float(fuzz.ratio(da, db))
    score_sort = float(fuzz.token_sort_ratio(da, db))
    return min(score_ratio, score_sort)


# =========================
# FACT EXTRACTION / CONTRADICTIONS
# =========================
def extract_surface(text: str) -> Optional[float]:
    if not text:
        return None

    lower = text.lower()
    patterns = [
        r'(\d+(?:[.,]\d+)?)\s*m\s*²',
        r'(\d+(?:[.,]\d+)?)\s*m2',
        r'superficie\s*(?:de)?\s*(\d+(?:[.,]\d+)?)',
    ]

    for pattern in patterns:
        m = re.search(pattern, lower)
        if m:
            try:
                return float(m.group(1).replace(",", "."))
            except ValueError:
                return None
    return None


def extract_bedrooms(text: str) -> Optional[int]:
    if not text:
        return None

    lower = text.lower()
    patterns = [
        r'\bs\s*\+\s*(\d+)\b',
        r'\bs(\d+)\b',
        r'(\d+)\s*chambres?',
        r'(\d+)\s*bedrooms?',
        r'(\d+)\s*lits?',
    ]

    for pattern in patterns:
        m = re.search(pattern, lower)
        if m:
            return int(m.group(1))

    return None


def extract_bathrooms(text: str) -> Optional[int]:
    if not text:
        return None

    lower = text.lower()
    patterns = [
        r'(\d+)\s*salles?\s*de\s*bain',
        r'(\d+)\s*sd[b]?',
        r'(\d+)\s*bathrooms?',
    ]

    for pattern in patterns:
        m = re.search(pattern, lower)
        if m:
            return int(m.group(1))

    return None


def contradictory_facts(a: Candidate, b: Candidate) -> bool:
    text_a = f"{a.title} {a.description}"
    text_b = f"{b.title} {b.description}"

    surf_a = extract_surface(text_a)
    surf_b = extract_surface(text_b)
    if surf_a is not None and surf_b is not None and abs(surf_a - surf_b) >= 15:
        return True

    beds_a = extract_bedrooms(text_a)
    beds_b = extract_bedrooms(text_b)
    if beds_a is not None and beds_b is not None and beds_a != beds_b:
        return True

    baths_a = extract_bathrooms(text_a)
    baths_b = extract_bathrooms(text_b)
    if baths_a is not None and baths_b is not None and baths_a != baths_b:
        return True

    return False


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
    if a.governorate != b.governorate:
        return False
    if a.price_value is None or b.price_value is None:
        return False

    return abs(a.price_value - b.price_value) <= max(a.price_value, b.price_value) * 0.03


def same_price(a: Candidate, b: Candidate, tolerance_ratio: float = 0.03) -> bool:
    if a.price_value is None or b.price_value is None:
        return True
    diff = abs(a.price_value - b.price_value)
    return diff <= max(a.price_value, b.price_value) * tolerance_ratio


def is_duplicate(candidate: Candidate, existing: Candidate) -> Tuple[bool, str, Optional[float]]:
    if same_exact_key(candidate, existing):
        return True, "same_exact_key", 100.0

    if contradictory_facts(candidate, existing):
        return False, "", None

    if (
        same_image_and_price(candidate, existing)
        and candidate.governorate == existing.governorate
    ):
        return True, "same_image_price_governorate", 98.0

    if candidate.governorate == existing.governorate and same_price(candidate, existing):
        title_score = float(
            fuzz.token_sort_ratio(candidate.normalized_title, existing.normalized_title)
        )
        desc_score = desc_similarity_strict(candidate, existing)

        # very strong description alone
        if desc_score >= 97:
            return True, "strict_description", round(desc_score, 2)

        # both title and description must be strong
        if title_score >= 96 and desc_score >= 94:
            return True, "strict_title_desc", round((title_score + desc_score) / 2, 2)

    return False, "", None


# =========================
# DB HELPERS
# =========================
def get_connection():
    return mysql.connector.connect(**DB_CONFIG)


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
        WHERE processed = %s
        ORDER BY id ASC
    """, (STATUS_NEW,))
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
            governorate=row["city"],
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
        c.location_raw, c.normalized_location, c.country, c.governorate,
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


def update_raw_status(conn, raw_id: int, status_code: int):
    cur = conn.cursor()
    cur.execute(f"UPDATE {RAW_TABLE} SET processed = %s WHERE id = %s", (status_code, raw_id))
    cur.close()


def delete_raw_row(conn, raw_id: int):
    cur = conn.cursor()
    cur.execute(f"DELETE FROM {RAW_TABLE} WHERE id = %s", (raw_id,))
    cur.close()


def handle_old_raw_row(conn, raw_id: int):
    if DELETE_OLD_RAW_ROWS:
        delete_raw_row(conn, raw_id)
    else:
        update_raw_status(conn, raw_id, STATUS_TOO_OLD)


def purge_old_live_data(conn):
    cur = conn.cursor()
    cutoff = cutoff_datetime()

    if PURGE_OLD_CLEAN_LISTINGS:
        cur.execute(
            "DELETE FROM clean_listings WHERE scraped_at IS NOT NULL AND scraped_at < %s",
            (cutoff,)
        )

    if PURGE_OLD_DUPLICATE_LOGS:
        cur.execute(
            "DELETE FROM duplicates_log WHERE created_at IS NOT NULL AND created_at < %s",
            (cutoff,)
        )

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
    country, governorate = detect_country_governorate(combined_geo_text)

    normalized_title = normalize_text(title)
    normalized_description = normalize_text(description)
    normalized_location = build_normalized_location(country, governorate, location)
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
        governorate=governorate,
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
    conn = get_connection()

    try:
        purge_old_live_data(conn)

        raw_rows = fetch_raw_rows(conn)
        existing_clean = load_existing_clean(conn)

        accepted = 0
        duplicates = 0
        skipped_rent = 0
        skipped_outside_tunisia = 0
        skipped_too_old = 0

        for raw_row in raw_rows:
            if is_too_old(raw_row.get("scraped_at")):
                handle_old_raw_row(conn, int(raw_row["id"]))
                skipped_too_old += 1
                continue

            candidate = build_candidate(raw_row)

            if is_for_rent(candidate.title, candidate.description, candidate.price_raw):
                update_raw_status(conn, candidate.raw_id, STATUS_RENT)
                skipped_rent += 1
                continue

            if not candidate_matches_target(candidate.country, candidate.governorate):
                update_raw_status(conn, candidate.raw_id, STATUS_OUTSIDE_TUNISIA)
                skipped_outside_tunisia += 1
                continue

            found_duplicate = False

            for clean_id, existing in existing_clean:
                dup, reason, score = is_duplicate(candidate, existing)
                if dup:
                    insert_duplicate_log(conn, raw_row, reason, clean_id, score)
                    update_raw_status(conn, candidate.raw_id, STATUS_DUPLICATE)
                    duplicates += 1
                    found_duplicate = True
                    break

            if found_duplicate:
                continue

            new_clean_id = insert_clean_listing(conn, candidate)
            existing_clean.append((new_clean_id, candidate))
            update_raw_status(conn, candidate.raw_id, STATUS_ACCEPTED)
            accepted += 1

        conn.commit()

        print(f"Read raw rows: {len(raw_rows)}")
        print(f"Accepted: {accepted}")
        print(f"Duplicates: {duplicates}")
        print(f"Skipped rent: {skipped_rent}")
        print(f"Skipped outside Tunisia: {skipped_outside_tunisia}")
        print(f"Skipped too old: {skipped_too_old}")
        print(f"Old raw rows deleted: {'yes' if DELETE_OLD_RAW_ROWS else 'no'}")

    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()