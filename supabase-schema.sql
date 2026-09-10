-- Financial Master Motriz - Supabase Schema
-- Execute este SQL no SQL Editor do Supabase Dashboard

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELA: motos
-- ============================================
CREATE TABLE IF NOT EXISTS motos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chassi TEXT UNIQUE NOT NULL,
  modelo TEXT NOT NULL CHECK (modelo IN ('M3K','Z3K','U3K','U5K','Tóquio','S8K','R8K','Vespa')),
  status TEXT NOT NULL CHECK (status IN ('Disponível para Operar','Em Contrato','Em Manutenção','Aguardando Peça','Aguardando Conserto')),
  cor TEXT CHECK (cor IN ('Azul','Preto','Cinza','Amarelo','Vermelho','Verde','Branco','Marrom','Bege')),
  localizacao TEXT CHECK (localizacao IN ('Galpão','Cliente','Técnico','Fazenda Boa Vista','Loja')),
  local_operacao_id UUID REFERENCES locais_operacao(id) ON DELETE SET NULL,
  valor_contabil NUMERIC(12,2),
  observacoes TEXT,
  preparacao JSONB DEFAULT '{}',
  pecas_faltantes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TABELA: clientes
-- ============================================
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  contato TEXT,
  responsavel TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TABELA: locais_operacao
-- ============================================
CREATE TABLE IF NOT EXISTS locais_operacao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  endereco TEXT NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add FK after table exists
ALTER TABLE motos DROP CONSTRAINT IF EXISTS motos_local_operacao_id_fkey;
ALTER TABLE motos ADD CONSTRAINT motos_local_operacao_id_fkey
  FOREIGN KEY (local_operacao_id) REFERENCES locais_operacao(id) ON DELETE SET NULL;

-- ============================================
-- TABELA: contratos
-- ============================================
CREATE TABLE IF NOT EXISTS contratos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  numero_contrato TEXT,
  data_inicio DATE NOT NULL,
  data_termino DATE,
  dia_vencimento INTEGER NOT NULL DEFAULT 10 CHECK (dia_vencimento BETWEEN 1 AND 31),
  valor_mensal_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  motos_vinculadas UUID[] DEFAULT '{}',
  valores_por_moto JSONB DEFAULT '[]',
  locacoes_extras JSONB DEFAULT '[]',
  regra_comissao_socio NUMERIC(5,2),
  regra_comissao_tecnico NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo','Encerrado','Suspenso')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TABELA: pecas_estoque
-- ============================================
CREATE TABLE IF NOT EXISTS pecas_estoque (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 0,
  quantidade_minima INTEGER,
  custo_unitario NUMERIC(12,2),
  fornecedor TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TABELA: lancamentos_financeiros
-- ============================================
CREATE TABLE IF NOT EXISTS lancamentos_financeiros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo TEXT NOT NULL CHECK (tipo IN ('Recebemos','Pagamos')),
  valor NUMERIC(12,2) NOT NULL,
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  classificacao TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('Fixo','Variável','Extraordinário','CAPEX')),
  centro_custo TEXT NOT NULL CHECK (centro_custo IN ('Operacional','Comercial','Administrativo','Financeiro','Marketing')),
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('PIX','Boleto','Cartão','Transferência','Dinheiro','Outros')),
  status TEXT NOT NULL CHECK (status IN ('Pago','Recebido','Pendente','Previsto')),
  contrato_id UUID REFERENCES contratos(id) ON DELETE SET NULL,
  moto_chassi TEXT,
  eh_comissao_socio BOOLEAN DEFAULT false,
  eh_comissao_tecnico BOOLEAN DEFAULT false,
  eh_investimento BOOLEAN DEFAULT false,
  eh_recorrente BOOLEAN DEFAULT false,
  recorrencia_fim DATE,
  grupo_recorrencia_id TEXT,
  nome_empresa TEXT,
  data_vencimento DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES para performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_motos_status ON motos(status);
CREATE INDEX IF NOT EXISTS idx_motos_chassi ON motos(chassi);
CREATE INDEX IF NOT EXISTS idx_contratos_cliente ON contratos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contratos_status ON contratos(status);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data ON lancamentos_financeiros(data);
CREATE INDEX IF NOT EXISTS idx_lancamentos_tipo_status ON lancamentos_financeiros(tipo, status);
CREATE INDEX IF NOT EXISTS idx_lancamentos_contrato ON lancamentos_financeiros(contrato_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_grupo ON lancamentos_financeiros(grupo_recorrencia_id);
CREATE INDEX IF NOT EXISTS idx_locais_cliente ON locais_operacao(cliente_id);

-- ============================================
-- RLS (Row Level Security) - permitir tudo para anon durante testes
-- ============================================
ALTER TABLE motos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE locais_operacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pecas_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos_financeiros ENABLE ROW LEVEL SECURITY;

-- Políticas abertas para fase de teste (substituir por auth depois)
CREATE POLICY "Allow all access motos" ON motos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access clientes" ON clientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access locais_operacao" ON locais_operacao FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access contratos" ON contratos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access pecas_estoque" ON pecas_estoque FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access lancamentos" ON lancamentos_financeiros FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- TRIGGER: auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_motos_updated BEFORE UPDATE ON motos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_clientes_updated BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_contratos_updated BEFORE UPDATE ON contratos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_pecas_updated BEFORE UPDATE ON pecas_estoque FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_lancamentos_updated BEFORE UPDATE ON lancamentos_financeiros FOR EACH ROW EXECUTE FUNCTION update_updated_at();