/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#3b82f6', // Example premium blue
                secondary: '#64748b',
                'medical-teal': '#0d9488', // Teal-600
                'deep-blue': '#0f172a', // Slate-900
                'soft-surface': '#e2e8f0', // Slate-200 for better contrast
            }
        },
    },
    plugins: [],
}
