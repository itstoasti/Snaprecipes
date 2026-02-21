/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}",
    ],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                surface: {
                    DEFAULT: "#0A0A0F",
                    50: "#F8F8FC",
                    100: "#F0F0F5",
                    200: "#E1E1EA",
                    300: "#C8C8D4",
                    400: "#9D9DB0",
                    500: "#6E6E85",
                    600: "#4A4A5E",
                    700: "#2D2D3D",
                    800: "#1A1A26",
                    900: "#0F0F18",
                    950: "#0A0A0F",
                },
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
