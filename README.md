# CareerBuddies

Career-guidance website: React 19 + Vite + Tailwind (frontend) and a single Express server (`server.ts`) with MongoDB (Mongoose).

- Public website, admin-controlled content (Site Settings, People, Mentors, Programmes, Webinars, Testimonials, Services, Plans)
- Admin Workspace (password-protected) with lead management
- AI Career Assistant (NVIDIA-hosted model via `/api/ai`)
- Online payments via **Dodo Payments** (checkout + verified webhooks)

## Prerequisites

- Node.js 20 or newer (developed on Node 24) and npm
- A MongoDB database (MongoDB Atlas works)
- An NVIDIA API key (AI assistant)
- A Dodo Payments account (only needed for online payments)

## Setup

```bash
npm install
cp .env.example .env      # then fill in real values — never commit .env
npm run dev               # http://localhost:3000
```

Other commands:

| Command | Purpose |
|---|---|
| `npm run lint` | TypeScript type-check (`tsc --noEmit`) |
| `npm run build` | Build frontend (`dist/`) and bundle server (`dist/server.cjs`) |
| `npm run start` | Run the production build (`node dist/server.cjs`) |

## Environment variables

Real values live only in your private `.env` / hosting dashboard. `.env.example` lists every variable with placeholders.

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | yes | MongoDB connection string (leads + all CMS content + payments) |
| `NVIDIA_API_KEY` | yes | AI Career Assistant |
| `ADMIN_PASSWORD` | yes | Admin Workspace password |
| `ADMIN_SESSION_SECRET` | yes | Separate random secret (32+ chars) that signs admin sessions. Never reuse the password. Changing it logs every admin out. |
| `TRUST_PROXY_HOPS` | optional | Number of reverse proxies in front of the app (default 1 in production) so rate limits see real client IPs |
| `APP_URL` | production | Public https URL; used for payment return/cancel URLs |
| `DODO_PAYMENTS_API_KEY` | for payments | Dodo secret API key |
| `DODO_PAYMENTS_WEBHOOK_KEY` | for payments | Dodo webhook signing secret (`whsec_...`) |
| `DODO_PAYMENTS_ENVIRONMENT` | for payments | `test_mode` (default) or `live_mode` |
| `DODO_PRODUCT_ID_WEBINAR` | for payments | Dodo product for the standard webinar pass |
| `NODE_ENV` | production | Set to `production` when deploying |
| `WHATSAPP_API_URL`, `WHATSAPP_API_TOKEN`, `NOTIFY_WHATSAPP_NUMBERS`, `APPS_SCRIPT_WEBHOOK_URL` | optional | Lead notifications / Google Sheets sync |

## Repository structure

```
server.ts                 Express app: leads API, admin login, AI proxy, CMS + payments routes, Vite/static serving
server/
  config/database.ts      MongoDB connection
  middleware/adminAuth.ts Admin password login + signed session tokens
  models/                 Mongoose models (Lead, SiteSettings, Person, Mentor, Programme, Webinar,
                          Testimonial, Service, Plan, Payment)
  routes/                 crudFactory (public list + admin CRUD), siteSettings, payments (Dodo)
src/
  App.tsx                 Page state machine (no router) + global modals
  components/             Screens, modals, admin panels (components/screens/admin), shared UI
  hooks/                  CMS data hooks (each falls back to static content)
  config/, data/          Static fallback content (kept as the safety net)
  utils/                  Admin fetch helper, checkout helper
public/                   Static assets — logo.png, assets/brand, assets/team (founder photos)
```

Content design rule: every CMS-driven section reads MongoDB first and **falls back to the static content in `src/config` / `src/data`** if the collection is empty or the API fails, so the public site never renders blank.

## Branding assets

- Official logo: `public/logo.png` (margin-trimmed for the header/footer). Full original: `public/assets/brand/careerbuddies-official-logo.png`.
- Founder photos: `public/assets/team/` — `nishant-sharma.jpg`, `deepak-sah.jpg`, `divyanshu-gautam.jpg`.

All asset paths are site-relative (`/logo.png`, `/assets/...`), so they work in development, production builds and any host.

## Dodo Payments

Flow: browser → `POST /api/payments/checkout` → server creates a Dodo checkout session → browser redirects to Dodo's hosted page → Dodo redirects back to `APP_URL/?order=<ref>` → the page shows the status stored by the **verified webhook** (`POST /api/payments/webhook`).

- The price is defined by the Dodo **product**; the browser never sends an amount.
- Webinars: uses the webinar's own `Dodo Payments Product ID` (Admin → Manage Webinars) or falls back to `DODO_PRODUCT_ID_WEBINAR`.
- Plans / Programmes: a "Pay online securely" button appears only when the record has a `Dodo Payments Product ID` (Admin → Programmes & Catalog). Custom-pricing plans stay sales-assisted.
- Webhook security: Standard Webhooks signature verification (official SDK `unwrap`), timestamp tolerance, idempotency by `webhook-id`, and statuses only move forward (a late "processing" can't undo "succeeded").
- Payment records are in the `payments` collection (Admin API: `GET /api/payments/admin`).

### Configure Dodo

1. In the Dodo dashboard create your products (webinar pass, plans, programmes) and note each `pdt_...` id.
2. Create an API key → `DODO_PAYMENTS_API_KEY`.
3. Add a webhook endpoint: `https://<your-domain>/api/payments/webhook`, subscribe to the `payment.*` events, and copy its signing secret → `DODO_PAYMENTS_WEBHOOK_KEY`.
4. Set `DODO_PAYMENTS_ENVIRONMENT=test_mode` until you have completed a test payment end-to-end, then switch to `live_mode` with live keys/products.

## Deployment (Render, existing setup)

`render.yaml` defines a Node web service (`bun install && bun run build`, then `bun run start`). Steps:

1. Push the repository to GitHub and connect it on Render (Blueprint or manual).
2. In the Render dashboard set every variable from the table above (secrets are `sync: false` and are never stored in Git).
3. Use HTTPS (Render provides it) and set `APP_URL` to the public https URL.
4. Register the Dodo webhook URL (see above) using that domain.
5. After deploy, verify: homepage, header/logo, founder photos, admin login, CMS pages, AI assistant, a test-mode payment.

Note: `server.ts` listens on port 3000 (fixed). Render's port detection has worked with the current setup; if you move to a host that requires the `PORT` variable, that line needs to read `process.env.PORT`.

## Making changes safely

Content edits → Admin Workspace (no code). Code/design changes: change only what is requested → `npm run lint` → `npm run build` → test → Git commit → deploy → verify live.
