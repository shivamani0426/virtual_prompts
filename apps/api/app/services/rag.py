"""Grounded assistant: strict evidence retrieval, optional AI phrasing, safe fallback."""

import os
import re
from typing import Literal

import httpx

from app.knowledge.retrieval import citation, registry, retrieve, tokens

_MODEL_URL = "https://winter-smog-rag-ai.1nc24cs197.workers.dev/assist"
_URGENT = re.compile(
    r"(?i)\b(can't breathe|cannot breathe|severe breath(?:ing)?|struggling to breathe|"
    r"chest pain|fainting|blue lips|unconscious|emergency ambulance|difficulty breathing|shortness of breath|breathless|severe wheezing)\b"
)

# Recognize high-risk phrases from the six supported regional-language inputs.
# These explicit phrases trigger escalation, not personal medical assessment.
_REGIONAL_URGENT = re.compile(
    r"(सांस लेने में तकलीफ|साँस लेने में तकलीफ|सांस लेने में तकलीफ़|साँस लेने में तकलीफ़|सांस लेने में दिक्कत|"
    r"साँस लेने में दिक्कत|सीने में दर्द|"
    r"ಉಸಿರಾಡಲು ಕಷ್ಟ|ಎದೆ ನೋವು|"
    r"శ్వాస తీసుకోవడం కష్టం|ఛాతీ నొప్పి|"
    r"மூச்சு விட சிரமம்|நெஞ்சு வலி|"
    r"শ্বাস নিতে কষ্ট|বুকে ব্যথা|"
    r"श्वास घेण्यास त्रास|छातीत दुखणे|"
    r"saans nahi aa rahi|saas nahi aa rahi)",
    re.IGNORECASE,
)
# English-only reviewed evidence must not silently imply translated authority.
_REGIONAL_SCRIPT = re.compile(r"[\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0CFF]")

_MEDICAL = re.compile(
    r"(?i)\b(stop|start|change|increase|decrease|dose|prescribe|prescription|"
    r"medicine|medication|inhaler|antibiotic|diagnos(?:e|is)|cure|treat my)\b"
)
_CURRENT = re.compile(
    r"(?i)\b(right now|currently|at this moment|live aqi|today'?s aqi|"
    r"aqi today|weather now|current weather in|current pollution in|actual air quality in|air quality now|"
    r"pollution level in .* today)\b"
)
_INJECTION = re.compile(
    r"(?i)(ignore (all |previous |your |the )?instructions|"
    r"override (system|developer)|developer mode|system prompt|jailbreak|"
    r"disable safety|fake (source|citation)|fabricate a (source|citation))"
)
_INVALID = re.compile(
    r"(?i)(\b(?:100\s*%|guarantee(?:d|s)?|risk.free|perfectly safe|"
    r"cure(?:s|d)?|always safe|no health risk|stop medication)\b|"
    r"<script|javascript:|https?://|\[\d+\])"
)
_DISCLAIMER = (
    "General educational information, not diagnosis or medical advice. "
    "Consult qualified clinicians and official local alerts for individual decisions."
)


def response(
    *,
    mode: Literal["evidence_only", "generated", "abstained", "urgent_safety"],
    text: str,
    passages: list[dict],
    limitations: list[str] | None = None,
) -> dict:
    return {
        "mode": mode,
        "answer": text,
        "citations": [citation(p) for p in passages],
        "registry_version": registry()["registry_version"],
        "limitations": limitations or [],
        "disclaimer": _DISCLAIMER,
        "live_data_used": False,
    }


def extractive_answer(passages: list[dict]) -> str:
    return "\n\n".join(p["fact"] for p in passages[:2])


def reviewed_numerical_claims_only(answer: str, passages: list[dict]) -> bool:
    """Numeric model sentences must match complete reviewed evidence sentences.

    Matching only a bag of known numbers cannot detect swapped WHO annual and
    24-hour concentrations. Any rephrased numerical sentence fails closed.
    """
    def sentences(value: str) -> list[str]:
        return re.split(r"(?<=[.!?])\s+(?=[A-Za-z0-9])", value.strip())

    def canonical(value: str) -> str:
        return re.sub(r"\s+", " ", value.casefold()).strip().strip(".!?*")

    evidence = {
        canonical(sentence)
        for passage in passages
        for sentence in sentences(passage["fact"])
        if re.search(r"\d", sentence)
    }
    for sentence in sentences(answer):
        if re.search(r"\d", sentence) and canonical(sentence) not in evidence:
            return False
    return True



_CLAIM_QUALIFIERS = re.compile(
    r"\b(?:can|cannot|could|may|must|should|not|no|never|always|"
    r"safe|unsafe|reduce|increase|avoid|guarantee|guaranteed|"
    r"higher|lower|more|less|all|none|every)\b",
    re.IGNORECASE,
)


def reviewed_qualitative_claims_only(answer: str, passages: list[dict]) -> bool:
    """Reject ungrounded sentence-level changes in advice or certainty.

    This is intentionally conservative. Matching qualifiers and vocabulary is
    defense in depth; it is not proof of semantic entailment.
    """
    def split(value: str) -> list[str]:
        return re.split(r"(?<=[.!?])\s+(?=[A-Za-z0-9])", value.strip())

    facts = [sentence for p in passages for sentence in split(p["fact"])]
    for sentence in split(answer):
        if re.search(r"\d", sentence):
            continue  # Numeric claims have a stricter exact-evidence rule.
        words = tokens(sentence)
        if not words:
            return False
        qualifiers = set(_CLAIM_QUALIFIERS.findall(sentence.casefold()))
        if not any(
            len(words & tokens(fact)) / len(words) >= 0.80
            and qualifiers == set(_CLAIM_QUALIFIERS.findall(fact.casefold()))
            for fact in facts
        ):
            return False
    return True

def generation_supported(answer: str, passages: list[dict]) -> bool:
    if not isinstance(answer, str) or len(answer) < 30 or len(answer) > 950:
        return False
    if _INVALID.search(answer):
        return False
    evidence = " ".join(p["fact"] for p in passages)
    # Numbers from a free-text question never become facts. Only reviewed evidence counts.
    evidence_numbers = set(re.findall(r"\b\d+(?:\.\d+)?\b", evidence))
    generated_numbers = set(re.findall(r"\b\d+(?:\.\d+)?\b", answer))
    if not generated_numbers.issubset(evidence_numbers):
        return False
    if not reviewed_numerical_claims_only(answer, passages):
        return False
    if not reviewed_qualitative_claims_only(answer, passages):
        return False
    meaningful = tokens(answer)
    supported = tokens(evidence)
    if not meaningful:
        return False
    # Heuristic defense-in-depth, NOT a formal factual-entailment proof.
    if len(meaningful & supported) / len(meaningful) < 0.58:
        return False
    return True


class RAGAssistant:
    def __init__(self, client: httpx.AsyncClient, model_enabled: bool | None = None):
        self.client = client
        self.model_enabled = (
            os.getenv("RAG_MODEL_ENABLED", "0") == "1"
            if model_enabled is None else model_enabled
        )

    async def answer(self, question: str) -> dict:
        query = question.strip()
        if _URGENT.search(query) or _REGIONAL_URGENT.search(query):
            return response(
                mode="urgent_safety", passages=[],
                text=(
                    "Severe breathing difficulty, chest pain or other emergency symptoms need "
                    "urgent medical attention. Contact your local emergency service or seek "
                    "emergency care immediately. This assistant cannot diagnose symptoms."
                ),
                limitations=["No personal medical assessment has been performed."],
            )
        if _INJECTION.search(query):
            return response(
                mode="abstained", passages=[],
                text="I can only help with questions about WHO/CPCB air-quality guidance using reviewed sources.",
                limitations=["Instructions to bypass evidence and safety checks are not followed."],
            )
        if _MEDICAL.search(query):
            return response(
                mode="abstained", passages=[],
                text=(
                    "I cannot prescribe, stop or change medication, diagnose symptoms or give "
                    "individual treatment advice. Please consult a qualified clinician."
                ),
                limitations=["Medical decisions require professional assessment."],
            )
        if _CURRENT.search(query):
            return response(
                mode="abstained", passages=[],
                text=(
                    "This evidence assistant cannot verify live conditions. Use the dashboard "
                    "for clearly labelled modelled US AQI, and an official local CPCB station "
                    "for India's AQI and current official warnings."
                ),
                limitations=["No live AQI or station observation is used to answer chat questions."],
            )
        if _REGIONAL_SCRIPT.search(query):
            return response(
                mode="abstained", passages=[],
                text=(
                    "The reviewed WHO/CPCB evidence assistant currently supports English "
                    "questions only. Please ask in English; regional-language clinical "
                    "translations have not been independently verified."
                ),
                limitations=[
                    "Do not rely on an unverified translation for medical or emergency decisions."
                ],
            )
        passages = retrieve(query)
        if not passages:
            return response(
                mode="abstained", passages=[],
                text="I do not have sufficient verified WHO/CPCB evidence for that question, so I will not guess.",
                limitations=["The reviewed source registry does not cover this topic."],
            )
        if not self.model_enabled:
            return response(
                mode="evidence_only", passages=passages,
                text=extractive_answer(passages),
                limitations=["AI paraphrasing is disabled; showing reviewed source summaries."],
            )
        try:
            result = await self.client.post(
                _MODEL_URL,
                json={"question": query[:400], "source_ids": [p["id"] for p in passages]},
                timeout=15.0,
            )
            result.raise_for_status()
            payload = result.json()
            generated = payload.get("answer") if isinstance(payload, dict) else None
            if generation_supported(generated, passages):
                return response(
                    mode="generated", text=generated.strip(), passages=passages,
                    limitations=[
                        "AI paraphrase automatically screened against reviewed evidence; "
                        "automated screening is not a guarantee of factual entailment.",
                        "Citations are attached by the server from the allowlisted registry.",
                    ],
                )
        except (httpx.HTTPError, ValueError, TypeError):
            pass
        return response(
            mode="evidence_only", passages=passages,
            text=extractive_answer(passages),
            limitations=["AI generation was unavailable or did not pass evidence checks; showing reviewed source summaries."],
        )
