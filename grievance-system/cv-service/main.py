"""
Computer Vision Validation Service — FastAPI + MobileNetV2

A lightweight micro-service that verifies uploaded images against
urban-governance categories using a pre-trained MobileNetV2 model.

Run:
    pip install -r requirements.txt
    uvicorn main:app --host 0.0.0.0 --port 8001

POST /predict  (multipart file upload)
  → { relevant, confidence, labels, category_match }
"""

import io
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

import tensorflow as tf
from tensorflow.keras.applications.mobilenet_v2 import (
    MobileNetV2,
    preprocess_input,
    decode_predictions,
)

# ── App setup ──────────────────────────────────────────────────────
app = FastAPI(title="Grievance CV Validation", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load model once at startup ─────────────────────────────────────
model = MobileNetV2(weights="imagenet", include_top=True)

# ── Urban-governance relevant ImageNet label mappings ──────────────
# Maps ImageNet class labels → our urban categories
RELEVANT_LABELS = {
    # Road / Asphalt
    "manhole_cover": "road",
    "street_sign": "road",
    "traffic_light": "road",
    "crash_helmet": "road",
    "moving_van": "road",
    "cab": "road",
    "pickup": "road",
    "racer": "road",
    # Water
    "dam": "water",
    "fountain": "water",
    "lakeside": "water",
    "breakwater": "water",
    "water_bottle": "water",
    "water_tower": "water",
    "geyser": "water",
    # Garbage / Sanitation
    "garbage_truck": "garbage",
    "ashcan": "garbage",
    "trash_can": "garbage",
    "plastic_bag": "garbage",
    "shopping_cart": "garbage",
    "crate": "garbage",
    "bucket": "garbage",
    # Electricity / Wires
    "electric_fan": "electricity",
    "power_drill": "electricity",
    "switch": "electricity",
    "pylon": "electricity",
    "pole": "electricity",
    "lampshade": "electricity",
    "spotlight": "electricity",
    "torch": "electricity",
    # Infrastructure (general relevance)
    "chainlink_fence": "infrastructure",
    "grille": "infrastructure",
    "iron": "infrastructure",
    "nail": "infrastructure",
    "screw": "infrastructure",
    "chain": "infrastructure",
    "pier": "infrastructure",
    "steel_arch_bridge": "infrastructure",
    "suspension_bridge": "infrastructure",
    "viaduct": "infrastructure",
}

# Broader keyword matching for labels not in the explicit map
KEYWORD_CATEGORIES = {
    "road":        ["road", "asphalt", "pothole", "street", "highway", "pavement", "car", "truck", "bus"],
    "water":       ["water", "pipe", "drain", "flood", "sewage", "lake", "river", "tap", "hydrant"],
    "garbage":     ["garbage", "trash", "waste", "litter", "bin", "dump", "refuse", "debris", "junk"],
    "electricity": ["wire", "cable", "electric", "power", "light", "lamp", "volt", "transformer", "pole"],
    "infrastructure": ["bridge", "fence", "wall", "concrete", "construction", "scaffold", "crane", "beam"],
}


def classify_label(label: str) -> tuple[str | None, bool]:
    """Map an ImageNet label to an urban category."""
    label_lower = label.lower().replace(" ", "_")

    # Direct match
    if label_lower in RELEVANT_LABELS:
        return RELEVANT_LABELS[label_lower], True

    # Keyword match
    for category, keywords in KEYWORD_CATEGORIES.items():
        for kw in keywords:
            if kw in label_lower:
                return category, True

    return None, False


@app.get("/health")
async def health():
    return {"status": "ok", "model": "MobileNetV2"}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
    Accept an image upload and return classification results.
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        contents = await file.read()
        img = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not process image file")

    # Preprocess for MobileNetV2 (224×224)
    img_resized = img.resize((224, 224))
    img_array = np.array(img_resized, dtype=np.float32)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = preprocess_input(img_array)

    # Inference
    preds = model.predict(img_array, verbose=0)
    decoded = decode_predictions(preds, top=10)[0]

    # Build result
    labels = []
    best_match = None
    best_confidence = 0.0

    for (_id, label, confidence) in decoded:
        category, is_relevant = classify_label(label)
        entry = {
            "label": label,
            "confidence": round(float(confidence), 4),
            "category": category,
            "relevant": is_relevant,
        }
        labels.append(entry)

        if is_relevant and confidence > best_confidence:
            best_confidence = float(confidence)
            best_match = category

    # Overall relevance: at least one relevant label with confidence ≥ 0.1
    # combined with best match confidence
    relevant = best_match is not None and best_confidence >= 0.05

    return {
        "relevant": relevant,
        "confidence": round(best_confidence, 4),
        "category_match": best_match,
        "labels": labels[:5],  # return top 5
        "model": "MobileNetV2",
    }


if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
