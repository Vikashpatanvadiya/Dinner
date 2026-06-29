# Queue Manager — Backend

Express API server for the Queue Manager app.

## Stack
- Node.js + TypeScript + Express 5
- PostgreSQL (Neon) + Drizzle ORM
- JWT auth, Pino logging
- esbuild bundler

## Setup

```bash
npm install
cp .env.example .env
# Fill in DATABASE_URL and SESSION_SECRET in .env
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Build and start in development mode |
| `npm run build` | Bundle with esbuild |
| `npm run start` | Start the bundled server |
| `npm run db:push` | Push schema to Neon (run once after setup) |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `PORT` | ✅ | HTTP port (Render sets this automatically) |
| `SESSION_SECRET` | ✅ | JWT signing secret |
| `NODE_ENV` | ✅ | `development` or `production` |
| `FRONTEND_URL` | optional | Frontend origin for CORS (e.g. `https://your-app.vercel.app`) |

## Deploy to Render

1. Push this folder as a GitHub repo
2. Render → New → Web Service → connect repo
3. Render auto-detects `render.yaml` — just add `DATABASE_URL` and `SESSION_SECRET` in the dashboard
