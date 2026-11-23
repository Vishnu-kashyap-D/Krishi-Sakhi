# Krishi Sakhi — Frontend

React 18 + Vite + Tailwind CSS client for Krishi Sakhi. See the [root README](../README.md) for the full project overview.

## Run

```powershell
npm install
npm run dev      # http://localhost:3000, /api is proxied to the backend
```

The backend must be running (default `http://localhost:3001`). Configure in `.env` (see `.env.example`):

- `VITE_API_URL` — base URL for API calls (default `/api`, via the dev proxy)
- `VITE_BACKEND_URL` — where the dev/preview proxy forwards `/api`

Never put API keys in this app's `.env`: every `VITE_` variable is shipped to the browser.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the build (with the same `/api` proxy)
- `npm run lint` — ESLint

## Structure

- `src/api/` — axios client (`client.js`) and typed API helpers (`services.js`)
- `src/pages/` — one component per route (lazy-loaded in `App.jsx`)
- `src/components/` — shared UI (header, map, reports, chat, community)
- `src/context/LanguageContext.jsx` — UI translations
- `src/utils/auth.js` — login session storage
