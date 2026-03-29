# AI Modules: Geocoding Engine + NLP Priority Triage

## Module 1: Automated Geocoding & Mapping Engine
- [ ] Create Python FastAPI geocoding service (`nlp-service/main.py`)
  - [ ] NLP location entity extraction from grievance text
  - [ ] GeoPy (Nominatim) geocoding to get lat/lng/district/state/country
  - [ ] `/geocode` endpoint
  - [ ] `/triage` endpoint (Module 2)
- [ ] DB migration: add `district`, `state`, `country` columns to grievances table
- [ ] Backend: integrate geocoding into submission pipeline ([grievanceController.js](file:///d:/Dharshuu/myvoice/grievance-system/backend/src/controllers/grievanceController.js))
- [ ] Backend: add `/api/grievances/map-data` endpoint for map markers with priority colors
- [ ] Frontend: rewrite [MapView.jsx](file:///d:/Dharshuu/myvoice/grievance-system/frontend/src/pages/MapView.jsx) with real Leaflet.js map + priority-colored markers
- [ ] Frontend: add `geocode` and `triage` methods to [api.js](file:///d:/Dharshuu/myvoice/grievance-system/frontend/src/services/api.js)

## Module 2: Zero-User-Input Priority Triage (NLP)
- [ ] Python NLP triage logic in same `nlp-service/main.py`
  - [ ] NER for infrastructure keywords
  - [ ] Sentiment & urgency analysis → High(1)/Medium(2)/Low(3)
- [ ] Frontend: remove manual priority dropdown from [SubmitGrievance.jsx](file:///d:/Dharshuu/myvoice/grievance-system/frontend/src/pages/SubmitGrievance.jsx)
- [ ] Frontend: add "Predict Priority" button that calls NLP triage
- [ ] Frontend: auto-update UI with predicted priority

## Verification
- [ ] Test Python service endpoints with curl
- [ ] Test full submit flow in browser
- [ ] Test map view with real markers
