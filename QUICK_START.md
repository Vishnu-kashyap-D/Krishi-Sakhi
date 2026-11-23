# Quick start

See [README.md](README.md) for full setup, environment variables and features.

```powershell
.\start.ps1
```

Or manually:

```powershell
cd krishi-sakhi-backend; npm install; copy .env.example .env; npm start
```

```powershell
cd krishi-sakhi-frontend; npm install; npm run dev
```

Set `GEMINI_API_KEY` and `JWT_SECRET` in `krishi-sakhi-backend/.env` first. The app runs at http://localhost:3000 and the API at http://localhost:3001 (`/api/health`).
