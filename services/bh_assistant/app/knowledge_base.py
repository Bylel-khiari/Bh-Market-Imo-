import re
import unicodedata


DEFAULT_SUGGESTIONS = [
    "Chercher un bien",
    "Simulation crédit",
    "Documents nécessaires",
    "Contacter un agent",
]

INTENT_RESPONSES = {
    "credit_simulation": {
        "keywords": [
            "simulation credit",
            "simuler credit",
            "credit immobilier",
            "pret immobilier",
            "mensualite",
            "mensualites",
            "taux",
            "financement",
        ],
        "reply": (
            "Pour faire une simulation de crédit immobilier BH, indiquez le prix du bien, "
            "votre apport personnel, le montant souhaité, vos revenus et la durée envisagée. "
            "La simulation donne une première estimation, mais les taux, mensualités et conditions "
            "exactes doivent être confirmés par un conseiller BH."
        ),
        "suggestions": ["Lancer une simulation", "Documents nécessaires", "Contacter un conseiller"],
        "handoff": False,
    },
    "credit_documents": {
        "keywords": [
            "documents",
            "dossier",
            "pieces",
            "piece",
            "papier",
            "justificatif",
            "cin",
            "bulletin de paie",
        ],
        "reply": (
            "Pour préparer un dossier de crédit immobilier, prévoyez généralement une pièce d'identité, "
            "des justificatifs de revenus, un RIB, les informations sur le bien, et tout document lié "
            "à votre situation professionnelle ou au compromis de vente. La liste exacte peut varier "
            "selon votre profil : un conseiller BH pourra confirmer les pièces nécessaires."
        ),
        "suggestions": ["Simulation crédit", "Étapes du crédit", "Contacter un agent"],
        "handoff": False,
    },
    "contact_agent": {
        "keywords": [
            "contacter",
            "contact",
            "agent",
            "conseiller",
            "rendez vous",
            "rdv",
            "appeler",
            "telephone",
            "email",
        ],
        "reply": (
            "Vous pouvez demander à être recontacté par un agent BH Market Imo en précisant votre besoin "
            "et vos coordonnées. Si vous consultez un bien précis, indiquez aussi sa référence ou son lien "
            "pour aider l'équipe à vous répondre plus vite."
        ),
        "suggestions": ["Je veux acheter", "Simulation crédit", "Chercher un bien"],
        "handoff": True,
    },
    "search_property": {
        "keywords": [
            "chercher un bien",
            "rechercher un bien",
            "trouver un bien",
            "recherche",
            "bien immobilier",
            "annonce",
            "maison",
            "appartement",
            "terrain",
            "villa",
        ],
        "reply": (
            "Pour chercher un bien, commencez par choisir le type de transaction, la ville ou la zone, "
            "votre budget et le type de bien souhaité. Vous pouvez ensuite comparer les annonces, ouvrir "
            "les détails et signaler les biens qui vous intéressent."
        ),
        "suggestions": ["Je veux acheter", "Je veux louer", "Contacter un agent"],
        "handoff": False,
    },
    "buy_property": {
        "keywords": [
            "acheter",
            "achat",
            "j achete",
            "je veux acheter",
            "acquerir",
            "acquisition",
        ],
        "reply": (
            "Pour acheter un bien, identifiez d'abord votre budget, le type de bien et la zone souhaitée. "
            "BH Market Imo peut vous aider à parcourir les annonces, préparer une simulation de crédit "
            "et demander un contact avec un agent pour avancer sur le dossier."
        ),
        "suggestions": ["Chercher un bien", "Simulation crédit", "Documents nécessaires"],
        "handoff": False,
    },
    "sell_property": {
        "keywords": [
            "vendre",
            "vente",
            "je veux vendre",
            "mettre en vente",
            "publier mon bien",
            "proprietaire",
        ],
        "reply": (
            "Pour vendre un bien, préparez les informations principales : localisation, surface, prix souhaité, "
            "photos, description et documents de propriété. Vous pouvez ensuite demander un accompagnement "
            "afin qu'un agent vous aide à qualifier l'annonce et les prochaines étapes."
        ),
        "suggestions": ["Contacter un agent", "Documents nécessaires", "Questions sur la plateforme"],
        "handoff": True,
    },
    "rent_property": {
        "keywords": [
            "louer",
            "location",
            "je veux louer",
            "locataire",
            "loyer",
            "appartement a louer",
        ],
        "reply": (
            "Pour louer un appartement ou une maison, indiquez la ville, le quartier, le budget mensuel, "
            "la surface souhaitée et vos critères prioritaires. Je peux vous aider à formuler la recherche "
            "ou à demander un contact avec un agent."
        ),
        "suggestions": ["Chercher un bien", "Contacter un agent", "Documents nécessaires"],
        "handoff": False,
    },
    "credit_steps": {
        "keywords": [
            "etapes credit",
            "processus credit",
            "comment se passe le credit",
            "demande de credit",
            "acceptation credit",
            "etude du dossier",
        ],
        "reply": (
            "Les grandes étapes d'un crédit immobilier sont généralement : simulation, préparation du dossier, "
            "dépôt de la demande, vérification des documents, étude bancaire, décision, puis finalisation. "
            "Les délais et conditions dépendent du dossier et doivent être confirmés par la banque."
        ),
        "suggestions": ["Simulation crédit", "Documents nécessaires", "Contacter un conseiller"],
        "handoff": False,
    },
    "platform_help": {
        "keywords": [
            "plateforme",
            "bh market imo",
            "comment utiliser",
            "compte",
            "favoris",
            "dashboard",
            "site",
        ],
        "reply": (
            "BH Market Imo vous permet de consulter des biens, suivre vos favoris, préparer une demande de crédit "
            "et contacter l'équipe selon votre besoin. Dites-moi ce que vous voulez faire et je vous oriente vers "
            "la bonne étape."
        ),
        "suggestions": ["Chercher un bien", "Simulation crédit", "Contacter un agent"],
        "handoff": False,
    },
}

INTENT_PRIORITY = [
    "credit_documents",
    "credit_steps",
    "credit_simulation",
    "contact_agent",
    "sell_property",
    "buy_property",
    "rent_property",
    "search_property",
    "platform_help",
]


def normalize_text(value):
    normalized = unicodedata.normalize("NFD", value or "")
    without_accents = "".join(char for char in normalized if unicodedata.category(char) != "Mn")
    lowered = without_accents.lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", lowered)).strip()


def detect_intent(message):
    normalized_message = normalize_text(message)

    if not normalized_message:
        return None

    for intent_name in INTENT_PRIORITY:
        response = INTENT_RESPONSES[intent_name]
        for keyword in response["keywords"]:
            if normalize_text(keyword) in normalized_message:
                return intent_name

    return None


def get_response_for_intent(intent_name):
    return INTENT_RESPONSES.get(intent_name)

