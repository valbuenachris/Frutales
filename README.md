# Frutales — Food Processing Profit Tracker

Mobile-first web app to track fruit-processing projects (batches): buy raw product,
apply a process (dehydrated, candied, syrup, ...), register the resulting yield and
see the profit instantly — color-coded green for profit, red for loss.

**Stack:** React (Vite) + Tailwind CSS v4 · Express 5 + TypeScript · PostgreSQL + Prisma ORM · TanStack Query

```
frutales/
├── server/                          Express + Prisma API
│   ├── prisma/schema.prisma         Database schema (model Project)
│   ├── prisma/migrations/           Generated SQL migrations
│   └── src/
│       ├── app.ts                   Express app (CORS, JSON, routes, errors)
│       ├── index.ts                 Bootstrap + graceful shutdown
│       ├── config/env.ts            Validated env vars (zod)
│       ├── lib/prisma.ts            PrismaClient singleton
│       ├── middleware/error-handler.ts
│       └── modules/projects/        routes · controller · service · mapper · calc · schema
└── client/                          React + Tailwind UI
    ├── vite.config.ts               Dev proxy /api -> localhost:4000
    └── src/
        ├── api/                     Fetch layer (no UI concerns)
        ├── hooks/useProjects.ts     TanStack Query hooks
        ├── lib/calc.ts              Live calculations mirroring the server
        ├── components/              Layout, SummaryCard, ProjectCard, UI primitives
        └── pages/                   Dashboard · ProjectForm · ProjectDetails
```

## Business logic (single source of truth)

| Value | Formula |
| --- | --- |
| Net yield (kg) | `initialQty × (1 − reductionPct / 100)` — or the manual override |
| Total cost | `initialQty × purchasePrice` |
| Total revenue | `netYield × sellingPrice` |
| Net profit | `totalRevenue − totalCost` (negative = loss) |

- The server **recomputes** the net yield whenever `netYieldOverridden` is `false`,
  so a stored row can never contradict its inputs.
- Money/qty are stored as PostgreSQL `DECIMAL` and computed server-side with
  `Prisma.Decimal` (no float dust). Derived totals are computed at read time,
  never stored, so they can never go stale.

## Requirements

- Node.js 20+ (developed on 24)
- PostgreSQL 14+ running locally (or any private Postgres server you own)

## Setup (step by step)

### 1. Database

```bash
createdb frutales
# or: psql -U postgres -c "CREATE DATABASE frutales;"
```

> **Important:** point `DATABASE_URL` at your own private database only.
> Never run the migration against shared/read-only/production databases
> (for example the Supabase instance used by other projects — it is read-only
> and must never receive DDL/migrations).

### 2. Backend

```bash
cd server
cp .env.example .env        # then edit DATABASE_URL for your Postgres
npm install
npm run prisma:migrate      # creates the "projects" table + Prisma Client
npm run dev                 # API at http://localhost:4000
```

`.env` variables:

| Variable | Description | Example |
| --- | --- | --- |
| `DATABASE_URL` | Private PostgreSQL connection string | `postgresql://user:pass@localhost:5432/frutales?schema=public` |
| `PORT` | API port | `4000` |
| `CLIENT_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |

Useful scripts: `npm run typecheck`, `npm run prisma:studio`, `npm run build && npm start`.

### 3. Frontend

```bash
cd client
npm install
npm run dev                 # UI at http://localhost:5173
```

Vite proxies `/api` to `http://localhost:4000` in development, so no CORS setup is needed.

### 4. Production build (optional)

```bash
# API
cd server && npm run build && npx prisma migrate deploy && npm start

# Web
cd client && VITE_API_URL="https://your-api.example.com/api" npm run build   # output: client/dist
```

## Docker

The whole stack (PostgreSQL + API + web client behind nginx) can run with Docker
Compose. See [DOCKER.md](./DOCKER.md) for setup, deployment and backup instructions.

## API reference

Base path: `/api`. Responses use the envelope `{ "data": ... }`; errors use
`{ "error": { "message": "...", "details?": [...] } }`.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/projects` | List all projects (newest first) |
| `POST` | `/api/projects` | Create project (validated DTO, 201) |
| `GET` | `/api/projects/:id` | Project details |
| `PUT` | `/api/projects/:id` | Update project (full replace) |
| `DELETE` | `/api/projects/:id` | Delete project (204) |

Example: the pineapple batch from the spec.

```bash
curl -X POST http://localhost:4000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pineapple Batch 1",
    "productName": "Pineapple",
    "processType": "Candied",
    "initialQty": 10,
    "purchasePrice": 2500,
    "reductionPct": 20,
    "sellingPrice": 6000,
    "netYieldOverridden": false
  }'
# -> netYield 8, totalCost 25000, totalRevenue 48000, netProfit 23000
```

Send `"netYieldOverridden": true` plus `"netYield": <value>` to store a manual yield.

## Customization

- **Currency symbol:** `client/src/lib/format.ts` (`formatMoney`).
- **Process dropdown options:** `client/src/lib/constants.ts` (`PROCESS_TYPES`).
- **Palette:** `client/src/index.css` (`@theme` tokens: `--color-app`, `--color-ink`, `--color-brand`).

## Notes

- `npm audit` reports 3 high severity advisories inside the Prisma **CLI** dev
  tooling (`deepmerge-ts`); they are dev-only and fixing them requires the
  breaking Prisma 7 upgrade. The runtime (`@prisma/client`) is unaffected.
- If the database ever contains rows created elsewhere, `npm run prisma:migrate`
  may ask to reset — never accept that on a database you do not own.
