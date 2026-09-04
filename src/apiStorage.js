/**
 * Implementação de `window.storage` que fala com a API (backend/server.js),
 * que por sua vez guarda tudo no MySQL. Mesma assinatura do storageShim.js
 * (que usava localStorage) — por isso o App.jsx não precisa mudar nada.
 *
 * Ativado automaticamente quando a variável de ambiente VITE_API_URL está
 * definida (veja o .env.example na raiz do projeto).
 */

const BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const API_SECRET = import.meta.env.VITE_API_SECRET || "";

function headers(extra = {}) {
  const h = { "Content-Type": "application/json", ...extra };
  if (API_SECRET) h["Authorization"] = `Bearer ${API_SECRET}`;
  return h;
}

async function get(key, shared = false) {
  const res = await fetch(`${BASE_URL}/storage/${encodeURIComponent(key)}?shared=${shared}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Chave "${key}" não encontrada`);
  return res.json();
}

async function set(key, value, shared = false) {
  const res = await fetch(`${BASE_URL}/storage/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ value, shared }),
  });
  if (!res.ok) throw new Error("Falha ao salvar na API");
  return res.json();
}

async function del(key, shared = false) {
  const res = await fetch(`${BASE_URL}/storage/${encodeURIComponent(key)}?shared=${shared}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) throw new Error("Falha ao remover na API");
  return res.json();
}

async function list(prefix = "", shared = false) {
  const res = await fetch(`${BASE_URL}/storage?prefix=${encodeURIComponent(prefix)}&shared=${shared}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error("Falha ao listar na API");
  return res.json();
}

if (typeof window !== "undefined") {
  window.storage = { get, set, delete: del, list };
}
