# SafeBlock

SafeBlock is a community-driven neighborhood safety network with an Expo mobile client and an Express backend.

## Workspaces

- `mobile`: Expo React Native application
- `backend`: Node.js + Express + TypeScript API

## Quick Start

1. Start PostgreSQL with PostGIS:
   - `docker compose up -d`
2. Install dependencies:
   - `npm install`
3. Start backend + mobile together (recommended):
   - `npm run dev:mobile`

   This command is resilient: it starts only missing services and avoids repeated port-conflict restarts.

   This prevents "Network Error" caused by the backend not running.

4. Or run with legacy script if needed:
   - `npm run dev:web`

5. Run separately if needed:
   - Backend: `npm run dev:backend`
   - Mobile only: `npm run dev:mobile:only -- --web`

## MVP Scope

- Backend-managed authentication
- SOS alerts
- Incident reporting
- Trusted contacts
- Safety map with nearby incidents
- In-app real-time notifications via Socket.IO

## Real Phone Build Setup (Free)

For an installed APK/IPA to work, the app must call a public backend URL over HTTPS.

### 1) Backend environment

1. Copy backend env template:
    - `copy backend\\.env.example backend\\.env`
2. Edit `backend/.env`:
    - Set strong `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
    - Set `DATABASE_URL` (PostgreSQL/PostGIS)
    - Set `CLIENT_ORIGIN` to your app/web origin if needed

### 2) Run free local database (PostGIS)

- `docker compose up -d`

This is free and has no API-request billing.

### 3) Point mobile build to live backend URL

Mobile config now reads `EXPO_PUBLIC_API_URL` from environment (`mobile/app.config.ts`).

- Local dev example in `mobile/.env.example`:
   - `EXPO_PUBLIC_API_URL=http://localhost:4000`
- Build profiles in `mobile/eas.json`:
   - `development` can use local emulator host
   - `preview` and `production` should use your real HTTPS API URL

Before creating installable builds, update:
- `mobile/eas.json` `EXPO_PUBLIC_API_URL` values to your backend URL

### 4) Free hosting strategy (no API fees)

Use self-hosted backend + Postgres/PostGIS:
- Host on your own VM/home server
- Add free domain DNS (e.g. DuckDNS/Cloudflare)
- Terminate TLS with Caddy or Nginx + Let's Encrypt

Your app then calls only your backend endpoint.

## Free Hosted Backend (No PC Required)

If you do not want your PC on all the time, deploy backend + database to free cloud services.

### Recommended free stack

- Backend host: Render (free web service)
- Database: Neon Postgres free tier (or Supabase Postgres free tier)

### Deploy backend with `render.yaml`

1. Push this repository to GitHub.
2. In Render, create a new Blueprint and select your repo.
3. Render will detect [render.yaml](render.yaml) and create `safeblock-backend`.
4. Set env vars in Render dashboard:
   - `DATABASE_URL` (from Neon/Supabase)
   - `JWT_ACCESS_SECRET` (long random string)
   - `JWT_REFRESH_SECRET` (long random string)
   - `CLIENT_ORIGIN` (optional)
5. Deploy and confirm health endpoint:
   - `https://<your-render-service>.onrender.com/health`

### Point mobile app to hosted backend

Update [mobile/eas.json](mobile/eas.json) for `preview`/`production`:

- `EXPO_PUBLIC_API_URL=https://<your-render-service>.onrender.com`

Then build/install your app and it will work without your laptop.

### Important free-tier note

Some free web hosts sleep after inactivity, causing a short cold start delay on first request. The app still works, but the first API call can be slower.
