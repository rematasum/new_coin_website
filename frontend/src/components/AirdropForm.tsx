"use client";

import { useState } from "react";
import { notifyWebhook } from "@/lib/notify";

const WEBHOOK_URL = process.env.NEXT_PUBLIC_SHEETS_WEBHOOK_URL ?? "";

function isValidEthAddress(v: string) { return /^0x[0-9a-fA-F]{40}$/.test(v); }
function isValidTwitter(v: string)    { return /^@?[A-Za-z0-9_]{1,15}$/.test(v); }

export function AirdropForm() {
  const [twitter, setTwitter]     = useState("");
  const [wallet, setWallet]       = useState("");
  const [followsUs, setFollowsUs] = useState(false);
  const [status, setStatus]       = useState<"idle"|"loading"|"success"|"error">("idle");
  const [errMsg, setErrMsg]       = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg("");
    if (!isValidTwitter(twitter)) { setErrMsg("Invalid Twitter/X username."); return; }
    if (!isValidEthAddress(wallet)) { setErrMsg("Invalid Base wallet address (must be 0x...)."); return; }
    if (!followsUs) { setErrMsg("You must follow @flozymeme on X to register."); return; }
    setStatus("loading");
    try {
      const tw = twitter.startsWith("@") ? twitter : "@" + twitter;
      const payload = { type: "airdrop", twitter: tw, wallet, timestamp: new Date().toISOString() };
      if (!WEBHOOK_URL) {
        console.log("Airdrop signup:", payload);
        await new Promise((r) => setTimeout(r, 800));
      } else {
        const res = await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
      }
      setStatus("success");
    } catch {
      setStatus("error");
      setErrMsg("Something went wrong. Please try again.");
    }
  };

  return (
    <section id="airdrop" className="py-20 relative" style={{ borderTop: "4px solid #1B5A9C" }}>
      {/* Section ticker */}
      <div className="bg-black border-y-4 border-meme-yellow overflow-hidden py-2 mb-12">
        <div className="flex whitespace-nowrap" style={{ animation: "marquee 18s linear infinite", width: "max-content" }}>
          {[1,2].map(i => (
            <span key={i} className="font-bangers text-meme-yellow text-base tracking-widest px-8">
              🎁 FREE AIRDROP OPEN &nbsp;·&nbsp; REGISTER NOW &nbsp;·&nbsp; LIMITED SPOTS &nbsp;·&nbsp; 6-MONTH LOCK &nbsp;·&nbsp;
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 sm:px-6 text-center">
        <div className="text-6xl mb-4" style={{ animation: "mascotFloat 2.5s ease-in-out infinite" }}>🎁</div>
        <h2 className="font-bangers txt-shadow-meme mb-2" style={{ fontSize: "3.5rem", letterSpacing: "3px", color: "#FFD43B" }}>
          FREE AIRDROP
        </h2>
        <p className="font-fredoka text-lg text-gray-300 mb-3">
          Register your 𝕏 account and Base wallet to receive a{" "}
          <span className="txt-yellow font-bold">6-month locked airdrop</span> of $FLZY tokens.
        </p>
        <div className="inline-flex items-center gap-2 bg-black/40 border-2 border-meme-yellow rounded-full px-4 py-1.5 mb-8">
          <span className="text-meme-yellow font-bangers text-lg" style={{ letterSpacing: "1px" }}>🏆 FIRST 10,000 FOLLOWERS ONLY</span>
        </div>

        {status === "success" ? (
          <div className="meme-card p-8" style={{ borderColor: "#00E676", borderWidth: 3 }}>
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="font-bangers text-3xl txt-green mb-2" style={{ letterSpacing: "2px" }}>YOU'RE IN!</h3>
            <p className="font-fredoka text-gray-300 text-sm mb-3">
              Your registration has been received.
            </p>
            <div className="bg-black/40 rounded-lg px-4 py-3 text-left space-y-1">
              <p className="font-fredoka text-xs text-gray-400">
                ⚠️ <span className="text-meme-yellow font-bold">Follower check at distribution:</span> Only the first 10,000 followers of{" "}
                <a href="https://x.com/flozymeme" target="_blank" rel="noopener noreferrer" className="text-sky-400 underline">@flozymeme</a>{" "}
                who registered will receive the airdrop. Accounts not following at distribution time will be removed.
              </p>
              <p className="font-fredoka text-xs text-gray-500 mt-1">
                Tokens locked 6 months after distribution · Presale ends Aug 2026
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="meme-card p-6 space-y-4 text-left">
            <div>
              <label className="block font-fredoka font-bold text-meme-yellow mb-1.5">
                𝕏 Twitter / X Username
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold txt-yellow">@</span>
                <input
                  type="text"
                  value={twitter.startsWith("@") ? twitter.slice(1) : twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="flozymeme"
                  required
                  className="meme-input pl-8"
                />
              </div>
            </div>

            <div>
              <label className="block font-fredoka font-bold text-meme-yellow mb-1.5">
                Base Wallet Address
              </label>
              <input
                type="text"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                placeholder="0x..."
                required
                className="meme-input font-mono text-sm"
              />
            </div>

            {/* Follow requirement */}
            <div className="bg-black/30 rounded-lg p-3 space-y-2" style={{ border: "2px solid #1B5A9C" }}>
              <div className="flex items-start gap-3">
                <input
                  id="follows-check"
                  type="checkbox"
                  checked={followsUs}
                  onChange={(e) => setFollowsUs(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-yellow-400 cursor-pointer flex-shrink-0"
                />
                <label htmlFor="follows-check" className="font-fredoka text-sm text-gray-300 cursor-pointer leading-snug">
                  I follow{" "}
                  <a
                    href="https://x.com/flozymeme"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-meme-yellow font-bold underline underline-offset-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    @flozymeme
                  </a>{" "}
                  on X (required for airdrop)
                </label>
              </div>
              {!followsUs && (
                <a
                  href="https://x.com/intent/follow?screen_name=flozymeme"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center font-fredoka font-bold text-sm py-2 rounded-lg transition-colors"
                  style={{ background: "#1DA1F2", color: "#fff" }}
                >
                  Follow @flozymeme →
                </a>
              )}
            </div>

            {errMsg && <p className="font-fredoka text-red-400 text-sm">{errMsg}</p>}

            <button type="submit" disabled={status === "loading"} className="btn-meme-yellow w-full py-4 text-xl">
              {status === "loading" ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-3 border-black/30 border-t-black rounded-full animate-spin" />
                  Registering…
                </span>
              ) : "🎯 REGISTER FOR AIRDROP"}
            </button>

            <p className="font-fredoka text-xs text-gray-500 text-center">
              First 10,000 followers · One registration per wallet · Tokens locked 6 months
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
