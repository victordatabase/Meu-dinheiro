import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// base: "./" gera caminhos relativos no build, então o site funciona
// tanto em usuario.github.io quanto em usuario.github.io/nome-do-repo
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "apple-touch-icon.png"],
      manifest: {
        name: "Meu Dinheiro — Controle Financeiro Pessoal",
        short_name: "Meu Dinheiro",
        description:
          "Controle financeiro pessoal com lançamentos em estilo chat, gastos parcelados, recorrentes e dashboard.",
        lang: "pt-BR",
        theme_color: "#17181C",
        background_color: "#121317",
        display: "standalone",
        orientation: "portrait",
        start_url: "./",
        scope: "./",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico,webmanifest}"],
      },
    }),
  ],
});
