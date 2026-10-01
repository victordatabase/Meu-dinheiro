/**
 * Implementação de `window.storage` que fala com o backend em PHP
 * (backend-php/storage.php), versão sem preflight CORS — tudo via POST
 * simples, com a chave secreta indo no corpo da requisição em vez de um
 * cabeçalho customizado. Necessário porque algumas hospedagens gratuitas
 * (ex: ByetHost) não lidam bem com o método OPTIONS usado pelo preflight.
 *
 * Mesma assinatura do storageShim.js e do apiStorage.js — por isso o
 * App.jsx não precisa mudar nada, seja qual for o backend usado.
 */

const BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const API_SECRET = import.meta.env.VITE_API_SECRET || "";

async function call(op, params = {}) {
  const body = new URLSearchParams({ op, secret: API_SECRET });
  for (const [k, v] of Object.entries(params)) {
    body.set(k, String(v));
  }
  // Sem header customizado e com body application/x-www-form-urlencoded
  // (definido automaticamente pelo navegador para URLSearchParams) —
  // isso faz o navegador tratar como "requisição simples" e pular o
  // preflight OPTIONS por completo.
  const res = await fetch(`${BASE_URL}/storage.php`, {
    method: "POST",
    body,
  });
  if (!res.ok) {
    throw new Error(`Falha na operação "${op}" (status ${res.status})`);
  }
  return res.json();
}

async function get(key, shared = false) {
  return call("get", { key, shared });
}

async function set(key, value, shared = false) {
  return call("set", { key, value, shared });
}

async function del(key, shared = false) {
  return call("delete", { key, shared });
}

async function list(prefix = "", shared = false) {
  return call("list", { prefix, shared });
}

if (typeof window !== "undefined") {
  window.storage = { get, set, delete: del, list };
}
