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

Each member chooses how to pay the registration fee, wherever they live: ₦10,000 by bank transfer
(they enter the transfer details), or £10 by card on the same step. Choosing the card shows
**Pay now by Stripe**, which opens Stripe Checkout in a new tab (`/api/payments/checkout`);
when the payment finishes Stripe sends that tab to `/payment-complete`, which tells the form and
closes itself, and the form shows the payment as completed. On submit, `/api/register` fetches the
session from Stripe and only accepts it if it is paid, for the right amount, and not already used by
another registration — the registration is then stored with its fee already **Verified**.

`/api/payments/webhook` still listens for `checkout.session.completed`, for registrations that are
paid by their reference after submitting.

Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Use the **test** key (`sk_test_…`) until the
client signs off.

The webhook signature is checked before any field is trusted: anyone can POST to that URL, so
without the check a forged request could mark any fee as paid. Repeated events are ignored, because
Stripe can send the same event more than once.

### On Vercel

Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in the project's environment variables, then
redeploy (environment changes do not apply to an existing deployment). To get the webhook secret:
Stripe dashboard → Developers → Webhooks → Add endpoint → `https://<your-site>/api/payments/webhook`,
select `checkout.session.completed`, save, and copy the signing secret it shows.

A payment is recorded even before that webhook exists: when the payer returns from Stripe the site
asks Stripe whether that session was actually paid (`/api/payments/confirm`). The session id alone
proves nothing — the answer comes from Stripe — but this only runs if the payer comes back, which is
why the webhook is still the reliable path.

### Testing locally

```bash
stripe login
stripe listen --forward-to localhost:3000/api/payments/webhook
```

`stripe listen` prints a `whsec_…` secret — put that in `.env.local` and restart. Then register, choose
the card payment on the Registration fee step, click **Pay now by Stripe**, and use Stripe's test card `4242 4242 4242 4242`
with any future expiry and any CVC.

## Structure

- `src/app/` — root layout (fonts, metadata), page, global styles/theme, favicons
- `src/app/api/register/` — receives registrations and stores them
- `src/lib/` — the database connection and the registration store
- `src/components/` — one component per page section (`Header`, `Hero`, `About`, `Services`, `HomeBridge`, `Register`, `RegistrationForm`, `Contact`, `Footer`)
- `public/` — VEKAT logo and icon
