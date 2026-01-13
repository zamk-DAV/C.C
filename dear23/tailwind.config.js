/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: 'var(--primary-color)',
                'text-primary': 'var(--text-primary)',
                'text-secondary': 'var(--text-secondary)',
                'background': 'var(--bg-color)',
                'background-secondary': 'var(--bg-secondary)',
                'border': 'var(--border-color)',
                'accent': 'var(--accent-color)',
                'input-bg': 'var(--input-bg)',
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
