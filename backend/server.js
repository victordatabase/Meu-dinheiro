require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
app.use(express.json({ limit: "5mb" }));

const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
app.use(cors({ origin: allowedOrigin }));

// Proteção simples: se API_SECRET estiver configurado, toda requisição
// precisa enviar o cabeçalho "Authorization: Bearer <API_SECRET>".
// Isso NÃO é autenticação por usuário — é só uma trava para impedir que
// qualquer pessoa na internet descubra a URL da API e mexa nos dados.
// Veja o aviso de segurança no guia sobre os limites disso.
const API_SECRET = process.env.API_SECRET || "";
app.use((req, res, next) => {
  if (req.path === "/health") return next();
  if (!API_SECRET) return next();
  const token = (req.headers["authorization"] || "").replace("Bearer ", "");
  if (token !== API_SECRET) {
    return res.status(401).json({ error: "Não autorizado" });
  }
  next();
});

let pool;
async function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
    });
  }
  return pool;
}

function toBool(v) {
  return v === "true" || v === true || v === "1";
}

// GET /storage/:key?shared=true|false
app.get("/storage/:key", async (req, res) => {
  try {
    const db = await getPool();
    const shared = toBool(req.query.shared);
    const [rows] = await db.execute(
      "SELECT value FROM kv_store WHERE store_key = ? AND is_shared = ? LIMIT 1",
      [req.params.key, shared]
    );
    if (rows.length === 0) return res.status(404).json({ error: "not found" });
    res.json({ key: req.params.key, value: rows[0].value, shared });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro interno" });
  }
});

// PUT /storage/:key   body: { value, shared }
app.put("/storage/:key", async (req, res) => {
  try {
    const db = await getPool();
    const shared = !!req.body.shared;
    const value = String(req.body.value ?? "");
    await db.execute(
      `INSERT INTO kv_store (store_key, is_shared, value)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = CURRENT_TIMESTAMP`,
      [req.params.key, shared, value]
    );
    res.json({ key: req.params.key, value, shared });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro interno" });
  }
});

// DELETE /storage/:key?shared=true|false
app.delete("/storage/:key", async (req, res) => {
  try {
    const db = await getPool();
    const shared = toBool(req.query.shared);
    await db.execute("DELETE FROM kv_store WHERE store_key = ? AND is_shared = ?", [req.params.key, shared]);
    res.json({ key: req.params.key, deleted: true, shared });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /storage?prefix=finance-data:&shared=true
app.get("/storage", async (req, res) => {
  try {
    const db = await getPool();
    const shared = toBool(req.query.shared);
    const prefix = req.query.prefix || "";
    const [rows] = await db.execute(
      "SELECT store_key FROM kv_store WHERE is_shared = ? AND store_key LIKE ?",
      [shared, `${prefix}%`]
    );
    res.json({ keys: rows.map((r) => r.store_key), prefix, shared });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro interno" });
  }
});

app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
