# PharmaOne - web app

Next.js (App Router, TypeScript, Tailwind) front end for the pharmacy SaaS. Talks to the
[`Pharmacybackend`](https://github.com/agyinjohn/Pharmacybackend) API (Node.js + MongoDB).

## Run it

```bash
# 1. API (in the Pharmacybackend repo)
npm install && cp .env.example .env && npm run seed && npm run dev      # http://localhost:4000

# 2. This app
cp .env.example .env.local        # NEXT_PUBLIC_API_URL=http://localhost:4000/api
npm install
npm run dev                       # http://localhost:3000
```

The API must allow this origin (`CORS_ORIGIN` in the API `.env`, default `http://localhost:3000`).

## What is in it

| Route | Purpose |
|---|---|
| `/` | Marketing page: features, multi-branch, online ordering, compliance, pricing, FAQ, demo-request form |
| `/login`, `/signup` | Staff sign-in (demo accounts listed on the page) and self-service workspace creation |
| `/app` | Owner / manager dashboard across all branches |
| `/app/pos` | Point of sale: barcode, split payments, shifts, hold/recall, receipts |
| `/app/prescriptions` | Capture, pharmacist verification with allergy / interaction warnings, dispensing, labels |
| `/app/inventory`, `/app/products` | Batch and expiry stock, alerts, receiving, adjustments, recall trace, CSV import, substitutes |
| `/app/purchasing`, `/app/transfers` | Purchase orders, supplier balances, inter-branch transfers with variance flagging |
| `/app/register` | Append-only controlled-drug register, disposal with witness, inspector CSV export |
| `/app/orders`, `/app/rider` | Online order review / pack / dispatch, rider mobile view with proof of delivery |
| `/app/reports`, `/app/audit` | Reports with CSV / print-to-PDF, immutable audit log |
| `/app/branches`, `/app/team` | Branch licences and details, users with per-branch roles |
| `/shop/[slug]` | Customer portal (demo: `/shop/medicare`): search, stock per branch, cart, prescription upload, checkout, order tracking |

Navigation adapts to the signed-in role (owner, branch manager, pharmacist, technician, cashier, store officer, accountant, rider, auditor).

## Demo script (suggested)

1. `/` marketing page, then **Try the live demo**.
2. `owner@demo.com` / `Demo@1234`: dashboard across three branches, branch licence warning (Kumasi), expiring stock.
3. `pharmacist@demo.com`: Prescriptions, open `RX-DEMO-001` (patient allergic to penicillin, prescribed Amoxil) and see the warning and override flow. Dispense `RX-DEMO-002`. Open the controlled-drug register after dispensing `RX-DEMO-003`.
4. `/shop/medicare`: sign in with any phone number (code `123456`), search "malaria", order with delivery. In **Online orders** record the delivery fee agreed by phone, then approve / pack / dispatch, and deliver as `rider@demo.com`.
5. `pharmacist@demo.com`: open `RX-DEMO-004` (uploaded online), type the directions from the photo, then verify.
6. `cashier@demo.com`: open a shift, sell Panadol (see "Tell the customer" directions), print the receipt.

Payments and SMS are simulated in demo mode (see the API README).

## Offline till

`/app/pos` keeps working without internet: it caches a catalogue snapshot and a service worker (`public/sw.js`) in the browser, queues
sales in IndexedDB (`src/lib/offline.ts`), and syncs them when the connection returns (a banner shows what is waiting). Only
non-prescription items can be sold offline. Stock shortfalls found on sync are accepted and flagged on the **Sales** page.
Visit the till once while online so the catalogue and app shell are cached.

## Deploy

Deploy the API first (see the `Pharmacybackend` README), then this app.

**Vercel (easiest)**: import the repo, framework Next.js, and set these environment variables before the first build:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<api-host>/api` |
| `NEXT_PUBLIC_DEMO_MODE` | `true` for a demo deployment (one-click demo accounts on the sign-in page); leave unset for a live pharmacy |

They are baked in at build time, so redeploy after changing them.

**Docker**:
`docker build --build-arg NEXT_PUBLIC_API_URL=https://<api-host>/api --build-arg NEXT_PUBLIC_DEMO_MODE=true -t pharmaone-web .`
then `docker run -p 3000:3000 pharmaone-web`.

After deploying, add the web app's address to the API's `CORS_ORIGIN` and `PUBLIC_WEB_URL`, and check:
the sign-in page loads, a demo account signs in (demo mode), and `/shop/medicare` lists products.

CI (`.github/workflows/ci.yml`) type-checks and builds on every PR.
