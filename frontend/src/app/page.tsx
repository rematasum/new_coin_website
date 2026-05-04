import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { TokenomicsSection } from "@/components/TokenomicsSection";
import { RoadmapSection } from "@/components/RoadmapSection";
import { FaqSection } from "@/components/FaqSection";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <HeroSection />
      <TokenomicsSection />
      <RoadmapSection />
      <FaqSection />
      <Footer />
    </main>
  );
}
