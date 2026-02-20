/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Custom colors removed - use GoA design tokens via CSS variables
      // Custom fontFamily removed - use GoA design tokens via CSS variables
    },
  },
  plugins: [],
}
