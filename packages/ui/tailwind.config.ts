import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "../../apps/web/src/**/*.{ts,tsx}",
    "../../apps/web/app/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    /*
     * -------------------------------------------------------
     * BREAKPOINTS
     * Mobile-first. Default styles target < 640px.
     * -------------------------------------------------------
     */
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },

    extend: {
      /*
       * -------------------------------------------------------
       * COLORS
       * Primary: Teal-blue (trust, marketplace)
       * Accent:  Warm amber (energy, CTAs, promotions)
       * Semantic: Success, Warning, Error, Info
       * Neutral: Zinc-tinted warm grays
       * -------------------------------------------------------
       */
      colors: {
        primary: {
          50: "#EFF8F8",
          100: "#D7EEEF",
          200: "#B3DFE1",
          300: "#7FC9CD",
          400: "#49ABB2",
          500: "#2A8F97",
          600: "#217379",
          700: "#1B5D62",
          800: "#164B4F",
          900: "#0F3436",
          950: "#091F21",
        },
        accent: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
        },
        success: {
          50: "#F0FDF4",
          100: "#DCFCE7",
          200: "#BBF7D0",
          500: "#22C55E",
          600: "#16A34A",
          700: "#15803D",
        },
        warning: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          500: "#EAB308",
          600: "#CA8A04",
          700: "#A16207",
        },
        error: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
        },
        info: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
        },
        neutral: {
          0: "#FFFFFF",
          50: "#FAFAFA",
          100: "#F4F4F5",
          200: "#E4E4E7",
          300: "#D4D4D8",
          400: "#A1A1AA",
          500: "#71717A",
          600: "#52525B",
          700: "#3F3F46",
          800: "#27272A",
          900: "#18181B",
          950: "#09090B",
        },

        /* Surface tokens for light/dark mode */
        surface: {
          base: "var(--surface-base)",
          raised: "var(--surface-raised)",
          overlay: "var(--surface-overlay)",
          sunken: "var(--surface-sunken)",
        },
      },

      /*
       * -------------------------------------------------------
       * TYPOGRAPHY
       * Inter as primary, system stack fallback
       * -------------------------------------------------------
       */
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "'Helvetica Neue'",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "'JetBrains Mono'",
          "'Fira Code'",
          "'SF Mono'",
          "Consolas",
          "monospace",
        ],
      },

      fontSize: {
        /* Display */
        "display-lg": [
          "clamp(1.75rem, 1.25rem + 1.5vw, 2.5rem)",
          { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
        "display-sm": [
          "clamp(1.5rem, 1.125rem + 1.125vw, 2rem)",
          { lineHeight: "1.15", letterSpacing: "-0.015em", fontWeight: "700" },
        ],

        /* Headings */
        "heading-lg": [
          "clamp(1.25rem, 1.125rem + 0.375vw, 1.5rem)",
          { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "600" },
        ],
        "heading-md": [
          "clamp(1.125rem, 1.0625rem + 0.1875vw, 1.25rem)",
          { lineHeight: "1.3", letterSpacing: "-0.005em", fontWeight: "600" },
        ],
        "heading-sm": [
          "1rem",
          { lineHeight: "1.4", letterSpacing: "0", fontWeight: "600" },
        ],

        /* Body */
        "body-lg": [
          "1.125rem",
          { lineHeight: "1.6", letterSpacing: "0", fontWeight: "400" },
        ],
        "body-md": [
          "1rem",
          { lineHeight: "1.6", letterSpacing: "0", fontWeight: "400" },
        ],
        "body-sm": [
          "0.875rem",
          { lineHeight: "1.5", letterSpacing: "0.005em", fontWeight: "400" },
        ],

        /* Utility */
        caption: [
          "0.75rem",
          { lineHeight: "1.4", letterSpacing: "0.01em", fontWeight: "400" },
        ],
        label: [
          "0.875rem",
          { lineHeight: "1.0", letterSpacing: "0.01em", fontWeight: "500" },
        ],
        overline: [
          "0.75rem",
          { lineHeight: "1.0", letterSpacing: "0.08em", fontWeight: "600" },
        ],
      },

      /*
       * -------------------------------------------------------
       * SPACING
       * 4px base unit. Extends Tailwind default scale.
       * -------------------------------------------------------
       */
      spacing: {
        "0.5": "0.125rem", // 2px
        "1": "0.25rem", // 4px
        "1.5": "0.375rem", // 6px
        "2": "0.5rem", // 8px
        "2.5": "0.625rem", // 10px
        "3": "0.75rem", // 12px
        "4": "1rem", // 16px
        "5": "1.25rem", // 20px
        "6": "1.5rem", // 24px
        "8": "2rem", // 32px
        "10": "2.5rem", // 40px
        "12": "3rem", // 48px
        "16": "4rem", // 64px
        "20": "5rem", // 80px
        "24": "6rem", // 96px
      },

      /*
       * -------------------------------------------------------
       * BORDER RADIUS
       * Consistent per component class
       * -------------------------------------------------------
       */
      borderRadius: {
        none: "0",
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
        full: "9999px",
      },

      /*
       * -------------------------------------------------------
       * SHADOWS
       * Layered, soft shadows for depth hierarchy
       * -------------------------------------------------------
       */
      boxShadow: {
        xs: "0 1px 2px rgba(0, 0, 0, 0.05)",
        sm: "0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)",
        md: "0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)",
        lg: "0 12px 32px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.06)",
        xl: "0 24px 48px rgba(0, 0, 0, 0.16), 0 8px 16px rgba(0, 0, 0, 0.08)",
        /* Inverted shadow for bottom navigation bar */
        "up-lg":
          "0 -12px 32px rgba(0, 0, 0, 0.12), 0 -4px 8px rgba(0, 0, 0, 0.06)",
      },

      /*
       * -------------------------------------------------------
       * TRANSITIONS
       * Purposeful, subtle motion
       * -------------------------------------------------------
       */
      transitionDuration: {
        fast: "150ms",
        normal: "200ms",
        slow: "300ms",
        spring: "400ms",
      },
      transitionTimingFunction: {
        "ease-out-custom": "cubic-bezier(0.16, 1, 0.3, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },

      /*
       * -------------------------------------------------------
       * ANIMATIONS
       * Keyframe animations for common patterns
       * -------------------------------------------------------
       */
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        spin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "slide-in-bottom": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s infinite",
        "fade-in-up": "fade-in-up 300ms ease-out",
        pulse: "pulse 2s ease-in-out infinite",
        spin: "spin 1s linear infinite",
        "slide-in-bottom": "slide-in-bottom 200ms ease-out",
        "scale-in": "scale-in 200ms ease-out",
      },

      /*
       * -------------------------------------------------------
       * CONTAINER
       * Centered, responsive widths
       * -------------------------------------------------------
       */
      maxWidth: {
        container: "1440px",
        content: "1280px",
        form: "680px",
        chat: "960px",
      },

      /*
       * -------------------------------------------------------
       * Z-INDEX SCALE
       * Predictable stacking context
       * -------------------------------------------------------
       */
      zIndex: {
        dropdown: "100",
        sticky: "200",
        overlay: "300",
        modal: "400",
        popover: "500",
        toast: "600",
        tooltip: "700",
      },
    },
  },
  plugins: [],
};

export default config;
