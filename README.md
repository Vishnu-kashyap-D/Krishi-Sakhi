# Krishi Sakhi — AI farming companion for Kerala farmers

Krishi Sakhi (കൃഷി സഖി, "farming friend") is a full-stack web app built for Smart India Hackathon 2025
(problem statement *AI-Powered Personal Farming Assistant for Kerala Farmers*, Govt. of Kerala; the
project docs also reference SIH25168, a land-profiling statement). It gives a farmer a personal profile, a farm diary,
reminders, weather- and record-aware advisories, a land/soil profile of their field, AI crop photo
diagnosis and an AI assistant that knows their farm.

## Features

| Feature | What it does | Data source |
|---|---|---|
| **My Farm** (`/my-farm`) | Personalised advisory, farm diary (sowing, irrigation, fertiliser, spraying, pest sightings, harvest, costs), reminders, crop calendar & pest guide, schemes, mandi prices | Your own records + Open-Meteo + community reports + built-in Kerala crop knowledge base |
| Farm (land) analysis | Click your field → soil texture, pH, organic carbon, sand/silt/clay, 30-day rainfall, soil moisture, elevation, recommendations | ISRIC SoilGrids (live, falls back to labelled estimates when down), Open-Meteo (live). Land cover, NDVI and groundwater are **estimates** (labelled in the UI) |
| Crop health check | Upload/take a leaf photo → crop, health score, issues, treatment plan; rejects non-plant photos | Google Gemini vision |
| AI assistant (text + voice) | Conversational advice in the selected language, remembers the conversation and uses your farm profile, diary and the crop knowledge base | Google Gemini |
| Weather advisory | Current conditions, 7-day forecast, soil moisture/temperature, evapotranspiration, derived alerts and "what to do today" | Open-Meteo |
| Marketplace | List produce/inputs, browse, search, filter, delete own listings | SQLite |
| Community | Forum (post, like once, reply), expert consultation requests | SQLite |
| Accounts | Register / login (JWT), profile with farm details (crops, acreage, soil type, irrigation, location), change password | SQLite + bcrypt |

## Architecture

```
React 18 + Vite + Tailwind (port 3000)
        │  /api  (Vite dev proxy)
        ▼
Express API (port 3001) ── Sequelize ── SQLite (krishi-sakhi-backend/database/krishi_sakhi.db)
        ├── Google Gemini (chat, voice, crop images)   — needs GEMINI_API_KEY
        ├── Open-Meteo (weather, soil moisture)        — free, no key
        ├── ISRIC SoilGrids (soil properties)          — free, no key, often slow
        ├── Nominatim / OpenStreetMap (place names)    — free, no key
        └── data.gov.in Agmarknet (mandi prices)       — optional DATA_GOV_IN_API_KEY
```

The browser never talks to Gemini directly; all AI calls go through the backend so the key stays on the server.

## Run locally

Prerequisites: Node.js 18+ (tested on 22).

```powershell
cd krishi-sakhi-backend
npm install
copy .env.example .env    # then set GEMINI_API_KEY and JWT_SECRET
npm start                 # http://localhost:3001  (health: /api/health)
```

```powershell
cd krishi-sakhi-frontend
npm install
npm run dev               # http://localhost:3000
```

Or run `start.ps1` from the repository root to open both.

### Backend environment (`krishi-sakhi-backend/.env`)

| Variable | Required | Notes |
|---|---|---|
| `GEMINI_API_KEY` | for AI features | Without it chat/voice/crop analysis return a clear 503 |
| `JWT_SECRET` | yes (production) | Random string; in development a temporary one is generated |
| `PORT` | no | Default 3001 |
| `GEMINI_MODEL` | no | Default `gemini-2.5-flash` |
| `DATA_GOV_IN_API_KEY` | no | Enables live mandi prices |
| `DB_PATH`, `CORS_ORIGIN`, `SOILGRIDS_TIMEOUT_MS` | no | See `.env.example` |

### Frontend environment (`krishi-sakhi-frontend/.env`)

`VITE_API_URL=/api` (default) and `VITE_BACKEND_URL=http://localhost:3001` (proxy target). Never put API keys here: anything prefixed `VITE_` is shipped to the browser.

## Tests

```powershell
cd krishi-sakhi-backend
npm test        # 15 API tests, run offline (external services stubbed)
```

```powershell
cd krishi-sakhi-frontend
npm run lint
npm run build
```

## API overview

`GET /api/health` · `POST /api/auth/register|login` · `GET|PUT /api/auth/profile` · `POST /api/v1/analyze` ·
`POST /api/chat/message` · `POST /api/crop-analysis/analyze` (multipart `image`) · `GET /api/weather/current|forecast|agriculture|alerts` ·
`GET|POST /api/marketplace/products` · `GET|POST /api/community/forum/posts` ·
`GET /api/farm/advisory` · `GET|POST /api/farm/activities` · `GET|POST|PATCH /api/farm/reminders` · `GET /api/farm/knowledge` · `GET /api/farm/prices`.
`GET /` on the backend lists every endpoint.

## Known limitations

- Land cover, NDVI and groundwater depth have no free key-less data source yet; they are deterministic estimates and are labelled "Estimated" in the UI. Phosphorus and potassium are always estimates (SoilGrids does not provide them).
- SoilGrids is frequently slow or unavailable; the app then falls back to labelled estimates.
- Malayalam is intentionally not offered in the UI (team decision); the assistant can still answer in any language Gemini supports.
- Expert profiles and success stories are curated sample content; booking requests are stored but no notification is sent.
