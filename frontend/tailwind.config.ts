import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        jagawana: {
          DEFAULT: "#428A40",
          deep: "#2F6B2E",
          light: "#6aaf68",
        },
        khatulistiwa: {
          DEFAULT: "#185088",
          light: "#2a6ab5",
        },
        terakota: "#DBAF6C",
        saka: "#EE2F24",
        pertiwi: "#FBF9D5",
        buana: {
          DEFAULT: "#919191",
          dark: "#242421",
          darker: "#161614",
        },
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
          DEFAULT: "#f0eedb",
          foreground: "#919191",
        },
        accent: {
          DEFAULT: "#DBAF6C",
          foreground: "#242421",
        },
        border: "#dddcc8",
        input: "#dddcc8",
        ring: "#185088",
        card: {
          DEFAULT: "#ffffff",
          foreground: "#242421",
        },
        popover: {
          DEFAULT: "#ffffff",
          foreground: "#242421",
        },
        // Dark surface colors for sidebar
        sidebar: {
          DEFAULT: "#1e1e1b",
          hover: "#2a2a26",
          border: "rgba(255,255,255,0.08)",
          text: "rgba(255,255,255,0.70)",
          "text-muted": "rgba(255,255,255,0.40)",
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
        "gradient-jagawana": "linear-gradient(135deg, #428A40 0%, #2F6B2E 100%)",
        "gradient-dark": "linear-gradient(135deg, #242421 0%, #161614 100%)",
        "gradient-hero": "linear-gradient(160deg, #1a3a1a 0%, #242421 50%, #0e1f3a 100%)",
        "gradient-auth": "linear-gradient(150deg, #1c2b1c 0%, #242421 40%, #0d1e38 100%)",
        "noise": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        "glow-green": "0 0 30px -5px rgba(66, 138, 64, 0.35)",
        "glow-blue": "0 0 30px -5px rgba(24, 80, 136, 0.35)",
        "glow-warm": "0 0 30px -5px rgba(219, 175, 108, 0.40)",
        "card": "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
        "auth": "0 25px 60px rgba(0,0,0,0.25), 0 10px 25px rgba(0,0,0,0.15)",
        "floating": "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
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
      },
    },
  },
  plugins: [],
};

export default config;
