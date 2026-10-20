import { Suspense } from "react";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HomeBridge from "@/components/HomeBridge";
import Register from "@/components/Register";
import Services from "@/components/Services";
import { isStripeConfigured } from "@/lib/stripe";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Reads Stripe's ?session_id= at request time, so the rest of the page can still be prerendered. */
async function RegisterWithSession({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : "";
  // Whether a card payment can be confirmed at all. Without a Stripe key the form must not hold
  // anyone behind a confirmation that can never arrive.
  return <Register sessionId={sessionId} stripeReady={isStripeConfigured()} />;
}

export default function Home({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <About />
        <Services />
        <HomeBridge />
        <Suspense fallback={<Register />}>
          <RegisterWithSession searchParams={searchParams} />
        </Suspense>
        <Contact />
      </main>
      <Footer />
    </>
  );
}
