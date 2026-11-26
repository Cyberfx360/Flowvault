# Flowvault

A card for every subscription. Top up a Naira wallet (no withdrawals). Each subscription you add gets **its own virtual card**, and you give that company only that card's number. Switching a subscription off **freezes its card**, so the company's next charge is declined.

Built with **Next.js** (the app) and **Supabase** (logins + database).

> **Test mode.** Payments, cards and merchant charges are pretend for now. "Add money" adds test money, and each subscription has a "Pretend it charges its card now" button so you can see approvals and declines. The code to make real cards with **Maplerad** is written but switched off until there are API keys (see "Going live" below).

## What's in here

| Folder | What it does |
| --- | --- |
| `app/` | The screens: welcome, sign up, sign in, home, cards, subscriptions, subscription detail (with its card), history |
| `app/api/cards/` | Server routes that talk to the card company: switch on/off (freeze), show card details, make a card, remove |
| `app/api/webhooks/maplerad/` | Where Maplerad tells us a card was made or a charge happened |
| `components/` | Shared pieces: data store, card, bottom sheets (add money, add subscription, turn off), switches, icons |
| `lib/cards/` | The card company adapter: `types.ts` (what any provider must do), `mock.ts`, `maplerad.ts` |
| `lib/` | Supabase connections and money/date formatting |
| `middleware.ts` | Keeps you signed in and sends signed-out people to the sign-in page |
| `supabase/migrations/` | The database: `0001_init.sql` (tables, money rules) and `0002_card_per_sub.sql` (one card per subscription) |

## Where the database lives

For now Flowvault shares the **recio-exchange** Supabase project with azaplug, to avoid paying for another project. It is kept apart like this:

- All Flowvault tables are in their own `flowvault` schema. Nothing of azaplug's was changed.
- The app talks to the database only through functions whose names start with `fv_`.
- Flowvault does not add anything to azaplug's sign-up. It creates a wallet the first time someone opens the app, and a card each time they add a subscription.

What *is* shared: the Supabase login system and its settings (email templates, allowed website addresses). Azaplug has its own separate user list, so azaplug accounts don't log into Flowvault. One side effect: azaplug's existing sign-up hook adds an empty row to azaplug's `public.profiles` table each time someone creates a Flowvault account.

Connection details (safe to put in the browser):

```
NEXT_PUBLIC_SUPABASE_URL=https://ssdxnmegivdgugiceany.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_6j2SA8dJrqD91wmVeNVHFw_nBwHUOdf
```

### Moving Flowvault to its own project later

1. Create a new Supabase project and run the files in `supabase/migrations/` in it, in order.
2. Copy the data across: `pg_dump --data-only --schema=flowvault <old db url> | psql <new db url>`. Login accounts (`auth.users`) for Flowvault users must be copied first, or users sign up again.
3. Change the two environment variables above to the new project's URL and key, and redeploy.
4. In the old project, run `drop schema flowvault cascade;` and drop the `public.fv_*` functions.

### How the money rules work
- Money is stored in **kobo** (₦1 = 100 kobo) so there are no rounding mistakes.
- The browser can't touch the tables at all. Every read and change goes through an `fv_` function that only works on the signed-in user's own data, so nobody can edit their balance from the browser.
- Every subscription has exactly one card, and each card belongs to exactly one subscription.
- Switching a subscription off freezes its card (at the card company first, then in the database), switching it on unfreezes it, and removing it ends the card for good.
- When a charge lands on a card, `authorize_card_charge` approves it only if: the card is ready and not frozen, its subscription is **on**, the price hasn't jumped more than 10% (if price guard is on), and there's enough money in the wallet. Dollar prices are converted at the rate in `flowvault.fx_rates`.

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

### Cards: Maplerad

The adapter is in `lib/cards/maplerad.ts`. It was written from Maplerad's docs (Nov 2026) and has not run against Maplerad yet. Lines marked `VERIFY` are guesses where the docs are silent, so check them in the sandbox first.

What Maplerad's docs say, and what it means for Flowvault:

- **Cards are US dollar Visa or Mastercard only.** Naira-priced services (DStv, GOtv, MTN…) also get a dollar card, and the bank converts. Ask Maplerad about cross-border and exchange fees on Naira merchants. If those are bad, Naira subscriptions may need a second provider with Naira cards.
- **Cards are prepaid.** Money has to be put on a card before a company can charge it. Flowvault will need a small daily job that, a day before each subscription's billing day, moves that month's price from the user's wallet onto that card (`maplerad.fund`). That job isn't written yet.
- **Making a card takes a moment.** We ask for a card and get a tracking reference. Maplerad then calls our webhook with the finished card, and the app shows "Making your card…" until then.
- **ID checks first.** Before a user's first real card, Maplerad needs them enrolled with BVN, date of birth, phone and address (`enrollCustomer`). That screen isn't built yet.

Steps:

1. Sign up at maplerad.com with Flowvault's registered business (done: Krevox Global Ltd), and get **sandbox** keys from **Settings > API**.
2. In Render, open the flowvault service > **Environment** and add these as secret values (never in `render.yaml` or GitHub):
   - `MAPLERAD_SECRET_KEY` = your Maplerad secret key
   - `SUPABASE_SERVICE_ROLE_KEY` = from Supabase **recio-exchange > Project Settings > API keys** (secret key)
   - `MAPLERAD_WEBHOOK_SECRET` = optional. Only fill it in if Maplerad shows a signing secret starting with `whsec_`. Without it, the webhook only accepts calls from Maplerad's published IP addresses. Even if no webhook arrives, the app still picks up new cards by asking Maplerad directly.
3. In the Maplerad dashboard, set the webhook URL to `https://flowvault-ndrx.onrender.com/api/webhooks/maplerad` (if it has a webhook setting).
4. **Test with one account first.** In the app go to **Cards > Get real cards** and do both ID steps: (1) BVN, date of birth, phone, address (Maplerad "tier 1"), then (2) an ID document (NIN, passport, driver's licence or voter's card) and a selfie (Maplerad "tier 2", which Maplerad needs before it makes any card). The two photos are shrunk on the phone and sent straight to Maplerad as base64 images; Flowvault doesn't store them. (An empty private storage bucket `flowvault-kyc` exists from an earlier version and can be deleted.) From then on, only *that* account gets real Maplerad cards when it adds a subscription. Everyone else keeps test cards.
5. When everything works, turn real cards on for everybody: `update flowvault.settings set card_provider = 'maplerad';` (every user then needs to verify before adding a subscription).
6. Still to build before real money: the daily card-funding job, and recording real charges from the `issuing.transaction` webhook (draft written, needs checking against real sandbox payloads).

All card company calls happen on the server (`app/api/...`). The secret key never reaches anyone's phone.

### Card fee

Making a real card costs the user a fee, taken from their Flowvault wallet. It follows Maplerad's
prices: card issuance $2 + card funding fee $1 + $2 first load = $5 from the Spend wallet, plus the
3% Treasury-to-Spend transfer fee, so $5.15 cost. Maplerad lets the business add its own margin on
issuance and funding; Flowvault charges $6.45 (about 25% margin), converted at the app's USD rate and
rounded up to the next ₦100 (₦10,000 at ₦1,550/$). The app shows the fee in dollars only ("$6.45") and takes the Naira amount from the wallet
behind the scenes. If the wallet is short,
the card isn't requested and the app shows "Insufficient balance". If Maplerad fails, the fee is refunded.

```sql
update flowvault.settings set card_fee_usd_cents = 515;          -- Maplerad's cost
update flowvault.settings set card_fee_margin_usd_cents = 130;   -- Flowvault's margin
update flowvault.fx_rates set ngn_per_unit = 1550 where currency = 'USD';  -- the rate used
```

**Maplerad money flow:** cards are paid only from the **Spend** wallet. Money arrives in the
**Treasury** wallet and must be moved to Spend first (3% fee below $25,000). Maplerad also holds a
$1,000 card reserve before live cards work. Before each new card the server tops Spend up from
Treasury to the $5 that card needs (`ensureSpend` in lib/cards/maplerad.ts), never more than $100 at once.

### IP whitelisting

Yes, Maplerad's live mode only accepts calls from server IP addresses you have registered with them. The sandbox doesn't need this. Live calls from any other address are refused with error 403, and the app shows "The card company didn't respond".

1. **Find Render's addresses.** In the Render dashboard, open the flowvault service, click **Connect** (top right), then the **Outbound** tab. It lists the outbound IP addresses for the Frankfurt region. Send Maplerad all of them.
2. **If Maplerad wants exactly one fixed IP**, Render's list won't do, because those addresses are shared and there are several. Two options:
   - a "static IP" proxy add-on (for example QuotaGuard Static or Fixie). It has a monthly fee, and only the Maplerad calls go through it;
   - or a small cheap server with a fixed IP (a VPS) that forwards only the Maplerad calls.

   Either one is a small change in `lib/cards/maplerad.ts`, where all Maplerad calls go through a single `call()` function.

Maplerad's webhooks come from a fixed list of their own IPs (in their docs). The webhook route already checks Maplerad's signature, which is the stronger check.

### Top-ups (Paystack)

Users add money by **debit card** or **bank transfer** on Paystack's page, then come back to `/topup`.
Money is added only after the server checks the payment with Paystack, and each payment is added once.

On Render > Environment, add `PAYSTACK_SECRET_KEY` (test key `sk_test_...` first). In Paystack >
Settings > API Keys & Webhooks, set the **Webhook URL** to `https://<your app>/api/webhooks/paystack`.
Without the key the app keeps its pretend top-ups. The first **live** (`sk_live_`) payment switches
pretend top-ups off for good, so nobody can add free money once real money flows.


## Admin page

Open `/admin` on the live site while logged in. Only the emails in `ADMIN_EMAILS` (Render > Environment, comma separated) can see it; everyone else gets "not found".

It shows Maplerad balances (USD Spend, USD Treasury, Naira), the Paystack balance and daily move status, users and ID checks, top-ups, card fees earned, and cards (with recent failures). Buttons: move dollars from Treasury to Spend (Maplerad takes about 3%, max $500 a go) and send the Paystack money to Maplerad now (needs AUTO_SWEEP=on, once a day). Maplerad has no API to turn Naira into dollars, so that is done in the Maplerad dashboard.
