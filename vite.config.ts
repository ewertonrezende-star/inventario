import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  // O iPad mini 2 está limitado ao iOS 12.5.8 (Safari antigo).
  // Mantemos a aplicação moderna e geramos JavaScript/CSS compatíveis
  // com Safari 12.1, sem alterar as funcionalidades nem a base de dados.
  build: {
    target: "safari12.1",
    cssTarget: "safari12.1",
  },
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
