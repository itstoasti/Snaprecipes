/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: "class",
    content: [
        "./app/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}",
    ],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                surface: {
                    DEFAULT: "rgb(var(--surface-950) / <alpha-value>)",
                    50: "rgb(var(--surface-50) / <alpha-value>)",
                    100: "rgb(var(--surface-100) / <alpha-value>)",
                    200: "rgb(var(--surface-200) / <alpha-value>)",
                    300: "rgb(var(--surface-300) / <alpha-value>)",
                    400: "rgb(var(--surface-400) / <alpha-value>)",
                    500: "rgb(var(--surface-500) / <alpha-value>)",
                    600: "rgb(var(--surface-600) / <alpha-value>)",
                    700: "rgb(var(--surface-700) / <alpha-value>)",
                    800: "rgb(var(--surface-800) / <alpha-value>)",
                    900: "rgb(var(--surface-900) / <alpha-value>)",
                    950: "rgb(var(--surface-950) / <alpha-value>)",
                },
                white: "rgb(var(--color-ink) / <alpha-value>)",
                accent: {
                    DEFAULT: "#FF6B35",
                    light: "#FF8F5E",
                    dark: "#E05520",
                    50: "#FFF3ED",
                    100: "#FFE2D1",
                    200: "#FFC4A3",
                    300: "#FFA775",
                    400: "#FF8F5E",
                    500: "#FF6B35",
                    600: "#E05520",
                    700: "#B8441A",
                    800: "#8C3414",
                    900: "#662710",
                },
                mint: {
                    DEFAULT: "#34D399",
                    light: "#6EE7B7",
                    dark: "#10B981",
                },
            },
            fontFamily: {
                sans: ["Inter_400Regular"],
                "sans-medium": ["Inter_500Medium"],
                "sans-semibold": ["Inter_600SemiBold"],
                "sans-bold": ["Inter_700Bold"],
            },
            borderRadius: {
                "2xl": "16px",
                "3xl": "24px",
                "4xl": "32px",
            },
        },
    },
    plugins: [],
};
