# Flowvault

One card for every subscription. Top up a Naira wallet (no withdrawals), get a Visa virtual card, pay your subscriptions with it, and switch any subscription off so its next charge is declined.

Built with **Next.js** (the app) and **Supabase** (logins + database).

> **Test mode.** Payments, the virtual card and merchant charges are pretend for now. "Add money" adds test money, and each subscription has a "Pretend it charges the card" button so you can see approvals and declines. Real money needs a card-issuing provider and a payment gateway (see "Going live" below).

## What's in here

| Folder | What it does |
| --- | --- |
| `app/` | The screens: welcome, sign up, sign in, home, card, subscriptions, subscription detail, history |
| `components/` | Shared pieces: data store, bottom sheets (add money, add subscription, turn off), switches, icons |
| `lib/` | Supabase connection and money/date formatting |
| `middleware.ts` | Keeps you signed in and sends signed-out people to the sign-in page |
| `supabase/migrations/0001_init.sql` | The database: tables, security rules, and every money rule |

## Where the database lives

For now Flowvault shares the **recio-exchange** Supabase project with azaplug, to avoid paying for another project. It is kept apart like this:

- All Flowvault tables are in their own `flowvault` schema. Nothing of azaplug's was changed.
- The app talks to the database only through functions whose names start with `fv_`.
- Flowvault does not add anything to azaplug's sign-up. It creates a wallet and card the first time someone opens the app.

What *is* shared: the Supabase login system and its settings (email templates, allowed website addresses). Azaplug has its own separate user list, so azaplug accounts don't log into Flowvault. One side effect: azaplug's existing sign-up hook adds an empty row to azaplug's `public.profiles` table each time someone creates a Flowvault account.

Connection details (safe to put in the browser):

```
NEXT_PUBLIC_SUPABASE_URL=https://ssdxnmegivdgugiceany.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_6j2SA8dJrqD91wmVeNVHFw_nBwHUOdf
```

### Moving Flowvault to its own project later

1. Create a new Supabase project and run `supabase/migrations/0001_init.sql` in it.
2. Copy the data across: `pg_dump --data-only --schema=flowvault <old db url> | psql <new db url>`. Login accounts (`auth.users`) for Flowvault users must be copied first, or users sign up again.
3. Change the two environment variables above to the new project's URL and key, and redeploy.
4. In the old project, run `drop schema flowvault cascade;` and drop the `public.fv_*` functions.

### How the money rules work
- Money is stored in **kobo** (₦1 = 100 kobo) so there are no rounding mistakes.
- The browser can't touch the tables at all. Every read and change goes through an `fv_` function that only works on the signed-in user's own data, so nobody can edit their balance from the browser.
- When a service charges the card, `authorize_charge` approves it only if: the card isn't frozen, the service is on your list, it's switched **on**, the price hasn't jumped more than 10% (if price guard is on), and there's enough money. Dollar prices are converted at the rate in `flowvault.fx_rates`.

## Run it on your computer

You need [Node.js 20+](https://nodejs.org) and [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
npm install
npx supabase start            # starts a local Supabase and creates the database
cp .env.example .env.local    # then paste the API URL and publishable key that supabase start printed
npm run dev                   # open http://localhost:3000
```

## Put it online with Render

The database is already set up in recio-exchange (see above), and `render.yaml` already has the settings Render needs.

1. Sign in at [dashboard.render.com](https://dashboard.render.com) and click **New > Blueprint**.
2. Connect GitHub if asked, pick the **flowvault** repo, and click **Apply**. Render reads `render.yaml` and builds the site (about 3 to 5 minutes).
3. When it says **Live**, copy the address at the top (something like `https://flowvault-xxxx.onrender.com`).
4. In Supabase, open **recio-exchange > Authentication > URL Configuration**:
   - set **Site URL** to that address, and
   - add `https://flowvault-xxxx.onrender.com/**` under **Redirect URLs**.
   (Azaplug doesn't use Supabase logins, so this doesn't affect it.)
5. Open the address on your phone. In Chrome or Safari, use **Add to Home Screen** to get an app icon.

Environment variables (already in `render.yaml`, nothing to type):

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ssdxnmegivdgugiceany.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_6j2SA8dJrqD91wmVeNVHFw_nBwHUOdf` |
| `NODE_VERSION` | `22` |

Good to know: on Render's free plan the site falls asleep after 15 minutes with no visitors, so the first visit after that takes about a minute to load. The $7/month Starter plan keeps it awake.

Every time new code is pushed to GitHub, Render rebuilds the site by itself.

## Going live with real money (not done yet)

1. Pick a Nigerian provider that issues **Visa virtual cards** and gives you a **card authorization webhook** (they ask your server "approve this charge?" in real time).
2. Pick a gateway for **top-ups** by bank transfer and debit card (it gives each user a dedicated account number and sends a webhook when money arrives).
3. Write two server endpoints (e.g. Supabase Edge Functions) that verify each webhook and call `flowvault.credit_wallet()` and `flowvault.authorize_charge()` with the service role key.
4. Delete `fv_mock_top_up`, `fv_mock_charge` and the `mock_pan` / `mock_cvv` columns, and fetch card details from the provider instead.
5. Do KYC (BVN/NIN checks) at sign-up, which card issuers require.
