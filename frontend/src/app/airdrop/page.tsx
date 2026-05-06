import type { Metadata } from "next";
import { AirdropForm } from "@/components/AirdropForm";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Free Airdrop — FLOZY ($FLZY)",
  description: "Register for the FLOZY free airdrop. Connect your Base wallet and X/Twitter account. Tokens locked for 6 months after distribution.",
};

export default function AirdropPage() {
  return (
    <main>
      <section className="min-h-screen relative" style={{ paddingTop: "106px" }}>
        {/* Glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full opacity-10"
               style={{ background: "#00E676", filter: "blur(100px)" }} />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-10"
               style={{ background: "#FFD43B", filter: "blur(80px)" }} />
        </div>

        <div className="relative z-10">
          {/* Important vesting notice */}
          <div className="max-w-lg mx-auto px-4 sm:px-6 pt-10 pb-0">
            <div className="meme-card p-4 text-center mb-2" style={{ borderColor: "#00E676", borderWidth: 2 }}>
              <p className="font-bangers text-base txt-green" style={{ letterSpacing: "2px" }}>
                ⏳ VESTİNG BİLGİSİ
              </p>
              <p className="font-fredoka text-sm text-gray-300 mt-1">
                Airdrop token&apos;larının vesting süreci,{" "}
                <span className="txt-yellow font-bold">dağıtımdan 6 ay sonra başlar.</span>
                <br />
                <span className="text-gray-400 text-xs">
                  Airdrop vesting begins 6 months after token distribution.
                </span>
              </p>
            </div>
          </div>

          {/* AirdropForm handles the rest of the section UI */}
          <AirdropForm />
        </div>
      </section>

      <Footer />
    </main>
  );
}
