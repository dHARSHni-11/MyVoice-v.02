"""
NLP Geocoding & Priority Triage Service — FastAPI

Modules:
  1. /geocode  — Extracts location entities from text via spaCy NER,
                 geocodes with GeoPy (Nominatim) → lat, lng, district, state, country
  2. /triage   — Zero-input priority classification using keyword NER +
                 sentiment analysis → priority (high / medium / low)

Run:
    pip install -r requirements.txt
    python -m spacy download en_core_web_sm
    uvicorn main:app --host 0.0.0.0 --port 8002
"""

import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import spacy
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderUnavailable

# ── App setup ──────────────────────────────────────────────────────
app = FastAPI(title="Grievance NLP Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load spaCy model at startup ───────────────────────────────────
nlp = spacy.load("en_core_web_sm")

# ── Geocoder ──────────────────────────────────────────────────────
geocoder = Nominatim(user_agent="grievance_system_geocoder_v1", timeout=10)


# ═══════════════════════════════════════════════════════════════════
#  Module 1: Geocoding Engine
# ═══════════════════════════════════════════════════════════════════

class GeocodeRequest(BaseModel):
    text: str


class GeocodeResult(BaseModel):
    success: bool
    location_entities: list[str] = []
    latitude: float | None = None
    longitude: float | None = None
    display_name: str | None = None
    district: str | None = None
    state: str | None = None
    country: str | None = None
    raw_address: dict | None = None


def extract_locations(text: str) -> list[str]:
    """Extract location entities using spaCy NER.

    SpaCy's small English model often misclassifies Indian place names
    (e.g. "Coimbatore" → ORG, "Gandhipuram" → PERSON), so we collect
    primary geo-entities first, then append ORG/PERSON as fallback
    candidates for geocoding.
    """
    doc = nlp(text)
    primary = []      # GPE, LOC, FAC — high-confidence location entities
    secondary = []    # ORG, PERSON — may actually be place names

    for ent in doc.ents:
        if ent.label_ in ("GPE", "LOC", "FAC"):
            primary.append(ent.text)
        elif ent.label_ in ("ORG", "PERSON"):
            # Filter out very short or obviously non-place entities
            if len(ent.text) >= 3:
                secondary.append(ent.text)

    locations = primary + secondary  # primary tried first

    # Also look for common Indian location patterns (ward, zone, nagar, etc.)
    patterns = [
        r"\b(?:ward|zone|sector|block|nagar|colony|layout|street|road|main road|cross|avenue|area|locality)\s*(?:no\.?\s*)?\d*\b",
        r"\b\d{6}\b",  # Indian PIN codes
    ]
    for pat in patterns:
        matches = re.findall(pat, text, re.IGNORECASE)
        locations.extend(matches)
    return list(dict.fromkeys(locations))  # deduplicate, preserve order


def geocode_location(location_str: str) -> dict | None:
    """Geocode a location string using Nominatim."""
    try:
        result = geocoder.geocode(location_str, addressdetails=True, language="en")
        if result:
            addr = result.raw.get("address", {})
            return {
                "latitude": result.latitude,
                "longitude": result.longitude,
                "display_name": result.raw.get("display_name"),
                "district": addr.get("county") or addr.get("city_district") or addr.get("city") or addr.get("town"),
                "state": addr.get("state"),
                "country": addr.get("country"),
                "raw_address": addr,
            }
    except (GeocoderTimedOut, GeocoderUnavailable):
        pass
    return None


@app.post("/geocode", response_model=GeocodeResult)
async def geocode_endpoint(req: GeocodeRequest):
    """Extract locations from text and geocode the best match."""
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")

    locations = extract_locations(req.text)

    # Try geocoding each extracted location, return first successful match
    for loc in locations:
        result = geocode_location(loc)
        if result:
            return GeocodeResult(
                success=True,
                location_entities=locations,
                latitude=result["latitude"],
                longitude=result["longitude"],
                display_name=result["display_name"],
                district=result["district"],
                state=result["state"],
                country=result["country"],
                raw_address=result["raw_address"],
            )

    # If individual entities fail, try the full text as a fallback
    result = geocode_location(req.text[:200])
    if result:
        return GeocodeResult(
            success=True,
            location_entities=locations,
            latitude=result["latitude"],
            longitude=result["longitude"],
            display_name=result["display_name"],
            district=result["district"],
            state=result["state"],
            country=result["country"],
            raw_address=result["raw_address"],
        )

    return GeocodeResult(success=False, location_entities=locations)


# ═══════════════════════════════════════════════════════════════════
#  Module 2: NLP Priority Triage
# ═══════════════════════════════════════════════════════════════════

class TriageRequest(BaseModel):
    text: str
    subject: str = ""


class TriageResult(BaseModel):
    priority: str  # "high", "medium", "low"
    priority_score: int  # 1=high, 2=medium, 3=low
    confidence: float
    category: str | None = None
    sentiment: str  # "negative", "neutral", "positive"
    urgency_keywords: list[str] = []
    infrastructure_entities: list[str] = []


# Infrastructure keyword dictionaries for NER-style recognition
INFRASTRUCTURE_KEYWORDS = {
    "road": [
        "pothole", "road", "crack", "asphalt", "pavement", "footpath",
        "bridge", "flyover", "highway", "divider", "speed breaker",
        "sinkhole", "tar", "bitumen", "gravel", "crater",
    ],
    "water": [
        "water", "pipe", "leakage", "flooding", "sewage", "drainage",
        "pipeline", "borewell", "overhead tank", "water supply",
        "contaminated", "tap", "running water", "stagnant",
    ],
    "electricity": [
        "electricity", "power", "outage", "blackout", "voltage",
        "transformer", "wire", "cable", "streetlight", "light",
        "electric pole", "short circuit", "power cut", "load shedding",
    ],
    "garbage": [
        "garbage", "trash", "waste", "sanitation", "dustbin", "dump",
        "littering", "sweeping", "debris", "stench", "smell",
        "recycling", "compost", "landfill", "disposal",
    ],
    "infrastructure": [
        "building", "collapse", "construction", "wall", "fence",
        "encroachment", "illegal", "demolition", "public toilet",
        "park", "playground", "footover bridge",
    ],
}

# Urgency / severity keywords that bump priority up
URGENCY_KEYWORDS = [
    "urgent", "emergency", "immediately", "critical", "dangerous",
    "life-threatening", "hazardous", "death", "injury", "accident",
    "electrocution", "drowning", "collapse", "fire", "explosion",
    "child", "children", "elderly", "hospital", "school",
    "blocked", "flooded", "burst", "broken", "destroyed",
    "no water", "no electricity", "no power", "dark", "unsafe",
    "days", "weeks", "months", "long time", "still not",
    "repeated", "multiple complaints", "nobody responded",
]

# Negative sentiment words
NEGATIVE_WORDS = [
    "terrible", "horrible", "awful", "disgusting", "pathetic",
    "worst", "unacceptable", "shameful", "corrupt", "negligence",
    "failure", "useless", "incompetent", "frustrated", "angry",
    "disappointed", "suffering", "harassment", "ignored", "careless",
    "dirty", "filthy", "stinking", "broken", "damaged",
    "dangerous", "risky", "hazardous", "unsafe", "threat",
]

POSITIVE_WORDS = [
    "thank", "good", "great", "excellent", "appreciate",
    "resolved", "fixed", "repaired", "working", "improved",
    "happy", "satisfied", "grateful", "better",
]


def detect_infrastructure_entities(text: str) -> tuple[list[str], str | None]:
    """Find infrastructure-related keywords in the text and determine category."""
    text_lower = text.lower()
    found = []
    category_scores: dict[str, int] = {}

    for category, keywords in INFRASTRUCTURE_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                found.append(kw)
                category_scores[category] = category_scores.get(category, 0) + 1

    # Best category
    best_category = None
    if category_scores:
        best_category = max(category_scores, key=category_scores.get)

    return list(dict.fromkeys(found)), best_category


def analyze_sentiment(text: str) -> tuple[str, float]:
    """Simple keyword-based sentiment analysis."""
    text_lower = text.lower()
    neg_count = sum(1 for w in NEGATIVE_WORDS if w in text_lower)
    pos_count = sum(1 for w in POSITIVE_WORDS if w in text_lower)

    total = neg_count + pos_count
    if total == 0:
        return "neutral", 0.5

    neg_ratio = neg_count / total
    if neg_ratio >= 0.6:
        return "negative", min(1.0, neg_ratio)
    elif neg_ratio <= 0.3:
        return "positive", min(1.0, 1 - neg_ratio)
    else:
        return "neutral", 0.5


def detect_urgency(text: str) -> tuple[list[str], float]:
    """Detect urgency-related keywords and return urgency score."""
    text_lower = text.lower()
    found = [kw for kw in URGENCY_KEYWORDS if kw in text_lower]
    # Urgency score: 0.0 (calm) → 1.0 (very urgent)
    score = min(1.0, len(found) * 0.15)
    return list(dict.fromkeys(found)), score


def compute_priority(urgency_score: float, sentiment: str, infra_count: int) -> tuple[str, int, float]:
    """
    Compute priority from urgency + sentiment + infrastructure density.

    Returns: (priority_label, priority_number, confidence)
    """
    # Base score from urgency (0-1)
    score = urgency_score * 0.5

    # Sentiment modifier
    if sentiment == "negative":
        score += 0.25
    elif sentiment == "neutral":
        score += 0.1

    # Infrastructure keyword density modifier
    score += min(0.25, infra_count * 0.05)

    # Clamp to [0, 1]
    score = max(0.0, min(1.0, score))

    # Classify
    if score >= 0.55:
        return "high", 1, round(score, 3)
    elif score >= 0.3:
        return "medium", 2, round(score, 3)
    else:
        return "low", 3, round(score, 3)


# Map our category names to the category names used in the grievance system
CATEGORY_MAP = {
    "road": "Road Damage",
    "water": "Water Supply",
    "electricity": "Electricity",
    "garbage": "Sanitation",
    "infrastructure": "Other",
}


@app.post("/triage", response_model=TriageResult)
async def triage_endpoint(req: TriageRequest):
    """Predict priority and category from grievance text."""
    full_text = f"{req.subject} {req.text}".strip()
    if not full_text:
        raise HTTPException(status_code=400, detail="Text or subject is required")

    # Step 1: Detect infrastructure entities
    infra_entities, raw_category = detect_infrastructure_entities(full_text)

    # Step 2: Analyze sentiment
    sentiment, sentiment_score = analyze_sentiment(full_text)

    # Step 3: Detect urgency
    urgency_kws, urgency_score = detect_urgency(full_text)

    # Step 4: Compute priority
    priority_label, priority_num, confidence = compute_priority(
        urgency_score, sentiment, len(infra_entities)
    )

    # Map category
    category = CATEGORY_MAP.get(raw_category) if raw_category else None

    return TriageResult(
        priority=priority_label,
        priority_score=priority_num,
        confidence=confidence,
        category=category,
        sentiment=sentiment,
        urgency_keywords=urgency_kws,
        infrastructure_entities=infra_entities,
    )


# ═══════════════════════════════════════════════════════════════════
#  Health Check
# ═══════════════════════════════════════════════════════════════════

@app.get("/health")
async def health():
    return {"status": "ok", "service": "nlp-geocoding-triage", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
