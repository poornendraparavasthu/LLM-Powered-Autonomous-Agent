/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: ["class"],

  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.css",
  ],

  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--bg))",
        foreground: "hsl(var(--fg))",

        primary: {
          DEFAULT: "hsl(var(--terminal))",
          foreground: "hsl(var(--bg))",
        },

        muted: {
          DEFAULT: "hsl(var(--surface))",
          foreground: "hsl(var(--fg))",
        },
      },
    },
  },

  plugins: [],
};

export default config;
