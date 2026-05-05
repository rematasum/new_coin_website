"use client";

import { useState } from "react";

const WEBHOOK_URL = process.env.NEXT_PUBLIC_SHEETS_WEBHOOK_URL ?? "";

function isValidEthAddress(v: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(v);
}
function isValidTwitter(v: string) {
  return /^@?[A-Za-z0-9_]{1,15}$/.test(v);
}

export function AirdropForm() {
  const [twitter, setTwitter] = useState("");
  const [wallet, setWallet] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const tw = twitter.startsWith("@") ? twitter : "@" + twitter;
    if (!isValidTwitter(twitter)) {
      setErrorMsg("Invalid Twitter/X username.");
      return;
    }
    if (!isValidEthAddress(wallet)) {
      setErrorMsg("Invalid Base wallet address (must be 0x...).");
      return;
    }

    setStatus("loading");

    try {
      if (!WEBHOOK_URL) {
        // Dev fallback — log to console
        console.log("Airdrop signup:", { twitter: tw, wallet, timestamp: new Date().toISOString() });
        await new Promise((r) => setTimeout(r, 800));
        setStatus("success");
        return;
      }

      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          twitter: tw,
          wallet,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error("Submission failed");
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  };

  return (
    <section id="airdrop" className="py-20 border-t border-surface-border">
      <div className="max-w-lg mx-auto px-4 sm:px-6 text-center">
        {/* Header */}
        <div className="text-5xl mb-4 animate-bounce-slow">🎁</div>
        <h2 className="text-4xl font-black mb-2">
          Free <span className="gradient-text">Airdrop</span>
        </h2>
        <p className="text-gray-400 mb-8 text-lg">
          Register your X account and Base wallet to receive a{" "}
          <span className="text-accent-yellow font-bold">6-month locked airdrop</span> of FLZY tokens.
        </p>

        {status === "success" ? (
          <div className="glass rounded-3xl p-8 border border-accent-green/30">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-xl font-black text-accent-green mb-2">You're registered!</h3>
            <p className="text-gray-400 text-sm">
              We'll distribute airdrop tokens after the presale ends. Tokens will be locked for 6 months.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass rounded-3xl p-6 border border-surface-border space-y-4 text-left">
            {/* Twitter field */}
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-1.5">
                𝕏 Twitter / X Username
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">@</span>
                <input
                  type="text"
                  value={twitter.startsWith("@") ? twitter.slice(1) : twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="flozymeme"
                  required
                  className="w-full bg-surface-card border-2 border-surface-border rounded-2xl pl-8 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue transition-colors"
                />
              </div>
            </div>

            {/* Wallet field */}
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-1.5">
                Base Wallet Address
              </label>
              <input
                type="text"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                placeholder="0x..."
                required
                className="w-full bg-surface-card border-2 border-surface-border rounded-2xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue transition-colors font-mono text-sm"
              />
            </div>

            {errorMsg && (
              <p className="text-red-400 text-sm">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="btn-bubble w-full text-lg py-3.5"
            >
              {status === "loading" ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Registering…
                </span>
              ) : "🎯 Register for Airdrop"}
            </button>

            <p className="text-xs text-gray-500 text-center">
              Airdrop tokens are locked for 6 months after distribution. One registration per wallet.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
