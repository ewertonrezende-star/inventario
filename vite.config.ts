import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [
    tanstackStart({
      server: { entry: "server" },
      spa: { enabled: true },
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
});
