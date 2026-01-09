/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                "primary": "#000000",
                "background-light": "#ffffff",
                "background-dark": "#0a0a0a",
            },
            fontFamily: {
                "display": ["Inter", "Noto Sans KR", "sans-serif"],
                "sans": ["Inter", "Noto Sans KR", "sans-serif"],
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
