const tailwindcssAnimate = require("tailwindcss-animate");
const tailwindcssAspectRatio = require("@tailwindcss/aspect-ratio");

/** @type {import('tailwindcss').Config} */
export default{
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
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },

        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
      },
    },
  },

  plugins: [tailwindcssAnimate, tailwindcssAspectRatio],
};