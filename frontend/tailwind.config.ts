import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./store/**/*.{js,ts,tsx}",
    "./lib/**/*.{js,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyan:    "#3ddbda",
        success: "#59d38c",
        danger:  "#ff647c",
        warning: "#f59e0b",
        amber:   "#f59e0b",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Consolas", "monospace"],
      },
      borderColor: {
        DEFAULT: "rgba(132, 170, 180, 0.14)",
        line:    "rgba(132, 170, 180, 0.14)",
      },
      textColor: {
        success: "#59d38c",
        danger:  "#ff647c",
        warning: "#f59e0b",
        cyan:    "#3ddbda",
        amber:   "#f59e0b",
      },
      backgroundColor: {
        "black/25": "rgba(0,0,0,0.25)",
        "black/30": "rgba(0,0,0,0.30)",
        "black/35": "rgba(0,0,0,0.35)",
        "black/40": "rgba(0,0,0,0.40)",
      },
      screens: {
        "2xl": "1400px",
      },
    },
  },
  plugins: [],
  safelist: [
    "text-success", "text-danger", "text-warning", "text-cyan", "text-amber",
    "border-line", "bg-cyan/10", "bg-cyan/20", "border-cyan/20",
    "border-cyan/30", "border-cyan/40", "border-cyan/50", "border-cyan/60",
    "bg-emerald-500/10", "bg-emerald-500/15", "bg-red-500/10", "bg-red-500/15",
    "bg-amber-500/10", "bg-violet-500/10", "text-emerald-400", "text-red-400",
    "text-amber-400", "text-violet-400",
    "neural-grid", "subtle-grid", "glass", "terminal-topbar",
  ],
};

export default config;
