import React from "react";
import ReactDOM from "react-dom/client";
import FinanceApp from "./App.jsx";
import { registerSW } from "virtual:pwa-register";

async function bootstrap() {
  // Se VITE_API_URL estiver configurada, os dados vão para a API/MySQL.
  // Caso contrário, usa o localStorage do navegador (comportamento padrão).
  if (import.meta.env.VITE_API_URL) {
    await import("./apiStorage.js");
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
