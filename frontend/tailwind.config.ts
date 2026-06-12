import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Royal blue authority scale (primary brand) ──
        royal: {
          950: "#03061A",
          900: "#060D2E",
          800: "#0D1F5C",
          700: "#1A3480",
          600: "#1E40AF", // primary brand
          500: "#2563EB",
          400: "#3B82F6",
          300: "#93C5FD",
          200: "#BFDBFE",
          100: "#DBEAFE",
          50: "#EFF6FF",
        },
        // ── Navy scale (landing — dark capital-city world) ──
        navy: {
          950: "#030A1A",
          900: "#060D2E",
          800: "#0B1B3E",
          700: "#0F2456",
          600: "#1A3480",
          500: "#1E40AF",
          400: "#2563EB",
          300: "#3B82F6",
          200: "#93C5FD",
          100: "#DBEAFE",
          50: "#EFF6FF",
        },
        // ── Gold accent (IKN official gold) ──
        gold: {
          700: "#92600A",
          600: "#B8860B",
          500: "#D4A017",
          400: "#EDB94A",
          300: "#F5D87A",
          200: "#FBF0C4",
          100: "#FEF9E7",
        },
        // ── Surfaces ──
        surface: {
          DEFAULT: "#F8FAFF", // off-white with blue tint
          card: "#FFFFFF",
          dark: "#060D2E",
        },
        // ── Ink (text) ──
        ink: {
          DEFAULT: "#0D1F5C",
          muted: "#4B5E8A",
          faint: "#94A3B8",
        },
        // ── Status ──
        status: {
          success: "#059669",
          warning: "#D97706",
          danger: "#DC2626",
          info: "#2563EB",
        },

        // ── Legacy Nusantara names remapped onto the royal system ──
        //    (kept so existing components rebrand without per-file edits)
        jagawana: {
          DEFAULT: "#1E40AF", // was green → now royal primary
          deep: "#1A3480",
          light: "#3B82F6",
        },
        khatulistiwa: {
          DEFAULT: "#2563EB",
          light: "#3B82F6",
        },
        terakota: "#D4A017", // warm accent → gold
        saka: "#DC2626", // danger
        pertiwi: "#EFF6FF", // light surface tint
        buana: {
          DEFAULT: "#4B5E8A", // muted navy-grey
          dark: "#060D2E", // dark royal surface
          darker: "#03061A",
        },

        // ── Semantic tokens ──
        primary: {
          DEFAULT: "#1E40AF",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#2563EB",
          foreground: "#ffffff",
        },
        destructive: {
          DEFAULT: "#DC2626",
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "#D4A017",
          foreground: "#ffffff",
        },
        background: "#F8FAFF",
        foreground: "#0D1F5C",
        muted: {
          DEFAULT: "#EFF6FF",
          foreground: "#4B5E8A",
        },
        accent: {
          DEFAULT: "#D4A017",
          foreground: "#ffffff",
        },
        border: "#DBE3F4",
        input: "#DBE3F4",
        ring: "#2563EB",
        card: {
          DEFAULT: "#ffffff",
          foreground: "#0D1F5C",
        },
        popover: {
          DEFAULT: "#ffffff",
          foreground: "#0D1F5C",
        },
        // Dark surface colors for sidebars
        sidebar: {
          DEFAULT: "#060D2E",
          hover: "#0D1F5C",
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
        "gradient-jagawana": "linear-gradient(135deg, #1E40AF 0%, #1A3480 100%)",
        "gradient-royal": "linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)",
        "gradient-gold": "linear-gradient(135deg, #D4A017 0%, #EDB94A 100%)",
        "gradient-dark": "linear-gradient(135deg, #060D2E 0%, #03061A 100%)",
        "gradient-hero": "linear-gradient(160deg, #060D2E 0%, #0D1F5C 55%, #1A3480 100%)",
        "gradient-auth": "linear-gradient(150deg, #0D1F5C 0%, #060D2E 45%, #03061A 100%)",
        "noise": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        "glow-green": "0 0 30px -5px rgba(30, 64, 175, 0.40)", // remapped → royal glow
        "glow-blue": "0 0 30px -5px rgba(37, 99, 235, 0.40)",
        "glow-royal": "0 0 30px -5px rgba(37, 99, 235, 0.45)",
        "glow-warm": "0 0 30px -5px rgba(212, 160, 23, 0.40)", // gold
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
