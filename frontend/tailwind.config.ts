import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Khatulistiwa — THE primary blue (Nusantara official) ──
        khatulistiwa: {
          DEFAULT: "#185088", // = 600 (legacy `text-khatulistiwa` etc.)
          light: "#2E85C8",   // = 400 (legacy `khatulistiwa-light`)
          950: "#04182A",
          900: "#0A2540",
          800: "#0D3060",
          700: "#124278",
          600: "#185088",
          500: "#1E6BA8",
          400: "#2E85C8",
          300: "#5BA3D8",
          200: "#93C4E8",
          100: "#CBE3F5",
          50: "#EBF4FB",
        },
        // ── Terakota — THE gold/brown accent (Nusantara official) ──
        terakota: {
          DEFAULT: "#DBAF6C", // = 500 (legacy `text-terakota` etc.)
          900: "#5C3A10",
          800: "#7A4E18",
          700: "#9A6520",
          600: "#BA8030",
          500: "#DBAF6C",
          400: "#E4C08A",
          300: "#EDCEA8",
          200: "#F4E0C8",
          100: "#FAF0E8",
          50: "#FDF8F2",
        },
        // ── Jagawana — green secondary accent only ──
        jagawana: {
          DEFAULT: "#428A40",
          deep: "#2F6B2E",
          light: "#5EA85C",
          600: "#2F6B2E",
          500: "#428A40",
          400: "#5EA85C",
          300: "#8CC68A",
        },
        pertiwi: {
          DEFAULT: "#FBF9D5",
          warm:    "#F5F0E8",
          muted:   "#EDE8D5",
        },
        buana: {
          DEFAULT: "#919191",
          dark: "#242421", // near-black
          mid: "#919191",  // muted grey
          darker: "#161614",
        },
        saka: "#DC2626", // danger

        // ── Legacy aliases remapped onto the Nusantara system ──
        //    royal/navy → khatulistiwa, gold → terakota, so globals.css and
        //    authenticated components render correct colors without edits.
        royal: {
          950: "#04182A", 900: "#0A2540", 800: "#0D3060", 700: "#124278",
          600: "#185088", 500: "#1E6BA8", 400: "#2E85C8", 300: "#5BA3D8",
          200: "#93C4E8", 100: "#CBE3F5", 50: "#EBF4FB",
        },
        navy: {
          950: "#04182A", 900: "#0A2540", 800: "#0D3060", 700: "#124278",
          600: "#185088", 500: "#1E6BA8", 400: "#2E85C8", 300: "#5BA3D8",
          200: "#93C4E8", 100: "#CBE3F5", 50: "#EBF4FB",
        },
        gold: {
          700: "#9A6520", 600: "#BA8030", 500: "#DBAF6C", 400: "#E4C08A",
          300: "#EDCEA8", 200: "#F4E0C8", 100: "#FAF0E8",
        },

        // ── Surfaces ──
        surface: {
          DEFAULT: "#F8FAFF",
          card: "#FFFFFF",
          dark: "#0A2540",
        },
        // ── Ink (text) ──
        ink: {
          DEFAULT: "#0D3060",
          muted: "#4B6486",
          faint: "#94A3B8",
        },
        // ── Status ──
        status: {
          success: "#428A40",
          warning: "#BA8030",
          danger: "#DC2626",
          info: "#185088",
        },

        // ── Semantic tokens ──
        primary: { DEFAULT: "#185088", foreground: "#ffffff" },
        secondary: { DEFAULT: "#1E6BA8", foreground: "#ffffff" },
        destructive: { DEFAULT: "#DC2626", foreground: "#ffffff" },
        warning: { DEFAULT: "#DBAF6C", foreground: "#242421" },
        background: "#F8FAFF",
        foreground: "#0D3060",
        muted: { DEFAULT: "#EBF4FB", foreground: "#4B6486" },
        accent: { DEFAULT: "#DBAF6C", foreground: "#242421" },
        border: "#D3E0EE",
        input: "#D3E0EE",
        ring: "#185088",
        card: { DEFAULT: "#ffffff", foreground: "#0D3060" },
        popover: { DEFAULT: "#ffffff", foreground: "#0D3060" },
        // Dark surface colors for sidebars
        sidebar: {
          DEFAULT: "#0A2540",
          hover: "#0D3060",
          border: "rgba(255,255,255,0.08)",
          text: "rgba(255,255,255,0.72)",
          "text-muted": "rgba(255,255,255,0.45)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ['"Plus Jakarta Sans"', "Inter", "sans-serif"],
      },
      borderRadius: {
        sm: "0.25rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
        "4xl": "2.5rem",
      },
      spacing: {
        "0.5": "0.125rem",
        "1": "0.25rem",
        "2": "0.5rem",
        "3": "0.75rem",
        "4": "1rem",
        "5": "1.25rem",
        "6": "1.5rem",
        "8": "2rem",
        "10": "2.5rem",
        "12": "3rem",
        "16": "4rem",
        "18": "4.5rem",
        "20": "5rem",
        "24": "6rem",
        "32": "8rem",
      },
      maxWidth: {
        content: "1200px",
        prose: "68ch",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-jagawana": "linear-gradient(135deg, #185088 0%, #124278 100%)",
        "gradient-royal": "linear-gradient(135deg, #185088 0%, #1E6BA8 100%)",
        "gradient-gold": "linear-gradient(135deg, #DBAF6C 0%, #E4C08A 100%)",
        "gradient-dark": "linear-gradient(135deg, #0A2540 0%, #04182A 100%)",
        "gradient-hero": "linear-gradient(160deg, #04182A 0%, #0A2540 55%, #124278 100%)",
        "gradient-auth": "linear-gradient(150deg, #0A2540 0%, #04182A 45%, #04182A 100%)",
        "noise": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        "glow-green": "0 0 30px -5px rgba(66, 138, 64, 0.40)", // jagawana green
        "glow-blue": "0 0 30px -5px rgba(24, 80, 136, 0.40)",
        "glow-royal": "0 0 30px -5px rgba(24, 80, 136, 0.45)",
        "glow-warm": "0 0 30px -5px rgba(219, 175, 108, 0.40)", // terakota
        "card": "0 1px 3px rgba(13,31,92,0.06), 0 1px 2px rgba(13,31,92,0.04)",
        "card-hover": "0 4px 16px rgba(13,31,92,0.10), 0 2px 4px rgba(13,31,92,0.05)",
        "auth": "0 25px 60px rgba(3,6,26,0.30), 0 10px 25px rgba(3,6,26,0.18)",
        "floating": "0 8px 32px rgba(13,31,92,0.14), 0 2px 8px rgba(13,31,92,0.06)",
        "inner-top": "inset 0 1px 0 rgba(255,255,255,0.08)",
      },
      animation: {
        "fade-in": "fadeIn 0.35s ease-out",
        "slide-up": "slideUp 0.4s cubic-bezier(0.22,1,0.36,1)",
        "slide-in-right": "slideInRight 0.35s cubic-bezier(0.22,1,0.36,1)",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 1.5s ease-in-out infinite",
        "spin-slow": "spin 8s linear infinite",
        "drift-1": "drift1 22s ease-in-out infinite",
        "drift-2": "drift2 28s ease-in-out infinite",
        "drift-3": "drift3 25s ease-in-out infinite",
        "btn-shimmer": "btnShimmer 2.5s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideInRight: {
          "0%": { transform: "translateX(20px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        drift1: {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "50%": { transform: "translate(60px, -40px) scale(1.12)" },
        },
        drift2: {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "50%": { transform: "translate(-50px, 50px) scale(1.08)" },
        },
        drift3: {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "50%": { transform: "translate(40px, 60px) scale(1.15)" },
        },
        btnShimmer: {
          "0%": { transform: "translateX(-150%)" },
          "60%, 100%": { transform: "translateX(150%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
