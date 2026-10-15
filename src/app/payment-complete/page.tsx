import PaymentTab from "@/components/PaymentTab";

export const metadata = { title: "Payment completed" };

export default function PaymentComplete() {
  return <PaymentTab outcome="paid" />;
}
