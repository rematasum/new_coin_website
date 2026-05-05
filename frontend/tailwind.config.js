/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        sky: {
          dark:   "#071B3E",
          mid:    "#0E3068",
          base:   "#4FB9E8",
          light:  "#87D4F5",
        },
        meme: {
          yellow:  "#FFD43B",
          orange:  "#FF6B00",
          red:     "#FF2D55",
          green:   "#00E676",
          purple:  "#A855F7",
        },
        card: {
          dark:   "#0A2145",
          mid:    "#0E3068",
          border: "#1B5A9C",
        },
      },
      fontFamily: {
        bangers:  ["Bangers", "cursive"],
        fredoka:  ["Fredoka One", "cursive"],
        nunito:   ["Nunito", "sans-serif"],
      },
      animation: {
        "float":      "float 3s ease-in-out infinite",
        "float-slow": "float 5s ease-in-out infinite",
        "bounce-fun": "bounceFun 0.6s ease infinite alternate",
        "marquee":    "marquee 22s linear infinite",
        "cloud1":     "cloud1 35s linear infinite",
        "cloud2":     "cloud2 50s linear infinite",
        "star-twinkle":"starTwinkle 1.5s ease-in-out infinite alternate",
        "glow-pulse":  "glowPulse 2s ease-in-out infinite",
        "spin-slow":   "spin 8s linear infinite",
        "pop":         "pop 0.15s ease",
        "shimmer":     "shimmer 2s linear infinite",
      },
      keyframes: {
        float: {
          "0%,100%": { transform: "translateY(0px) rotate(-1deg)" },
          "50%":     { transform: "translateY(-18px) rotate(1deg)" },
        },
        bounceFun: {
          "0%":   { transform: "scale(1) translateY(0)" },
          "100%": { transform: "scale(1.06) translateY(-4px)" },
        },
        marquee: {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        cloud1: {
          "0%":   { transform: "translateX(-200px)" },
          "100%": { transform: "translateX(110vw)" },
        },
        cloud2: {
          "0%":   { transform: "translateX(110vw)" },
          "100%": { transform: "translateX(-200px)" },
        },
        starTwinkle: {
          "0%":   { opacity: "0.2", transform: "scale(0.7)" },
          "100%": { opacity: "1",   transform: "scale(1.3)" },
        },
        glowPulse: {
          "0%,100%": { boxShadow: "0 0 20px rgba(79,185,232,0.5), 0 0 40px rgba(79,185,232,0.2)" },
          "50%":     { boxShadow: "0 0 40px rgba(79,185,232,0.8), 0 0 80px rgba(79,185,232,0.4)" },
        },
        pop: {
          "0%":   { transform: "scale(1)" },
          "50%":  { transform: "scale(1.12)" },
          "100%": { transform: "scale(1)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
      },
      boxShadow: {
        "meme":       "4px 4px 0px #000",
        "meme-lg":    "6px 6px 0px #000",
        "meme-hover": "7px 7px 0px #000",
        "meme-active":"2px 2px 0px #000",
        "glow-blue":  "0 0 30px rgba(79,185,232,0.6)",
        "glow-yellow":"0 0 30px rgba(255,212,59,0.6)",
        "glow-orange":"0 0 30px rgba(255,107,0,0.6)",
        "card":       "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
      },
      borderRadius: {
        "meme": "20px",
        "bubble": "9999px",
      },
      textShadow: {
        "meme": "3px 3px 0px #000, -1px -1px 0px #000",
      },
    },
  },
  plugins: [],
};
