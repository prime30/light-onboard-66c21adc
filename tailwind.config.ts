import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Die Grotesk B", "system-ui", "sans-serif"],
        display: ["Die Grotesk B", "system-ui", "sans-serif"],
        grotesk: ["Die Grotesk B", "system-ui", "sans-serif"],
        termina: ["Termina", "Bebas Neue", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        default: "hsl(var(--default))",
        info: "hsl(var(--info))",
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          red: "hsl(var(--accent-red))",
          "red-soft": "hsl(var(--accent-red-soft))",
        },
        status: {
          amber: "hsl(var(--status-amber))",
          green: "hsl(var(--status-green))",
          red: "hsl(var(--status-red))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        // Standardized border-radius system: 3, 5, 10, 20, 30, 40, 9999
        xs: "var(--radius-xs)", // 3px - tiny badges
        sm: "var(--radius-sm)", // 5px - small badges
        md: "var(--radius-md)", // 10px - inputs, cards, medium elements
        lg: "var(--radius-lg)", // 20px - larger cards, containers
        xl: "var(--radius-xl)", // 30px - modal corners, large containers
        "2xl": "var(--radius-2xl)", // 40px - hero sections, large backgrounds
        full: "var(--radius-full)", // 9999px - pills, CTAs, circular buttons
        // Form element specific
        form: "var(--radius-form)",
        "form-sm": "var(--radius-form-sm)",
      },
      height: {
        // Standardized input heights
        input: "var(--input-height)",
        "input-prominent": "var(--input-height-prominent)",
        button: "var(--button-height)",
      },
      boxShadow: {
        soft: "0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 4px 16px -4px rgba(0, 0, 0, 0.08)",
        card: "0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.06)",
        elevated: "0 8px 30px rgba(0, 0, 0, 0.08)",
        "input-focus": "var(--shadow-input-focus)",
        "card-hover": "var(--shadow-card-hover)",
        pill: "var(--shadow-pill)",
        "pill-hover": "var(--shadow-pill-hover)",
        toast: "var(--shadow-toast)",
        modal: "var(--shadow-modal)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(4px)" },
        },
        "scroll-wheel": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "50%": { opacity: "0.4", transform: "translateY(8px)" },
          "100%": { opacity: "0", transform: "translateY(12px)" },
        },
        "scroll-chevron-1": {
          "0%, 100%": { opacity: "0.4", transform: "translateY(0)" },
          "50%": { opacity: "0.7", transform: "translateY(2px)" },
        },
        "scroll-chevron-2": {
          "0%, 100%": { opacity: "0.2", transform: "translateY(0)" },
          "50%": { opacity: "0.5", transform: "translateY(3px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 1.5s ease-in-out infinite",
        "bounce-subtle": "bounce-subtle 6s ease-in-out infinite",
        "scroll-wheel": "scroll-wheel 1.5s cubic-bezier(0.65, 0, 0.35, 1) infinite",
        "scroll-chevron-1": "scroll-chevron-1 1.5s ease-in-out infinite",
        "scroll-chevron-2": "scroll-chevron-2 1.5s ease-in-out infinite 0.15s",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
