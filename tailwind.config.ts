import type { Config } from "tailwindcss";

/**
 * 肉体副業のカラー。
 * ink 系は Fact Layer（読みやすさ優先）、sweat は Brand Layer のアクセント。
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0f1211",
          900: "#171a19",
          800: "#222725",
          700: "#333a37",
          400: "#8d9a94",
          200: "#d7ded9",
          50: "#f6f8f6"
        },
        sweat: {
          500: "#e2543a",
          400: "#f06a4f"
        },
        moss: {
          500: "#4d7c58",
          300: "#8fbf9b"
        }
      },
      fontFamily: {
        sans: [
          "'Hiragino Kaku Gothic ProN'",
          "'Yu Gothic'",
          "'Noto Sans JP'",
          "system-ui",
          "sans-serif"
        ]
      }
    }
  },
  plugins: []
};

export default config;
