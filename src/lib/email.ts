// Outgoing email, used for the registration confirmation.
//
// Sent through Resend's HTTP API rather than its npm package, so there is nothing extra to install
// and nothing to configure on Vercel beyond the two variables below.
//
// RESEND_API_KEY is a server secret and is never sent to the browser. Until the vekat.org domain is
// verified in Resend, leave EMAIL_FROM unset: Resend's own test sender is used, which can only
// deliver to the address that owns the Resend account. Once the domain is verified, set
// EMAIL_FROM="Home Bridge <no-reply@vekat.org>" and it delivers to anyone.

import "server-only";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** Resend's shared test sender. Deliverable only to the Resend account's own address. */
const TEST_FROM = "onboarding@resend.dev";

const apiKey = process.env.RESEND_API_KEY;

export const isEmailConfigured = () => Boolean(apiKey);

/** True while no verified sending domain is set, so the UI and logs can say so plainly. */
export const isEmailTestSender = () => !process.env.EMAIL_FROM;

export type SendResult = { ok: true; id: string } | { ok: false; error: string };

type SendInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Optional copy to the office, so staff see the same confirmation the member got. */
  bcc?: string;
};

/**
 * Sends one email. Never throws: a mail failure must not fail the thing that triggered it, so the
 * caller gets a result to log and the member's registration still stands.
 */
export async function sendEmail(input: SendInput): Promise<SendResult> {
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY is not set" };

  const from = process.env.EMAIL_FROM?.trim() || TEST_FROM;
  const bcc = input.bcc?.trim() || process.env.EMAIL_BCC?.trim() || "";

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
        ...(bcc ? { bcc: [bcc] } : {}),
      }),
    });

    const data = (await res.json().catch(() => null)) as { id?: string; message?: string } | null;

    if (!res.ok) {
      // Resend's message says which address or domain was refused, which is what makes a bad
      // EMAIL_FROM debuggable. It carries no member data, so it is safe to log.
      return { ok: false, error: data?.message || `Resend returned ${res.status}` };
    }

    return { ok: true, id: data?.id || "" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown error" };
  }
}

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type ConfirmationInput = {
  to: string;
  firstName: string;
  reference: string;
  /** True when the fee was already paid by card on the form; false means a bank transfer is owed. */
  paidByCard: boolean;
};

/**
 * The email a member gets the moment their registration is stored.
 *
 * It carries the reference and nothing sensitive: no ID number, no date of birth. Anyone who later
 * forwards it, or leaves it open on a shared screen, gives nothing away.
 */
export async function sendRegistrationConfirmation(input: ConfirmationInput): Promise<SendResult> {
  const name = input.firstName.trim() || "there";
  const ref = input.reference;

  const nextStep = input.paidByCard
    ? {
        text: `Your £10 registration fee was paid by card with this application, so there is nothing further to pay. Your card statement will show the payment separately.`,
        html: `Your <strong>£10 registration fee</strong> was paid by card with this application, so there is nothing further to pay. Your card statement will show the payment separately.`,
      }
    : {
        text: `Next step: pay your ₦10,000 registration fee to VEKAT Nigeria Limited, First Bank, account 2049483671, and put ${ref} as the payment reference so we can match it to you.`,
        html: `<strong>Next step:</strong> pay your <strong>₦10,000</strong> registration fee to VEKAT Nigeria Limited, First Bank, account <strong>2049483671</strong>, and put <strong>${esc(ref)}</strong> as the payment reference so we can match it to you.`,
      };

  const text = [
    `Hello ${name},`,
    ``,
    `Thank you for registering with Home Bridge Cooperative. We have your application.`,
    ``,
    `Your reference: ${ref}`,
    `Please keep it. Quote it in any message to us about your membership.`,
    ``,
    nextStep.text,
    ``,
    `We will email you again once your fee is confirmed and your membership is approved.`,
    ``,
    `Home Bridge Cooperative`,
    `VEKAT Nigeria Limited`,
  ].join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f5f2;font-family:ui-sans-serif,system-ui,'Segoe UI',Arial,sans-serif;color:#1c1b19;line-height:1.6">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e4e1da">
    <tr><td style="padding:28px">
      <p style="margin:0 0 16px">Hello ${esc(name)},</p>
      <p style="margin:0 0 16px">Thank you for registering with <strong>Home Bridge Cooperative</strong>. We have your application.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;background:#f6f5f2;border-radius:8px">
        <tr><td style="padding:16px;text-align:center">
          <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b6760">Your reference</div>
          <div style="font-size:22px;font-weight:700;letter-spacing:.04em;margin-top:4px">${esc(ref)}</div>
        </td></tr>
      </table>
      <p style="margin:0 0 16px">Please keep it. Quote it in any message to us about your membership.</p>
      <p style="margin:0 0 16px">${nextStep.html}</p>
      <p style="margin:0 0 20px">We will email you again once your fee is confirmed and your membership is approved.</p>
      <p style="margin:0;padding-top:16px;border-top:1px solid #e4e1da;font-size:13px;color:#6b6760">
        Home Bridge Cooperative<br>VEKAT Nigeria Limited
      </p>
    </td></tr>
  </table>
</body></html>`;

  return sendEmail({
    to: input.to,
    subject: `Your Home Bridge registration — ${ref}`,
    text,
    html,
  });
}
