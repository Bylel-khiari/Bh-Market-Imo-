import html
import json
import re
from urllib.parse import urlparse


IMAGE_EXT_RE = re.compile(r"\.(?:avif|gif|jpe?g|png|webp)(?:$|[?#])", re.IGNORECASE)
SCRIPT_IMAGE_URL_RE = re.compile(
    r"https?:\\?/\\?/[^\"'\s<>]+?\.(?:avif|gif|jpe?g|png|webp)(?:\?[^\"'\s<>]*)?",
    re.IGNORECASE,
)
STYLE_URL_RE = re.compile(r"url\((['\"]?)(.*?)\1\)", re.IGNORECASE)
SKIP_IMAGE_NAME_RE = re.compile(
    r"(?:^|[-_.])(?:avatar|blank|default|favicon|icon|loader|loading|logo|placeholder|spinner|sprite|transparent)(?:[-_.]|$)",
    re.IGNORECASE,
)

IMAGE_KEYS = {
    "image",
    "images",
    "imageurl",
    "imageurls",
    "image_urls",
    "thumbnail",
    "thumbnailurl",
    "thumbnail_url",
    "photo",
    "photos",
    "picture",
    "pictures",
    "contenturl",
}

IMAGE_OBJECT_TYPES = {"imageobject", "photoobject"}

IMAGE_ATTRS = (
    "src",
    "data-src",
    "data-lazy-src",
    "data-original",
    "data-full",
    "data-large",
    "data-zoom-image",
    "data-bg",
    "content",
)

BASE_IMAGE_SELECTORS = (
    "meta[property='og:image']::attr(content)",
    "meta[property='og:image:secure_url']::attr(content)",
    "meta[name='twitter:image']::attr(content)",
    "meta[itemprop='image']::attr(content)",
    "img[itemprop='image']::attr(src)",
    "img[itemprop='image']::attr(data-src)",
)

GALLERY_CONTAINERS = (
    ".gallery",
    ".property-gallery",
    ".property-slider",
    ".pro-details-slider",
    ".swiper",
    ".swiper-slide",
    ".slick-slider",
    ".slick-slide",
    ".carousel",
    ".slider",
    ".slides",
    ".photos",
    ".photo",
    ".images",
    ".image-gallery",
    ".fotorama",
    "article",
    "main",
)


def normalize_image_url(response, value, *, require_image_like=False):
    if value is None:
        return None

    raw = html.unescape(str(value)).strip().strip("\"'")
    if not raw:
        return None

    raw = raw.replace("\\/", "/")
    lower = raw.lower()
    if lower.startswith(("data:", "blob:", "javascript:", "mailto:", "tel:")):
        return None

    absolute = response.urljoin(raw).split("#", 1)[0]
    parsed = urlparse(absolute)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None

    if require_image_like and not IMAGE_EXT_RE.search(absolute):
        return None

    filename = parsed.path.rsplit("/", 1)[-1]
    if filename and SKIP_IMAGE_NAME_RE.search(filename):
        return None

    return absolute


def first_image(images):
    return images[0] if images else None


def _best_srcset_url(srcset):
    best_url = None
    best_score = -1

    for index, part in enumerate(str(srcset or "").split(",")):
        bits = part.strip().split()
        if not bits:
            continue

        url = bits[0]
        descriptor = bits[1] if len(bits) > 1 else ""
        score = index
        if descriptor.endswith("w"):
            try:
                score = int(descriptor[:-1])
            except ValueError:
                score = index
        elif descriptor.endswith("x"):
            try:
                score = int(float(descriptor[:-1]) * 1000)
            except ValueError:
                score = index

        if score >= best_score:
            best_url = url
            best_score = score

    return best_url


def _iter_image_values(value):
    if value is None:
        return

    if isinstance(value, str):
        yield value
        return

    if isinstance(value, dict):
        for key in ("url", "contentUrl", "src", "image", "thumbnailUrl"):
            candidate = value.get(key)
            if candidate:
                yield from _iter_image_values(candidate)
        return

    if isinstance(value, (list, tuple, set)):
        for element in value:
            yield from _iter_image_values(element)


def _collect_json_images(payload, add):
    def visit(value, key_name=""):
        if isinstance(value, dict):
            type_value = value.get("@type") or value.get("type")
            type_values = type_value if isinstance(type_value, list) else [type_value]
            is_image_object = any(
                str(item or "").strip().lower() in IMAGE_OBJECT_TYPES for item in type_values
            )

            if is_image_object:
                for candidate in _iter_image_values(
                    value.get("url") or value.get("contentUrl") or value.get("thumbnailUrl")
                ):
                    add(candidate)

            for key, child in value.items():
                normalized_key = str(key).replace("-", "").lower()
                if normalized_key in IMAGE_KEYS:
                    for candidate in _iter_image_values(child):
                        add(candidate)
                visit(child, normalized_key)
            return

        if isinstance(value, list):
            for element in value:
                visit(element, key_name)

    visit(payload)


def extract_listing_images(response, extra_selectors=()):
    images = []
    seen = set()

    def add(candidate, *, require_image_like=False):
        normalized = normalize_image_url(
            response,
            candidate,
            require_image_like=require_image_like,
        )
        if not normalized or normalized in seen:
            return

        seen.add(normalized)
        images.append(normalized)

    for selector in BASE_IMAGE_SELECTORS + tuple(extra_selectors):
        for candidate in response.css(selector).getall():
            add(candidate)

    for container in GALLERY_CONTAINERS:
        for attr in IMAGE_ATTRS:
            for candidate in response.css(f"{container} img::attr({attr})").getall():
                add(candidate)

            for candidate in response.css(f"{container} source::attr({attr})").getall():
                add(candidate)

        for srcset in response.css(
            f"{container} img::attr(srcset), {container} img::attr(data-srcset), "
            f"{container} source::attr(srcset), {container} source::attr(data-srcset)"
        ).getall():
            add(_best_srcset_url(srcset))

        for href in response.css(f"{container} a::attr(href)").getall():
            add(href, require_image_like=True)

        for style in response.css(f"{container}::attr(style), {container} [style*='url']::attr(style)").getall():
            for _, style_url in STYLE_URL_RE.findall(style):
                add(style_url, require_image_like=True)

    for raw in response.css("script[type='application/ld+json']::text").getall():
        raw = (raw or "").strip()
        if not raw:
            continue

        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            continue

        _collect_json_images(payload, add)

    for match in SCRIPT_IMAGE_URL_RE.findall(response.text or ""):
        add(match, require_image_like=True)

    return images
