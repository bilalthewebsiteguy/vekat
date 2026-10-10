import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HomeBridge from "@/components/HomeBridge";
import Register from "@/components/Register";
import Services from "@/components/Services";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <About />
        <Services />
        <HomeBridge />
        <Register />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
