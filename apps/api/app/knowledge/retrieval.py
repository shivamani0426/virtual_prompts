"""Deterministic retrieval: no arbitrary URLs, scraping, or model-created citations."""

import json
import re
import unicodedata
from functools import lru_cache
from pathlib import Path

_DATA = Path(__file__).with_name("verified_sources.json")
_STOP = frozenset(
    "a an about above after against all am and are as at be because before below but can "
    "could do does for from how i if in into is it its me my of on or our should so "
    "than that the their them there these this to us we what when where which who why "
    "will with would you your please tell give show explain help want need".split()
)
_SYNONYMS = {
    "pm25": {"pm25", "particulate", "particles"},
    "pm10": {"pm10", "particulate", "particles"},
    "asthma": {"asthma", "sensitive", "breathing", "risk"},
    "lungs": {"lungs", "breathing", "respiratory"},
    "baby": {"baby", "children", "sensitive"},
    "children": {"children", "sensitive"},
    "child": {"children", "sensitive"},
    "elderly": {"elderly", "older", "sensitive"},
    "exercise": {"exercise", "outside", "outdoor", "running"},
    "jog": {"exercise", "running"},
    "run": {"exercise", "running"},
    "play": {"exercise", "children", "outdoor"},
    "indoors": {"indoor", "home"},
    "airfilter": {"filter", "purifier", "hepa"},
    "n95": {"n95", "mask", "respirator"},
    "index": {"index", "aqi", "scale"},
    "compare": {"compare", "scale"},
    "convert": {"compare", "scale"},
    "india": {"india", "cpcb"},
    "carbon": {"carbon", "co2", "emissions"},
    "emissions": {"emissions", "transport", "pollution"},
}


def tokens(value: str) -> set[str]:
    normalized = unicodedata.normalize("NFKD", value.lower())
    normalized = normalized.replace("₂", "2").replace("₅", "5").replace("pm2.5", "pm25")
    words = set(re.findall(r"[a-z0-9]+", normalized)) - _STOP
    # A query can contain malicious instructions; only its topic terms affect retrieval.
    expanded = set(words)
    for word in words:
        expanded.update(_SYNONYMS.get(word, ()))
    return expanded


@lru_cache(maxsize=1)
def registry() -> dict:
    data = json.loads(_DATA.read_text(encoding="utf-8"))
    if not data.get("registry_version") or not isinstance(data.get("sources"), list):
        raise RuntimeError("RAG registry is missing or invalid")
    ids = set()
    for item in data["sources"]:
        if not all(item.get(field) for field in ("id", "publisher", "title", "url", "section", "fact", "verified")):
            raise RuntimeError("RAG evidence has missing citation metadata")
        if item["id"] in ids:
            raise RuntimeError("Duplicate evidence ID")
        ids.add(item["id"])
        if not item["url"].startswith(("https://www.who.int/", "https://airquality.cpcb.gov.in/")):
            raise RuntimeError("Evidence source is outside WHO/CPCB allowlist")
    return data


def retrieve(question: str, limit: int = 3) -> list[dict]:
    query = tokens(question)
    if not query:
        return []
    candidates = []
    for item in registry()["sources"]:
        tag_tokens = tokens(" ".join(item.get("tags", [])))
        fact_tokens = tokens(item["fact"] + " " + item["section"])
        tag_hits = len(query & tag_tokens)
        fact_hits = len(query & fact_tokens)
        score = tag_hits * 4 + fact_hits
        if score >= 4 and tag_hits:
            candidates.append((score, tag_hits, item["id"], item))
    candidates.sort(key=lambda item: (-item[0], -item[1], item[2]))
    return [item[3] for item in candidates[:limit]]


def citation(item: dict) -> dict:
    return {
        field: item[field]
        for field in ("id", "publisher", "title", "url", "section", "published", "verified")
    }
