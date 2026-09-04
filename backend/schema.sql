-- Schema do banco de dados
--
-- Guarda os dados do app como pares chave/valor (mesmo formato que o app já
-- usava no localStorage), só que agora em um banco MySQL de verdade,
-- acessível de qualquer dispositivo.
--
-- store_key exemplos:
--   'finance-users'              -> lista de contas (usuário + senha com hash)
--   'finance-data:victor'        -> grupos e lançamentos do usuário "victor"
--
-- Este script NÃO cria um banco de dados novo — ele roda dentro do banco
-- que você já tem selecionado/conectado (ex: o banco "railway" que o
-- Railway já provisiona automaticamente). Se estiver testando local com o
-- docker-compose.yml, o banco "meudinheiro" já é criado por ele antes
-- deste script rodar.

CREATE TABLE IF NOT EXISTS kv_store (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  store_key VARCHAR(255) NOT NULL,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  value LONGTEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_key_shared (store_key, is_shared)
);
