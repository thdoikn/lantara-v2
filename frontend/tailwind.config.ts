import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Nusantara brand palette (CLAUDE.md §4.1)
        jagawana: {
          DEFAULT: "#428A40",
          deep: "#2F6B2E",
        },
        khatulistiwa: "#185088",
        terakota: "#DBAF6C",
        saka: "#EE2F24",
        pertiwi: "#FBF9D5",
        buana: {
          DEFAULT: "#919191",
          dark: "#242421",
        },
        // Semantic aliases
        primary: {
          DEFAULT: "#428A40",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#185088",
          foreground: "#ffffff",
        },
        destructive: {
          DEFAULT: "#EE2F24",
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "#DBAF6C",
          foreground: "#242421",
        },
        background: "#FBF9D5",
        foreground: "#242421",
        muted: {
          DEFAULT: "#f3f2e0",
          foreground: "#919191",
        },
        accent: {
          DEFAULT: "#DBAF6C",
          foreground: "#242421",
        },
        border: "#e0dfc5",
        input: "#e0dfc5",
        ring: "#185088",
        card: {
          DEFAULT: "#ffffff",
          foreground: "#242421",
        },
        popover: {
          DEFAULT: "#ffffff",
          foreground: "#242421",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ['"Plus Jakarta Sans"', "Inter", "sans-serif"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      spacing: {
        // 8px grid
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
        "20": "5rem",
        "24": "6rem",
        "32": "8rem",
      },
      maxWidth: {
        content: "1200px",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
