import React from "react";
import ReactDOM from "react-dom/client";
import FinanceApp from "./App.jsx";
import { registerSW } from "virtual:pwa-register";

async function bootstrap() {
  // Se VITE_API_URL estiver configurada, os dados vão para a API/MySQL.
  // VITE_API_BACKEND escolhe qual API usar: "node" (padrão, Railway) ou "php" (hospedagem cPanel/PHP).
  // Sem VITE_API_URL, usa o localStorage do navegador (comportamento padrão).
  if (import.meta.env.VITE_API_URL) {
    if (import.meta.env.VITE_API_BACKEND === "php") {
      await import("./apiStoragePhp.js");
    } else {
      await import("./apiStorage.js");
    }
  } else {
    await import("./storageShim.js");
  }

  // Ativa o service worker: permite instalar o app e usá-lo offline.
  registerSW({ immediate: true });

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <FinanceApp />
    </React.StrictMode>
  );
}

bootstrap();
