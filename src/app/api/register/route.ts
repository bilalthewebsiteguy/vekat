import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { saveRegistration, type RegistrationInput } from "@/lib/registrations";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v: unknown, max = 10) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, max) : []);
const yes = (v: unknown) => v === true || v === "Yes";

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const isPhone = (v: string) => /^\+?\d{10,15}$/.test(v.replace(/[\s\-().]/g, ""));
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Whole years between a yyyy-mm-dd birth date and today. NaN if the date is not valid. */
function ageOn(dob: string, today: Date): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return NaN;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const birth = new Date(Date.UTC(y, mo - 1, d));
  if (birth.getUTCFullYear() !== y || birth.getUTCMonth() !== mo - 1 || birth.getUTCDate() !== d) return NaN;
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < mo || (today.getMonth() + 1 === mo && today.getDate() < d)) age--;
  return age;
}

/**
 * Receives registrations from the Home Bridge form on vekat.org and stores them in the database
 * shared with the HomeBridge site, so one person has one reference across both.
 *
 * Registrations carry an ID number: it is stored, never logged, and never returned to the browser.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const input: RegistrationInput = {
    email: str(body.email, 120),
    memberType: str(body.memberType, 120),
    cohort: str(body.cohort, 80),
    alsoInterested: list(body.alsoInterested),
    heardFrom: str(body.heardFrom, 80),
    title: str(body.title, 20),
    surname: str(body.surname, 80),
    firstName: str(body.firstName, 80),
    otherNames: str(body.otherNames, 80),
    dateOfBirth: str(body.dateOfBirth, 10),
    sex: str(body.sex, 10),
    nationality: str(body.nationality, 60),
    stateOfOrigin: str(body.stateOfOrigin, 80),
    occupation: str(body.occupation, 100),
    phone: str(body.phone, 40),
    homeAddress: str(body.homeAddress, 300),
    countryOfResidence: str(body.countryOfResidence, 80),
    nigeriaAddress: str(body.nigeriaAddress, 300),
    idType: str(body.idType, 80),
    idNumber: str(body.idNumber, 40),
    idDocsConfirmed: yes(body.idDocsConfirmed),
    nomineeName: str(body.nomineeName, 120),
    nomineeRelationship: str(body.nomineeRelationship, 60),
    nomineePhone: str(body.nomineePhone, 40),
    paymentMethod: str(body.paymentMethod, 120),
    datePaid: str(body.datePaid, 10),
    paymentReference: str(body.paymentReference, 80),
    receiptConfirmed: yes(body.receiptConfirmed),
    sharePlan: str(body.sharePlan, 120),
    declarations: list(body.declarations, 12),
    signature: str(body.signature, 120),
  };

  // The browser checks each step, but a request can arrive without going through the form at all.
  const fields: string[] = [];
  if (!isEmail(input.email)) fields.push("email");
  if (!input.memberType) fields.push("memberType");
  if (!input.cohort) fields.push("cohort");
  if (!input.title) fields.push("title");
  if (input.firstName.length < 2) fields.push("firstName");
  if (input.surname.length < 2) fields.push("surname");
  if (!isDate(input.dateOfBirth)) fields.push("dateOfBirth");
  if (!input.sex) fields.push("sex");
  if (input.nationality.length < 2) fields.push("nationality");
  if (input.occupation.length < 2) fields.push("occupation");
  if (!isPhone(input.phone)) fields.push("phone");
  if (input.homeAddress.length < 6) fields.push("homeAddress");
  if (input.countryOfResidence.length < 2) fields.push("countryOfResidence");
  if (!input.idType) fields.push("idType");
  if (input.idNumber.length < 6) fields.push("idNumber");
  if (!input.idDocsConfirmed) fields.push("idDocsConfirmed");
  if (input.nomineeName.length < 3) fields.push("nomineeName");
  if (input.nomineeRelationship.length < 2) fields.push("nomineeRelationship");
  if (!isPhone(input.nomineePhone)) fields.push("nomineePhone");
  if (!input.paymentMethod) fields.push("paymentMethod");
  if (!isDate(input.datePaid)) fields.push("datePaid");
  if (input.paymentReference.length < 3) fields.push("paymentReference");
  if (input.declarations.length < 7) fields.push("declarations");
  if (input.signature.length < 3) fields.push("signature");

  if (fields.length) {
    return NextResponse.json({ ok: false, error: "Some answers need checking", fields }, { status: 422 });
  }

  // Members must be 18 or older: computed here, not trusted from the browser.
  if (!(ageOn(input.dateOfBirth, new Date()) >= 18)) {
    return NextResponse.json({ ok: false, error: "Applicants must be 18 or older", fields: ["dateOfBirth"] }, { status: 422 });
  }

  if (!isDbConfigured()) {
    console.error("[register] MONGODB_URI is not set — the registration was not stored.");
    return NextResponse.json({ ok: false, error: "Registration storage is not configured" }, { status: 503 });
  }

  try {
    const { reference } = await saveRegistration(input);
    return NextResponse.json({ ok: true, reference });
  } catch (err) {
    // Never return the error text: a Mongo error can carry the connection string.
    console.error("[register] could not store the registration:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not store registration" }, { status: 502 });
  }
}
