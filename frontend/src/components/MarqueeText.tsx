const TEXT = "🚀 PRESALE LIVE  ·  BUY $FLZY NOW  ·  BIGGEST MEME ON BASE  ·  5 STAGES — EARLY BUYERS WIN  ·  BASE NETWORK  ·  $FLZY TO THE MOON  ·";

export function MarqueeText() {
  // Duplicate for seamless loop
  const items = [TEXT, TEXT];

  return (
    <div className="bg-black border-y-4 border-yellow-400 overflow-hidden py-2.5 relative z-50">
      <div
        className="flex whitespace-nowrap"
        style={{ animation: "marquee 22s linear infinite", width: "max-content" }}
      >
        {items.map((t, i) => (
          <span key={i} className="font-bangers text-meme-yellow text-base tracking-widest mx-0 px-0">
            {t}&nbsp;&nbsp;&nbsp;&nbsp;
          </span>
        ))}
      </div>
    </div>
  );
}
