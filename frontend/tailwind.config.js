/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#FF8C00",
          dark: "#E07800",
          light: "#FFB84D",
        },
        accent: {
          blue: "#4EC5F1",
          yellow: "#FFD166",
          green: "#06D6A0",
          purple: "#9B5DE5",
        },
        surface: {
          DEFAULT: "#0B1426",
          card: "#112040",
          border: "#1E3A5F",
          light: "#1A3A6B",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace"],
      },
      borderRadius: {
        bubble: "9999px",
      },
      boxShadow: {
        bubble: "0 6px 0 rgba(0,0,0,0.3), 0 2px 20px rgba(255,140,0,0.25)",
        "bubble-blue": "0 6px 0 rgba(0,0,0,0.3), 0 2px 20px rgba(78,197,241,0.25)",
        card: "0 4px 24px rgba(0,0,0,0.4)",
        glow: "0 0 30px rgba(255,140,0,0.3)",
        "glow-blue": "0 0 30px rgba(78,197,241,0.3)",
      },
      animation: {
        "float": "float 3s ease-in-out infinite",
        "float-slow": "float 5s ease-in-out infinite",
        "twinkle": "twinkle 2s ease-in-out infinite alternate",
        "marquee": "marquee 30s linear infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 8s linear infinite",
        "bounce-slow": "bounce 2s infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        twinkle: {
          "0%": { opacity: "0.3", transform: "scale(0.8)" },
          "100%": { opacity: "1", transform: "scale(1.2)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};
