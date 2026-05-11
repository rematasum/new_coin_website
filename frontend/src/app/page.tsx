import { Navbar } from "@/components/Navbar";
import { MarqueeText } from "@/components/MarqueeText";
import { HeroSection } from "@/components/HeroSection";
import { Tokenomics } from "@/components/Tokenomics";
import { Roadmap } from "@/components/Roadmap";
import { AirdropForm } from "@/components/AirdropForm";
import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <MarqueeText />
      <Navbar />
      <HeroSection />
      <Tokenomics />
      <Roadmap />
      <AirdropForm />
      <FAQ />
      <Footer />
    </main>
  );
}
