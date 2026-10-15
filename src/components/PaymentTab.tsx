"use client";

import { useEffect } from "react";

/** The channel the registration form listens on, so it updates the moment Stripe sends the payer back. */
export const PAYMENT_CHANNEL = "homebridge-payment";

/**
 * Shown in the tab the form opened for Stripe. It tells the form how the payment ended, then closes
 * itself; a tab the browser will not let us close keeps the message below on screen.
 */
export default function PaymentTab({ outcome }: { outcome: "paid" | "cancelled" }) {
  useEffect(() => {
    try {
      const channel = new BroadcastChannel(PAYMENT_CHANNEL);
      channel.postMessage(outcome);
      channel.close();
    } catch {
      // Older browsers: the form also checks with Stripe every few seconds.
    }
    const id = setTimeout(() => window.close(), 1500);
    return () => clearTimeout(id);
  }, [outcome]);

  return (
    <main className="grid min-h-screen place-items-center bg-cream px-4">
      <div className="w-full max-w-[440px] rounded-[20px] border border-line bg-white p-7 text-center shadow-[0_20px_50px_rgba(27,67,50,.08)]">
        <h1 className="m-0 text-[22px]">{outcome === "paid" ? "Payment completed" : "Payment cancelled"}</h1>
        <p className="mt-3 mb-0 text-[14.5px] text-muted">
          {outcome === "paid"
            ? "Thank you — your £10 registration fee has been received. This tab will close; go back to the registration form to finish."
            : "No payment was taken. This tab will close; go back to the registration form to try again."}
        </p>
      </div>
    </main>
  );
}
