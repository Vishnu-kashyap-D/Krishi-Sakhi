# Krishi Sakhi — Audit, Fixes and Verification Report

Date: 2026-11-22 · Scope: whole repository (backend, frontend, config, docs)

## 1. What the project is

A full-stack farming assistant: React/Vite/Tailwind frontend, Express + Sequelize + SQLite backend, Google
Gemini for AI, open geospatial/weather APIs for data. The app is a "personal farming assistant" (SIH problem
*AI-Powered Personal Farming Assistant for Kerala Farmers*); the docs also cite SIH25168 (land profiling).

## 2. State before the audit (verified by running it)

| Area | Status found | Root cause |
|---|---|---|
| Frontend ↔ backend | **Broken** | Uncommitted edits pointed the frontend at port 5000; backend runs on 3001. Every page silently fell back to mock data |
| AI chatbot | **Broken** | `gemini-1.5-flash` is retired (404). Backend caught the error and returned an apology with HTTP 200. Frontend bypassed the backend and called Gemini from the browser with the key embedded |
| API key | **Critical leak** | A Gemini key was hard-coded in 4 committed files and bundled into the built JS |
| Crop image analysis | **Fake** | The uploaded image was ignored; one of three canned results was returned at random. Frontend showed mock data on any error |
| Farm analysis | **Partly broken / fake** | All data mocked; `texture` and `depth_meters` were `undefined` for most coordinates (float used as array index) |
| Weather | **Fake** | `Math.random()` values; sunrise/sunset and "activities" hard-coded |
| Auth | **Broken** | Frontend login stored users in localStorage and accepted any password. Backend token had no user id (`user._id` on a Sequelize model); middleware used Mongoose API (`findById().select`) |
| Marketplace | **Fake** | Three hard-coded products; create/update/delete returned success without saving. Product/Forum/WeatherCache models required `mongoose`, which is not installed |
| Community | **Fake** | Frontend mock arrays; likes returned a random number; posts not saved |
| Profile | **Fake** | Invented earnings, orders, ratings and activity |
| Map | **Broken** | CARTO tiles now require an API key ("API KEY REQUIRED") |
| Security | Weak | Hard-coded JWT secret fallback; open CORS; crop history IDOR (`/history/:userId`); public sign-up could set `role: admin` |
| Lint / tests | None effective | ESLint only matched `.ts/.tsx` (app is `.jsx`); `npm test` just exited with an error |
| Layout | Bug | 8-tab nav wider than the viewport → horizontal scroll |

## 3. Fixes (files)

**Backend**
- `app.js` (new), `server.js`: app/server split, health endpoint, JSON 404, JSON error handler, CORS allow-list, DB must initialise before listening.
- `config/db.js`: path-independent DB location, `sync()` only creates missing tables, seeds starter content.
- `models/*`: Sequelize models for Product, Forum (posts/comments/likes/bookings), FarmAnalysis, CropAnalysis, FarmActivity, Reminder; removed Mongoose models and mock DB.
- `middleware/auth.js`, `controllers/authController.js`, `routes/authRoutes.js`: working JWT auth, no admin self-registration, profile whitelist, sensible rate limits.
- `services/geminiClient.js` (new): key only from env, configurable model (default `gemini-2.5-flash`), user-safe errors (503 instead of fake 200).
- `services/chatbotService.js`, `controllers/chatController.js`: real multi-turn chat with stored history, session ownership checks, feedback, sessions list, grounding in farm profile, diary and crop knowledge.
- `services/cropAnalysisService.js`, `controllers/cropAnalysisController.js`: Gemini vision with a strict JSON schema; non-plant photos rejected (422); results stored; history only for the logged-in user.
- `services/weatherService.js`, `controllers/weatherController.js`: live Open-Meteo, place names via Nominatim, derived alerts and advice, caching.
- `services/geoApiService.js`, `controllers/analysisController.js`: live SoilGrids + Open-Meteo, deterministic labelled estimates for the rest, data-source labels, stored reports, history.
- `controllers/marketplaceController.js`, `controllers/communityController.js`: real persistence, ownership checks, validation.
- New "My Farm" module: `data/cropKnowledge.js`, `models/FarmRecord.js`, `controllers/farmController.js`, `routes/farmRoutes.js`.
- `tests/api.test.js`: 15 offline API tests.

**Frontend**
- Single API client with Vite proxy (`vite.config.js`, `src/api/client.js`, `src/api/services.js`); removed `gemini.js`, `mockData.js`, `public/test-gemini.html` and every silent mock fallback.
- Real auth (`src/utils/auth.js`, Login, Signup, Header).
- Pages rewired: Chatbot, Farm/Crop analysis, Weather (location picker, real sun times, computed activities), Marketplace (+ new Create and Detail pages), Community (persisted posts, likes, replies, bookings), Profile (real data, farm details, password change), new **My Farm** page.
- Redesign: new theme (forest green / harvest gold / warm neutrals, Fraunces + Plus Jakarta Sans), unified sticky header with drawer, new Home page with live weather card, footer, 404 page, markdown rendering for AI replies, map with OSM + satellite layers.
- `eslint.config.js` now lints `.js/.jsx`.

## 4. Problem-statement features added

| Required | Implemented |
|---|---|
| Farmer & farm profiling | Profile: location, acreage, crops, soil type, irrigation, farm coordinates (auto-saved from first farm analysis) |
| Conversational interface (voice/text) | Text + voice assistant via backend Gemini; replies in the selected language. Malayalam UI intentionally left out (team decision, 2026-11-22) |
| Activity tracking | Farm diary with costs; sowing a known crop auto-schedules its calendar tasks |
| Personalised advisory | Rules combining your forecast, soil moisture, diary, reminders, profile and nearby community pest reports |
| Reminders | User reminders + calendar-generated ones; overdue/due surfaced in advisory. Scheme info with official links (no invented deadlines). Mandi prices via data.gov.in when a key is configured |
| Knowledge engine | Kerala crop calendars, operations and pests (paddy, banana, coconut, pepper, vegetables, rubber) used by reminders, advisory and the AI assistant |

## 5. Verification (actually run)

- `npm test` (backend): **15/15 pass**.
- Frontend `npm run build`: passes; `npm run lint`: 0 errors (18 hook-dependency/unused-var warnings remain).
- Built bundle no longer contains the API key (checked with grep).
- Live API calls: Gemini chat answered with context; Gemini vision diagnosed a real diseased-leaf photo and rejected non-plant images; Open-Meteo weather and climate returned real data; SoilGrids timed out on some calls (fallback worked) and answered on others.
- Browser (built-in, against a copy of the DB): sign-up → farm analysis on map → chat (multi-turn, feedback) → weather (location switch, agriculture tab) → create listing → forum post → profile → My Farm diary (6 reminders scheduled) → crop page error path. Mobile 375 px: no horizontal overflow.

## 6. Not verified / remaining

- **Rotate the Gemini API key.** It is in the public Git history; removing it from the code does not revoke it.
- `database/krishi_sakhi.db` is committed and contains a real user email; consider untracking it (`git rm --cached`) and adding it to `.gitignore`.
- Mandi prices: code path not exercised against the live API (no `DATA_GOV_IN_API_KEY` available).
- Crop-photo upload through the browser was only tested with a generated image; the positive path was tested via the API.
- Land cover, NDVI, groundwater, P and K remain estimates until a real source (e.g. Bhuvan / Sentinel NDVI with credentials, CGWB data) is integrated.
- SMS/push notifications for reminders; expert booking confirmations; image uploads for listings/posts.
- Old docs (`QUICK_START.md`, `RUN_NOW.txt`, `IMPLEMENTATION_SUMMARY.md`, `techstack.txt`, etc.) describe the earlier mock-based version.
