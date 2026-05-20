import dynamic from "next/dynamic";
import { MarqueeText } from "@/components/MarqueeText";
import { Tokenomics } from "@/components/Tokenomics";
import { Roadmap } from "@/components/Roadmap";
import { AirdropForm } from "@/components/AirdropForm";
import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";

// These components use wagmi hooks (wallet state, contract reads) which
// produce different HTML on server vs client — ssr: false prevents Next.js
// from server-rendering them, eliminating all hydration mismatches.
const Navbar = dynamic(
  () => import("@/components/Navbar").then((m) => ({ default: m.Navbar })),
  { ssr: false }
);
const HeroSection = dynamic(
  () => import("@/components/HeroSection").then((m) => ({ default: m.HeroSection })),
  { ssr: false }
);
const ClaimsSection = dynamic(
  () => import("@/components/ClaimsSection").then((m) => ({ default: m.ClaimsSection })),
  { ssr: false }
);

export default function Home() {
  return (
    <main>
      <MarqueeText />
      <Navbar />
      <HeroSection />
      <ClaimsSection />
      <Tokenomics />
      <Roadmap />
      <AirdropForm />
      <FAQ />
      <Footer />
    </main>
  );
}
