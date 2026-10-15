import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HomeBridge from "@/components/HomeBridge";
import Register from "@/components/Register";
import Services from "@/components/Services";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : "";
  return (
    <>
      <Header />
      <main>
        <Hero />
        <About />
        <Services />
        <HomeBridge />
        <Register sessionId={sessionId} />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
