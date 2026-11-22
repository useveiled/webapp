# Veiled web app

Veiled is a confidential neobank on Solana, built for people and for the AI agents they let spend money. This repository is the Next.js front end: the public site at useveiled.com and the signed in product behind `/app`.

Product and protocol documentation is published at [docs.useveiled.com](https://docs.useveiled.com/). What follows covers only this codebase: what it runs on, how to bring it up on your machine and the conventions that keep it honest.

## What it runs on

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16.2 (App Router) on React 19.2 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 via `@tailwindcss/postcss`, plus shadcn components built on Base UI and Lucide icons |
| Backend | Supabase: auth, Postgres, row level security and SQL functions, through `@supabase/ssr` and `@supabase/supabase-js` |
| Linting | ESLint 9 with `eslint-config-next` |

## Running it locally

**Requirements:** Node 20.9 or later (the minimum Next.js 16 accepts) and an empty Supabase project.

**1. Prepare the database.** The schema lives in `supabase/` at the root of this repo. There is no Supabase CLI config, so the SQL is pasted into the dashboard's SQL editor by hand, in this order:

1. `supabase/migrations/0001_init_schema.sql` builds every table, view, RLS policy, guard trigger and SQL function. It drops its own objects first, so rerunning it is safe.
2. `supabase/migrations/0002_virtual_cards.sql` adds the table behind the Cards page.
3. Sign up once through the app, so a trigger can provision your profile and a primary account.
4. Optionally run `supabase/seed.sql` for demo accounts, agents, cards and a couple of weeks of history.

`supabase/README.md` has the longer version, including how to recover from a half applied migration. The confirmation email template is in `supabase/templates/confirm-signup.html`.

Skip the migrations and you can still sign in, but every page will load empty.

**2. Configure the environment.** Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_DEPOSIT_ADDRESS=your-solana-deposit-address
```

| Name | Read by | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `src/middleware.ts`, `src/lib/supabase/*`, `src/app/auth/callback/route.ts` | Required |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same files | Required. The anon key is meant to be public; RLS does the protecting |
| `NEXT_PUBLIC_DEPOSIT_ADDRESS` | `src/app/app/wallet/page.tsx` | Shown on the Wallet page as the address to fund. Falls back to an empty string |

`VEILED_API_KEY` also appears under `src/`, but only inside an SDK code sample printed on the landing page. The app never reads it.

**3. Start the dev server.**

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## npm scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serves the production build |
| `npm run lint` | ESLint over the project |

## Where things live

```
src/
  middleware.ts         refreshes the Supabase session; sends signed out visitors on /app to /login
                        and signed in visitors on /login or /signup to /app
  app/
    page.tsx            landing page
    roadmap/ token/ status/
                        public pages
    login/ signup/      auth forms
    auth/callback/      exchanges the email confirmation code for a session
    auth/confirmed/     landing spot after a successful confirmation
    app/                the signed in product (layout.tsx holds the sidebar)
  components/           site sections, landing/, mockups/, auth/, app/ui.tsx and ui/ (shadcn)
  lib/
    supabase/           browser client, server client and database.types.ts
    utils.ts            cn() class helper
  types/                shared TypeScript types for the site
public/images/          logos and background photography
```

The sidebar in `src/app/app/layout.tsx` maps onto these routes:

| Group | Page | Route |
| --- | --- | --- |
| Banking | Accounts | `/app` |
| | Send Payment | `/app/run` |
| | Cards | `/app/cards` |
| | Wallet | `/app/wallet` |
| Agents | Agent Accounts | `/app/dashboard` |
| | Activity | `/app/executions` |
| | Analytics | `/app/analytics` |
| Developer | API Keys | `/app/keys` |
| | Alerts | `/app/alerts` |
| | Status | `/status` (public) |
| Pinned | Settings | `/app/settings` |

`next.config.ts` adds one setting: image quality 90 is allowed alongside the default 75, so full bleed background photos render without gradient banding.

## Rules the code follows

### Balances change only inside Postgres

Nothing in `src/` writes a balance. Money moves through `SECURITY DEFINER` functions that do their own `auth.uid()` checks: `send_payment`, `simulate_topup`, `create_agent_account`, `revoke_agent_account`, `set_agent_status` and `generate_disclosure`. A guard trigger on `accounts` rejects any direct change to a balance, a handle, an owner or an account type, and any attempt to revoke outside `revoke_agent_account`. A broken form cannot turn into a broken ledger, because the database refuses the write.

### The schema types are written by hand

`src/lib/supabase/database.types.ts` is maintained manually against `0001_init_schema.sql` rather than generated. Change a migration, change this file in the same commit.

Declare every `Row`, `Insert`, `Update` and `Args` shape with `type X = { ... }`. Never use `interface`. The Supabase client checks these shapes against `Record<string, unknown>`, and only object literal type aliases pass. An `interface` slips through without an error, and every `.from()` call then types as `never`.

The `Relationships` arrays in that file are empty. A page that embeds a related table, such as `accounts.select("*, spend_policies(*)")`, declares the relationship locally instead; `src/app/app/page.tsx` shows the pattern.

### Agents are accounts with a policy

`create_agent_account` creates an account of type `agent` with its own handle and a zero balance, plus a row in `spend_policies` holding a per request cap, a daily cap and an optional list of allowed domains. `set_agent_status` switches an agent between active and paused. `revoke_agent_account` is final: it sweeps the remaining balance back to the owner's primary account, marks the agent revoked and keeps its transaction history.

### Privacy is labelled, not yet encrypted

Each account stores a `privacy_tier` and each transaction a `privacy_layer`, both one of Public, Confidential or Shielded, with Confidential as the default. The payment form picks the layer per transfer. In this app those values are labels: amounts sit in Postgres as plain numbers, and the proof hashes, transaction signatures and finality times on each row come from helper functions that generate realistic placeholders. Real confidential settlement belongs to the on-chain program, described in [The Solana Program](https://docs.useveiled.com/under-the-hood/solana-program) and [Encrypted Balances and Private Payments](https://docs.useveiled.com/confidentiality/encrypted-balances).
