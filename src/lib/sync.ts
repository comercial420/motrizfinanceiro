/**
 * Camada de sincronização entre Zustand (local) e Supabase (remoto).
 *
 * Estratégia:
 * - onLoad: busca tudo do Supabase e popula o store local
 * - onSave: após cada mutation no store, persiste no Supabase
 * - Fallback: se Supabase não estiver configurado, funciona 100% local (localStorage via zustand/persist)
 */

import { getSupabase, isSupabaseConfigured } from './supabase';
import type { Moto, Cliente, Contrato, LancamentoFinanceiro, PecaEstoque, LocalOperacao, TestRide, AporteSocio, ParcelaRepagamento, Funcionario } from '@/types';

// ── Serializers: converter tipos TS ↔ colunas snake_case do DB ──

function motoToRow(m: Moto) {
  return {
    id: m.id,
    chassi: m.chassi,
    modelo: m.modelo,
    status: m.status,
    cor: m.cor || null,
    localizacao: m.localizacao || null,
    local_operacao_id: m.localOperacaoId || null,
    valor_contabil: m.valorContabil ?? null,
    observacoes: m.observacoes || null,
    preparacao: m.preparacao || {},
    pecas_faltantes: m.pecasFaltantes || [],
  };
}

function rowToMoto(r: any): Moto {
  return {
    id: r.id,
    chassi: r.chassi,
    modelo: r.modelo,
    status: r.status,
    cor: r.cor || undefined,
    localizacao: r.localizacao || undefined,
    localOperacaoId: r.local_operacao_id || undefined,
    valorContabil: r.valor_contabil ?? undefined,
    observacoes: r.observacoes || undefined,
    preparacao: r.preparacao || undefined,
    pecasFaltantes: r.pecas_faltantes?.length ? r.pecas_faltantes : undefined,
  };
}

function clienteToRow(c: Cliente) {
  return {
    id: c.id,
    nome: c.nome,
    cnpj: c.cnpj || null,
    contato: c.contato || null,
    responsavel: c.responsavel || null,
  };
}

function rowToCliente(r: any): Cliente {
  return {
    id: r.id,
    nome: r.nome,
    cnpj: r.cnpj || undefined,
    contato: r.contato || undefined,
    responsavel: r.responsavel || undefined,
    // locaisOperacao são carregados separadamente
  };
}

function localToRow(l: LocalOperacao, clienteId: string) {
  return {
    id: l.id,
    cliente_id: clienteId,
    nome: l.nome,
    endereco: l.endereco,
    observacoes: l.observacoes || null,
  };
}

function rowToLocal(r: any): LocalOperacao {
  return {
    id: r.id,
    nome: r.nome,
    endereco: r.endereco,
    observacoes: r.observacoes || undefined,
  };
}

function contratoToRow(c: Contrato) {
  return {
    id: c.id,
    cliente_id: c.clienteId,
    numero_contrato: c.numeroContrato || null,
    data_inicio: c.dataInicio instanceof Date ? c.dataInicio.toISOString().split('T')[0] : String(c.dataInicio).split('T')[0],
    data_termino: c.dataTermino ? (c.dataTermino instanceof Date ? c.dataTermino.toISOString().split('T')[0] : String(c.dataTermino).split('T')[0]) : null,
    dia_vencimento: c.diaVencimento,
    valor_mensal_total: c.valorMensalTotal,
    motos_vinculadas: c.motosVinculadas || [],
    valores_por_moto: c.valoresPorMoto || [],
    locacoes_extras: c.locacoesExtras || [],
    regra_comissao_socio: c.regraComissaoSocio ?? null,
    regra_comissao_tecnico: c.regraComissaoTecnico ?? null,
    status: c.status,
  };
}

function rowToContrato(r: any): Contrato {
  return {
    id: r.id,
    clienteId: r.cliente_id,
    numeroContrato: r.numero_contrato || '',
    dataInicio: new Date(r.data_inicio),
    dataTermino: r.data_termino ? new Date(r.data_termino) : undefined,
    diaVencimento: r.dia_vencimento,
    valorMensalTotal: Number(r.valor_mensal_total),
    motosVinculadas: r.motos_vinculadas || [],
    valoresPorMoto: r.valores_por_moto || [],
    locacoesExtras: r.locacoes_extras?.length ? r.locacoes_extras : undefined,
    regraComissaoSocio: r.regra_comissao_socio != null ? Number(r.regra_comissao_socio) : undefined,
    regraComissaoTecnico: r.regra_comissao_tecnico != null ? Number(r.regra_comissao_tecnico) : undefined,
    status: r.status,
  };
}

function pecaToRow(p: PecaEstoque) {
  return {
    id: p.id,
    nome: p.nome,
    categoria: p.categoria,
    quantidade: p.quantidade,
    quantidade_minima: p.quantidadeMinima ?? null,
    custo_unitario: p.custoUnitario ?? null,
    fornecedor: p.fornecedor || null,
    observacoes: p.observacoes || null,
  };
}

function rowToPeca(r: any): PecaEstoque {
  return {
    id: r.id,
    nome: r.nome,
    categoria: r.categoria,
    quantidade: r.quantidade,
    quantidadeMinima: r.quantidade_minima ?? undefined,
    custoUnitario: r.custo_unitario != null ? Number(r.custo_unitario) : undefined,
    fornecedor: r.fornecedor || undefined,
    observacoes: r.observacoes || undefined,
  };
}

function lancamentoToRow(l: LancamentoFinanceiro) {
  return {
    id: l.id,
    tipo: l.tipo,
    valor: l.valor,
    data: l.data instanceof Date ? l.data.toISOString().split('T')[0] : String(l.data).split('T')[0],
    descricao: l.descricao,
    classificacao: l.classificacao,
    categoria: l.categoria,
    centro_custo: l.centroCusto,
    forma_pagamento: l.formaPagamento,
    status: l.status,
    contrato_id: l.contratoId || null,
    moto_chassi: l.motoChassi || null,
    eh_comissao_socio: l.ehComissaoSocio || false,
    eh_comissao_tecnico: l.ehComissaoTecnico || false,
    eh_investimento: l.ehInvestimento || false,
    eh_recorrente: l.ehRecorrente || false,
    recorrencia_fim: l.recorrenciaFim ? (l.recorrenciaFim instanceof Date ? l.recorrenciaFim.toISOString().split('T')[0] : String(l.recorrenciaFim).split('T')[0]) : null,
    grupo_recorrencia_id: l.grupoRecorrenciaId || null,
    nome_empresa: l.nomeEmpresa || null,
    data_vencimento: l.dataVencimento ? (l.dataVencimento instanceof Date ? l.dataVencimento.toISOString().split('T')[0] : String(l.dataVencimento).split('T')[0]) : null,
    eh_visita_tecnico: l.ehVisitaTecnico || false,
    tipo_visita: l.tipoVisita || null,
    categoria_custo_visita: l.categoriaCustoVisita || null,
    eh_mau_uso: l.ehMauUso || false,
    valor_cobrar_cliente: l.valorCobrarCliente ?? null,
    tecnico_responsavel: l.tecnicoResponsavel || null,
    observacoes_visita: l.observacoesVisita || null,
    venda_id: l.vendaId || null,
    parcela_numero: l.parcelaNumero ?? null,
    total_parcelas: l.totalParcelas ?? null,
  };
}

function rowToLancamento(r: any): LancamentoFinanceiro {
  return {
    id: r.id,
    tipo: r.tipo,
    valor: Number(r.valor),
    data: new Date(r.data),
    descricao: r.descricao,
    classificacao: r.classificacao,
    categoria: r.categoria,
    centroCusto: r.centro_custo,
    formaPagamento: r.forma_pagamento,
    status: r.status,
    contratoId: r.contrato_id || undefined,
    motoChassi: r.moto_chassi || undefined,
    ehComissaoSocio: r.eh_comissao_socio || undefined,
    ehComissaoTecnico: r.eh_comissao_tecnico || undefined,
    ehInvestimento: r.eh_investimento || undefined,
    ehRecorrente: r.eh_recorrente || undefined,
    recorrenciaFim: r.recorrencia_fim ? new Date(r.recorrencia_fim) : undefined,
    grupoRecorrenciaId: r.grupo_recorrencia_id || undefined,
    nomeEmpresa: r.nome_empresa || undefined,
    dataVencimento: r.data_vencimento ? new Date(r.data_vencimento) : undefined,
    ehVisitaTecnico: r.eh_visita_tecnico || undefined,
    tipoVisita: r.tipo_visita || undefined,
    categoriaCustoVisita: r.categoria_custo_visita || undefined,
    ehMauUso: r.eh_mau_uso || undefined,
    valorCobrarCliente: r.valor_cobrar_cliente != null ? Number(r.valor_cobrar_cliente) : undefined,
    tecnicoResponsavel: r.tecnico_responsavel || undefined,
    observacoesVisita: r.observacoes_visita || undefined,
    vendaId: r.venda_id || undefined,
    parcelaNumero: r.parcela_numero != null ? Number(r.parcela_numero) : undefined,
    totalParcelas: r.total_parcelas != null ? Number(r.total_parcelas) : undefined,
  };
}

// ── LOAD: buscar tudo do Supabase ──

export async function loadAllFromSupabase(): Promise<{
  motos: Moto[];
  clientes: Cliente[];
  contratos: Contrato[];
  pecas: PecaEstoque[];
  lancamentos: LancamentoFinanceiro[];
  testRides: TestRide[];
} | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const [motosRes, clientesRes, locaisRes, contratosRes, pecasRes, lancamentosRes, testRidesRes] = await Promise.all([
      (sb.from('motos') as any).select('*'),
      (sb.from('clientes') as any).select('*'),
      (sb.from('locais_operacao') as any).select('*'),
      (sb.from('contratos') as any).select('*'),
      (sb.from('pecas_estoque') as any).select('*'),
      (sb.from('lancamentos_financeiros') as any).select('*'),
      (sb.from('test_rides') as any).select('*'),
    ]);

    if (motosRes.error) throw motosRes.error;
    if (clientesRes.error) throw clientesRes.error;
    if (contratosRes.error) throw contratosRes.error;

    // Montar clientes com seus locais de operação
    const locaisByCliente = new Map<string, LocalOperacao[]>();
    for (const l of ((locaisRes.data || []) as any[])) {
      const arr = locaisByCliente.get(l.cliente_id) || [];
      arr.push(rowToLocal(l));
      locaisByCliente.set(l.cliente_id, arr);
    }

    const clientes = ((clientesRes.data || []) as any[]).map((r) => ({
      ...rowToCliente(r),
      locaisOperacao: locaisByCliente.get(r.id) || [],
    }));

    return {
      motos: ((motosRes.data || []) as any[]).map(rowToMoto),
      clientes,
      contratos: ((contratosRes.data || []) as any[]).map(rowToContrato),
      pecas: ((pecasRes.data || []) as any[]).map(rowToPeca),
      lancamentos: ((lancamentosRes.data || []) as any[]).map(rowToLancamento),
      testRides: ((testRidesRes.data || []) as any[]).map(rowToTestRide),
    };
  } catch (err) {
    console.error('[Supabase Sync] Erro ao carregar dados:', err);
    return null;
  }
}

// ── SAVE: upsert individual por entidade ──

export async function upsertMoto(moto: Moto) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await (sb.from('motos') as any).upsert(motoToRow(moto), { onConflict: 'id' });
  if (error) console.error('[Supabase] upsertMoto error:', error.message);
}

export async function deleteMoto(id: string) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await (sb.from('motos') as any).delete().eq('id', id);
  if (error) console.error('[Supabase] deleteMoto error:', error.message);
}

export async function upsertCliente(cliente: Cliente) {
  const sb = getSupabase();
  if (!sb) return;
  // Upsert cliente
  const { error } = await (sb.from('clientes') as any).upsert(clienteToRow(cliente), { onConflict: 'id' });
  if (error) console.error('[Supabase] upsertCliente error:', error.message);
  // Upsert locais de operação
  if (cliente.locaisOperacao) {
    for (const local of cliente.locaisOperacao) {
      const { error: lErr } = await (sb.from('locais_operacao') as any).upsert(localToRow(local, cliente.id), { onConflict: 'id' });
      if (lErr) console.error('[Supabase] upsertLocal error:', lErr.message);
    }
  }
}

export async function deleteCliente(id: string) {
  const sb = getSupabase();
  if (!sb) return;
  // Locais são deletados por CASCADE
  const { error } = await (sb.from('clientes') as any).delete().eq('id', id);
  if (error) console.error('[Supabase] deleteCliente error:', error.message);
}

export async function upsertContrato(contrato: Contrato) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await (sb.from('contratos') as any).upsert(contratoToRow(contrato), { onConflict: 'id' });
  if (error) console.error('[Supabase] upsertContrato error:', error.message);
}

export async function deleteContrato(id: string) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await (sb.from('contratos') as any).delete().eq('id', id);
  if (error) console.error('[Supabase] deleteContrato error:', error.message);
}

export async function upsertPeca(peca: PecaEstoque) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await (sb.from('pecas_estoque') as any).upsert(pecaToRow(peca), { onConflict: 'id' });
  if (error) console.error('[Supabase] upsertPeca error:', error.message);
}

export async function deletePeca(id: string) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await (sb.from('pecas_estoque') as any).delete().eq('id', id);
  if (error) console.error('[Supabase] deletePeca error:', error.message);
}

export async function upsertLancamento(lancamento: LancamentoFinanceiro) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await (sb.from('lancamentos_financeiros') as any).upsert(lancamentoToRow(lancamento), { onConflict: 'id' });
  if (error) console.error('[Supabase] upsertLancamento error:', error.message);
}

export async function upsertLancamentos(lancamentos: LancamentoFinanceiro[]) {
  const sb = getSupabase();
  if (!sb || lancamentos.length === 0) return;
  // Batch upsert (Supabase aceita arrays)
  const rows = lancamentos.map(lancamentoToRow);
  const { error } = await (sb.from('lancamentos_financeiros') as any).upsert(rows, { onConflict: 'id' });
  if (error) console.error('[Supabase] upsertLancamentos batch error:', error.message);
}

export async function deleteLancamento(id: string) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await (sb.from('lancamentos_financeiros') as any).delete().eq('id', id);
  if (error) console.error('[Supabase] deleteLancamento error:', error.message);
}

export async function deleteLancamentosByGrupo(grupoId: string) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await (sb.from('lancamentos_financeiros') as any).delete().eq('grupo_recorrencia_id', grupoId);
  if (error) console.error('[Supabase] deleteLancamentosByGrupo error:', error.message);
}

// ── TestRide persistence ──

function testRideToRow(tr: TestRide) {
  return {
    id: tr.id,
    cliente_id: tr.clienteId,
    motos_vinculadas: tr.motosVinculadas || [],
    data_inicio: tr.dataInicio instanceof Date ? tr.dataInicio.toISOString().split('T')[0] : String(tr.dataInicio).split('T')[0],
    data_previsao_retorno: tr.dataPrevisaoRetorno ? (tr.dataPrevisaoRetorno instanceof Date ? tr.dataPrevisaoRetorno.toISOString().split('T')[0] : String(tr.dataPrevisaoRetorno).split('T')[0]) : null,
    local_operacao_id: tr.localOperacaoId || null,
    observacoes: tr.observacoes || null,
    status: tr.status,
    status_retorno_moto: tr.statusRetornoMoto || null,
  };
}

function rowToTestRide(r: any): TestRide {
  return {
    id: r.id,
    clienteId: r.cliente_id,
    motosVinculadas: r.motos_vinculadas || [],
    dataInicio: new Date(r.data_inicio),
    dataPrevisaoRetorno: r.data_previsao_retorno ? new Date(r.data_previsao_retorno) : undefined,
    localOperacaoId: r.local_operacao_id || undefined,
    observacoes: r.observacoes || undefined,
    status: r.status,
    statusRetornoMoto: r.status_retorno_moto || undefined,
  };
}

export async function upsertTestRide(tr: TestRide) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await (sb.from('test_rides') as any).upsert(testRideToRow(tr), { onConflict: 'id' });
  if (error) console.error('[Supabase] upsertTestRide error:', error.message);
}

export async function deleteTestRide(id: string) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await (sb.from('test_rides') as any).delete().eq('id', id);
  if (error) console.error('[Supabase] deleteTestRide error:', error.message);
}

// ── AporteSocio persistence ──

function aporteToRow(a: AporteSocio) {
  return {
    id: a.id,
    socio_id: a.socioId,
    valor: a.valor,
    data: a.data instanceof Date ? a.data.toISOString().split('T')[0] : String(a.data).split('T')[0],
    descricao: a.descricao || null,
    observacoes: a.observacoes || null,
  };
}

function rowToAporte(r: any): AporteSocio {
  return {
    id: r.id,
    socioId: r.socio_id,
    valor: Number(r.valor),
    data: new Date(r.data),
    descricao: r.descricao || '',
    motivo: (r.motivo as any) || 'Outros',
    tipo: (r.tipo as any) || 'Operacional',
    percentualSocietarioNaData: Number(r.percentual_societario_na_data) || 0,
    ativo: r.ativo ?? true,
    observacoes: r.observacoes || undefined,
  };
}

export async function upsertAporte(aporte: AporteSocio) {
  const sb = getSupabase();
  if (!sb) return;
  // Type assertion: tabela pode não estar no schema gerado do Supabase
  const { error } = await (sb.from('aportes_socios') as any).upsert(aporteToRow(aporte), { onConflict: 'id' });
  if (error) console.error('[Supabase] upsertAporte error:', error.message);
}

export async function deleteAporte(id: string) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await (sb.from('aportes_socios') as any).delete().eq('id', id);
  if (error) console.error('[Supabase] deleteAporte error:', error.message);
}

// ── ParcelaRepagamento persistence ──

function parcelaToRow(p: ParcelaRepagamento) {
  return {
    id: p.id,
    aporte_id: p.aporteId,
    socio_id: p.socioId,
    numero: p.numero,
    valor_original: p.valorOriginal,
    valor_pago: p.valorPago,
    data_prevista: p.dataPrevista instanceof Date ? p.dataPrevista.toISOString().split('T')[0] : String(p.dataPrevista).split('T')[0],
    data_pagamento: p.dataPagamento ? (p.dataPagamento instanceof Date ? p.dataPagamento.toISOString().split('T')[0] : String(p.dataPagamento).split('T')[0]) : null,
    status: p.status,
    lancamento_id: p.lancamentoId || null,
    observacoes: p.observacoes || null,
  };
}

function rowToParcela(r: any): ParcelaRepagamento {
  return {
    id: r.id,
    aporteId: r.aporte_id,
    socioId: r.socio_id,
    numero: r.numero,
    valorOriginal: Number(r.valor_original),
    valorPago: Number(r.valor_pago),
    dataPrevista: new Date(r.data_prevista),
    dataPagamento: r.data_pagamento ? new Date(r.data_pagamento) : undefined,
    status: r.status,
    lancamentoId: r.lancamento_id || undefined,
    observacoes: r.observacoes || undefined,
  };
}

export async function upsertParcela(parcela: ParcelaRepagamento) {
  const sb = getSupabase();
  if (!sb) return;
  // Type assertion: tabela pode não estar no schema gerado do Supabase
  const { error } = await (sb.from('parcelas_repagamento') as any).upsert(parcelaToRow(parcela), { onConflict: 'id' });
  if (error) console.error('[Supabase] upsertParcela error:', error.message);
}

export async function upsertParcelas(parcelas: ParcelaRepagamento[]) {
  const sb = getSupabase();
  if (!sb || parcelas.length === 0) return;
  const rows = parcelas.map(parcelaToRow);
  // Type assertion: tabela pode não estar no schema gerado do Supabase
  const { error } = await (sb.from('parcelas_repagamento') as any).upsert(rows, { onConflict: 'id' });
  if (error) console.error('[Supabase] upsertParcelas batch error:', error.message);
}

export async function deleteParcela(id: string) {
  const sb = getSupabase();
  if (!sb) return;
  // Type assertion: tabela pode não estar no schema gerado do Supabase
  const { error } = await (sb.from('parcelas_repagamento') as any).delete().eq('id', id);
  if (error) console.error('[Supabase] deleteParcela error:', error.message);
}

export async function deleteParcelasByAporte(aporteId: string) {
  const sb = getSupabase();
  if (!sb) return;
  // Type assertion: tabela pode não estar no schema gerado do Supabase
  const { error } = await (sb.from('parcelas_repagamento') as any).delete().eq('aporte_id', aporteId);
  if (error) console.error('[Supabase] deleteParcelasByAporte error:', error.message);
}

// ── Funcionario persistence ──

function funcionarioToRow(f: Funcionario) {
  return {
    id: f.id,
    nome: f.nome,
    funcao: f.funcao,
    ativo: f.ativo,
    salario: f.salario ?? 0,
    percentual_empresa: f.percentualEmpresa ?? 0,
    percentual_comissao_contratos: f.percentualComissaoContratos ?? 0,
    percentual_comissao_manutencao: f.percentualComissaoManutencao ?? 0,
    origem_comissao: f.origemComissao ?? 'Nenhum',
    eh_socio: f.ehSocio ?? false,
    contratos_vinculados: f.contratosVinculados || [],
    comissao_por_contrato: f.comissaoPorContrato || {},
    observacoes: f.observacoes || null,
  };
}

function rowToFuncionario(r: any): Funcionario {
  return {
    id: r.id,
    nome: r.nome,
    funcao: r.funcao,
    ativo: r.ativo,
    salario: Number(r.salario) || 0,
    percentualEmpresa: Number(r.percentual_empresa) || 0,
    percentualComissaoContratos: Number(r.percentual_comissao_contratos) || 0,
    percentualComissaoManutencao: Number(r.percentual_comissao_manutencao) || 0,
    origemComissao: r.origem_comissao || 'Nenhum',
    ehSocio: r.eh_socio || false,
    contratosVinculados: r.contratos_vinculados || [],
    observacoes: r.observacoes || undefined,
  };
}

export async function upsertFuncionario(funcionario: Funcionario) {
  const sb = getSupabase();
  if (!sb) return;
  // Type assertion: tabela pode não estar no schema gerado do Supabase
  const { error } = await (sb.from('funcionarios') as any).upsert(funcionarioToRow(funcionario), { onConflict: 'id' });
  if (error) console.error('[Supabase] upsertFuncionario error:', error.message);
}

export async function deleteFuncionario(id: string) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await (sb.from('funcionarios') as any).delete().eq('id', id);
  if (error) console.error('[Supabase] deleteFuncionario error:', error.message);
}

// ── Config persistence ──

export async function upsertConfig(key: string, value: unknown) {
  const sb = getSupabase();
  if (!sb) return;
  // Type assertion: tabela pode não estar no schema gerado do Supabase
  const { error } = await (sb.from('app_config') as any).upsert({ key, value: JSON.stringify(value) }, { onConflict: 'key' });
  if (error) console.error('[Supabase] upsertConfig error:', error.message);
}

export async function loadConfig(): Promise<Record<string, unknown> | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    // Type assertion: tabela pode não estar no schema gerado do Supabase
    const { data, error } = await (sb.from('app_config') as any).select('*');
    if (error) throw error;
    const config: Record<string, unknown> = {};
    for (const row of (data || []) as Array<{ key: string; value: string }>) {
      try {
        config[row.key] = JSON.parse(row.value);
      } catch {
        config[row.key] = row.value;
      }
    }
    return config;
  } catch (err) {
    console.error('[Supabase] loadConfig error:', err);
    return null;
  }
}

// ── Extended LOAD: incluir aportes, parcelas, funcionarios, config ──

export async function loadAllFromSupabaseExtended(): Promise<{
  motos: Moto[];
  clientes: Cliente[];
  contratos: Contrato[];
  pecas: PecaEstoque[];
  lancamentos: LancamentoFinanceiro[];
  testRides: TestRide[];
  aportes: AporteSocio[];
  parcelas: ParcelaRepagamento[];
  funcionarios: Funcionario[];
  config: Record<string, unknown>;
} | null> {
  const base = await loadAllFromSupabase();
  if (!base) return null;

  const sb = getSupabase();
  if (!sb) return { ...base, aportes: [], parcelas: [], funcionarios: [], config: {} };

  try {
    const [aportesRes, parcelasRes, funcionariosRes, configRes] = await Promise.all([
      (sb.from('aportes_socios') as any).select('*'),
      (sb.from('parcelas_repagamento') as any).select('*'),
      (sb.from('funcionarios') as any).select('*'),
      (sb.from('app_config') as any).select('*'),
    ]);

    const aportes = ((aportesRes.data || []) as any[]).map(rowToAporte);
    const parcelas = ((parcelasRes.data || []) as any[]).map(rowToParcela);
    const funcionarios = ((funcionariosRes.data || []) as any[]).map(rowToFuncionario);

    const config: Record<string, unknown> = {};
    for (const row of (configRes.data || []) as Array<{ key: string; value: string }>) {
      try {
        config[row.key] = JSON.parse(row.value);
      } catch {
        config[row.key] = row.value;
      }
    }

    return {
      ...base,
      aportes,
      parcelas,
      funcionarios,
      config,
    };
  } catch (err) {
    console.error('[Supabase Sync] Erro ao carregar dados estendidos:', err);
    return { ...base, aportes: [], parcelas: [], funcionarios: [], config: {} };
  }
}

// ── SYNC STATUS ──
export { isSupabaseConfigured };