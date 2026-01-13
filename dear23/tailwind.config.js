/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: 'hsl(var(--primary))',
                'text-primary': 'hsl(var(--text-primary))',
                'text-secondary': 'hsl(var(--text-secondary))',
                background: 'hsl(var(--background))',
                'background-secondary': 'hsl(var(--background-secondary))',
                border: 'hsl(var(--border))',
                accent: 'hsl(var(--accent))',
                'input-bg': 'hsl(var(--input-bg))',
            },
            fontFamily: {
                "display": ["Plus Jakarta Sans", "Inter", "sans-serif"],
                "sans": ["Plus Jakarta Sans", "Inter", "sans-serif"],
                "serif": ["Noto Serif KR", "serif"],
            },
            borderRadius: {
                "DEFAULT": "6px",
                "lg": "8px",
                "xl": "12px",
                "full": "9999px"
            },
        },
    },
    plugins: [],
}
