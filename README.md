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
| `/app/branches`, `/app/team` | Branch licences and delivery zones, users with per-branch roles |
| `/shop/[slug]` | Customer portal (demo: `/shop/medicare`): search, stock per branch, cart, prescription upload, checkout, order tracking |

Navigation adapts to the signed-in role (owner, branch manager, pharmacist, technician, cashier, store officer, accountant, rider, auditor).

## Demo script (suggested)

1. `/` marketing page, then **Try the live demo**.
2. `owner@demo.com` / `Demo@1234`: dashboard across three branches, branch licence warning (Kumasi), expiring stock.
3. `pharmacist@demo.com`: Prescriptions, open `RX-DEMO-001` (patient allergic to penicillin, prescribed Amoxil) and see the warning and override flow. Dispense `RX-DEMO-002`. Open the controlled-drug register after dispensing `RX-DEMO-003`.
4. `/shop/medicare`: sign in with any phone number (code `123456`), search "malaria", order with delivery, then approve / pack / dispatch in **Online orders**, deliver as `rider@demo.com`.
5. `cashier@demo.com`: open a shift, sell items, print receipt.

Payments and SMS are simulated in the demo (see the API README).
