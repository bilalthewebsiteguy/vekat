// Shared by the form and the server, so both decide the payment route the same way.

/** True when a country-of-residence answer means Nigeria: the fee is then paid by bank transfer, not card. */
export function livesInNigeria(country: string) {
  const c = country.trim().toLowerCase();
  return c.includes("nigeria") || c === "ng" || c === "nga";
}
