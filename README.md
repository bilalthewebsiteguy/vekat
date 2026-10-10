# VEKAT Nig Ltd — vekat.org

Single-page marketing site for VEKAT Nig Ltd and the Home Bridge Cooperative, built with Next.js and Tailwind CSS.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Registration storage

The Home Bridge registration form posts to a Google Apps Script Web App that appends each submission to a Google Sheet (see the developer brief, Section 3, for the Sheet and `Code.gs` setup).

Once deployed, copy `.env.example` to `.env.local` (or set it in your host's environment variables):

```bash
NEXT_PUBLIC_REGISTRATION_ENDPOINT=https://script.google.com/macros/s/XXXXXXXX/exec
```

Until it is set, submitting the form shows a "storage isn't connected yet" message. After a successful submission the form shows the Stripe payment link.

## Structure

- `src/app/` — root layout (fonts, metadata), page, global styles/theme, favicons
- `src/components/` — one component per page section (`Header`, `Hero`, `About`, `Services`, `HomeBridge`, `Register`, `RegistrationForm`, `Contact`, `Footer`)
- `public/` — VEKAT logo and icon
