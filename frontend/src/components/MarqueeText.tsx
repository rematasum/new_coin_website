const TEXT = "🚀 PRESALE LIVE  ·  BUY $FLZY NOW  ·  BIGGEST MEME ON BASE  ·  5 STAGES — EARLY BUYERS WIN  ·  BASE NETWORK  ·  $FLZY TO THE MOON  ·";

export function MarqueeText() {
  // Duplicate for seamless loop
  const items = [TEXT, TEXT];

  return (
    <div className="fixed top-0 left-0 right-0 bg-black border-b-4 border-yellow-400 overflow-hidden py-2.5 z-[60]">
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
