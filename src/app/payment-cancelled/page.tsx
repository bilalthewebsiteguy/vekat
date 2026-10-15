import PaymentTab from "@/components/PaymentTab";

export const metadata = { title: "Payment cancelled" };

export default function PaymentCancelled() {
  return <PaymentTab outcome="cancelled" />;
}
