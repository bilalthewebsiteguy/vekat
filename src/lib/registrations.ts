// Writes VEKAT registrations into the database shared with the HomeBridge site.
//
// The form on this site collects the same membership details as the HomeBridge one, so it writes
// to the same `members` collection, tagged source: "vekat". Both sites' registrations then appear
// in one admin queue. People are matched by email or phone, so someone who registers on both sites
// is one person with one reference, not two records.

import "server-only";
import { Binary, type Collection } from "mongodb";
import { getDb } from "@/lib/db";
import { livesInNigeria } from "@/lib/residence";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeReference(prefix: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `${prefix}-${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("")}`;
}

export const normEmail = (v: string) => v.trim().toLowerCase();

/** Digits only, keeping the last 10, so +234 810 583 2602 and 08105832602 match. */
export function normPhone(v: string) {
  const digits = v.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

type PersonDoc = {
  reference: string;
  emails: string[];
  phones: string[];
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

/** Matches the document the HomeBridge site writes, so one admin queue can read both. */
type MemberDoc = {
  reference: string;
  personRef: string;
  status: "Submitted";
  supporter: false;

  title: string;
  firstName: string;
  surname: string;
  otherNames: string;
  fullName: string;
  sex: string;
  nationality: string;
  stateOfOrigin: string;
  dob: string;

  email: string;
  emailNorm: string;
  whatsapp: string;
  phoneNorm: string;
  contactMethod: string;
  contact: string;

  country: string;
  state: string;
  city: string;
  address: string;

  occupation: string;
  heard: string;
  chapter: string;
  memberType: string;
  /** Every option ticked on the form; memberType keeps the single value the HomeBridge admin reads. */
  memberTypes: string[];
  /** Every cohort ticked on the form; chapter holds them joined, for the HomeBridge admin. */
  chapters: string[];
  route: string;
  routeDetail: string;
  sharePlan: string;
  alsoInterested: string[];

  idChoice: string;
  idNumber: string;
  idDocsEmailed: boolean;

  payment: {
    status: "Claimed" | "Verified";
    method: string;
    datePaid: string;
    reference: string;
    receiptEmailed: boolean;
    /** Whose account the money came from, when a joint or family account paid. */
    payerName?: string;
    verifiedAt: Date | null;
    verifiedBy: string | null;
    amount: string | null;
    /** Set by the payment provider's webhook, never by the applicant. */
    provider?: string;
    providerRef?: string;
    /** The provider event that recorded it, so a repeated webhook cannot double-count. */
    eventId?: string;
  };

  /**
   * The receipt the applicant uploaded, if any. Held as bytes rather than a link so there is no
   * second place to secure, and never returned to a browser without an officer signing in first.
   */
  receipt?: {
    name: string;
    type: string;
    bytes: number;
    data: Binary;
    uploadedAt: Date;
  };

  groupName: string;
  repName: string;
  groupDoc: string;
  nominees: { name: string; relationship: string; contact: string; share: number }[];
  declarations: { accepted: string[]; allAccepted: boolean } | null;
  signature: string;

  source: "vekat";
  submittedAt: Date;
  updatedAt: Date;
};

async function collections() {
  const db = await getDb();
  return {
    people: db.collection<PersonDoc>("people") as Collection<PersonDoc>,
    members: db.collection<MemberDoc>("members") as Collection<MemberDoc>,
  };
}

let indexesReady: Promise<void> | null = null;
export function ensureIndexes() {
  indexesReady ??= (async () => {
    const { people, members } = await collections();
    await Promise.all([
      people.createIndex({ reference: 1 }, { unique: true }),
      people.createIndex({ emails: 1 }),
      people.createIndex({ phones: 1 }),
      members.createIndex({ reference: 1 }, { unique: true }),
      members.createIndex({ personRef: 1 }),
      members.createIndex({ submittedAt: -1 }),
      members.createIndex({ status: 1 }),
    ]);
  })().catch((err) => {
    indexesReady = null;
    throw err;
  });
  return indexesReady;
}

/** Finds the person behind an email or phone, or creates one. Shared with the HomeBridge site. */
async function upsertPerson(input: { name: string; email: string; phone: string }): Promise<string> {
  const { people } = await collections();
  const email = input.email ? normEmail(input.email) : "";
  const phone = input.phone ? normPhone(input.phone) : "";

  const or = [...(email ? [{ emails: email }] : []), ...(phone && phone.length >= 7 ? [{ phones: phone }] : [])];
  const existing = or.length ? await people.findOne({ $or: or }) : null;
  const now = new Date();

  if (existing) {
    await people.updateOne(
      { reference: existing.reference },
      {
        $addToSet: { ...(email ? { emails: email } : {}), ...(phone ? { phones: phone } : {}) },
        $set: { updatedAt: now, ...(input.name ? { name: input.name } : {}) },
      },
    );
    return existing.reference;
  }

  const reference = makeReference("HB");
  await people.insertOne({
    reference,
    emails: email ? [email] : [],
    phones: phone ? [phone] : [],
    name: input.name,
    createdAt: now,
    updatedAt: now,
  });
  return reference;
}

/** The shape the registration form sends, already trimmed and checked by the route. */
/** "10.00 GBP" from Stripe's smallest-unit amount, as the HomeBridge admin shows it. */
function formatAmount(amount: number | null, currency: string | null) {
  return amount === null ? null : `${(amount / 100).toFixed(2)} ${(currency ?? "").toUpperCase()}`.trim();
}

/** A card payment already confirmed with Stripe, to be stored as verified with the registration. */
export type CardPayment = {
  amount: number | null;
  currency: string | null;
  provider: string;
  providerRef: string;
  /** The Checkout session id, so one payment cannot be attached to two registrations. */
  eventId: string;
};

/** True when a Checkout session has already paid for a registration. */
export async function isCheckoutSessionUsed(sessionId: string) {
  const { members } = await collections();
  return (await members.countDocuments({ "payment.eventId": sessionId }, { limit: 1 })) > 0;
}

/** One registration, by its reference. */
export async function findMemberByReference(reference: string) {
  const { members } = await collections();
  return members.findOne({ reference });
}

/**
 * Records a verified payment against a registration. Keyed on the provider's event id, so a webhook
 * Stripe sends twice updates the record once.
 */
export async function markPaymentVerified(
  reference: string,
  input: { amount: number | null; currency: string | null; provider: string; providerRef: string; eventId: string },
) {
  const { members } = await collections();
  const amount = formatAmount(input.amount, input.currency);

  await members.updateOne(
    { reference, "payment.eventId": { $ne: input.eventId } },
    {
      $set: {
        "payment.status": "Verified",
        "payment.verifiedAt": new Date(),
        "payment.verifiedBy": `${input.provider} (automatic)`,
        "payment.amount": amount,
        "payment.provider": input.provider,
        "payment.providerRef": input.providerRef,
        "payment.eventId": input.eventId,
        updatedAt: new Date(),
      },
    },
  );
}

/** A receipt that has already been decoded and checked by the route. */
export type StoredReceipt = { name: string; type: string; bytes: number; data: Buffer };

export type RegistrationInput = {
  email: string;
  memberType: string[];
  cohort: string[];
  alsoInterested: string[];
  heardFrom: string;
  title: string;
  surname: string;
  firstName: string;
  otherNames: string;
  dateOfBirth: string;
  sex: string;
  nationality: string;
  stateOfOrigin: string;
  occupation: string;
  phone: string;
  homeAddress: string;
  countryOfResidence: string;
  nigeriaAddress: string;
  idType: string;
  idNumber: string;
  idDocsConfirmed: boolean;
  nomineeName: string;
  nomineeRelationship: string;
  nomineePhone: string;
  paymentMethod: string;
  datePaid: string;
  paymentReference: string;
  /** Whose account the money came from, when it was not the member's own. */
  payerName: string;
  receiptConfirmed: boolean;
  sharePlan: string;
  declarations: string[];
  signature: string;
};

const DECLARATION_COUNT = 7;

export async function saveRegistration(
  input: RegistrationInput,
  card: CardPayment | null,
  receipt: StoredReceipt | null = null,
  declarationCount = DECLARATION_COUNT,
) {
  await ensureIndexes();

  const fullName = [input.firstName, input.otherNames, input.surname]
    .map((p) => p.trim())
    .filter(Boolean)
    .join(" ");

  const personRef = await upsertPerson({ name: fullName, email: input.email, phone: input.phone });
  const { members } = await collections();
  const reference = makeReference("APP");
  const now = new Date();

  await members.insertOne({
    reference,
    personRef,
    status: "Submitted",
    supporter: false,

    title: input.title,
    firstName: input.firstName,
    surname: input.surname,
    otherNames: input.otherNames,
    fullName,
    sex: input.sex,
    nationality: input.nationality,
    stateOfOrigin: input.stateOfOrigin,
    dob: input.dateOfBirth,

    email: input.email,
    emailNorm: normEmail(input.email),
    whatsapp: input.phone,
    phoneNorm: normPhone(input.phone),
    contactMethod: "email",
    contact: input.email,

    country: input.countryOfResidence,
    state: input.stateOfOrigin,
    city: "",
    address: input.homeAddress,

    occupation: input.occupation,
    heard: input.heardFrom,
    chapter: input.cohort.join(", "),
    chapters: input.cohort,
    memberType: livesInNigeria(input.countryOfResidence) ? "home" : "diaspora",
    memberTypes: input.memberType,
    route: "",
    routeDetail: input.nigeriaAddress,
    sharePlan: input.sharePlan,
    alsoInterested: input.alsoInterested,

    idChoice: input.idType,
    idNumber: input.idNumber,
    idDocsEmailed: input.idDocsConfirmed,

    ...(receipt
      ? {
          receipt: {
            name: receipt.name,
            type: receipt.type,
            bytes: receipt.bytes,
            data: new Binary(receipt.data),
            uploadedAt: now,
          },
        }
      : {}),

    payment: card
      ? {
          status: "Verified",
          method: input.paymentMethod,
          datePaid: now.toISOString().slice(0, 10),
          reference: card.providerRef,
          receiptEmailed: false,
          verifiedAt: now,
          verifiedBy: `${card.provider} (automatic)`,
          amount: formatAmount(card.amount, card.currency),
          provider: card.provider,
          providerRef: card.providerRef,
          eventId: card.eventId,
        }
      : {
          status: "Claimed",
          method: input.paymentMethod,
          datePaid: input.datePaid,
          reference: input.paymentReference,
          payerName: input.payerName,
          receiptEmailed: input.receiptConfirmed,
          verifiedAt: null,
          verifiedBy: null,
          amount: null,
        },

    groupName: "",
    repName: "",
    groupDoc: "",
    nominees: input.nomineeName
      ? [{ name: input.nomineeName, relationship: input.nomineeRelationship, contact: input.nomineePhone, share: 100 }]
      : [],
    declarations: {
      accepted: input.declarations,
      allAccepted: input.declarations.length >= declarationCount,
    },
    signature: input.signature,

    source: "vekat",
    submittedAt: now,
    updatedAt: now,
  });

  return { reference };
}
