# VEKAT Nig Ltd — vekat.org

Single-page marketing site for VEKAT Nig Ltd and the Home Bridge Cooperative, built with Next.js and Tailwind CSS.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Registration storage

The Home Bridge registration form posts to `/api/register`, which stores each registration in
MongoDB. The HomeBridge site (`homebridgecooperative.org`) points at the **same** database, so
someone who registers on either site has one record and one reference: people are matched by email
or phone. Registrations from both sites appear in the HomeBridge admin queue.

Copy `.env.example` to `.env.local` (or set it in your host's environment variables):

```bash
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.example.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=homebridge
```

Until it is set, submitting the form shows a "registrations aren't being accepted just now" message.

Registrations carry an ID number (BVN, NIN or passport). It is never written to a log and never sent
back to the browser, but it is in the database — restrict who holds the Atlas credentials, turn on
IP access lists, and agree a retention period with the client.

## Card payments (Stripe)

Diaspora members pay the registration fee by card after submitting the form. `/api/payments/checkout`
creates a Stripe Checkout session carrying the member's reference as `client_reference_id`, and
`/api/payments/webhook` listens for `checkout.session.completed` and marks that member's fee as
**Verified** — so a paid fee appears as verified in the HomeBridge admin dashboard without anyone
checking Stripe by hand.

Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Use the **test** key (`sk_test_…`) until the
client signs off.

The webhook signature is checked before any field is trusted: anyone can POST to that URL, so
without the check a forged request could mark any fee as paid. Repeated events are ignored, because
Stripe can send the same event more than once.

### Testing locally

```bash
stripe login
stripe listen --forward-to localhost:3000/api/payments/webhook
```

`stripe listen` prints a `whsec_…` secret — put that in `.env.local` and restart. Then register as a
diaspora member, click **Pay £10 Registration Fee**, and use Stripe's test card `4242 4242 4242 4242`
with any future expiry and any CVC.

## Structure

- `src/app/` — root layout (fonts, metadata), page, global styles/theme, favicons
- `src/app/api/register/` — receives registrations and stores them
- `src/lib/` — the database connection and the registration store
- `src/components/` — one component per page section (`Header`, `Hero`, `About`, `Services`, `HomeBridge`, `Register`, `RegistrationForm`, `Contact`, `Footer`)
- `public/` — VEKAT logo and icon
