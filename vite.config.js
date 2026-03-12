import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/corssport-site/",
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        book: resolve(__dirname, "book.html"),
      },
    },
  },
});
