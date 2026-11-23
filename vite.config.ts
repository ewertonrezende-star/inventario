// @lovable.dev/vite-tanstack-config already includes the TanStack, React, Tailwind and Nitro plugins.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  tanstackStart: {
    server: { entry: "server" },
  },
});
