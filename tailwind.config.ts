import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0f172a",
          sidebar: "#020617",
          muted: "#1e293b",
        },
        gold: {
          DEFAULT: "#f59e0b",
          light: "#fef3c7",
          muted: "#92400e",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
