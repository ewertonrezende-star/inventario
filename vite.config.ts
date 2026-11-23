// Configuração do Inventário Coopsintra para publicação no GitHub Pages.
// O Pages publica ficheiros estáticos; o prerender gera o HTML da aplicação no build.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    base: "/inventario/",
  },
  tanstackStart: {
    prerender: {
      enabled: true,
      crawlLinks: true,
      failOnError: true,
    },
    server: { entry: "server" },
  },
});
