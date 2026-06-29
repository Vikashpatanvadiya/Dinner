# Queue Manager — Frontend

React SPA for the Queue Manager app.

## Stack
- React 19 + TypeScript + Vite 7
- TailwindCSS v4 + shadcn/ui
- TanStack React Query
- Wouter routing

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server (proxies /api to localhost:3001) |
| `npm run build` | Production build → dist/ |
| `npm run preview` | Preview the production build |

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Dev server port (default: 5173) |
| `BASE_PATH` | Base URL path (default: /) |
| `VITE_API_URL` | Backend URL in production (e.g. `https://queue-manager-api.onrender.com`) |

## Deploy to Vercel / Netlify

1. Push this folder as a GitHub repo
2. Connect to Vercel/Netlify
3. Set `VITE_API_URL` to your Render backend URL in environment variables
4. Build command: `npm run build` | Output dir: `dist`
