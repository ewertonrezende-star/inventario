// @lovable.dev/vite-tanstack-config supplies TanStack Start, React, Tailwind and Nitro.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  tanstackStart: {
    server: { entry: "server" },
    // GitHub Pages serves static files only; the app uses Supabase directly from the browser.
    spa: { enabled: true },
  },
});
