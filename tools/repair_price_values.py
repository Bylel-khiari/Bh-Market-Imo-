import argparse
import json
import os
from pathlib import Path

import mysql.connector


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_ENV_FILES = [
    ROOT_DIR / "apps" / "server" / ".env",
    ROOT_DIR / ".env",
]


def load_env_files():
    for env_path in DEFAULT_ENV_FILES:
        if not env_path.exists():
            continue

        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


def get_connection():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "127.0.0.1"),
        port=int(os.getenv("MYSQL_PORT", "3306")),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", ""),
        database=os.getenv("MYSQL_DATABASE", "database"),
        autocommit=False,
    )


def quote_identifier(value):
    return f"`{str(value).replace('`', '``')}`"


def table_exists(cursor, table_name):
    cursor.execute("SHOW TABLES LIKE %s", (table_name,))
    return cursor.fetchone() is not None


def column_exists(cursor, table_name, column_name):
    cursor.execute(f"SHOW COLUMNS FROM {quote_identifier(table_name)} LIKE %s", (column_name,))
    return cursor.fetchone() is not None


def values_are_different(current_value, next_value):
    if current_value is None:
        return True

    try:
        return abs(float(current_value) - float(next_value)) >= 0.01
    except (TypeError, ValueError):
        return True


def repair_column(cursor, table_name, raw_column, value_column, parse_price, apply_changes):
    if not table_exists(cursor, table_name):
        return {
            "table": table_name,
            "raw_column": raw_column,
            "value_column": value_column,
            "updated": 0,
            "skipped": "missing_table",
        }

    if not column_exists(cursor, table_name, raw_column) or not column_exists(cursor, table_name, value_column):
        return {
            "table": table_name,
            "raw_column": raw_column,
            "value_column": value_column,
            "updated": 0,
            "skipped": "missing_column",
        }

    cursor.execute(
        f"""
        SELECT id, {quote_identifier(raw_column)} AS raw_price, {quote_identifier(value_column)} AS current_price
        FROM {quote_identifier(table_name)}
        WHERE {quote_identifier(raw_column)} IS NOT NULL
          AND TRIM({quote_identifier(raw_column)}) <> ''
        """
    )
    rows = cursor.fetchall()
    updates = []

    for row_id, raw_price, current_price in rows:
        next_price = parse_price(raw_price)
        if next_price is None or not values_are_different(current_price, next_price):
            continue

        updates.append((next_price, row_id, raw_price, current_price))

    if apply_changes and updates:
        cursor.executemany(
            f"""
            UPDATE {quote_identifier(table_name)}
            SET {quote_identifier(value_column)} = %s
            WHERE id = %s
            """,
            [(next_price, row_id) for next_price, row_id, _, _ in updates],
        )

    examples = [
        {
            "id": row_id,
            "price_raw": raw_price,
            "old_price_value": None if current_price is None else float(current_price),
            "new_price_value": next_price,
        }
        for next_price, row_id, raw_price, current_price in updates[:10]
    ]

    return {
        "table": table_name,
        "raw_column": raw_column,
        "value_column": value_column,
        "updated": len(updates),
        "examples": examples,
    }


def main():
    parser = argparse.ArgumentParser(description="Repair parsed property prices from raw price strings.")
    parser.add_argument("--apply", action="store_true", help="Apply updates. Without this flag, only prints a dry-run.")
    args = parser.parse_args()

    load_env_files()

    # Import after loading env files so listing_cleaner sees the same runtime config.
    from listing_cleaner import parse_price

    connection = get_connection()

    try:
        cursor = connection.cursor()
        results = [
            repair_column(cursor, "clean_listings", "price_raw", "price_value", parse_price, args.apply),
            repair_column(cursor, "properties", "price_raw", "price_value", parse_price, args.apply),
            repair_column(cursor, "properties", "manual_price_raw", "manual_price_value", parse_price, args.apply),
        ]

        if args.apply:
            connection.commit()
        else:
            connection.rollback()

        print(json.dumps({"mode": "apply" if args.apply else "dry_run", "results": results}, indent=2, ensure_ascii=False))
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


if __name__ == "__main__":
    main()
