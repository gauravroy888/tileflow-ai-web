/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        success: '#16A34A',
        warning: '#F59E0B',
        error: '#DC2626',
        background: '#F8FAFC',
        surface: '#FFFFFF',
        textPrimary: '#111827',
        textSecondary: '#6B7280',
        border: '#E5E7EB',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
