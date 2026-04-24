/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f9f4",
          100: "#dcf1e3",
          500: "#16a36b",
          600: "#128757",
          700: "#0d6b45",
        },
        correctness: "#dc2626",
        clarity: "#2563eb",
        engagement: "#7c3aed",
        delivery: "#0891b2",
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
