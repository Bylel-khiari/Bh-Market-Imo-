from .knowledge_base import normalize_text


CHARGES_RATIO_LIMIT = 0.40
ACCEPTANCE_SCORE = 60

CONTRACT_RULES = [
    ("fonctionnaire", 25, "Situation contractuelle tres stable"),
    ("titulaire", 25, "Situation contractuelle tres stable"),
    ("cdi", 25, "Contrat stable"),
    ("retraite", 18, "Revenu regulier"),
    ("profession liberale", 18, "Revenu professionnel a verifier"),
    ("profession libre", 18, "Revenu professionnel a verifier"),
    ("independant", 16, "Revenu independant a consolider"),
    ("cdd", 12, "Contrat acceptable avec vigilance"),
    ("stage", 4, "Situation contractuelle fragile"),
    ("sans contrat", 0, "Absence de contrat stable"),
    ("sans emploi", 0, "Absence de revenu professionnel stable"),
    ("chomeur", 0, "Absence de revenu professionnel stable"),
]

FAMILY_RULES = [
    ("celibataire", 15, "Charges familiales limitees"),
    ("marie sans enfant", 15, "Situation familiale stable"),
    ("avec enfant", 11, "Charges familiales a prendre en compte"),
    ("marie", 13, "Situation familiale stable"),
    ("divorce", 10, "Situation familiale a verifier"),
    ("veuf", 10, "Situation familiale a verifier"),
]


def _round_money(value):
    return round(float(value), 2)


def _match_rule(value, rules, default_score, default_message):
    normalized_value = normalize_text(value)

    for keyword, score, message in rules:
        if normalize_text(keyword) in normalized_value:
            return score, message

    return default_score, default_message


def _capacity_score(charges_ratio):
    if charges_ratio <= CHARGES_RATIO_LIMIT:
        # A compliant ratio keeps at least 40/60 points, then gains margin.
        margin = (CHARGES_RATIO_LIMIT - charges_ratio) / CHARGES_RATIO_LIMIT
        return round(40 + (max(0, margin) * 20))

    overflow = min((charges_ratio - CHARGES_RATIO_LIMIT) / (1 - CHARGES_RATIO_LIMIT), 1)
    return round(max(0, 40 - (overflow * 40)))


def _risk_level(score):
    if score >= 80:
        return "faible"
    if score >= ACCEPTANCE_SCORE:
        return "moyen"
    return "eleve"


def score_credit_application(request):
    annual_income = float(request.revenu_annuel)
    unpaid_charges = float(request.charges_impayees)
    charges_limit = annual_income * CHARGES_RATIO_LIMIT
    remaining_income = annual_income - unpaid_charges
    charges_ratio = unpaid_charges / annual_income if annual_income > 0 else 1

    charges_passed = unpaid_charges <= charges_limit
    capacity_score = _capacity_score(charges_ratio)

    contract_score, contract_message = _match_rule(
        request.situation_contractuelle,
        CONTRACT_RULES,
        8,
        "Situation contractuelle non standard a verifier",
    )
    contract_passed = contract_score >= 12

    family_score, family_message = _match_rule(
        request.situation_familiale,
        FAMILY_RULES,
        8,
        "Situation familiale non standard a verifier",
    )

    score = max(0, min(100, capacity_score + contract_score + family_score))
    accepted = charges_passed and contract_passed and score >= ACCEPTANCE_SCORE
    decision = "ACCEPTE" if accepted else "REFUSE"

    if charges_passed:
        charges_message = (
            "Charges conformes: "
            f"{_round_money(unpaid_charges)} <= {_round_money(charges_limit)}"
        )
    else:
        charges_message = (
            "Charges trop elevees: "
            f"{_round_money(unpaid_charges)} > {_round_money(charges_limit)}"
        )

    criteria = [
        {
            "nom": "Capacite de remboursement",
            "valide": charges_passed,
            "score": capacity_score,
            "message": charges_message,
        },
        {
            "nom": "Situation contractuelle",
            "valide": contract_passed,
            "score": contract_score,
            "message": contract_message,
        },
        {
            "nom": "Situation familiale",
            "valide": family_score >= 8,
            "score": family_score,
            "message": family_message,
        },
    ]

    summary = (
        f"Dossier {decision.lower()} avec un score de {score}/100. "
        f"Le taux de charges est de {round(charges_ratio * 100, 2)}% "
        f"pour un seuil maximal de {round(CHARGES_RATIO_LIMIT * 100)}%."
    )
    recommendation = (
        "Le dossier respecte la regle principale et peut passer a l'etape d'etude bancaire."
        if accepted
        else "Le dossier doit etre rejete ou revu par un agent bancaire avant acceptation."
    )

    return {
        "decision": decision,
        "score": score,
        "niveau_risque": _risk_level(score),
        "formule": "charges_impayees <= revenu_annuel * 0.40",
        "taux_charges": round(charges_ratio * 100, 2),
        "plafond_charges": _round_money(charges_limit),
        "reste_apres_charges": _round_money(remaining_income),
        "criteres": criteria,
        "resume": summary,
        "recommandation": recommendation,
    }
