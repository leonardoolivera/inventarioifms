-- ================================================================
--  INVENTÁRIO CAMPUS IFMS — Supabase Schema
--  Espelha as abas do Google Sheets atual
-- ================================================================

-- Extensão para busca parcial (deve vir antes dos índices que a usam)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── Funcionários (login por SIAPE) ────────────────────────────
CREATE TABLE funcionarios (
  id        SERIAL PRIMARY KEY,
  siape     TEXT NOT NULL UNIQUE,
  nome      TEXT NOT NULL,
  admin     BOOLEAN DEFAULT FALSE,
  ativo     BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ── Patrimônios SUAP (importados manualmente) ─────────────────
CREATE TABLE patrimonios (
  id              SERIAL PRIMARY KEY,
  numero          TEXT NOT NULL UNIQUE,
  descricao       TEXT,
  sala_suap       TEXT,
  estado_suap     TEXT,
  status          TEXT DEFAULT '',        -- '', '✅ Encontrado', '🟡 Outro local', '🔴 DUPLICADO', '❌ Não localizado'
  local_encontrado TEXT DEFAULT '',
  encontrado_por  TEXT DEFAULT '',       -- 'nome (siape)'
  encontrado_em   TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca rápida por número (suporte a busca parcial)
CREATE INDEX idx_patrimonios_numero ON patrimonios USING gin(numero gin_trgm_ops);
-- Índice para filtrar por sala
CREATE INDEX idx_patrimonios_sala ON patrimonios(sala_suap);
-- Índice para filtrar por status
CREATE INDEX idx_patrimonios_status ON patrimonios(status);

-- ── Scans de inventário ────────────────────────────────────────
CREATE TABLE scans (
  id            TEXT PRIMARY KEY,         -- gerado no cliente (uuid)
  codigo        TEXT NOT NULL,
  sala          TEXT NOT NULL,
  funcionario   TEXT,
  siape         TEXT,
  criado_em     TIMESTAMPTZ NOT NULL,
  sincronizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scans_siape ON scans(siape);
CREATE INDEX idx_scans_sala  ON scans(sala);

-- ── Itens sem patrimônio ───────────────────────────────────────
CREATE TABLE sem_patrimonio (
  id            TEXT PRIMARY KEY,         -- gerado no cliente
  sala          TEXT NOT NULL,
  descricao     TEXT,
  estado        TEXT,                     -- Excelente, Bom, Regular, Ruim
  foto_url      TEXT,                     -- URL no Supabase Storage
  funcionario   TEXT,
  siape         TEXT,
  criado_em     TIMESTAMPTZ NOT NULL,
  sincronizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nopat_sala  ON sem_patrimonio(sala);
CREATE INDEX idx_nopat_siape ON sem_patrimonio(siape);

-- ── Log de operações ──────────────────────────────────────────
CREATE TABLE log_operacoes (
  id            SERIAL PRIMARY KEY,
  item_id       TEXT,
  tipo          TEXT,                     -- 'scan', 'nopat', 'ERRO'
  codigo        TEXT,
  sala          TEXT,
  descricao     TEXT,
  estado        TEXT,
  criado_em     TIMESTAMPTZ NOT NULL,
  sincronizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
--  RLS (Row Level Security) — acesso público para ferramenta interna
--  Todos podem ler e inserir; só o serviço pode deletar/atualizar patrimônios
-- ================================================================
ALTER TABLE funcionarios    ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrimonios     ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sem_patrimonio  ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_operacoes   ENABLE ROW LEVEL SECURITY;

-- Funcionários: só leitura pública (para login)
CREATE POLICY "leitura publica" ON funcionarios FOR SELECT USING (true);

-- Patrimônios: leitura pública; escrita deve passar por Edge Functions
CREATE POLICY "leitura publica"  ON patrimonios FOR SELECT USING (true);

-- Scans: leitura pública; inserção via Edge Function
CREATE POLICY "leitura publica" ON scans FOR SELECT USING (true);

-- Sem patrimônio: leitura pública; inserção via Edge Function
CREATE POLICY "leitura publica"  ON sem_patrimonio FOR SELECT USING (true);

-- Log: somente leitura pública; escrita via Edge Function
CREATE POLICY "leitura publica"  ON log_operacoes FOR SELECT USING (true);

-- ================================================================
--  VIEWS úteis (substituem partes do Dashboard)
-- ================================================================

-- Progresso geral
CREATE VIEW vw_progresso_geral AS
SELECT
  COUNT(*)                                              AS total,
  COUNT(*) FILTER (WHERE status = '✅ Encontrado')      AS correto,
  COUNT(*) FILTER (WHERE status = '🟡 Outro local')     AS outro_local,
  COUNT(*) FILTER (WHERE status = '🔴 DUPLICADO')       AS duplicado,
  COUNT(*) FILTER (WHERE status = '❌ Não localizado')  AS nao_localizado,
  COUNT(*) FILTER (WHERE status = '')                   AS pendente,
  ROUND(
    COUNT(*) FILTER (WHERE status IN ('✅ Encontrado','🟡 Outro local'))::numeric
    / NULLIF(COUNT(*),0) * 100, 1
  )                                                     AS percentual
FROM patrimonios;

-- Progresso por sala
CREATE VIEW vw_progresso_por_sala AS
SELECT
  sala_suap,
  COUNT(*)                                              AS total,
  COUNT(*) FILTER (WHERE status = '✅ Encontrado')      AS correto,
  COUNT(*) FILTER (WHERE status = '🟡 Outro local')     AS outro_local,
  COUNT(*) FILTER (WHERE status = '🔴 DUPLICADO')       AS duplicado,
  COUNT(*) FILTER (WHERE status = '❌ Não localizado')  AS nao_localizado,
  COUNT(*) FILTER (WHERE status = '')                   AS pendente,
  ROUND(
    COUNT(*) FILTER (WHERE status IN ('✅ Encontrado','🟡 Outro local'))::numeric
    / NULLIF(COUNT(*),0) * 100, 1
  )                                                     AS percentual
FROM patrimonios
GROUP BY sala_suap
ORDER BY sala_suap;

-- Atividade por servidor
CREATE VIEW vw_atividade_servidores AS
SELECT
  funcionario,
  siape,
  COUNT(*)        AS total_scans,
  MAX(criado_em)  AS ultimo_scan
FROM scans
WHERE funcionario IS NOT NULL
GROUP BY funcionario, siape
ORDER BY total_scans DESC;
