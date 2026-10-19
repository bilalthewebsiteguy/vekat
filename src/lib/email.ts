// Outgoing email, used for the registration confirmation.
//
// Sent over SMTP through the vekat.org mailbox hosted at GoDaddy, so the member sees a real
// vekat.org address as the sender.
//
// SMTP_PASSWORD is the mailbox password: a server secret, never imported into a client component
// and never sent to the browser. If it is not set, no mail is sent and registrations still save.

import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/** GoDaddy's own "Professional Email". Microsoft 365 mailboxes use smtp.office365.com instead. */
const DEFAULT_HOST = "smtpout.secureserver.net";
const DEFAULT_PORT = 465;

const host = process.env.SMTP_HOST?.trim() || DEFAULT_HOST;
const port = Number(process.env.SMTP_PORT) || DEFAULT_PORT;
const user = process.env.SMTP_USER?.trim() || "";
const password = process.env.SMTP_PASSWORD || "";

export const isEmailConfigured = () => Boolean(user && password);

let transporter: Transporter | null = null;

/** One reused connection pool: a new SMTP handshake per email is slow and trips rate limits. */
function transport(): Transporter {
  transporter ??= nodemailer.createTransport({
    host,
    port,
    // 465 is implicit TLS; 587 upgrades with STARTTLS. Either way the password is never in clear.
    secure: port === 465,
    auth: { user, pass: password },
    pool: true,
    maxConnections: 1,
    // Vercel functions are short-lived, so fail fast rather than holding the request open.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transporter;
}

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
  if (!isEmailConfigured()) return { ok: false, error: "SMTP_USER / SMTP_PASSWORD are not set" };

  // GoDaddy rejects a From that is not the authenticated mailbox, so it defaults to that mailbox.
  const from = process.env.EMAIL_FROM?.trim() || `Home Bridge <${user}>`;
  const bcc = input.bcc?.trim() || process.env.EMAIL_BCC?.trim() || "";

  try {
    const info = await transport().sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      ...(bcc ? { bcc } : {}),
      // Bounces and auto-replies go to the mailbox, not to the member.
      replyTo: process.env.EMAIL_REPLY_TO?.trim() || user,
    });

    return { ok: true, id: info.messageId || "" };
  } catch (err) {
    // SMTP errors name the host and the refusal reason, which is what makes a wrong host, port or
    // password debuggable. They carry no member data, so the caller can log this safely.
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
