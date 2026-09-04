/**
 * Implementação local de `window.storage`, usando o localStorage do navegador.
 *
 * O App.jsx foi escrito originalmente para rodar dentro do Claude.ai, que
 * fornece uma API `window.storage` (persistente entre sessões). Fora do
 * Claude.ai essa API não existe — este arquivo cria uma versão equivalente
 * com a mesma assinatura (get/set/delete/list), para que o app funcione
 * normalmente quando publicado no GitHub Pages ou em qualquer hospedagem
 * estática, salvando os dados no navegador de cada pessoa que acessar.
 *
 * Observação: como não há um servidor por trás, os dados ficam no
 * localStorage do navegador/dispositivo usado — não é um banco de dados
 * compartilhado na nuvem. Se duas pessoas acessarem de navegadores
 * diferentes, cada uma terá seu próprio armazenamento local.
 */

const PREFIX = "financeapp";

function storageKey(key, shared) {
  return `${PREFIX}:${shared ? "shared" : "personal"}:${key}`;
}

async function get(key, shared = false) {
  const raw = window.localStorage.getItem(storageKey(key, shared));
  if (raw === null) {
    throw new Error(`Chave "${key}" não encontrada`);
  }
  return { key, value: raw, shared };
}

async function set(key, value, shared = false) {
  window.localStorage.setItem(storageKey(key, shared), value);
  return { key, value, shared };
}

async function del(key, shared = false) {
  window.localStorage.removeItem(storageKey(key, shared));
  return { key, deleted: true, shared };
}

async function list(prefix = "", shared = false) {
  const fullPrefix = storageKey(prefix, shared);
  const keys = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(fullPrefix)) {
      keys.push(k.slice(storageKey("", shared).length));
    }
  }
  return { keys, prefix, shared };
}

if (typeof window !== "undefined") {
  window.storage = { get, set, delete: del, list };
}
