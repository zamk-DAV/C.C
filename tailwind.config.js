export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Map Tailwind colors to CSS variables
                primary: 'var(--primary-color)',
                'text-primary': 'var(--text-primary)',
                'text-secondary': 'var(--text-secondary)',
                'background': 'var(--bg-color)',
                'background-secondary': 'var(--bg-secondary)',
                'border': 'var(--border-color)',
                'accent': 'var(--accent-color)',
                'input-bg': 'var(--input-bg)',

                // Keep backward compatibility if needed, or just let these override
                "background-light": "var(--bg-color)", // alias
                "background-dark": "var(--bg-color)",  // alias (dynamic now)
            },
            fontFamily: {
                "display": ["-apple-system", "BlinkMacSystemFont", "Apple SD Gothic Neo", "Malgun Gothic", "sans-serif"],
                "sans": ["-apple-system", "BlinkMacSystemFont", "Apple SD Gothic Neo", "Malgun Gothic", "sans-serif"],
                "serif": ["-apple-system", "BlinkMacSystemFont", "Apple SD Gothic Neo", "Malgun Gothic", "serif"],
            },
            borderRadius: {
                "DEFAULT": "6px",
                "lg": "8px",
                "xl": "12px",
                "full": "9999px"
            },
        },
    },
    plugins: [
        require("tailwindcss-animate"),
    ],
}
