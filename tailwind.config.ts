import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sidebar: "#0a0a0a",
        accent: "#7c3aed",
      },
    },
  },
  plugins: [],
};
export default config;
