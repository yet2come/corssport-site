import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        book: resolve(__dirname, "book.html"),
        cancel: resolve(__dirname, "cancel.html"),
        admin: resolve(__dirname, "admin-manual.html"),
      },
    },
  },
});
