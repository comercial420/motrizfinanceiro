-- Financial Master Motriz - Schema Completo para Supabase
-- Execute este script no SQL Editor do Supabase Dashboard

-- Habilitar UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELA: motos
-- ============================================
CREATE TABLE IF NOT EXISTS motos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chassi TEXT UNIQUE NOT NULL,
  modelo TEXT NOT NULL CHECK (modelo IN ('M3K', 'Z3K', 'U3K', 'U5K', 'Tóquio', 'S8K', 'R8K', 'Vespa')),
  status TEXT NOT NULL CHECK (status IN ('Disponível para Operar', 'Em Contrato', 'Em Test Ride', 'Em Manutenção', 'Aguardando Peça', 'Aguardando Conserto')),
  cor TEXT CHECK (cor IN ('Azul', 'Preto', 'Cinza', 'Amarelo', 'Vermelho', 'Verde', 'Branco', 'Marrom', 'Bege')),
  localizacao TEXT CHECK (localizacao IN ('Galpão', 'Cliente', 'Técnico', 'Fazenda Boa Vista', 'Loja')),
  local_operacao_id UUID,
  valor_contabil NUMERIC(12,2),
  observacoes TEXT,
  preparacao JSONB DEFAULT '{}',
  pecas_faltantes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar FK em motos após criar locais_operacao
ALTER TABLE motos ADD CONSTRAINT fk_motos_local_operacao
  FOREIGN KEY (local_operacao_id) REFERENCES locais_operacao(id) ON DELETE SET NULL;

-- ============================================
-- TABELA: contratos
-- ============================================
CREATE TABLE IF NOT EXISTS contratos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  numero_contrato TEXT,
  data_inicio DATE NOT NULL,
  data_termino DATE,
  dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
  valor_mensal_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  motos_vinculadas UUID[] DEFAULT '{}',
  valores_por_moto JSONB DEFAULT '[]',
  locacoes_extras JSONB DEFAULT '[]',
  regra_comissao_socio NUMERIC(5,2),
  regra_comissao_tecnico NUMERIC(5,2),
  status TEXT NOT NULL CHECK (status IN ('Ativo', 'Encerrado', 'Suspenso')) DEFAULT 'Ativo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: funcionarios
-- ============================================
CREATE TABLE IF NOT EXISTS funcionarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  funcao TEXT NOT NULL CHECK (funcao IN ('Comercial', 'Administrativo', 'Operacional', 'Marketing', 'Técnico', 'Sócio', 'Outros')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  salario NUMERIC(12,2) NOT NULL DEFAULT 0,
  percentual_empresa NUMERIC(5,2) NOT NULL DEFAULT 0,
  percentual_comissao_contratos NUMERIC(5,2) NOT NULL DEFAULT 0,
  percentual_comissao_manutencao NUMERIC(5,2) NOT NULL DEFAULT 0,
  origem_comissao TEXT NOT NULL CHECK (origem_comissao IN ('Contratos de Locação', 'Vendas de Motos', 'Ambos', 'Nenhum')) DEFAULT 'Nenhum',
  eh_socio BOOLEAN NOT NULL DEFAULT false,
  contratos_vinculados UUID[] DEFAULT '{}',
  comissao_por_contrato JSONB DEFAULT '{}',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: lancamentos_financeiros
-- ============================================
CREATE TABLE IF NOT EXISTS lancamentos_financeiros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo TEXT NOT NULL CHECK (tipo IN ('Recebemos', 'Pagamos')),
  valor NUMERIC(12,2) NOT NULL,
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  classificacao TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('Fixo', 'Variável', 'Extraordinário', 'CAPEX')),
  centro_custo TEXT NOT NULL CHECK (centro_custo IN ('Operacional', 'Comercial', 'Administrativo', 'Financeiro', 'Marketing')),
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('PIX', 'Boleto', 'Cartão', 'Transferência', 'Dinheiro', 'Outros')),
  status TEXT NOT NULL CHECK (status IN ('Pago', 'Recebido', 'Pendente', 'Previsto')),

  -- Vínculos
  contrato_id UUID REFERENCES contratos(id) ON DELETE SET NULL,
  moto_chassi TEXT,
  funcionario_responsavel_id UUID REFERENCES funcionarios(id) ON DELETE SET NULL,
  eh_comissao_socio BOOLEAN DEFAULT false,
  eh_comissao_tecnico BOOLEAN DEFAULT false,
  eh_investimento BOOLEAN DEFAULT false,

  -- Recorrência
  eh_recorrente BOOLEAN DEFAULT false,
  recorrencia_fim DATE,
  grupo_recorrencia_id UUID,
  nome_empresa TEXT,
  data_vencimento DATE,

  -- Visita Técnica
  eh_visita_tecnico BOOLEAN DEFAULT false,
  tipo_visita TEXT CHECK (tipo_visita IN ('Contrato Ativo', 'Test Ride', 'Inesperada', 'Manutenção Preventiva', 'Manutenção Corretiva')),
  categoria_custo_visita TEXT CHECK (categoria_custo_visita IN ('Mão de Obra', 'Gasolina/Transporte', 'Peças', 'Ferramentas', 'Outros')),
  eh_mau_uso BOOLEAN DEFAULT false,
  valor_cobrar_cliente NUMERIC(12,2),
  tecnico_responsavel TEXT,
  observacoes_visita TEXT,

  -- Cobrança Mau Uso
  eh_cobranca_mau_uso BOOLEAN DEFAULT false,
  visita_mau_uso_id UUID,
  custo_itens_mau_uso NUMERIC(12,2),
  lucro_mau_uso NUMERIC(12,2),

  -- Peças Usadas
  pecas_usadas JSONB DEFAULT '[]',

  -- Parcelamento Venda
  venda_id UUID,
  parcela_numero INTEGER,
  total_parcelas INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: test_rides
-- ============================================
CREATE TABLE IF NOT EXISTS test_rides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  motos_vinculadas UUID[] DEFAULT '{}',
  data_inicio DATE NOT NULL,
  data_previsao_retorno DATE,
  local_operacao_id UUID REFERENCES locais_operacao(id) ON DELETE SET NULL,
  observacoes TEXT,
  status TEXT NOT NULL CHECK (status IN ('Ativo', 'Finalizado')) DEFAULT 'Ativo',
  status_retorno_moto TEXT CHECK (status_retorno_moto IN ('Disponível para Operar', 'Em Contrato', 'Em Test Ride', 'Em Manutenção', 'Aguardando Peça', 'Aguardando Conserto')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: historico_vendas_motos
-- ============================================
CREATE TABLE IF NOT EXISTS historico_vendas_motos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  moto_id UUID NOT NULL,
  chassi TEXT NOT NULL,
  modelo TEXT NOT NULL,
  cor TEXT,
  valor_contabil NUMERIC(12,2) NOT NULL,
  valor_venda NUMERIC(12,2) NOT NULL,
  imposto_percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
  imposto_valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  comissao_percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
  comissao_valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  lucro_liquido NUMERIC(12,2) NOT NULL DEFAULT 0,
  data_venda DATE NOT NULL,
  status_pagamento TEXT NOT NULL CHECK (status_pagamento IN ('Recebido', 'Previsto', 'Pendente')),
  funcionario_responsavel_id UUID NOT NULL REFERENCES funcionarios(id),
  comprador_nome TEXT NOT NULL,
  comprador_cpf TEXT NOT NULL,
  comprador_celular TEXT NOT NULL,
  observacoes TEXT,
  lancamento_comissao_id UUID,

  -- Parcelamento
  eh_parcelada BOOLEAN DEFAULT false,
  numero_parcelas INTEGER,
  valor_parcela NUMERIC(12,2),
  parcelas_recebidas_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: aportes_socios
-- ============================================
CREATE TABLE IF NOT EXISTS aportes_socios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  socio_id UUID NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
  valor NUMERIC(12,2) NOT NULL,
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  motivo TEXT NOT NULL CHECK (motivo IN ('Compra de Motos', 'Compra de Equipamentos', 'Preparação de Motos', 'Bater Contas Faltantes', 'Compra de Peças', 'Outros')),
  tipo TEXT NOT NULL CHECK (tipo IN ('Inicial', 'Operacional', 'Expansao')),
  percentual_societario_na_data NUMERIC(5,2) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: parcelas_repagamento
-- ============================================
CREATE TABLE IF NOT EXISTS parcelas_repagamento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aporte_id UUID NOT NULL REFERENCES aportes_socios(id) ON DELETE CASCADE,
  socio_id UUID NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  valor_original NUMERIC(12,2) NOT NULL,
  valor_pago NUMERIC(12,2) NOT NULL DEFAULT 0,
  data_prevista DATE NOT NULL,
  data_pagamento DATE,
  status TEXT NOT NULL CHECK (status IN ('Pendente', 'Pago', 'Amortizado')) DEFAULT 'Pendente',
  lancamento_id UUID,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: app_config
-- ============================================
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_motos_status ON motos(status);
CREATE INDEX IF NOT EXISTS idx_motos_chassi ON motos(chassi);
CREATE INDEX IF NOT EXISTS idx_contratos_cliente ON contratos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contratos_status ON contratos(status);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data ON lancamentos_financeiros(data);
CREATE INDEX IF NOT EXISTS idx_lancamentos_tipo ON lancamentos_financeiros(tipo);
CREATE INDEX IF NOT EXISTS idx_lancamentos_status ON lancamentos_financeiros(status);
CREATE INDEX IF NOT EXISTS idx_lancamentos_contrato ON lancamentos_financeiros(contrato_id);
CREATE INDEX IF NOT EXISTS idx_locais_cliente ON locais_operacao(cliente_id);
CREATE INDEX IF NOT EXISTS idx_test_rides_cliente ON test_rides(cliente_id);
CREATE INDEX IF NOT EXISTS idx_historico_vendas_funcionario ON historico_vendas_motos(funcionario_responsavel_id);
CREATE INDEX IF NOT EXISTS idx_aportes_socio ON aportes_socios(socio_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_aporte ON parcelas_repagamento(aporte_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_status ON parcelas_repagamento(status);

-- ============================================
-- ROW LEVEL SECURITY (RLS) - Opcional
-- Para produção, habilite RLS e configure políticas
-- ============================================
-- ALTER TABLE motos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE lancamentos_financeiros ENABLE ROW LEVEL SECURITY;
-- etc.

-- Política exemplo (permitir tudo para anon key - ajustar conforme necessidade):
-- CREATE POLICY "Allow all access" ON motos FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- TRIGGERS PARA updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_motos_updated_at BEFORE UPDATE ON motos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locais_operacao_updated_at BEFORE UPDATE ON locais_operacao FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contratos_updated_at BEFORE UPDATE ON contratos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pecas_estoque_updated_at BEFORE UPDATE ON pecas_estoque FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_funcionarios_updated_at BEFORE UPDATE ON funcionarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lancamentos_financeiros_updated_at BEFORE UPDATE ON lancamentos_financeiros FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_test_rides_updated_at BEFORE UPDATE ON test_rides FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_historico_vendas_motos_updated_at BEFORE UPDATE ON historico_vendas_motos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_aportes_socios_updated_at BEFORE UPDATE ON aportes_socios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parcelas_repagamento_updated_at BEFORE UPDATE ON parcelas_repagamento FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_app_config_updated_at BEFORE UPDATE ON app_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DADOS INICIAIS DE CONFIGURAÇÃO
-- ============================================
INSERT INTO app_config (key, value) VALUES
  ('percentualImposto', '10'),
  ('percentualImpostoMauUso', '10'),
  ('percentualComissaoComercial', '5'),
  ('percentualComissaoOperacional', '3')
ON CONFLICT (key) DO NOTHING;