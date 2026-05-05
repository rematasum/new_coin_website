export function MarqueeText() {
  const items = [
    "🚀 FLOZY PRESALE LIVE",
    "🌕 BUY FLZY NOW",
    "⭐ BASE NETWORK",
    "🔥 LIMITED SUPPLY",
    "💎 5 STAGES · 250M TOKENS",
    "🎯 EARLY BUYERS GET BEST PRICE",
    "🚀 FLOZY PRESALE LIVE",
    "🌕 BUY FLZY NOW",
    "⭐ BASE NETWORK",
    "🔥 LIMITED SUPPLY",
    "💎 5 STAGES · 250M TOKENS",
    "🎯 EARLY BUYERS GET BEST PRICE",
  ];

  return (
    <div className="bg-brand overflow-hidden py-2.5 border-y-2 border-brand-dark">
      <div className="flex animate-marquee whitespace-nowrap" style={{ width: "max-content" }}>
        {items.map((item, i) => (
          <span key={i} className="text-white font-black text-sm tracking-wide mx-6">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
