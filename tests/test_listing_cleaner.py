import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))

from listing_cleaner import parse_price  # noqa: E402


def test_parse_price_keeps_space_thousand_separators():
    assert parse_price("260 000 DT") == 260000
    assert parse_price("2 100 000 DT") == 2100000
    assert parse_price("390 000 TND") == 390000


def test_parse_price_keeps_plain_small_prices():
    assert parse_price("18 DT") == 18
    assert parse_price("260,50 DT") == 260.5


def test_parse_price_handles_dot_thousand_separator_and_multipliers():
    assert parse_price("260.000 DT") == 260000
    assert parse_price("1.2 million DT") == 1200000
    assert parse_price("260 mille DT") == 260000


def test_parse_price_returns_none_without_amount():
    assert parse_price("Prix sur demande") is None
