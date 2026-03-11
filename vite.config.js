import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/corssport-site/",
  plugins: [tailwindcss()],
});
