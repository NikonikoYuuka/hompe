import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        retroPink: "#ff66a1",
        retroBlue: "#1e88e5",
        retroYellow: "#ffb347"
      }
    }
  },
  plugins: []
};

export default config;
