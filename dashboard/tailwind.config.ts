import type { Config } from "tailwindcss";

// Palette hệ NVIDIA (getdesign add nvidia)
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#76b900",
        "primary-dark": "#5a8d00",
        ink: "#000000",
        canvas: "#ffffff",
        "surface-dark": "#000000",
        "surface-soft": "#f7f7f7",
        hairline: "#cccccc",
        "hairline-strong": "#5e5e5e",
        body: "#1a1a1a",
        mute: "#757575",
        "on-dark": "#ffffff",
        "link-blue": "#0046a4",
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "2px",
      },
      fontFamily: {
        sans: ["Inter", "Arial", "Helvetica", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
