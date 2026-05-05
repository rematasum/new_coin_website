import { Navbar } from "@/components/Navbar";
import { MarqueeText } from "@/components/MarqueeText";
import { HeroSection } from "@/components/HeroSection";
import { AirdropForm } from "@/components/AirdropForm";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <MarqueeText />
      <HeroSection />
      <AirdropForm />
      <Footer />
    </main>
  );
}
