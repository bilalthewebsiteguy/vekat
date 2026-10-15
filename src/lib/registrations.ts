// Writes VEKAT registrations into the database shared with the HomeBridge site.
//
// The form on this site collects the same membership details as the HomeBridge one, so it writes
// to the same `members` collection, tagged source: "vekat". Both sites' registrations then appear
// in one admin queue. People are matched by email or phone, so someone who registers on both sites
// is one person with one reference, not two records.

import "server-only";
import type { Collection } from "mongodb";
import { getDb } from "@/lib/db";

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
  route: string;
  routeDetail: string;
  sharePlan: string;
  alsoInterested: string[];

  idChoice: string;
  idNumber: string;
  idDocsEmailed: boolean;

  payment: {
    status: "Claimed";
    method: string;
    datePaid: string;
    reference: string;
    receiptEmailed: boolean;
    verifiedAt: Date | null;
    verifiedBy: string | null;
    amount: string | null;
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
export type RegistrationInput = {
  email: string;
  memberType: string;
  cohort: string;
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
  receiptConfirmed: boolean;
  sharePlan: string;
  declarations: string[];
  signature: string;
};

const DECLARATION_COUNT = 7;

export async function saveRegistration(input: RegistrationInput, declarationCount = DECLARATION_COUNT) {
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
    chapter: input.cohort,
    memberType: input.memberType.startsWith("Home") ? "home" : "diaspora",
    route: "",
    routeDetail: input.nigeriaAddress,
    sharePlan: input.sharePlan,
    alsoInterested: input.alsoInterested,

    idChoice: input.idType,
    idNumber: input.idNumber,
    idDocsEmailed: input.idDocsConfirmed,

    payment: {
      status: "Claimed",
      method: input.paymentMethod,
      datePaid: input.datePaid,
      reference: input.paymentReference,
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
