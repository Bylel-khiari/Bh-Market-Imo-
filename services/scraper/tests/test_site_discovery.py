import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from real_estate_scraper.site_discovery import (  # noqa: E402
    dedupe_candidates,
    normalize_base_url,
    normalize_domain,
    score_candidate,
)


def test_normalize_domain_strips_scheme_www_and_path():
    assert normalize_domain("https://www.immotn.com/annonces?utm_source=x") == "immotn.com"
    assert normalize_domain("dyar.tn/proprietes") == "dyar.tn"


def test_normalize_base_url_keeps_clean_origin():
    assert normalize_base_url("https://www.diarkoum.tn/annonces/appartement") == "https://diarkoum.tn"


def test_score_candidate_detects_tunisian_real_estate_signals():
    candidate = score_candidate(
        {
            "name": "Portail immobilier Tunisie",
            "url": "https://example.tn/annonces/appartement-a-vendre",
            "snippet": "Appartement et villa a vendre a Tunis, prix 350 000 DT.",
        },
        "<html><body>Maison terrain agence immobiliere Sousse TND location</body></html>",
    )

    assert candidate.domain == "example.tn"
    assert candidate.confidence_score >= 70
    assert "immobilier" in candidate.evidence["matched_keywords"]
    assert candidate.evidence["price_signal"] is True


def test_dedupe_candidates_keeps_best_score_per_domain():
    low = score_candidate(
        {"name": "Example", "url": "https://example.tn", "snippet": "immobilier Tunisie"},
        "",
    )
    high = score_candidate(
        {
            "name": "Example high",
            "url": "https://www.example.tn/appartement",
            "snippet": "annonces immobilieres Tunisie appartement a vendre 200 000 DT Tunis",
        },
        "",
    )

    deduped = dedupe_candidates([low, high])

    assert len(deduped) == 1
    assert deduped[0].name == "Example high"
