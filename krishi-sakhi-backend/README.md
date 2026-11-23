# Krishi Sakhi — Backend API

Express + Sequelize (SQLite) API for Krishi Sakhi. See the [root README](../README.md) for the project overview.

## Run

```powershell
npm install
copy .env.example .env    # set GEMINI_API_KEY and JWT_SECRET
npm start                 # http://localhost:3001
npm test                  # offline API tests (node --test)
```

Health check: `GET /api/health` (database status and whether AI is configured). `GET /` lists every endpoint.

The SQLite file is created at `database/krishi_sakhi.db` on first start (tables are created automatically and
starter marketplace/forum content is seeded). It is git-ignored because it holds user data.

## Configuration (`.env`)

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Google Gemini key for chat, voice and crop image analysis (503 without it) |
| `JWT_SECRET` | Signs login tokens (required in production) |
| `PORT` | Default 3001 |
| `GEMINI_MODEL` | Default `gemini-2.5-flash` |
| `DATA_GOV_IN_API_KEY` | Optional, enables mandi prices |
| `DB_PATH`, `CORS_ORIGIN`, `SOILGRIDS_TIMEOUT_MS` | Optional overrides |

## Layout

```
app.js            Express app (middleware, routes, error handling)
server.js         Starts the DB and the HTTP server
config/           Database and language configuration
models/           Sequelize models + seed data
controllers/      Request handlers
routes/           Route definitions (auth, chat, analysis, crop-analysis, weather,
                  marketplace, community, farm, languages)
services/         Gemini client, chatbot, crop image analysis, weather, geodata
data/             Crop calendar / pest knowledge base and schemes
tests/            API tests
```

## External services

- Google Gemini — chat, voice replies, crop photo diagnosis
- Open-Meteo — weather, forecast, soil moisture (no key)
- ISRIC SoilGrids — soil properties (no key; slow at times, falls back to labelled estimates)
- Nominatim / OpenStreetMap — place names (no key)
- data.gov.in Agmarknet — mandi prices (optional key)
