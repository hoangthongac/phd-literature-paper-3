import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#0f2a4a",
        "navy-light": "#1c4270",
        accent: "#2f6db3",
      },
    },
  },
  plugins: [],
};

export default config;
