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
(they enter the transfer details), or by card on the same step. Choosing the card shows
**Pay now by Stripe**, which opens the client's Stripe Payment Link (`STRIPE_PAYMENT_LINK` in
`src/lib/payment-methods.ts`) in a new tab. The form adds a random `vekatpay_…` code as the link's
`client_reference_id` and then asks `/api/payments/confirm` every few seconds whether Stripe holds a
paid checkout on that link with that code. Once it does, the step shows the payment as completed.
On submit, `/api/register` fetches the checkout from Stripe again and only accepts it if it is paid,
was made on that Payment Link from the form, and is not already used by another registration — the
registration is then stored with its fee already **Verified**.

Set `STRIPE_SECRET_KEY` to the secret key of **the Stripe account that owns the Payment Link**
(live key `sk_live_…` for a live link); a key from any other account cannot see its payments.

So that the Stripe tab closes itself after paying, edit the Payment Link in the Stripe dashboard →
**After the payment** → *Don't show confirmation page* → redirect to
`https://<your-site>/payment-complete?session_id={CHECKOUT_SESSION_ID}`. Without it the payment is
still picked up; the member just closes Stripe's own confirmation tab themselves.

`/api/payments/webhook` (with `STRIPE_WEBHOOK_SECRET`) only matters for fees paid by a registration's
`APP-…` reference; fees paid during the form are recorded by `/api/register`.

## Structure

- `src/app/` — root layout (fonts, metadata), page, global styles/theme, favicons
- `src/app/api/register/` — receives registrations and stores them
- `src/lib/` — the database connection and the registration store
- `src/components/` — one component per page section (`Header`, `Hero`, `About`, `Services`, `HomeBridge`, `Register`, `RegistrationForm`, `Contact`, `Footer`)
- `public/` — VEKAT logo and icon
