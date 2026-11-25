# Song and Scripture

Church presentation software for displaying Bible verses, song lyrics and video on screens during services. Built to work offline on modest hardware.

## What it does

- Shows Bible verses during sermons (English and Swahili first)
- Shows song lyrics, split into slides, during praise and worship
- Plays video and background loops on the audience screen
- Runs the order of service from one operator screen, with a separate clean output for the projector or TV

The full, prioritised feature list is in [`docs/FEATURES.md`](docs/FEATURES.md). The agreed look and layout are in [`docs/DESIGN.md`](docs/DESIGN.md).

## Repository layout

| Folder | Purpose | Status |
| --- | --- | --- |
| `desktop/` | The presenter app used in church (Electron, TypeScript, React). Dual-screen, offline | Milestone 1 |
| `web/` | Marketing site, downloads and licensing API (Next.js on Vercel) | Starter |
| `db/` | Postgres schema for licensing (Neon) | Initial tables |
| `docs/` | Product notes: features and design | Written |

## Infrastructure

- **Hosting:** Vercel (project `songandscripture`, root directory `web`), live at https://songandscripture.vercel.app
- **Database:** Neon Postgres (project `song-and-scripture`, Frankfurt)
- **Source:** GitHub (`levimburu/song-and-scripture`)

## Running the desktop app

```powershell
cd desktop
npm install
npm run dev
```

Other commands, run from `desktop`:

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app with hot reload |
| `npm run typecheck` | Check types in the main, preload and renderer code |
| `npm test` | Run the unit tests |
| `npm run build` | Produce a production build in `desktop/out` |

## Running the website locally

```powershell
cd web
copy .env.example .env.local
# put your Neon connection string in .env.local as DATABASE_URL
npm install
npm run dev
```

Open http://localhost:3000. The page `/api/health` checks the database connection.

## Database

The schema lives in `db/schema.sql`. It is safe to run more than once. Apply changes through the Neon SQL editor or the Neon tooling, not by hand-editing tables.

## Licence

Proprietary. All rights reserved. See [`LICENSE`](LICENSE).
