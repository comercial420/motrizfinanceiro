import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Moto, Cliente, Contrato, LancamentoFinanceiro, PecaEstoque, CategoriaCustoVisita, Funcionario, TestRide, AporteSocio, ParcelaRepagamento, HistoricoVendaMoto } from '@/types';
import { isRentalModel } from '@/types';
import { generateId } from '@/lib/utils';
import {
  loadAllFromSupabase,
  loadAllFromSupabaseExtended,
  upsertMoto, deleteMoto as dbDeleteMoto,
  upsertCliente, deleteCliente as dbDeleteCliente,
  upsertContrato, deleteContrato as dbDeleteContrato,
  upsertTestRide, deleteTestRide as dbDeleteTestRide,
  upsertPeca, deletePeca as dbDeletePeca,
  upsertLancamento, upsertLancamentos, deleteLancamento as dbDeleteLancamento,
  deleteLancamentosByGrupo,
  upsertAporte, deleteAporte as dbDeleteAporte,
  upsertParcela, upsertParcelas, deleteParcela as dbDeleteParcela, deleteParcelasByAporte,
  upsertFuncionario, deleteFuncionario as dbDeleteFuncionario,
  upsertConfig,
  isSupabaseConfigured,
} from '@/lib/sync';

// --- Slice Interfaces ---

interface MotoSlice {
  motos: Moto[];
  addMoto: (moto: Moto) => void;
  updateMoto: (id: string, data: Partial<Moto>) => void;
  removeMoto: (id: string) => void;
  getMotoByChassi: (chassi: string) => Moto | undefined;
}

interface ClienteSlice {
  clientes: Cliente[];
  addCliente: (cliente: Cliente) => void;
  updateCliente: (id: string, data: Partial<Cliente>) => void;
  removeCliente: (id: string) => void;
}

interface ContratoSlice {
  contratos: Contrato[];
  addContrato: (contrato: Contrato) => void;
  updateContrato: (id: string, data: Partial<Contrato>) => void;
  removeContrato: (id: string) => void;
  getContratosAtivos: () => Contrato[];
  updateExtraLocalOperacao: (contratoId: string, extraId: string, localOperacaoId: string | undefined) => void;
}

interface LancamentoSlice {
  lancamentos: LancamentoFinanceiro[];
  addLancamento: (lancamento: LancamentoFinanceiro) => void;
  updateLancamento: (id: string, data: Partial<LancamentoFinanceiro>) => void;
  removeLancamento: (id: string) => void;
  /** Adiciona um lançamento fixo recorrente e replica para os próximos meses até recorrenciaFim */
  addLancamentoRecorrente: (lancamento: LancamentoFinanceiro) => void;
  /** Atualiza todas as instâncias futuras (status Pendente/Previsto) de um grupo de recorrência */
  updateGrupoRecorrenciaFuturo: (grupoId: string, data: Partial<LancamentoFinanceiro>) => void;
  /** Muda apenas o dia do mês em todas as instâncias futuras de um grupo recorrente, preservando mês/ano de cada uma */
  updateDiaGrupoRecorrenciaFuturo: (grupoId: string, novoDia: number) => void;
  /** Remove todas as instâncias futuras de um grupo de recorrência */
  removeGrupoRecorrenciaFuturo: (grupoId: string) => void;
  /** Retorna lançamentos fixos pendentes do mês corrente que precisam de confirmação */
  getPendenciasFimMes: () => LancamentoFinanceiro[];
  /** Verifica se estamos nos últimos 3 dias úteis do mês */
  isPeriodoFechamentoMes: () => boolean;
  /** Migra lançamentos de salário/comissão antigos para categoria Fixo + ehRecorrente */
  migrarLancamentosFuncionariosParaFixo: () => void;
  /** Remove lançamentos duplicados de salário/pró-labore/comissão (mesmo funcionário/mês/tipo) */
  limparLancamentosDuplicados: () => void;
  /** Gera automaticamente um lançamento "Recebemos" pendente quando mau uso é identificado */
  gerarCobrancaMauUso: (visitaLancamento: LancamentoFinanceiro) => void;
  /** Gera N lançamentos mensais para uma venda parcelada */
  addLancamentosParceladosParaVenda: (params: {
    vendaId: string;
    motoChassi: string;
    modelo: string;
    compradorNome: string;
    funcionarioResponsavelId: string;
    dataPrimeiraParcela: Date;
    numeroParcelas: number;
    valorParcela: number;
  }) => void;
  /** Retorna parcelas de venda pendentes de confirmação no mês corrente */
  getPendenciasParcelasFimMes: () => LancamentoFinanceiro[];
  /** Conta parcelas recebidas e total de parcelas para uma venda específica */
  getParcelasRecebidasPorVenda: (vendaId: string) => { total: number; recebidas: number };
  /** Remove lançamentos de salário/comissão vinculados a um contrato específico de um funcionário */
  removeLancamentosContratoFuncionario: (funcionarioId: string, contratoId: string) => void;
  /** Remove lançamentos legados de comissão sem contratoId vinculado (path antigo) */
  limparComissoesLegadas: (funcionarioId: string) => void;
}

interface PecaSlice {
  pecas: PecaEstoque[];
  addPeca: (peca: PecaEstoque) => void;
  updatePeca: (id: string, data: Partial<PecaEstoque>) => void;
  removePeca: (id: string) => void;
}

interface FuncionarioSlice {
  funcionarios: Funcionario[];
  addFuncionario: (f: Funcionario) => void;
  updateFuncionario: (id: string, data: Partial<Funcionario>) => void;
  removeFuncionario: (id: string) => void;
  getLancamentosPorFuncionario: (funcionarioId: string) => LancamentoFinanceiro[];
  getValorComissaoMensalFuncionario: (funcionarioId: string, mes?: string) => number;
  syncLancamentosFuncionarioContrato: (funcionarioId: string, contratoId: string) => void;
}

interface TestRideSlice {
  testRides: TestRide[];
  addTestRide: (tr: TestRide) => void;
  updateTestRide: (id: string, data: Partial<TestRide>) => void;
  removeTestRide: (id: string) => void;
  finalizarTestRide: (id: string, statusRetornoMoto: Moto['status']) => void;
}

interface VendaSlice {
  historicoVendas: HistoricoVendaMoto[];
  addHistoricoVenda: (venda: HistoricoVendaMoto) => void;
  updateHistoricoVenda: (id: string, data: Partial<HistoricoVendaMoto>) => void;
  removeHistoricoVenda: (id: string) => void;
}

interface SyncSlice {
  /** Carrega todos os dados do Supabase e popula o store local */
  syncFromSupabase: () => Promise<boolean>;
  /** Indica se o Supabase está configurado e conectado */
  supabaseReady: boolean;
}

interface AporteSocioSlice {
  aportes: AporteSocio[];
  parcelas: ParcelaRepagamento[];

  // CRUD Aportes
  addAporte: (aporte: AporteSocio) => void;
  updateAporte: (id: string, data: Partial<AporteSocio>) => void;
  removeAporte: (id: string) => void;

  // CRUD Parcelas
  addParcela: (parcela: ParcelaRepagamento) => void;
  updateParcela: (id: string, data: Partial<ParcelaRepagamento>) => void;
  removeParcela: (id: string) => void;

  // Ações de negócio
  gerarParcelasRepagamento: (aporteId: string, qtdParcelas: number, valorPorParcela?: number, dataInicio?: Date) => void;
  reconfigurarParcelas: (aporteId: string, novaQtd: number, novoValorPorParcela?: number) => void;
  pagarParcela: (parcelaId: string, valorPago: number, dataPagamento: Date) => void;
  amortizarParcelasFuturas: (socioId: string, valorSobra: number, mesReferencia: string) => void;

  // Selectors
  getDividaTotalSocios: () => number;
  getDividaPorSocio: (socioId: string) => number;
  getTotalAportadoPorSocio: (socioId: string) => number;
  getTotalDevolvidoPorSocio: (socioId: string) => number;
  getParcelasPendentes: (socioId?: string) => ParcelaRepagamento[];
  getParcelasDoMes: (mes: string, socioId?: string) => ParcelaRepagamento[];
  getHistoricoAportes: () => AporteSocio[];
  getHistoricoRepagamentos: () => ParcelaRepagamento[];
  getSaldoAporte: (aporteId: string) => number;

  // Estudo de Fluxo de Caixa
  getEstudoFluxoCaixa: (mes?: string) => {
    receitaFixaPrevista: number;
    receitaVariavelEstimada: number;
    receitaTotalPrevista: number;
    despesasFixas: number;
    impostoEstimado: number;
    comissoesEstimadas: number;
    sobraLiquida: number;
    parcelaSugerida: number;
    parcelasPendentesCount: number;
  };
}

// --- Computed Selectors Interface ---

interface ComissaoSlice {
  percentualImposto: number;
  percentualImpostoMauUso: number; // % de imposto específico para cobranças de mau uso (só sobre o recebido)
  percentualComissaoComercial: number;
  percentualComissaoOperacional: number;
  setPercentualImposto: (v: number) => void;
  setPercentualImpostoMauUso: (v: number) => void;
  setPercentualComissaoComercial: (v: number) => void;
  setPercentualComissaoOperacional: (v: number) => void;
}

interface ComputedSelectors {
  getReceitaRecorrente: () => number;
  getSaldoCaixa: () => number;
  getRunway: () => number;
  getTaxaUtilizacao: () => number;
  getPontoEquilibrio: () => number;
  getReceitaRecebidaMes: (mes?: string) => number;
  getDespesasPagasMes: () => number;
  getResultadoLiquidoOperacional: () => number;
  getPercentualReceitaPrevisivel: () => number;
  getReceitaFixaMes: (mes?: string) => number;
  getReceitaFixaPrevistaMes: (mes?: string) => number;
  getReceitaVariavelMes: (mes?: string) => number;
  getPrevisaoDespesasFixas: (mes?: string) => number;
  getResultadoPrevisto: (mes?: string) => number;
  getTotalReceitasMes: () => number;
  getTotalDespesasMes: () => number;
  getResultadoMes: () => number;
  getEvolucaoFinanceira: () => { mes: string; entradas: number; saidas: number; resultado: number }[];
  getComposicaoReceita: () => { nome: string; valor: number }[];
  getVisaoCaixa: () => { nome: string; atual: number; comprometido: number; projetado: number }[];
  // --- Visita Técnica Selectors ---
  getVisitasTecnicasMes: (mes?: string) => LancamentoFinanceiro[];
  getCustoTotalVisitasMes: (mes?: string) => number;
  getCustoVisitasPorCategoria: (mes?: string) => Record<string, number>;
  getVisitasPorContrato: (contratoId: string) => LancamentoFinanceiro[];
  getValorMauUsoPendente: () => number;
  getValorMauUsoPago: () => number;
  getValorMauUsoPendenteCount: () => number;
  getValorMauUsoPagoCount: () => number;
  getVisitasPorTecnico: (mes?: string) => Record<string, { count: number; total: number }>;
  getCobrancasMauUsoMes: (mes?: string) => LancamentoFinanceiro[];
  getLucroMauUsoMes: (mes?: string) => number;
  getLucroMauUsoDetalhado: (mes?: string) => Array<{ id: string; descricao: string; data: Date; valorCobrado: number; imposto: number; custoItens: number; comissaoTecnico: number; pctComissao: number; tecnicoNome: string; lucro: number; status: 'Pago' | 'Recebido' | 'Pendente' | 'Previsto'; visitaMauUsoId: string | undefined }>;
  // --- Comissão Global Selectors (nova lógica: funcionários/sócios) ---
  getFaturamentoBrutoMes: (mes?: string) => number;
  getReceitaTotalMes: (mes?: string) => number;
  getReceitaAReceberMes: (mes?: string) => number;
  getFaturamentoBrutoRecebidoMes: (mes?: string) => number;
  getFaturamentoBrutoAReceberMes: (mes?: string) => number;
  getImpostoMes: (mes?: string) => number;
  getBasePosImpostoMes: (mes?: string) => number;
  getDespesasTotaisMes: (mes?: string) => number;
  getBaseOperacionalMes: (mes?: string) => number;
  getVendasMotosPorFuncionario: (mes?: string) => Record<string, number>;
  getComissaoPorFuncionario: (mes?: string) => Array<{ funcionarioId: string; nome: string; funcao: string; percentual: number; valor: number }>;
  getComissaoComercialMes: (mes?: string) => number;
  getComissaoOperacionalMes: (mes?: string) => number;
  getResultadoFinalMes: (mes?: string) => number;
  getDivisaoSocietaria: (mes?: string) => Array<{ funcionarioId: string; nome: string; percentual: number; valor: number }>;
  getQuadroRecebimentos: (mes?: string) => Array<{ funcionarioId: string; nome: string; funcao: string; ehSocio: boolean; salario: number; comissao: number; comissaoMauUso: number; comissaoMauUsoCount: number; comissaoMauUsoPct: number; participacao: number; total: number }>;
  getComissoesGlobaisJaGeradas: (mes: string) => boolean;
  gerarLancamentosComissoesGlobais: (mes: string) => void;
  getComissoesPorContrato: (mes?: string) => Array<{ contratoId: string; nome: string; valorMensal: number; contribComercial: number; contribOperacional: number; contribPorFunc?: Array<{ nome: string; valor: number }> }>;
}

// --- Store Type ---

export type AppStore = MotoSlice & ClienteSlice & ContratoSlice & LancamentoSlice & PecaSlice & FuncionarioSlice & TestRideSlice & VendaSlice & ComissaoSlice & SyncSlice & AporteSocioSlice & ComputedSelectors;

// --- Implementation ---

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // --- Sync ---
      supabaseReady: false,
      syncFromSupabase: async () => {
        if (!isSupabaseConfigured()) {
          console.log('[Store] Supabase não configurado — modo local-only');
          return false;
        }
        try {
          const data = await loadAllFromSupabaseExtended();
          if (!data) return false;
          set({
            motos: data.motos,
            clientes: data.clientes,
            contratos: data.contratos,
            pecas: data.pecas,
            lancamentos: data.lancamentos,
            testRides: data.testRides,
            funcionarios: data.funcionarios,
            aportes: data.aportes,
            parcelasRepagamento: data.parcelas,
            percentualImposto: (data.config.percentualImposto as number) ?? get().percentualImposto,
            percentualComissaoComercial: (data.config.percentualComissaoComercial as number) ?? get().percentualComissaoComercial,
            percentualComissaoOperacional: (data.config.percentualComissaoOperacional as number) ?? get().percentualComissaoOperacional,
            supabaseReady: true,
          });
          console.log(`[Store] Sync OK — ${data.motos.length} motos, ${data.clientes.length} clientes, ${data.contratos.length} contratos, ${data.funcionarios.length} funcionários, ${data.lancamentos.length} lançamentos`);
          // Migração automática: salários/comissões antigos → categoria Fixo + ehRecorrente
          get().migrarLancamentosFuncionariosParaFixo();
          // Limpeza automática: remover lançamentos duplicados de salário/pró-labore/comissão
          get().limparLancamentosDuplicados();
          return true;
        } catch (err) {
          console.error('[Store] syncFromSupabase failed:', err);
          return false;
        }
      },

      // --- Motos ---
      motos: [],
      addMoto: (moto) => {
        set((state) => ({ motos: [...state.motos, moto] }));
        upsertMoto(moto).catch(() => {});
      },
      updateMoto: (id, data) => {
        set((state) => {
          const updated = state.motos.map((m) => (m.id === id ? { ...m, ...data } : m));
          const moto = updated.find((m) => m.id === id);
          if (moto) upsertMoto(moto).catch(() => {});
          return { motos: updated };
        });
      },
      removeMoto: (id) => {
        set((state) => ({ motos: state.motos.filter((m) => m.id !== id) }));
        dbDeleteMoto(id).catch(() => {});
      },
      getMotoByChassi: (chassi) => get().motos.find((m) => m.chassi === chassi),

      // --- Clientes ---
      clientes: [],
      addCliente: (cliente) => {
        set((state) => ({ clientes: [...state.clientes, cliente] }));
        upsertCliente(cliente).catch(() => {});
      },
      updateCliente: (id, data) => {
        set((state) => {
          const updated = state.clientes.map((c) => (c.id === id ? { ...c, ...data } : c));
          const cliente = updated.find((c) => c.id === id);
          if (cliente) upsertCliente(cliente).catch(() => {});
          return { clientes: updated };
        });
      },
      removeCliente: (id) => {
        set((state) => ({ clientes: state.clientes.filter((c) => c.id !== id) }));
        dbDeleteCliente(id).catch(() => {});
      },

      // --- Contratos ---
      contratos: [],
      addContrato: (contrato) => {
        const state = get();
        // Gerar lançamentos recorrentes automáticos para este contrato
        const cliente = state.clientes.find((c) => c.id === contrato.clienteId);
        const baseDate = new Date(contrato.dataInicio);
        const extrasTotal = (contrato.locacoesExtras || []).reduce((a, e) => a + e.valorMensal, 0);
        const valorTotal = contrato.valorMensalTotal + extrasTotal;

        // Criar lançamento recorrente principal do contrato
        const lancamentoContrato: LancamentoFinanceiro = {
          id: generateId(),
          tipo: 'Recebemos',
          valor: valorTotal,
          data: baseDate,
          descricao: `Aluguel ${cliente?.nome || 'Cliente'} - ${contrato.numeroContrato || contrato.id.slice(0, 6)}`,
          classificacao: 'Aluguel',
          categoria: 'Fixo',
          centroCusto: 'Operacional',
          formaPagamento: 'PIX',
          status: 'Previsto',
          contratoId: contrato.id,
          ehRecorrente: true,
          recorrenciaFim: contrato.dataTermino,
          grupoRecorrenciaId: `contrato-${contrato.id}`,
          nomeEmpresa: cliente?.nome,
          dataVencimento: new Date(baseDate.getFullYear(), baseDate.getMonth(), contrato.diaVencimento),
        };

        // Gerar instâncias mensais (até 24 meses ou dataTermino)
        const fim = contrato.dataTermino ?? new Date(baseDate.getFullYear() + 2, baseDate.getMonth(), baseDate.getDate());
        const instances: LancamentoFinanceiro[] = [];
        let current = new Date(baseDate);

        while (current <= fim) {
          const vencimento = new Date(current.getFullYear(), current.getMonth(), contrato.diaVencimento);
          instances.push({
            ...lancamentoContrato,
            id: generateId(),
            data: new Date(current),
            dataVencimento: vencimento,
          });
          current = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
        }

        set((state) => ({
          contratos: [...state.contratos, contrato],
          lancamentos: [...state.lancamentos, ...instances],
        }));
        // Persistir no Supabase
        upsertContrato(contrato).catch(() => {});
        upsertLancamentos(instances).catch(() => {});
      },
      updateContrato: (id, data) => {
        const state = get();
        const contratoAtual = state.contratos.find((c) => c.id === id);
        if (!contratoAtual) return;

        const contratoAtualizado = { ...contratoAtual, ...data };
        const cliente = state.clientes.find((c) => c.id === contratoAtualizado.clienteId);
        const extrasTotal = (contratoAtualizado.locacoesExtras || []).reduce((a, e) => a + e.valorMensal, 0);
        const valorTotal = contratoAtualizado.valorMensalTotal + extrasTotal;

        // Atualizar lançamentos futuros deste contrato
        const grupoId = `contrato-${id}`;
        const lancamentosAtualizados = state.lancamentos.map((l) => {
          if (l.grupoRecorrenciaId === grupoId && (l.status === 'Pendente' || l.status === 'Previsto')) {
            return {
              ...l,
              valor: valorTotal,
              descricao: `Aluguel ${cliente?.nome || 'Cliente'} - ${contratoAtualizado.numeroContrato || id.slice(0, 6)}`,
              nomeEmpresa: cliente?.nome,
              dataVencimento: new Date(new Date(l.data).getFullYear(), new Date(l.data).getMonth(), contratoAtualizado.diaVencimento),
            };
          }
          return l;
        });

        // Coletar lançamentos alterados para persistir
        const lancamentosAlterados = lancamentosAtualizados.filter((l) => {
          const original = state.lancamentos.find((ol) => ol.id === l.id);
          return original && original.valor !== l.valor;
        });

        set((state) => ({
          contratos: state.contratos.map((c) => (c.id === id ? contratoAtualizado : c)),
          lancamentos: lancamentosAtualizados,
        }));
        // Persistir no Supabase
        upsertContrato(contratoAtualizado).catch(() => {});
        if (lancamentosAlterados.length > 0) upsertLancamentos(lancamentosAlterados).catch(() => {});

        // Propagar mudanças para funcionários vinculados a este contrato
        const linkedFuncionarios = state.funcionarios.filter((f) => f.contratosVinculados?.includes(id));
        for (const func of linkedFuncionarios) {
          const dataTerminoMudou = JSON.stringify(contratoAtual.dataTermino) !== JSON.stringify(contratoAtualizado.dataTermino);
          const valorMudou = contratoAtual.valorMensalTotal !== contratoAtualizado.valorMensalTotal;
          const extrasAntigos = (contratoAtual.locacoesExtras || []).reduce((s, e) => s + (e.valorMensal || 0), 0);
          const extrasNovos = (contratoAtualizado.locacoesExtras || []).reduce((s, e) => s + (e.valorMensal || 0), 0);
          const extrasMudaram = extrasAntigos !== extrasNovos;
          const statusEncerrado = contratoAtualizado.status === 'Encerrado';

          if (dataTerminoMudou || statusEncerrado) {
            // Remover grupos compostos futuros e regenerar com nova vigência
            get().removeGrupoRecorrenciaFuturo(`salario-${func.id}-contrato-${id}`);
            get().removeGrupoRecorrenciaFuturo(`comissao-${func.id}-contrato-${id}`);
            if (!statusEncerrado && func.ativo) {
              get().syncLancamentosFuncionarioContrato(func.id, id);
            }
          } else if ((valorMudou || extrasMudaram) && func.percentualComissaoContratos > 0) {
            // Atualizar valor da comissão nos grupos compostos (incluindo extras)
            const pctImposto = state.percentualImposto || 10;
            const extrasTotal = (contratoAtualizado.locacoesExtras || []).reduce((s, e) => s + (e.valorMensal || 0), 0);
            const basePosImposto = ((contratoAtualizado.valorMensalTotal || 0) + extrasTotal) * (1 - pctImposto / 100);
            const valorComissao = basePosImposto * (func.percentualComissaoContratos / 100);
            get().updateGrupoRecorrenciaFuturo(`comissao-${func.id}-contrato-${id}`, {
              valor: valorComissao,
            });
          }
        }
      },
      removeContrato: (id) => {
        const state = get();
        const grupoId = `contrato-${id}`;

        // Encontrar funcionários vinculados para limpar seus grupos compostos
        const linkedFuncionarios = state.funcionarios.filter((f) => f.contratosVinculados?.includes(id));
        const gruposParaRemover = [grupoId];
        for (const f of linkedFuncionarios) {
          gruposParaRemover.push(`salario-${f.id}-contrato-${id}`);
          gruposParaRemover.push(`comissao-${f.id}-contrato-${id}`);
        }

        set((state) => ({
          contratos: state.contratos.filter((c) => c.id !== id),
          lancamentos: state.lancamentos.filter((l) =>
            !gruposParaRemover.includes(l.grupoRecorrenciaId || '') ||
            (l.status !== 'Pendente' && l.status !== 'Previsto')
          ),
          // Limpar referências em contratosVinculados dos funcionários afetados
          funcionarios: state.funcionarios.map((f) => ({
            ...f,
            contratosVinculados: f.contratosVinculados?.filter((cid) => cid !== id),
          })),
        }));
        // Persistir no Supabase
        dbDeleteContrato(id).catch(() => {});
        for (const gid of gruposParaRemover) deleteLancamentosByGrupo(gid).catch(() => {});
      },
      getContratosAtivos: () => get().contratos.filter((c) => c.status === 'Ativo'),

      updateExtraLocalOperacao: (contratoId, extraId, localOperacaoId) => {
        set((state) => {
          const updated = state.contratos.map((c) => {
            if (c.id !== contratoId) return c;
            const updatedExtras = (c.locacoesExtras || []).map((e) =>
              e.id === extraId ? { ...e, localOperacaoId } : e
            );
            return { ...c, locacoesExtras: updatedExtras };
          });
          const contrato = updated.find((c) => c.id === contratoId);
          if (contrato) upsertContrato(contrato).catch(() => {});
          return { contratos: updated };
        });
      },

      // --- Lançamentos ---
      lancamentos: [],
      addLancamento: (lancamento) => {
        set((state) => ({ lancamentos: [...state.lancamentos, lancamento] }));
        upsertLancamento(lancamento).catch(() => {});
      },

      /**
       * Reconstrói todos os lançamentos de salário/pró-labore e comissão dos
       * funcionários cadastrados. Apaga os antigos (que podem ter categoria
       * errada) e recria com categoria 'Fixo' + ehRecorrente=true, usando
       * os mesmos valores. Garante que apareçam na aba "Receitas e Custos Fixos"
       * e se repitam nos meses seguintes.
       */
      migrarLancamentosFuncionariosParaFixo: () => {
        const state = get();
        const { funcionarios, contratos, lancamentos } = state;
        if (!funcionarios || funcionarios.length === 0) return;

        const padraoSalarioComissao = /salário|pró-labore|comiss/i;

        // VERIFICAÇÃO: só migrar se existir algum lançamento de salário/comissão
        // que AINDA NÃO tenha categoria 'Fixo' (ou seja, é dado legado).
        // Se todos já têm categoria 'Fixo', a migração já foi feita — não sobrescrever
        // edições do usuário (datas, valores, etc.).
        const lancamentosLegados = lancamentos.filter((l) =>
          padraoSalarioComissao.test(l.classificacao || '') && l.categoria !== 'Fixo'
        );

        // Se não há nenhum lançamento legado para migrar, sair imediatamente.
        // Isso protege todas as edições que o usuário já fez (datas, valores, status).
        if (lancamentosLegados.length === 0) return;

        // 1) Identifica e remove APENAS os lançamentos legados (sem categoria Fixo)
        const idsAntigos = new Set(lancamentosLegados.map((l) => l.id));
        const lancamentosRestantes = lancamentos.filter((l) => !idsAntigos.has(l.id));

        // Remove do Supabase (fire-and-forget)
        lancamentosLegados.forEach((l) => dbDeleteLancamento(l.id).catch(() => {}));

        // 2) Recria lançamentos fixos recorrentes para cada funcionário ativo
        const novosLancamentos: LancamentoFinanceiro[] = [];
        const now = new Date();
        const mesAtual = now.getMonth();
        const anoAtual = now.getFullYear();

        for (const func of funcionarios) {
          if (!func.ativo) continue;

          // --- Salário / Pró-labore (se > 0) ---
          if (func.salario > 0) {
            const classificacao = func.ehSocio ? `Pró-labore ${func.nome}` : `Salário ${func.nome}`;
            const descricao = func.ehSocio
              ? `Pró-labore mensal - ${func.nome}`
              : `Salário mensal - ${func.nome}`;

            // Determina vigência: contratos vinculados ou 24 meses
            let mesesGerar = 24;
            let dataFim: Date | undefined;

            if (func.contratosVinculados && func.contratosVinculados.length > 0) {
              // Usa a data de término mais distante dos contratos vinculados
              let fimMaisDistante: Date | null = null;
              for (const cId of func.contratosVinculados) {
                const contrato = contratos.find((c) => c.id === cId);
                if (contrato?.dataTermino) {
                  const dt = new Date(contrato.dataTermino);
                  if (!fimMaisDistante || dt > fimMaisDistante) fimMaisDistante = dt;
                }
              }
              if (fimMaisDistante) {
                dataFim = fimMaisDistante;
                const diffMs = fimMaisDistante.getTime() - now.getTime();
                mesesGerar = Math.max(1, Math.ceil(diffMs / (30 * 24 * 60 * 60 * 1000)));
              }
            }

            const grupoId = generateId();
            for (let m = 0; m < mesesGerar; m++) {
              const dataLanc = new Date(anoAtual, mesAtual + m, 5); // dia 5 de cada mês

              // DEDUPLICAÇÃO: Verificar se já existe um lançamento de salário/pró-labore para este funcionário neste mês
              const mesLanc = dataLanc.getMonth();
              const anoLanc = dataLanc.getFullYear();
              const jaExiste = lancamentosRestantes.some((l) =>
                l.funcionarioResponsavelId === func.id &&
                (l.classificacao === classificacao || padraoSalarioComissao.test(l.classificacao || '')) &&
                new Date(l.data).getMonth() === mesLanc &&
                new Date(l.data).getFullYear() === anoLanc
              );

              if (jaExiste) continue; // Pular se já existir

              novosLancamentos.push({
                id: generateId(),
                tipo: 'Pagamos',
                valor: func.salario,
                data: dataLanc,
                descricao,
                classificacao,
                categoria: 'Fixo',
                centroCusto: 'Administrativo',
                formaPagamento: 'Transferência',
                status: m === 0 ? 'Pendente' : 'Previsto',
                funcionarioResponsavelId: func.id,
                ehRecorrente: true,
                grupoRecorrenciaId: grupoId,
                recorrenciaFim: dataFim,
              });
            }
          }

          // --- Comissão sobre contratos: DESATIVADO (path legado) ---
          // Agora a comissão é gerada por contrato individual via syncLancamentosFuncionarioContrato
          // que respeita comissaoPorContrato[contratoId] e gera lançamentos com contratoId vinculado.
          // O path legado gerava um lançamento único sem contratoId, impedindo atualização por contrato.

          // --- Comissão Técnico sobre Mau Uso (apenas se % > 0 E houver cobranças) ---
          if (func.percentualComissaoManutencao > 0) {
            // Verifica se há cobranças de mau uso no mês atual (pendentes ou recebidas)
            const cobrancasMauUso = state.lancamentos.filter((l) => {
              const isMauUso = l.classificacao?.includes('Mau Uso') || l.visitaMauUsoId;
              if (!isMauUso) return false;
              const d = l.data instanceof Date ? l.data : new Date(l.data);
              return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
            });

            if (cobrancasMauUso.length > 0) {
              // Calcula o lucro líquido total das cobranças de mau uso
              const lucroTotalMauUso = cobrancasMauUso.reduce((acc, l) => {
                const valorCobrado = l.valor;
                const impostoVal = valorCobrado * (state.percentualImpostoMauUso / 100);
                // Custo dos itens e comissão já estão embutidos no lançamento de mau uso
                // O lucro é aproximado como: valor cobrado - imposto
                return acc + (valorCobrado - impostoVal);
              }, 0);

              const valorComissaoTecnico = Math.round(lucroTotalMauUso * (func.percentualComissaoManutencao / 100) * 100) / 100;

              if (valorComissaoTecnico > 0) {
                const classificacao = `Comissão Mau Uso ${func.nome}`;
                const descricao = `Comissão ${func.percentualComissaoManutencao}% sobre manutenções de mau uso - ${func.nome} (${cobrancasMauUso.length} ocorrência(s))`;

                const grupoId = generateId();
                // Gera apenas para o mês atual (mau uso é variável, não recorrente fixo)
                const dataLanc = new Date(anoAtual, mesAtual, 20); // dia 20 do mês
                novosLancamentos.push({
                  id: generateId(),
                  tipo: 'Pagamos',
                  valor: valorComissaoTecnico,
                  data: dataLanc,
                  descricao,
                  classificacao,
                  categoria: 'Fixo',
                  centroCusto: 'Operacional',
                  formaPagamento: 'Transferência',
                  status: 'Pendente',
                  funcionarioResponsavelId: func.id,
                  ehRecorrente: false, // Não é recorrente — depende de ocorrências reais
                  grupoRecorrenciaId: grupoId,
                });
              }
            }
          }
        }

        // 3) Atualiza o store com os lançamentos restantes + os novos
        const lancamentosFinal = [...lancamentosRestantes, ...novosLancamentos];
        set({ lancamentos: lancamentosFinal });

        // Persiste os novos no Supabase
        if (novosLancamentos.length > 0) {
          upsertLancamentos(novosLancamentos).catch(() => {});
        }

        console.log(`[Store] Migração salários/comissões: ${lancamentosLegados.length} removidos, ${novosLancamentos.length} recriados como Fixo`);
      },

      /**
       * Remove lançamentos duplicados de salário/pró-labore/comissão.
       * Dois lançamentos são considerados duplicados se tiverem o mesmo
       * funcionárioResponsavelId, mesmo mês/ano, e classificação similar
       * (salário/pró-labore ou comissão do mesmo funcionário).
       * Mantém o primeiro encontrado e remove os demais.
       */
      limparLancamentosDuplicados: () => {
        const state = get();
        const padraoSalarioComissao = /salário|pró-labore|comiss/i;
        const lancamentosRelevantes = state.lancamentos.filter((l) =>
          padraoSalarioComissao.test(l.classificacao || '')
        );

        if (lancamentosRelevantes.length === 0) return;

        // Agrupa por chave única: funcionarioId + mes/ano + tipo(salario/comissao)
        const vistos = new Map<string, string>(); // chave → id do primeiro lançamento
        const idsParaRemover: string[] = [];

        for (const l of lancamentosRelevantes) {
          const d = new Date(l.data);
          const mesAno = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const ehComissao = (l.classificacao || '').toLowerCase().includes('comiss');
          const tipo = ehComissao ? 'comissao' : 'salario';
          const chave = `${l.funcionarioResponsavelId || 'sem-func'}-${mesAno}-${tipo}`;

          if (vistos.has(chave)) {
            // Já existe um lançamento com esta chave — este é duplicado
            idsParaRemover.push(l.id);
          } else {
            vistos.set(chave, l.id);
          }
        }

        if (idsParaRemover.length === 0) return;

        // Remove os duplicados do estado e do Supabase
        const lancamentosLimpos = state.lancamentos.filter((l) => !idsParaRemover.includes(l.id));
        set({ lancamentos: lancamentosLimpos });

        // Remove do Supabase (fire-and-forget)
        idsParaRemover.forEach((id) => dbDeleteLancamento(id).catch(() => {}));

        console.log(`[Store] Limpeza duplicados: ${idsParaRemover.length} lançamentos duplicados removidos`);
      },

      updateLancamento: (id, data) =>
        set((state) => {
          const updated = state.lancamentos.map((l) => (l.id === id ? { ...l, ...data } : l));
          const lancamento = updated.find((l) => l.id === id);
          if (lancamento) upsertLancamento(lancamento).catch(() => {});
          return { lancamentos: updated };
        }),
      removeLancamento: (id) => {
        set((state) => ({ lancamentos: state.lancamentos.filter((l) => l.id !== id) }));
        dbDeleteLancamento(id).catch(() => {});
      },

      /**
       * Adiciona um lançamento fixo recorrente e replica para os próximos meses
       * até a data de recorrenciaFim. Cada instância recebe o mesmo grupoRecorrenciaId.
       */
      addLancamentoRecorrente: (lancamento) => {
        const grupoId = generateId();
        const baseDate = new Date(lancamento.data);
        // Se não houver data final, limitar a 24 meses (2 anos) para evitar geração excessiva
        const fim = lancamento.recorrenciaFim ?? new Date(baseDate.getFullYear() + 2, baseDate.getMonth(), baseDate.getDate());
        const instances: LancamentoFinanceiro[] = [];
        let current = new Date(baseDate);

        while (current <= fim) {
          instances.push({
            ...lancamento,
            id: generateId(),
            data: new Date(current),
            ehRecorrente: true,
            grupoRecorrenciaId: grupoId,
            status: current.getTime() === baseDate.getTime() ? lancamento.status : 'Pendente',
          });
          // Avançar 1 mês mantendo o dia
          current = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
        }

        set((state) => ({ lancamentos: [...state.lancamentos, ...instances] }));
        upsertLancamentos(instances).catch(() => {});
      },

      /**
       * Gera N lançamentos mensais para uma venda parcelada.
       * Cada parcela é um LancamentoFinanceiro individual com status 'Pendente',
       * vinculado à venda via vendaId/parcelaNumero/totalParcelas.
       * Reutiliza a infraestrutura de grupoRecorrenciaId existente.
       */
      addLancamentosParceladosParaVenda: (params) => {
        const grupoId = `venda-${params.vendaId}`;
        const instances: LancamentoFinanceiro[] = [];
        const baseDate = new Date(params.dataPrimeiraParcela);

        for (let i = 1; i <= params.numeroParcelas; i++) {
          // Calcular data da parcela mantendo o dia, ajustando overflow
          const targetMonth = baseDate.getMonth() + (i - 1);
          const targetYear = baseDate.getFullYear() + Math.floor(targetMonth / 12);
          const normalizedMonth = targetMonth % 12;
          const lastDayOfMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
          const safeDay = Math.min(baseDate.getDate(), lastDayOfMonth);
          const parcelaDate = new Date(targetYear, normalizedMonth, safeDay);

          instances.push({
            id: generateId(),
            tipo: 'Recebemos',
            classificacao: 'Venda de Moto (Parcela)',
            descricao: `Parcela ${i}/${params.numeroParcelas} — ${params.modelo} (${params.motoChassi}) — ${params.compradorNome}`,
            valor: params.valorParcela,
            data: parcelaDate,
            status: 'Pendente',
            categoria: 'Variável',
            centroCusto: 'Comercial',
            formaPagamento: 'Transferência',
            motoChassi: params.motoChassi,
            funcionarioResponsavelId: params.funcionarioResponsavelId,
            ehRecorrente: true,
            grupoRecorrenciaId: grupoId,
            vendaId: params.vendaId,
            parcelaNumero: i,
            totalParcelas: params.numeroParcelas,
          });
        }

        set((state) => ({ lancamentos: [...state.lancamentos, ...instances] }));
        upsertLancamentos(instances).catch(() => {});
      },

      /**
       * Atualiza todas as instâncias FUTURAS (status Pendente ou Previsto) de um
       * grupo de recorrência. Instâncias já pagas/recebidas não são alteradas.
       */
      updateGrupoRecorrenciaFuturo: (grupoId, data) => {
        const lancamentosAlterados: LancamentoFinanceiro[] = [];
        set((state) => {
          const updatedLancamentos = state.lancamentos.map((l) => {
            if (
              l.grupoRecorrenciaId === grupoId &&
              (l.status === 'Pendente' || l.status === 'Previsto')
            ) {
              const updated = { ...l, ...data };
              lancamentosAlterados.push(updated);
              return updated;
            }
            return l;
          });
          return { lancamentos: updatedLancamentos };
        });
        // Persistir no Supabase (se configurado)
        if (lancamentosAlterados.length > 0) {
          upsertLancamentos(lancamentosAlterados).catch(() => {});
        }
        // Forçar persistência imediata no localStorage via Zustand persist
        // O middleware persist detecta mudanças no estado e escreve automaticamente,
        // mas garantimos que o estado foi atualizado corretamente
      },

      /**
       * Muda apenas o DIA do mês em todas as instâncias futuras (Pendente/Previsto)
       * de um grupo recorrente, preservando o mês e ano originais de cada lançamento.
       * Ex: se novoDia = 15, um lançamento de 2026-11-10 vira 2026-11-15,
       * e outro de 2026-12-10 vira 2026-12-15. Nunca colapsa todos na mesma data.
       * Se o dia exceder os dias do mês alvo, usa o último dia daquele mês.
       */
      updateDiaGrupoRecorrenciaFuturo: (grupoId, novoDia) => {
        const lancamentosAlterados: LancamentoFinanceiro[] = [];
        set((state) => ({
          lancamentos: state.lancamentos.map((l) => {
            if (
              l.grupoRecorrenciaId !== grupoId ||
              (l.status !== 'Pendente' && l.status !== 'Previsto')
            ) {
              return l;
            }
            const antiga = l.data instanceof Date ? l.data : new Date(l.data);
            const ano = antiga.getFullYear();
            const mes = antiga.getMonth();
            // Último dia válido do mês alvo (ex: dia 31 num mês de 30 dias → 30)
            const ultimoDiaDoMes = new Date(ano, mes + 1, 0).getDate();
            const diaSeguro = Math.min(novoDia, ultimoDiaDoMes);
            const novaData = new Date(ano, mes, diaSeguro);
            // Preservar horário original se houver
            novaData.setHours(antiga.getHours(), antiga.getMinutes(), antiga.getSeconds(), antiga.getMilliseconds());
            const updated = { ...l, data: novaData };
            lancamentosAlterados.push(updated);
            return updated;
          }),
        }));
        // Persistir no Supabase
        if (lancamentosAlterados.length > 0) {
          upsertLancamentos(lancamentosAlterados).catch(() => {});
        }
      },

      /**
       * Remove todas as instâncias FUTURAS (status Pendente ou Previsto) de um
       * grupo de recorrência. Instâncias já pagas/recebidas são preservadas.
       */
      removeGrupoRecorrenciaFuturo: (grupoId) => {
        const toRemove = get().lancamentos.filter(
          (l) =>
            l.grupoRecorrenciaId === grupoId &&
            (l.status === 'Pendente' || l.status === 'Previsto')
        );
        set((state) => ({
          lancamentos: state.lancamentos.filter(
            (l) =>
              !(
                l.grupoRecorrenciaId === grupoId &&
                (l.status === 'Pendente' || l.status === 'Previsto')
              )
          ),
        }));
        // Persist deletions to Supabase so removed lancamentos don't reappear on sync
        if (toRemove.length > 0) {
          deleteLancamentosByGrupo(grupoId).catch((err) =>
            console.error('[Store] removeGrupoRecorrenciaFuturo persist error:', err)
          );
        }
      },

      /** Remove lancamentos de salario/comissao vinculados a um contrato especifico de um funcionario */
      removeLancamentosContratoFuncionario: (funcionarioId: string, contratoId: string) => {
        const grupoSalario = `salario-${funcionarioId}-contrato-${contratoId}`;
        const grupoComissao = `comissao-${funcionarioId}-contrato-${contratoId}`;
        get().removeGrupoRecorrenciaFuturo(grupoSalario);
        get().removeGrupoRecorrenciaFuturo(grupoComissao);
      },

      /** Remove lancamentos legados de comissao sem contratoId vinculado (path antigo) */
      limparComissoesLegadas: (funcionarioId: string) => {
        const state = get();
        const func = state.funcionarios.find((f) => f.id === funcionarioId);
        if (!func) return;
        const nomeNorm = func.nome.normalize('NFD').replace(/[̀-ͯ]/g, '');
        const legados = state.lancamentos.filter((l) => {
          if (l.funcionarioResponsavelId !== funcionarioId) return false;
          if (l.contratoId) return false; // tem contratoId = novo formato, manter
          const classif = (l.classificacao || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
          const desc = (l.descricao || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
          const isComissao = classif.toLowerCase().includes('comiss') || desc.toLowerCase().includes('comiss');
          const isFunc = classif.includes(nomeNorm) || desc.includes(nomeNorm);
          return isComissao && isFunc && (l.status === 'Pendente' || l.status === 'Previsto');
        });
        if (legados.length > 0) {
          const idsToRemove = new Set(legados.map((l) => l.id));
          set((s) => ({
            lancamentos: s.lancamentos.filter((l) => !idsToRemove.has(l.id)),
          }));
        }
      },

      /**
       * Retorna lançamentos fixos pendentes do mês corrente que precisam de
       * confirmação de pagamento/recebimento. Usado para alertas de fechamento.
       */
      getPendenciasFimMes: () => {
        const { lancamentos } = get();
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        return lancamentos.filter(
          (l) =>
            l.categoria === 'Fixo' &&
            l.status === 'Pendente' &&
            new Date(l.data).getMonth() === currentMonth &&
            new Date(l.data).getFullYear() === currentYear
        );
      },

      /**
       * Retorna parcelas de venda pendentes de confirmação no mês corrente.
       * Usado para alertas de fechamento específicos de parcelamento.
       */
      getPendenciasParcelasFimMes: () => {
        const { lancamentos } = get();
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        return lancamentos.filter(
          (l) =>
            l.vendaId != null &&
            l.parcelaNumero != null &&
            l.status === 'Pendente' &&
            new Date(l.data).getMonth() === currentMonth &&
            new Date(l.data).getFullYear() === currentYear
        );
      },

      /**
       * Conta parcelas recebidas e total de parcelas para uma venda específica.
       * Usado na tabela de vendas para mostrar progresso do parcelamento.
       */
      getParcelasRecebidasPorVenda: (vendaId: string) => {
        const { lancamentos } = get();
        const parcelas = lancamentos.filter(
          (l) => l.vendaId === vendaId && l.parcelaNumero != null
        );
        const recebidas = parcelas.filter((l) => l.status === 'Recebido').length;
        return { total: parcelas.length, recebidas };
      },

      /**
       * Verifica se estamos nos últimos 3 dias úteis do mês corrente.
       * Considera sábados e domingos como não-úteis.
       */
      isPeriodoFechamentoMes: () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        // Último dia do mês
        const lastDay = new Date(year, month + 1, 0);
        // Contar 3 dias úteis retroativos a partir do último dia
        let uteisContados = 0;
        const check = new Date(lastDay);
        while (uteisContados < 3) {
          const dow = check.getDay();
          if (dow !== 0 && dow !== 6) {
            uteisContados++;
          }
          if (uteisContados < 3) {
            check.setDate(check.getDate() - 1);
          }
        }
        // Se hoje >= data do 3º dia útil contado retroativamente, estamos no período
        check.setHours(0, 0, 0, 0);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return today >= check;
      },

      // --- Computed Selectors ---

      /**
       * Soma do valorMensalTotal de todos os contratos ativos.
       */
      getReceitaRecorrente: () => {
        const { contratos } = get();
        return contratos
          .filter((c) => c.status === 'Ativo')
          .reduce((acc, c) => {
            const extrasTotal = (c.locacoesExtras || []).reduce((a, e) => a + e.valorMensal, 0);
            return acc + c.valorMensalTotal + extrasTotal;
          }, 0);
      },

      /**
       * Entradas (Recebemos/Pago) - Saídas (Pagamos/Pago).
       * Exclui CAPEX do resultado operacional mas inclui no fluxo de caixa.
       * Para saldo de caixa puro, consideramos tudo que foi pago/recebido.
       */
      getSaldoCaixa: () => {
        const { lancamentos } = get();
        return lancamentos.reduce((acc, l) => {
          if (l.status === 'Pago' || l.status === 'Recebido') {
            return l.tipo === 'Recebemos' ? acc + l.valor : acc - l.valor;
          }
          return acc;
        }, 0);
      },

      /**
       * Caixa Disponível / Custo Operacional Médio (últimos 3 meses).
       * Se custo médio for 0, retorna Infinity ou 0 dependendo da preferência.
       */
      getRunway: () => {
        const { lancamentos, getSaldoCaixa } = get();
        const saldo = getSaldoCaixa();

        const now = new Date();
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

        const despesasRecentes = lancamentos.filter(
          (l) =>
            l.tipo === 'Pagamos' &&
            l.status === 'Pago' &&
            new Date(l.data) >= threeMonthsAgo &&
            !l.ehInvestimento // CAPEX/investimentos não entram no custo operacional
        );

        const totalDespesas3Meses = despesasRecentes.reduce((acc, l) => acc + l.valor, 0);
        const mediaMensal = totalDespesas3Meses / 3;

        if (mediaMensal === 0) return 0;
        return saldo / mediaMensal;
      },

      /**
       * Motos em Contrato / Total de Motos de Locação (Rental Models).
       * Estoque parado (StockOnly) não conta para taxa de utilização da frota ativa.
       */
      getTaxaUtilizacao: () => {
        const { motos } = get();
        const fleetMotos = motos.filter((m) => isRentalModel(m.modelo));
        if (fleetMotos.length === 0) return 0;

        const utilized = fleetMotos.filter((m) => m.status === 'Em Contrato').length;
        return utilized / fleetMotos.length;
      },

      /**
       * Qtd de motos necessárias para cobrir custos fixos + variáveis.
       * Fórmula simplificada: Custo Fixo Mensal / (Receita Média por Moto - Custo Variável por Moto)
       * Como não temos custo variável por moto explícito no modelo global,
       * usamos uma aproximação baseada na receita recorrente e qtd de motos ativas.
       */
      getPontoEquilibrio: () => {
        const { contratos, lancamentos, motos } = get();
        const contratosAtivos = contratos.filter((c) => c.status === 'Ativo');

        // Receita média por moto ativa (incluindo locacoesExtras)
        const totalMotosAtivas = contratosAtivos.reduce((acc, c) => acc + c.motosVinculadas.length, 0);
        const receitaRecorrente = contratosAtivos.reduce((acc, c) => {
          const extras = (c.locacoesExtras || []).reduce((s, e) => s + (e.valorMensal || 0), 0);
          return acc + (c.valorMensalTotal || 0) + extras;
        }, 0);

        if (totalMotosAtivas === 0) return 0;
        const receitaPorMoto = receitaRecorrente / totalMotosAtivas;

        // Custo Fixo Mensal (média últimos 3 meses, categoria Fixo)
        const now = new Date();
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        const custosFixos = lancamentos
          .filter(
            (l) =>
              l.tipo === 'Pagamos' &&
              l.status === 'Pago' &&
              l.categoria === 'Fixo' &&
              new Date(l.data) >= threeMonthsAgo
          )
          .reduce((acc, l) => acc + l.valor, 0);
        const custoFixoMensal = custosFixos / 3;

        if (receitaPorMoto === 0) return 0;

        // Ponto de equilíbrio em quantidade de motos
        return Math.ceil(custoFixoMensal / receitaPorMoto);
      },

      /**
       * Despesas Pagas no mês corrente (Pagamos com status Pago, exclui CAPEX).
       */
      getDespesasPagasMes: () => {
        const { lancamentos } = get();
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        return lancamentos
          .filter(
            (l) =>
              l.tipo === 'Pagamos' &&
              l.status === 'Pago' &&
              !l.ehInvestimento &&
              new Date(l.data).getMonth() === currentMonth &&
              new Date(l.data).getFullYear() === currentYear
          )
          .reduce((acc, l) => acc + l.valor, 0);
      },

      /**
       * Resultado Líquido Operacional = Receita - Despesas (exclui CAPEX/ehInvestimento).
       */
      getResultadoLiquidoOperacional: () => {
        const { lancamentos } = get();
        const recebidos = lancamentos
          .filter((l) => l.status === 'Recebido')
          .reduce((acc, l) => acc + l.valor, 0);
        const pagos = lancamentos
          .filter((l) => l.status === 'Pago' && !l.ehInvestimento)
          .reduce((acc, l) => acc + l.valor, 0);
        return recebidos - pagos;
      },

      /**
       * % Receita Previsível = (Receita Recorrente / Total Receita Recebida) * 100.
       */
      getPercentualReceitaPrevisivel: () => {
        const { lancamentos, getReceitaRecorrente } = get();
        const totalReceita = lancamentos
          .filter((l) => l.tipo === 'Recebemos' && l.status === 'Recebido')
          .reduce((acc, l) => acc + l.valor, 0);
        if (totalReceita === 0) return 0;
        return (getReceitaRecorrente() / totalReceita) * 100;
      },

      /**
       * Receita Fixa do mês corrente: lançamentos Recebemos com categoria 'Fixo'
       * ou vinculados a contrato (receita recorrente previsível).
       */
      getReceitaFixaMes: (mes?: string) => {
        const { lancamentos } = get();
        const targetMes = mes || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const [year, month] = targetMes.split('-').map(Number);
        return lancamentos
          .filter(
            (l) =>
              l.tipo === 'Recebemos' &&
              l.status === 'Recebido' &&
              new Date(l.data).getMonth() === month - 1 &&
              new Date(l.data).getFullYear() === year &&
              l.categoria === 'Fixo'
          )
          .reduce((acc, l) => acc + l.valor, 0);
      },

      /**
       * Receita Fixa Prevista para o mês corrente: lançamentos Recebemos com categoria 'Fixo'
       * ou vinculados a contrato, com status 'Previsto' ou 'Pendente'. Representa o valor
       * que ainda deve ser recebido de fontes previsíveis neste mês.
       */
      getReceitaFixaPrevistaMes: (mes?: string) => {
        const { lancamentos } = get();
        const targetMes = mes || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const [year, month] = targetMes.split('-').map(Number);
        return lancamentos
          .filter(
            (l) =>
              l.tipo === 'Recebemos' &&
              (l.status === 'Previsto' || l.status === 'Pendente') &&
              new Date(l.data).getMonth() === month - 1 &&
              new Date(l.data).getFullYear() === year &&
              l.categoria === 'Fixo'
          )
          .reduce((acc, l) => acc + l.valor, 0);
      },

      /**
       * Previsão de Despesas Fixas: soma dos lançamentos 'Pagamos' com categoria 'Fixo'
       * e status 'Previsto' ou 'Pendente' para o mês selecionado. Representa as despesas
       * fixas já cadastradas que ainda serão pagas neste mês.
       */
      getPrevisaoDespesasFixas: (mes?: string) => {
        const { lancamentos } = get();
        const targetMes = mes || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const [year, month] = targetMes.split('-').map(Number);
        return lancamentos
          .filter(
            (l) =>
              l.tipo === 'Pagamos' &&
              l.categoria === 'Fixo' &&
              (l.status === 'Previsto' || l.status === 'Pendente') &&
              new Date(l.data).getMonth() === month - 1 &&
              new Date(l.data).getFullYear() === year
          )
          .reduce((acc, l) => acc + l.valor, 0);
      },

      /**
       * Resultado Previsto: Receita Fixa (contratos + receitas previsíveis) menos
       * Previsão de Despesas Fixas. Indica quanto sobrará das receitas garantidas
       * após pagar as despesas fixas comprometidas do mês.
       */
      getResultadoPrevisto: (mes?: string) => {
        const { getReceitaFixaMes, getReceitaFixaPrevistaMes, getPrevisaoDespesasFixas } = get();
        return (getReceitaFixaMes(mes) + getReceitaFixaPrevistaMes(mes)) - getPrevisaoDespesasFixas(mes);
      },

      /**
       * Total de Receitas do mês corrente: soma de todos os lançamentos 'Recebemos'
       * com status 'Recebido' no mês atual (fixas + variáveis).
       */
      getTotalReceitasMes: () => {
        const { lancamentos } = get();
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        return lancamentos
          .filter(
            (l) =>
              l.tipo === 'Recebemos' &&
              l.status === 'Recebido' &&
              new Date(l.data).getMonth() === currentMonth &&
              new Date(l.data).getFullYear() === currentYear
          )
          .reduce((acc, l) => acc + l.valor, 0);
      },

      /**
       * Total de Despesas do mês corrente: soma de todos os lançamentos 'Pagamos'
       * com status 'Pago' no mês atual (exclui CAPEX).
       */
      getTotalDespesasMes: () => {
        const { lancamentos } = get();
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        return lancamentos
          .filter(
            (l) =>
              l.tipo === 'Pagamos' &&
              l.status === 'Pago' &&
              !l.ehInvestimento &&
              new Date(l.data).getMonth() === currentMonth &&
              new Date(l.data).getFullYear() === currentYear
          )
          .reduce((acc, l) => acc + l.valor, 0);
      },

      /**
       * Resultado da Empresa no mês: Total Receitas − Total Despesas.
       * Diferente do Resultado Líquido Operacional por incluir todas as categorias.
       */
      getResultadoMes: () => {
        const { getTotalReceitasMes, getTotalDespesasMes } = get();
        return getTotalReceitasMes() - getTotalDespesasMes();
      },

      /**
       * Evolução Financeira últimos 6 meses: entradas vs saídas vs resultado.
       */
      getEvolucaoFinanceira: () => {
        const { lancamentos } = get();
        const months: { mes: string; entradas: number; saidas: number; resultado: number }[] = [];
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const m = d.getMonth();
          const y = d.getFullYear();
          const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

          const entradas = lancamentos
            .filter(
              (l) =>
                l.tipo === 'Recebemos' &&
                l.status === 'Recebido' &&
                new Date(l.data).getMonth() === m &&
                new Date(l.data).getFullYear() === y
            )
            .reduce((acc, l) => acc + l.valor, 0);

          const saidas = lancamentos
            .filter(
              (l) =>
                l.tipo === 'Pagamos' &&
                l.status === 'Pago' &&
                !l.ehInvestimento &&
                new Date(l.data).getMonth() === m &&
                new Date(l.data).getFullYear() === y
            )
            .reduce((acc, l) => acc + l.valor, 0);

          months.push({ mes: label, entradas, saidas, resultado: entradas - saidas });
        }
        return months;
      },

      /**
       * Composição da Receita: Recorrente vs Variável vs Extraordinária.
       */
      getComposicaoReceita: () => {
        const { contratos, lancamentos } = get();
        const receitaRecorrente = contratos
          .filter((c) => c.status === 'Ativo')
          .reduce((acc, c) => {
            const extras = (c.locacoesExtras || []).reduce((s, e) => s + (e.valorMensal || 0), 0);
            return acc + (c.valorMensalTotal || 0) + extras;
          }, 0);

        const receitaVariavel = lancamentos
          .filter(
            (l) =>
              l.tipo === 'Recebemos' &&
              l.status === 'Recebido' &&
              l.categoria === 'Variável'
          )
          .reduce((acc, l) => acc + l.valor, 0);

        const receitaExtra = lancamentos
          .filter(
            (l) =>
              l.tipo === 'Recebemos' &&
              l.status === 'Recebido' &&
              l.categoria === 'Extraordinário'
          )
          .reduce((acc, l) => acc + l.valor, 0);

        // If recorrente is zero and others too, avoid empty chart
        if (receitaRecorrente === 0 && receitaVariavel === 0 && receitaExtra === 0) {
          return [{ nome: 'Sem dados', valor: 1 }];
        }

        return [
          { nome: 'Recorrente', valor: receitaRecorrente },
          { nome: 'Variável', valor: receitaVariavel },
          { nome: 'Extraordinária', valor: receitaExtra },
        ].filter((d) => d.valor > 0);
      },

      /**
       * Visão de Caixa: Caixa Atual vs Comprometido vs Projetado.
       */
      getVisaoCaixa: () => {
        const { lancamentos, getSaldoCaixa } = get();
        const caixaAtual = getSaldoCaixa();

        const comprometido = lancamentos
          .filter((l) => l.status === 'Pendente' && l.tipo === 'Pagamos')
          .reduce((acc, l) => acc + l.valor, 0);

        const projetado = lancamentos
          .filter((l) => l.status === 'Previsto' && l.tipo === 'Recebemos')
          .reduce((acc, l) => acc + l.valor, 0);

        return [
          { nome: 'Caixa Atual', atual: caixaAtual, comprometido: 0, projetado: 0 },
          { nome: 'Comprometido', atual: 0, comprometido, projetado: 0 },
          { nome: 'Projetado', atual: 0, comprometido: 0, projetado },
        ];
      },

      // --- Visita Técnica Selectors ---
      getVisitasTecnicasMes: (mes?: string) => {
        const { lancamentos } = get();
        let visitas = lancamentos.filter((l) => l.ehVisitaTecnico === true);
        if (mes) {
          visitas = visitas.filter((l) => {
            const d = new Date(l.data);
            const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            return ym === mes;
          });
        }
        return visitas.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      },

      getCustoTotalVisitasMes: (mes?: string) => {
        const { getVisitasTecnicasMes } = get();
        return getVisitasTecnicasMes(mes).reduce((acc, l) => acc + l.valor, 0);
      },

      getCustoVisitasPorCategoria: (mes?: string) => {
        const { getVisitasTecnicasMes } = get();
        const visitas = getVisitasTecnicasMes(mes);
        const result: Record<string, number> = {};
        for (const v of visitas) {
          const cat = v.categoriaCustoVisita || 'Outros';
          result[cat] = (result[cat] || 0) + v.valor;
        }
        return result;
      },

      getVisitasPorContrato: (contratoId: string) => {
        const { lancamentos } = get();
        return lancamentos
          .filter((l) => l.ehVisitaTecnico === true && l.contratoId === contratoId)
          .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      },

      getValorMauUsoPendente: () => {
        const { getCobrancasMauUsoMes } = get();
        return getCobrancasMauUsoMes()
          .filter((l) => l.status === 'Pendente' || l.status === 'Previsto')
          .reduce((acc, l) => acc + l.valor, 0);
      },

      getValorMauUsoPago: () => {
        const { getCobrancasMauUsoMes } = get();
        return getCobrancasMauUsoMes()
          .filter((l) => l.status === 'Recebido' || l.status === 'Pago')
          .reduce((acc, l) => acc + l.valor, 0);
      },

      getValorMauUsoPendenteCount: () => {
        const { getCobrancasMauUsoMes } = get();
        return getCobrancasMauUsoMes()
          .filter((l) => l.status === 'Pendente' || l.status === 'Previsto').length;
      },

      getValorMauUsoPagoCount: () => {
        const { getCobrancasMauUsoMes } = get();
        return getCobrancasMauUsoMes()
          .filter((l) => l.status === 'Recebido' || l.status === 'Pago').length;
      },

      getVisitasPorTecnico: (mes?: string) => {
        const { getVisitasTecnicasMes } = get();
        const visitas = getVisitasTecnicasMes(mes);
        const result: Record<string, { count: number; total: number }> = {};
        for (const v of visitas) {
          const tec = v.tecnicoResponsavel || 'Não informado';
          if (!result[tec]) result[tec] = { count: 0, total: 0 };
          result[tec].count += 1;
          result[tec].total += v.valor;
        }
        return result;
      },

      // --- Mau Uso Selectors ---
      getCobrancasMauUsoMes: (mes?: string) => {
        const { lancamentos } = get();
        let cobrancas = lancamentos.filter((l) => l.ehCobrancaMauUso === true);
        if (mes) {
          cobrancas = cobrancas.filter((l) => {
            const d = new Date(l.data);
            const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            return ym === mes;
          });
        }
        // Deduplicar por visitaMauUsoId — manter apenas a primeira ocorrência de cada visita
        const seen = new Set<string>();
        const unique = cobrancas.filter((l) => {
          const key = l.visitaMauUsoId || l.id;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return unique.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      },

      getLucroMauUsoMes: (mes?: string) => {
        const { getLucroMauUsoDetalhado } = get();
        // Calcular em tempo real (não usar lucroMauUso congelado)
        return getLucroMauUsoDetalhado(mes).reduce((acc, item) => acc + item.lucro, 0);
      },

      getLucroMauUsoDetalhado: (mes?: string) => {
        const { getCobrancasMauUsoMes, percentualImpostoMauUso, lancamentos, funcionarios } = get();
        const pctImposto = percentualImpostoMauUso ?? 10; // fallback para dados antigos sem esse campo
        return getCobrancasMauUsoMes(mes).map((l) => {
          const valorCobrado = l.valor || 0;
          // Imposto só sobre o valor recebido do cliente (custo da empresa já tem imposto embutido)
          const imposto = valorCobrado * (pctImposto / 100);
          // Custo dos itens: buscar o lançamento de visita vinculado (custo real da empresa)
          const visitaOrigem = lancamentos.find((v) => v.id === l.visitaMauUsoId);
          const custoItens = visitaOrigem ? visitaOrigem.valor : (l.custoItensMauUso || 0);
          const tecnicoNome = visitaOrigem?.tecnicoResponsavel || '';
          const tecnico = funcionarios.find((f) => f.nome === tecnicoNome);
          const pctComissao = tecnico?.percentualComissaoManutencao || 0;
          const basePosImposto = valorCobrado - imposto;
          const comissaoTecnico = basePosImposto * (pctComissao / 100);
          const lucro = valorCobrado - imposto - custoItens - comissaoTecnico;
          return {
            id: l.id,
            descricao: l.descricao,
            data: l.data,
            valorCobrado,
            imposto,
            custoItens,
            comissaoTecnico,
            pctComissao,
            tecnicoNome,
            lucro,
            status: l.status,
            visitaMauUsoId: l.visitaMauUsoId,
          };
        });
      },

      gerarCobrancaMauUso: (visitaLancamento: LancamentoFinanceiro) => {
        const { lancamentos, percentualImpostoMauUso, funcionarios, addLancamento } = get();
        const pctImposto = percentualImpostoMauUso ?? 10; // fallback para dados antigos
        // Verificar se já existe cobrança para esta visita (dedup robusta)
        const jaExiste = lancamentos.some((l) => l.visitaMauUsoId === visitaLancamento.id && l.ehCobrancaMauUso);
        if (jaExiste) return;

        const valorCobrar = visitaLancamento.valorCobrarCliente || 0;
        if (valorCobrar <= 0) return;

        // Imposto só sobre o valor recebido do cliente (custo da empresa já tem imposto embutido nos itens)
        const imposto = valorCobrar * (pctImposto / 100);
        const custoItens = visitaLancamento.valor; // O custo da visita é o custo dos itens
        const tecnicoNome = visitaLancamento.tecnicoResponsavel || '';
        const tecnico = funcionarios.find((f) => f.nome === tecnicoNome);
        const pctComissao = tecnico?.percentualComissaoManutencao || 0;
        const basePosImposto = valorCobrar - imposto;
        const comissaoTecnico = basePosImposto * (pctComissao / 100);
        const lucro = valorCobrar - imposto - custoItens - comissaoTecnico;

        const cobranca: LancamentoFinanceiro = {
          id: generateId(),
          tipo: 'Recebemos',
          valor: valorCobrar,
          data: new Date(visitaLancamento.data),
          descricao: `Cobrança Mau Uso - ${visitaLancamento.descricao}`,
          classificacao: 'Cobrança Mau Uso',
          categoria: 'Variável',
          centroCusto: 'Operacional',
          formaPagamento: 'PIX',
          status: 'Pendente',
          ehCobrancaMauUso: true,
          visitaMauUsoId: visitaLancamento.id,
          custoItensMauUso: custoItens,
          lucroMauUso: lucro,
          contratoId: visitaLancamento.contratoId,
        };

        addLancamento(cobranca);
      },

      // --- ComissaoSlice ---
      percentualImposto: 10,
      percentualImpostoMauUso: 10, // % de imposto específico para cobranças de mau uso (só sobre o valor recebido do cliente)
      percentualComissaoComercial: 8,
      percentualComissaoOperacional: 5,
      setPercentualImposto: (v) => {
        set({ percentualImposto: v });
        upsertConfig('percentualImposto', v).catch((err) => console.error('[Store] setPercentualImposto persist error:', err));
      },
      setPercentualImpostoMauUso: (v) => {
        set({ percentualImpostoMauUso: v });
        upsertConfig('percentualImpostoMauUso', v).catch((err) => console.error('[Store] setPercentualImpostoMauUso persist error:', err));
      },
      setPercentualComissaoComercial: (v) => {
        set({ percentualComissaoComercial: v });
        upsertConfig('percentualComissaoComercial', v).catch((err) => console.error('[Store] setPercentualComissaoComercial persist error:', err));
      },
      setPercentualComissaoOperacional: (v) => {
        set({ percentualComissaoOperacional: v });
        upsertConfig('percentualComissaoOperacional', v).catch((err) => console.error('[Store] setPercentualComissaoOperacional persist error:', err));
      },

      // --- Comissão Global Selectors (NOVA LÓGICA: baseada em funcionários/sócios) ---
      getFaturamentoBrutoMes: (mes?: string) => {
        const { contratos } = get();
        const targetMes = mes || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const [year, month] = targetMes.split('-').map(Number);
        const primeiroDiaMes = new Date(year, month - 1, 1);
        const ultimoDiaMes = new Date(year, month, 0);

        return contratos
          .filter((c) => {
            if (c.status !== 'Ativo') return false;
            const inicio = c.dataInicio instanceof Date ? c.dataInicio : new Date(c.dataInicio);
            if (inicio > ultimoDiaMes) return false;
            if (c.dataTermino) {
              const termino = c.dataTermino instanceof Date ? c.dataTermino : new Date(c.dataTermino);
              if (termino < primeiroDiaMes) return false;
            }
            return true;
          })
          .reduce((acc, c) => {
            const extras = (c.locacoesExtras || []).reduce((s, e) => s + (e.valorMensal || 0), 0);
            return acc + (c.valorMensalTotal || 0) + extras;
          }, 0);
      },

      getReceitaVariavelMes: (mes?: string) => {
        const { lancamentos } = get();
        const targetMes = mes || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        return lancamentos
          .filter((l) => {
            if (l.tipo !== 'Recebemos') return false;
            if (l.categoria !== 'Variável') return false;
            const d = l.data instanceof Date ? l.data : new Date(l.data);
            const lMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            return lMes === targetMes;
          })
          .reduce((acc, l) => acc + l.valor, 0);
      },

      getReceitaTotalMes: (mes?: string) => {
        const { getFaturamentoBrutoMes, getReceitaVariavelMes } = get();
        return getFaturamentoBrutoMes(mes) + getReceitaVariavelMes(mes);
      },

      getImpostoMes: (mes?: string) => {
        const { getFaturamentoBrutoMes, percentualImposto } = get();
        return getFaturamentoBrutoMes(mes) * (percentualImposto / 100);
      },

      getBasePosImpostoMes: (mes?: string) => {
        const { getFaturamentoBrutoMes, getImpostoMes } = get();
        return getFaturamentoBrutoMes(mes) - getImpostoMes(mes);
      },

      getDespesasTotaisMes: (mes?: string) => {
        const { lancamentos } = get();
        const targetMes = mes || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        return lancamentos
          .filter((l) => {
            if (l.tipo !== 'Pagamos') return false;
            if (l.ehInvestimento) return false;
            if (l.ehComissaoSocio || l.ehComissaoTecnico) return false;
            if (l.classificacao?.includes('Comissão') || l.classificacao?.includes('Pró-labore') || l.classificacao?.includes('Salário')) return false;
            const d = l.data instanceof Date ? l.data : new Date(l.data);
            const lMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            return lMes === targetMes;
          })
          .reduce((acc, l) => acc + l.valor, 0);
      },

      getBaseOperacionalMes: (mes?: string) => {
        const { getBasePosImpostoMes, getDespesasTotaisMes } = get();
        return Math.max(0, getBasePosImpostoMes(mes) - getDespesasTotaisMes(mes));
      },

      // Receita Recebida do mês (status 'Recebido')
      getReceitaRecebidaMes: (mes?: string) => {
        const { lancamentos } = get();
        const targetMes = mes || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        return lancamentos
          .filter((l) => {
            if (l.tipo !== 'Recebemos') return false;
            if (l.status !== 'Recebido') return false;
            const d = l.data instanceof Date ? l.data : new Date(l.data);
            const lMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            return lMes === targetMes;
          })
          .reduce((acc, l) => acc + l.valor, 0);
      },

      // Receita A Receber do mês (status 'Previsto' ou 'Pendente')
      getReceitaAReceberMes: (mes?: string) => {
        const { lancamentos } = get();
        const targetMes = mes || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        return lancamentos
          .filter((l) => {
            if (l.tipo !== 'Recebemos') return false;
            if (l.status !== 'Previsto' && l.status !== 'Pendente') return false;
            const d = l.data instanceof Date ? l.data : new Date(l.data);
            const lMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            return lMes === targetMes;
          })
          .reduce((acc, l) => acc + l.valor, 0);
      },

      // Faturamento Bruto Recebido (contratos com lançamentos recebidos)
      getFaturamentoBrutoRecebidoMes: (mes?: string) => {
        const { lancamentos, contratos } = get();
        const targetMes = mes || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const contratoIdsAtivos = new Set(contratos.filter((c) => c.status === 'Ativo').map((c) => c.id));
        return lancamentos
          .filter((l) => {
            if (l.tipo !== 'Recebemos') return false;
            if (l.status !== 'Recebido') return false;
            if (!l.contratoId || !contratoIdsAtivos.has(l.contratoId)) return false;
            const d = l.data instanceof Date ? l.data : new Date(l.data);
            const lMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            return lMes === targetMes;
          })
          .reduce((acc, l) => acc + l.valor, 0);
      },

      // Faturamento Bruto A Receber (contratos com lançamentos previstos/pendentes)
      getFaturamentoBrutoAReceberMes: (mes?: string) => {
        const { lancamentos, contratos } = get();
        const targetMes = mes || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const contratoIdsAtivos = new Set(contratos.filter((c) => c.status === 'Ativo').map((c) => c.id));
        return lancamentos
          .filter((l) => {
            if (l.tipo !== 'Recebemos') return false;
            if (l.status !== 'Previsto' && l.status !== 'Pendente') return false;
            if (!l.contratoId || !contratoIdsAtivos.has(l.contratoId)) return false;
            const d = l.data instanceof Date ? l.data : new Date(l.data);
            const lMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            return lMes === targetMes;
          })
          .reduce((acc, l) => acc + l.valor, 0);
      },

      // Vendas de Motos por funcionário no mês
      getVendasMotosPorFuncionario: (mes?: string) => {
        const { lancamentos } = get();
        const targetMes = mes || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const result: Record<string, number> = {};
        for (const l of lancamentos) {
          if (l.classificacao !== 'Venda de Moto') continue;
          if (!l.funcionarioResponsavelId) continue;
          const d = l.data instanceof Date ? l.data : new Date(l.data);
          const lMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (lMes !== targetMes) continue;
          result[l.funcionarioResponsavelId] = (result[l.funcionarioResponsavelId] || 0) + l.valor;
        }
        return result;
      },

      // Comissão por funcionário (respeita origemComissao)
      getComissaoPorFuncionario: (mes?: string) => {
        const state = get();
        const { funcionarios, contratos, percentualImposto, getVendasMotosPorFuncionario } = state;
        const pctImp = percentualImposto || 10;
        const vendasPorFunc = getVendasMotosPorFuncionario(mes);
        // Filtra mes se fornecido
        const [mesNum, anoNum] = mes ? mes.split('-').map(Number) : [new Date().getMonth() + 1, new Date().getFullYear()];
        return funcionarios
          .filter((f) => f.ativo && f.origemComissao !== 'Nenhum' && (f.percentualComissaoContratos > 0 || Object.keys(f.comissaoPorContrato || {}).length > 0))
          .map((f) => {
            let valorTotal = 0;
            let baseTotal = 0;
            let pctEfetivo = 0;
            const origem = f.origemComissao || 'Contratos de Locação';
            // Comissao por contrato vinculado (nova logica)
            if (origem === 'Contratos de Locação' || origem === 'Ambos') {
              const contratosVinculados = (f.contratosVinculados || []).filter((cId) => {
                const c = contratos.find((ct) => ct.id === cId);
                return c && c.status === 'Ativo';
              });
              for (const cId of contratosVinculados) {
                const c = contratos.find((ct) => ct.id === cId);
                if (!c) continue;
                const pct = f.comissaoPorContrato?.[cId] ?? f.percentualComissaoContratos;
                if (pct <= 0) continue;
                const extras = (c.locacoesExtras || []).reduce((s, e) => s + (e.valorMensal || 0), 0);
                const baseContrato = ((c.valorMensalTotal || 0) + extras) * (1 - pctImp / 100);
                valorTotal += baseContrato * (pct / 100);
                baseTotal += baseContrato;
              }
              pctEfetivo = baseTotal > 0 ? (valorTotal / baseTotal) * 100 : 0;
            }
            // Comissao por vendas de motos
            if (origem === 'Vendas de Motos' || origem === 'Ambos') {
              const baseVendas = vendasPorFunc[f.id] || 0;
              // Usa percentual específico para manutenção/vendas se disponível, senão fallback para contratos
              const pctVendas = f.percentualComissaoManutencao > 0 ? f.percentualComissaoManutencao : f.percentualComissaoContratos;
              valorTotal += baseVendas * (pctVendas / 100);
              baseTotal += baseVendas;
            }
            return {
              funcionarioId: f.id,
              nome: f.nome,
              funcao: f.funcao,
              percentual: Math.round(pctEfetivo * 100) / 100,
              origemComissao: origem,
              baseCalculo: Math.round(baseTotal * 100) / 100,
              valor: Math.round(valorTotal * 100) / 100,
            };
          });
      },

      getComissaoComercialMes: (mes?: string) => {
        const { getComissaoPorFuncionario } = get();
        return getComissaoPorFuncionario(mes).reduce((acc, c) => acc + c.valor, 0);
      },

      getComissaoOperacionalMes: (_mes?: string) => 0, // Deprecated — agora é por funcionário

      // Resultado Final do Mês = Receita Total - Despesas - Imposto - Comissões
      getResultadoFinalMes: (mes?: string) => {
        const { getReceitaTotalMes, getDespesasTotaisMes, getImpostoMes, getComissaoComercialMes } = get();
        const receita = getReceitaTotalMes(mes);
        const despesas = getDespesasTotaisMes(mes);
        const imposto = getImpostoMes(mes);
        const comissoes = getComissaoComercialMes(mes);
        return receita - despesas - imposto - comissoes;
      },

      // Divisão societária do resultado final
      getDivisaoSocietaria: (mes?: string) => {
        const { funcionarios, getResultadoFinalMes } = get();
        const resultadoFinal = getResultadoFinalMes(mes);
        const socios = funcionarios.filter((f) => f.ativo && f.ehSocio && f.percentualEmpresa > 0);
        return socios.map((s) => ({
          funcionarioId: s.id,
          nome: s.nome,
          percentual: s.percentualEmpresa,
          valor: resultadoFinal * (s.percentualEmpresa / 100),
        }));
      },

      // Quadro final: quanto cada pessoa recebe no mês
      getQuadroRecebimentos: (mes?: string) => {
        const { funcionarios, getComissaoPorFuncionario, getDivisaoSocietaria, getLucroMauUsoDetalhado } = get();
        const comissoes = getComissaoPorFuncionario(mes);
        const divisao = getDivisaoSocietaria(mes);
        const lucroDetalhado = getLucroMauUsoDetalhado(mes);

        // Agrupar comissão de mau uso por técnico — preferir funcionarioId; fallback por nome para dados legados
        const mauUsoPorId: Record<string, { comissao: number; count: number; pctSoma: number }> = {};
        const mauUsoPorNome: Record<string, { comissao: number; count: number; pctSoma: number }> = {};
        for (const item of lucroDetalhado) {
          const entry = { comissao: item.comissaoTecnico, count: 1, pctSoma: item.pctComissao };
          // Indexar por ID quando disponível (lançamentos com funcionarioResponsavelId)
          if (item.funcionarioId) {
            if (!mauUsoPorId[item.funcionarioId]) mauUsoPorId[item.funcionarioId] = { comissao: 0, count: 0, pctSoma: 0 };
            mauUsoPorId[item.funcionarioId].comissao += entry.comissao;
            mauUsoPorId[item.funcionarioId].count += entry.count;
            mauUsoPorId[item.funcionarioId].pctSoma += entry.pctSoma;
          }
          // Fallback por nome para compatibilidade com registros antigos sem vínculo de ID
          const nomeKey = item.tecnicoNome || '';
          if (nomeKey) {
            if (!mauUsoPorNome[nomeKey]) mauUsoPorNome[nomeKey] = { comissao: 0, count: 0, pctSoma: 0 };
            mauUsoPorNome[nomeKey].comissao += entry.comissao;
            mauUsoPorNome[nomeKey].count += entry.count;
            mauUsoPorNome[nomeKey].pctSoma += entry.pctSoma;
          }
        }

        return funcionarios
          .filter((f) => f.ativo)
          .map((f) => {
            const salario = f.salario || 0;
            const comissaoContratos = comissoes.find((c) => c.funcionarioId === f.id)?.valor || 0;
            const participacao = divisao.find((d) => d.funcionarioId === f.id)?.valor || 0;
            // Comissão de mau uso: buscar por ID primeiro, fallback por nome
            const mauUso = mauUsoPorId[f.id] || mauUsoPorNome[f.nome] || { comissao: 0, count: 0, pctSoma: 0 };
            const comissaoMauUso = mauUso.comissao;
            const comissaoMauUsoCount = mauUso.count;
            const comissaoMauUsoPct = mauUso.count > 0 ? mauUso.pctSoma / mauUso.count : 0;
            const comissao = comissaoContratos + comissaoMauUso;
            return {
              funcionarioId: f.id,
              nome: f.nome,
              funcao: f.funcao,
              ehSocio: f.ehSocio,
              salario,
              comissao,
              comissaoMauUso,
              comissaoMauUsoCount,
              comissaoMauUsoPct,
              participacao,
              total: salario + comissao + participacao,
            };
          });
      },

      getComissoesGlobaisJaGeradas: (mes: string) => {
        const { lancamentos } = get();
        return lancamentos.some((l) => {
          const isComissaoGlobal = l.classificacao === 'Comissão Global Comercial' || l.classificacao === 'Comissão Global Operacional' || l.classificacao?.startsWith('Comissão ');
          if (!isComissaoGlobal) return false;
          const d = l.data instanceof Date ? l.data : new Date(l.data);
          const lMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          return lMes === mes;
        });
      },

      gerarLancamentosComissoesGlobais: (mes: string) => {
        const { getComissoesGlobaisJaGeradas, getComissaoPorFuncionario, funcionarios, addLancamento, contratos } = get();
        if (getComissoesGlobaisJaGeradas(mes)) {
          throw new Error('Lançamentos já gerados para este mês');
        }
        const [year, month] = mes.split('-').map(Number);
        const dataRef = new Date(year, month - 1, 15);
        const ultimoDiaMes = new Date(year, month, 0);

        // Filtrar contratos ativos E que têm vigência durante o mês selecionado
        const primeiroDiaMes = new Date(year, month - 1, 1);
        const contratosAtivosNoMes = contratos.filter(c => {
          if (c.status !== 'Ativo') return false;
          const inicio = c.dataInicio instanceof Date ? c.dataInicio : new Date(c.dataInicio);
          // Se o contrato começa depois do fim do mês, não conta
          if (inicio > ultimoDiaMes) return false;
          if (c.dataTermino) {
            const termino = c.dataTermino instanceof Date ? c.dataTermino : new Date(c.dataTermino);
            // Se o contrato termina antes do início do mês, não conta
            if (termino < primeiroDiaMes) return false;
          }
          return true;
        });

        // Calcular base de comissão apenas com contratos ativos no mês (incluindo extras)
        const pctImpostoGlobal = get().percentualImposto || 10;
        const basePosImpostoContratosAtivos = contratosAtivosNoMes.reduce((acc, c) => {
          const extras = (c.locacoesExtras || []).reduce((s, e) => s + (e.valorMensal || 0), 0);
          return acc + (c.valorMensalTotal || 0) + extras;
        }, 0) * (1 - pctImpostoGlobal / 100);

        const comissoes = getComissaoPorFuncionario(mes);

        for (const f of funcionarios.filter(func => func.ativo)) {
          const salario = f.salario || 0;

          // 1. Comissão (se houver) - respeita comissaoPorContrato individual quando configurado
          if (f.percentualComissaoContratos > 0 && f.origemComissao !== 'Nenhum' && f.origemComissao !== 'Vendas de Motos') {
            let valorComissao = 0;
            let descricaoComissao = '';
            let contratoVinculado: string | undefined;

            if (f.comissaoPorContrato && Object.keys(f.comissaoPorContrato).length > 0) {
              // Soma comissão individual por contrato ativo no mês
              for (const c of contratosAtivosNoMes) {
                const pctIndividual = f.comissaoPorContrato[c.id];
                if (pctIndividual && pctIndividual > 0) {
                  const extras = (c.locacoesExtras || []).reduce((s, e) => s + (e.valorMensal || 0), 0);
                  const baseContrato = ((c.valorMensalTotal || 0) + extras) * (1 - pctImpostoGlobal / 100);
                  valorComissao += baseContrato * (pctIndividual / 100);
                }
              }
              descricaoComissao = `Comissão ${f.nome} - % individual por contrato (${mes})`;
              // Vincula ao contrato com maior comissão individual
              const melhorContrato = contratosAtivosNoMes
                .filter(c => (f.comissaoPorContrato?.[c.id] || 0) > 0)
                .sort((a, b) => (f.comissaoPorContrato?.[b.id] || 0) - (f.comissaoPorContrato?.[a.id] || 0))[0];
              contratoVinculado = melhorContrato?.id;
            } else {
              // Fallback: percentual global sobre base total
              valorComissao = basePosImpostoContratosAtivos * (f.percentualComissaoContratos / 100);
              descricaoComissao = `Comissão ${f.nome} - ${f.percentualComissaoContratos}% sobre contratos ativos (${mes})`;
              const contratoPrincipal = contratosAtivosNoMes.sort((a, b) => (b.valorMensalTotal || 0) - (a.valorMensalTotal || 0))[0];
              contratoVinculado = contratoPrincipal?.id;
            }

            if (valorComissao > 0) {
              addLancamento({
                id: generateId(),
                tipo: 'Pagamos',
                valor: valorComissao,
                data: dataRef,
                descricao: descricaoComissao,
                classificacao: `Comissão ${f.nome}`,
                categoria: 'Fixo',
                centroCusto: 'Financeiro',
                formaPagamento: 'Transferência',
                status: 'Pendente',
                ehComissaoSocio: f.ehSocio,
                funcionarioResponsavelId: f.id,
                contratoId: contratoVinculado,
              });
            }
          }

          // 2. Salário ou Pró-labore (se houver) - sempre gerado se funcionário ativo
          if (salario > 0) {
            addLancamento({
              id: generateId(),
              tipo: 'Pagamos',
              valor: salario,
              data: dataRef,
              descricao: `${f.ehSocio ? 'Pró-labore' : 'Salário'} ${f.nome} (${mes})`,
              classificacao: f.ehSocio ? `Pró-labore ${f.nome}` : `Salário ${f.nome}`,
              categoria: 'Fixo',
              centroCusto: 'Financeiro',
              formaPagamento: 'Transferência',
              status: 'Pendente',
              funcionarioResponsavelId: f.id,
            });
          }

          // NOTA: Participação Societária NÃO é gerada automaticamente pois varia mensalmente
          // conforme desempenho e resultado final. Deve ser lançada manualmente se necessário.
        }
      },

      getComissoesPorContrato: (mes?: string) => {
        const { contratos, percentualImposto, getDespesasTotaisMes, getFaturamentoBrutoMes, getComissaoPorFuncionario } = get();
        const faturamentoTotal = getFaturamentoBrutoMes(mes);
        const basePosImpostoTotal = faturamentoTotal * (1 - percentualImposto / 100);
        const comissoes = getComissaoPorFuncionario(mes);

        return contratos
          .filter((c) => c.status === 'Ativo')
          .map((c) => {
            const extras = (c.locacoesExtras || []).reduce((s, e) => s + (e.valorMensal || 0), 0);
            const valorMensal = (c.valorMensalTotal || 0) + extras;
            const proporcao = faturamentoTotal > 0 ? valorMensal / faturamentoTotal : 0;
            const contribPorFunc = comissoes.map((cf) => ({
              nome: cf.nome,
              valor: basePosImpostoTotal * proporcao * (cf.percentual / 100),
            }));
            const clienteDoContrato = get().clientes.find((cl) => cl.id === c.clienteId);
            return {
              contratoId: c.id,
              nome: clienteDoContrato?.nome || c.numeroContrato || c.id,
              valorMensal,
              contribComercial: contribPorFunc.reduce((s, cf) => s + cf.valor, 0),
              contribOperacional: 0,
              contribPorFunc,
            };
          });
      },

      // --- FuncionarioSlice ---
      funcionarios: [
        { id: 'func-joao', nome: 'João', ativo: true, funcao: 'Comercial', salario: 2000, percentualEmpresa: 10, percentualComissaoContratos: 8, percentualComissaoManutencao: 0, origemComissao: 'Contratos de Locação' as const, ehSocio: true, observacoes: 'Sócio - Comissão 8% sobre aluguéis pós-imposto' },
        { id: 'func-william', nome: 'William', ativo: true, funcao: 'Técnico', salario: 0, percentualEmpresa: 0, percentualComissaoContratos: 0, percentualComissaoManutencao: 0, origemComissao: 'Nenhum' as const, ehSocio: false, observacoes: 'Técnico - Percentual de comissão a definir' },
        { id: 'func-murilo', nome: 'Murilo', ativo: true, funcao: 'Sócio', salario: 0, percentualEmpresa: 90, percentualComissaoContratos: 0, percentualComissaoManutencao: 0, origemComissao: 'Nenhum' as const, ehSocio: true, observacoes: 'Sócio majoritário - 90% da empresa' },
      ],
      getLancamentosPorFuncionario: (funcionarioId: string) => {
        const { lancamentos } = get();
        return lancamentos.filter((l) => l.funcionarioResponsavelId === funcionarioId);
      },

      getValorComissaoMensalFuncionario: (funcionarioId: string, mes?: string) => {
        const { funcionarios, getBasePosImpostoMes } = get();
        const func = funcionarios.find((f) => f.id === funcionarioId);
        if (!func || func.percentualComissaoContratos === 0) return 0;
        const basePosImposto = getBasePosImpostoMes(mes);
        return basePosImposto * (func.percentualComissaoContratos / 100);
      },

      syncLancamentosFuncionarioContrato: (funcionarioId: string, contratoId: string) => {
        const state = get();
        const func = state.funcionarios.find((f) => f.id === funcionarioId);
        const contrato = state.contratos.find((c) => c.id === contratoId);
        if (!func || !contrato || !func.ativo) return;

        const novosLancamentos: LancamentoFinanceiro[] = [];
        const inicio = contrato.dataInicio instanceof Date ? contrato.dataInicio : new Date(contrato.dataInicio);
        // Regra: se contrato não tem dataTermino, usar 24 meses a partir da dataInicio
        const fim = contrato.dataTermino
          ? (contrato.dataTermino instanceof Date ? contrato.dataTermino : new Date(contrato.dataTermino))
          : new Date(inicio.getFullYear() + 2, inicio.getMonth(), inicio.getDate());

        let current = new Date(inicio.getFullYear(), inicio.getMonth(), 15);
        if (current < inicio) current = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 15);

        const pctImposto = state.percentualImposto || 10;

        // 1. Salário / Pró-labore vinculado ao contrato
        if (func.salario > 0) {
          const grupoSalarioId = `salario-${func.id}-contrato-${contratoId}`;
          const classificacao = func.ehSocio ? `Pró-labore ${func.nome}` : `Salário ${func.nome}`;
          const numContrato = contrato.numeroContrato || contratoId.slice(0, 6);

          while (current <= fim) {
            // DEDUPLICAÇÃO: Verificar se já existe um lançamento para este funcionário/contrato/mês
            const mesLanc = current.getMonth();
            const anoLanc = current.getFullYear();
            const jaExiste = state.lancamentos.some((l) =>
              l.funcionarioResponsavelId === func.id &&
              l.contratoId === contratoId &&
              (l.classificacao === classificacao || l.classificacao?.includes(func.nome)) &&
              new Date(l.data).getMonth() === mesLanc &&
              new Date(l.data).getFullYear() === anoLanc
            );

            if (!jaExiste) {
              novosLancamentos.push({
                id: generateId(),
                tipo: 'Pagamos',
                valor: func.salario,
                data: new Date(current),
                descricao: `${func.ehSocio ? 'Pró-labore' : 'Salário'} ${func.nome} - Contrato ${numContrato}`,
                classificacao,
                categoria: 'Fixo',
                centroCusto: 'Financeiro',
                formaPagamento: 'Transferência',
                status: 'Previsto',
                funcionarioResponsavelId: func.id,
                contratoId: contratoId,
                ehRecorrente: true,
                recorrenciaFim: contrato.dataTermino || undefined,
                grupoRecorrenciaId: grupoSalarioId,
              });
            }
            current = new Date(current.getFullYear(), current.getMonth() + 1, 15);
          }
        }

        // 2. Comissão: SOMA de TODOS os contratos vinculados → UM lançamento por mês
        // Só executa quando este é o ÚLTIMO contrato da lista (evita duplicação)
        const todosContratosVinculados = (func.contratosVinculados || []).filter((cId) => {
          const c = state.contratos.find((ct) => ct.id === cId);
          return c && c.status === 'Ativo';
        });
        const isLastContract = todosContratosVinculados.indexOf(contratoId) === todosContratosVinculados.length - 1;

        if (isLastContract && todosContratosVinculados.length > 0 && func.origemComissao !== 'Nenhum' && func.origemComissao !== 'Vendas de Motos') {
          // Calcular soma total de comissão de todos os contratos vinculados
          let somaComissaoMensal = 0;
          const detalhesContratos: string[] = [];
          for (const cId of todosContratosVinculados) {
            const c = state.contratos.find((ct) => ct.id === cId);
            if (!c) continue;
            const pct = func.comissaoPorContrato?.[cId] ?? func.percentualComissaoContratos;
            if (pct <= 0) continue;
            const extras = (c.locacoesExtras || []).reduce((s, e) => s + (e.valorMensal || 0), 0);
            const base = ((c.valorMensalTotal || 0) + extras) * (1 - pctImposto / 100);
            const valComissao = base * (pct / 100);
            somaComissaoMensal += valComissao;
            const nomeC = state.clientes.find((cl) => cl.id === c.clienteId)?.nome || c.numeroContrato || cId.slice(0, 6);
            detalhesContratos.push(`${pct}% ${nomeC}`);
          }

          if (somaComissaoMensal > 0) {
            const grupoComissaoId = `comissao-${func.id}-todos-contratos`;
            const descricaoResumo = `Comissão ${func.nome} - ${detalhesContratos.join(' + ')}`;

            // Remover TODOS os lançamentos de comissão antigos deste funcionário (legados + por contrato individual)
            const comissoesAntigas = state.lancamentos.filter((l) =>
              l.funcionarioResponsavelId === func.id &&
              (l.classificacao || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes('comiss') &&
              (l.classificacao || '').normalize('NFD').replace(/[̀-ͯ]/g, '').includes(func.nome.normalize('NFD').replace(/[̀-ͯ]/g, '')) &&
              (l.status === 'Pendente' || l.status === 'Previsto')
            );
            if (comissoesAntigas.length > 0) {
              const idsToRemove = new Set(comissoesAntigas.map((l) => l.id));
              set((s) => ({
                lancamentos: s.lancamentos.filter((l) => !idsToRemove.has(l.id)),
              }));
            }

            // Determinar período: usar a dataInicio mais antiga e dataTermino mais distante
            let periodoInicio: Date | null = null;
            let periodoFim: Date | null = null;
            for (const cId of todosContratosVinculados) {
              const c = state.contratos.find((ct) => ct.id === cId);
              if (!c) continue;
              const ini = c.dataInicio instanceof Date ? c.dataInicio : new Date(c.dataInicio);
              if (!periodoInicio || ini < periodoInicio) periodoInicio = ini;
              if (c.dataTermino) {
                const fim = c.dataTermino instanceof Date ? c.dataTermino : new Date(c.dataTermino);
                if (!periodoFim || fim > periodoFim) periodoFim = fim;
              }
            }
            if (!periodoInicio) periodoInicio = new Date();
            if (!periodoFim) periodoFim = new Date(periodoInicio.getFullYear() + 2, periodoInicio.getMonth(), periodoInicio.getDate());

            current = new Date(periodoInicio.getFullYear(), periodoInicio.getMonth(), 15);
            if (current < periodoInicio) current = new Date(periodoInicio.getFullYear(), periodoInicio.getMonth() + 1, 15);

            while (current <= periodoFim) {
              novosLancamentos.push({
                id: generateId(),
                tipo: 'Pagamos',
                valor: Math.round(somaComissaoMensal * 100) / 100,
                data: new Date(current),
                descricao: descricaoResumo,
                classificacao: `Comissão ${func.nome}`,
                categoria: 'Fixo',
                centroCusto: 'Financeiro',
                formaPagamento: 'Transferência',
                status: 'Previsto',
                funcionarioResponsavelId: func.id,
                ehRecorrente: true,
                recorrenciaFim: periodoFim || undefined,
                grupoRecorrenciaId: grupoComissaoId,
                ehComissaoSocio: func.ehSocio,
              });
              current = new Date(current.getFullYear(), current.getMonth() + 1, 15);
            }
          }
        }

        if (novosLancamentos.length > 0) {
          set((s) => ({ lancamentos: [...s.lancamentos, ...novosLancamentos] }));
          upsertLancamentos(novosLancamentos).catch(() => {});
        }
      },

      addFuncionario: (f) => {
        set((state) => {
          // Prevent duplicates by ID
          if (state.funcionarios.some((existing) => existing.id === f.id)) {
            return state;
          }
          return { funcionarios: [...state.funcionarios, f] };
        });
        upsertFuncionario(f).catch((err) => console.error('[Store] addFuncionario persist error:', err));

        const temContratosVinculados = f.contratosVinculados && f.contratosVinculados.length > 0;

        if (temContratosVinculados) {
          // Path novo: gerar lançamentos vinculados a cada contrato
          for (const contratoId of f.contratosVinculados!) {
            get().syncLancamentosFuncionarioContrato(f.id, contratoId);
          }
        } else {
          // Path legado: 24 meses sem vínculo a contrato (retrocompatibilidade)
          const novosLancamentos: LancamentoFinanceiro[] = [];
          const hoje = new Date();
          const dataBase = new Date(hoje.getFullYear(), hoje.getMonth(), 15);

          if (f.salario > 0 && f.ativo) {
            const grupoSalarioId = `salario-${f.id}`;
            const classificacao = f.ehSocio ? `Pró-labore ${f.nome}` : `Salário ${f.nome}`;
            const descricao = `${f.ehSocio ? 'Pró-labore' : 'Salário'} ${f.nome} - Recorrente`;
            let current = new Date(dataBase);
            const fim = new Date(current.getFullYear() + 2, current.getMonth(), current.getDate());
            while (current <= fim) {
              // DEDUPLICAÇÃO: Verificar se já existe um lançamento para este funcionário/mês
              const mesLanc = current.getMonth();
              const anoLanc = current.getFullYear();
              const jaExiste = get().lancamentos.some((l: LancamentoFinanceiro) =>
                l.funcionarioResponsavelId === f.id &&
                (l.classificacao === classificacao || l.classificacao?.includes(f.nome)) &&
                new Date(l.data).getMonth() === mesLanc &&
                new Date(l.data).getFullYear() === anoLanc
              );

              if (!jaExiste) {
                novosLancamentos.push({
                  id: generateId(),
                  tipo: 'Pagamos',
                  valor: f.salario,
                  data: new Date(current),
                  descricao,
                  classificacao,
                  categoria: 'Fixo',
                  centroCusto: 'Financeiro',
                  formaPagamento: 'Transferência',
                  status: 'Previsto',
                  funcionarioResponsavelId: f.id,
                  ehRecorrente: true,
                  grupoRecorrenciaId: grupoSalarioId,
                });
              }
              current = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
            }
          }

          if (f.percentualComissaoContratos > 0 && f.ativo && f.origemComissao !== 'Nenhum') {
            const grupoComissaoId = `comissao-${f.id}`;
            const classificacao = `Comissão ${f.nome}`;
            const descricao = `Comissão ${f.nome} - ${f.percentualComissaoContratos}% sobre base pós-imposto - Recorrente`;
            const valorEstimado = get().getValorComissaoMensalFuncionario(f.id);
            let current = new Date(dataBase);
            const fim = new Date(current.getFullYear() + 2, current.getMonth(), current.getDate());
            while (current <= fim) {
              // DEDUPLICAÇÃO: Verificar se já existe um lançamento de comissão para este funcionário/mês
              const mesLanc = current.getMonth();
              const anoLanc = current.getFullYear();
              const jaExiste = get().lancamentos.some((l: LancamentoFinanceiro) =>
                l.funcionarioResponsavelId === f.id &&
                l.classificacao?.includes('Comissão') &&
                l.classificacao?.includes(f.nome) &&
                new Date(l.data).getMonth() === mesLanc &&
                new Date(l.data).getFullYear() === anoLanc
              );

              if (!jaExiste) {
                novosLancamentos.push({
                  id: generateId(),
                  tipo: 'Pagamos',
                  valor: valorEstimado,
                  data: new Date(current),
                  descricao,
                  classificacao,
                  categoria: 'Fixo',
                  centroCusto: 'Financeiro',
                  formaPagamento: 'Transferência',
                  status: 'Previsto',
                  funcionarioResponsavelId: f.id,
                  ehRecorrente: true,
                  grupoRecorrenciaId: grupoComissaoId,
                  ehComissaoSocio: f.ehSocio,
                });
              }
              current = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
            }
          }

          if (novosLancamentos.length > 0) {
            set((state) => ({ lancamentos: [...state.lancamentos, ...novosLancamentos] }));
            upsertLancamentos(novosLancamentos).catch(() => {});
          }
        }
      },

      updateFuncionario: (id, data) => {
        const state = get();
        const funcionarioAtual = state.funcionarios.find((f) => f.id === id);
        if (!funcionarioAtual) return;

        const funcionarioAtualizado = { ...funcionarioAtual, ...data };

        // Atualizar cadastro
        set({
          funcionarios: state.funcionarios.map((f) => (f.id === id ? funcionarioAtualizado : f)),
        });

        // Detectar diff em contratosVinculados
        const antigos = funcionarioAtual.contratosVinculados || [];
        const novos = funcionarioAtualizado.contratosVinculados || [];
        const adicionados = novos.filter((c) => !antigos.includes(c));
        const removidos = antigos.filter((c) => !novos.includes(c));
        const mantidos = novos.filter((c) => antigos.includes(c));
        const temVinculos = novos.length > 0;
        const tinhaVinculos = antigos.length > 0;

        if (temVinculos || tinhaVinculos) {
          // Path vinculado a contratos

          // Contratos removidos: remover lançamentos futuros dos grupos compostos
          for (const contratoId of removidos) {
            get().removeGrupoRecorrenciaFuturo(`salario-${id}-contrato-${contratoId}`);
            get().removeGrupoRecorrenciaFuturo(`comissao-${id}-contrato-${contratoId}`);
          }

          // Contratos adicionados: gerar novos lançamentos
          for (const contratoId of adicionados) {
            get().syncLancamentosFuncionarioContrato(id, contratoId);
          }

          // Contratos mantidos: atualizar valores se salário/comissão mudou
          if (mantidos.length > 0) {
            const salarioMudou = funcionarioAtual.salario !== funcionarioAtualizado.salario;
            const comissaoMudou = funcionarioAtual.percentualComissaoContratos !== funcionarioAtualizado.percentualComissaoContratos;
            const nomeMudou = funcionarioAtual.nome !== funcionarioAtualizado.nome;
            const socioMudou = funcionarioAtual.ehSocio !== funcionarioAtualizado.ehSocio;

            for (const contratoId of mantidos) {
              if (salarioMudou || nomeMudou || socioMudou) {
                const classificacaoSalario = funcionarioAtualizado.ehSocio
                  ? `Pró-labore ${funcionarioAtualizado.nome}`
                  : `Salário ${funcionarioAtualizado.nome}`;
                get().updateGrupoRecorrenciaFuturo(`salario-${id}-contrato-${contratoId}`, {
                  valor: funcionarioAtualizado.salario,
                  classificacao: classificacaoSalario,
                });
              }
              if (comissaoMudou || nomeMudou || socioMudou) {
                const contrato = state.contratos.find((c) => c.id === contratoId);
                if (contrato) {
                  const pctImposto = state.percentualImposto || 10;
                  const extrasContrato = (contrato.locacoesExtras || []).reduce((s, e) => s + (e.valorMensal || 0), 0);
                  const basePosImposto = ((contrato.valorMensalTotal || 0) + extrasContrato) * (1 - pctImposto / 100);
                  const valorComissao = basePosImposto * (funcionarioAtualizado.percentualComissaoContratos / 100);
                  get().updateGrupoRecorrenciaFuturo(`comissao-${id}-contrato-${contratoId}`, {
                    valor: valorComissao,
                    classificacao: `Comissão ${funcionarioAtualizado.nome}`,
                    ehComissaoSocio: funcionarioAtualizado.ehSocio,
                  });
                }
              }
            }
          }

          // Se funcionário ficou inativo, remover todos os grupos compostos futuros
          if (!funcionarioAtualizado.ativo) {
            for (const contratoId of novos) {
              get().removeGrupoRecorrenciaFuturo(`salario-${id}-contrato-${contratoId}`);
              get().removeGrupoRecorrenciaFuturo(`comissao-${id}-contrato-${contratoId}`);
            }
          }
        } else {
          // Path legado: sem vínculos a contratos (retrocompatibilidade)
          const grupoSalarioId = `salario-${id}`;
          const lancamentosSalario = state.lancamentos.filter(
            (l) => l.grupoRecorrenciaId === grupoSalarioId
          );

          if (funcionarioAtualizado.salario > 0 && funcionarioAtualizado.ativo) {
            if (lancamentosSalario.length > 0) {
              get().updateGrupoRecorrenciaFuturo(grupoSalarioId, {
                valor: funcionarioAtualizado.salario,
                classificacao: funcionarioAtualizado.ehSocio
                  ? `Pró-labore ${funcionarioAtualizado.nome}`
                  : `Salário ${funcionarioAtualizado.nome}`,
                descricao: `${funcionarioAtualizado.ehSocio ? 'Pró-labore' : 'Salário'} ${funcionarioAtualizado.nome} - Recorrente`,
              });
            } else {
              const novosSalarios: LancamentoFinanceiro[] = [];
              const hoje = new Date();
              let current = new Date(hoje.getFullYear(), hoje.getMonth(), 15);
              const fim = new Date(current.getFullYear() + 2, current.getMonth(), current.getDate());
              const classificacao = funcionarioAtualizado.ehSocio
                ? `Pró-labore ${funcionarioAtualizado.nome}`
                : `Salário ${funcionarioAtualizado.nome}`;
              while (current <= fim) {
                novosSalarios.push({
                  id: generateId(),
                  tipo: 'Pagamos',
                  valor: funcionarioAtualizado.salario,
                  data: new Date(current),
                  descricao: `${funcionarioAtualizado.ehSocio ? 'Pró-labore' : 'Salário'} ${funcionarioAtualizado.nome} - Recorrente`,
                  classificacao,
                  categoria: 'Fixo',
                  centroCusto: 'Financeiro',
                  formaPagamento: 'Transferência',
                  status: 'Previsto',
                  funcionarioResponsavelId: id,
                  ehRecorrente: true,
                  grupoRecorrenciaId: grupoSalarioId,
                });
                current = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
              }
              set((s) => ({ lancamentos: [...s.lancamentos, ...novosSalarios] }));
              upsertLancamentos(novosSalarios).catch(() => {});
            }
          } else {
            if (lancamentosSalario.length > 0) {
              get().removeGrupoRecorrenciaFuturo(grupoSalarioId);
            }
          }

          const grupoComissaoId = `comissao-${id}`;
          const lancamentosComissao = state.lancamentos.filter(
            (l) => l.grupoRecorrenciaId === grupoComissaoId
          );

          if (
            funcionarioAtualizado.percentualComissaoContratos > 0 &&
            funcionarioAtualizado.ativo &&
            funcionarioAtualizado.origemComissao !== 'Nenhum'
          ) {
            const valorEstimado = get().getValorComissaoMensalFuncionario(id);
            if (lancamentosComissao.length > 0) {
              get().updateGrupoRecorrenciaFuturo(grupoComissaoId, {
                valor: valorEstimado,
                classificacao: `Comissão ${funcionarioAtualizado.nome}`,
                descricao: `Comissão ${funcionarioAtualizado.nome} - ${funcionarioAtualizado.percentualComissaoContratos}% sobre base pós-imposto - Recorrente`,
                ehComissaoSocio: funcionarioAtualizado.ehSocio,
              });
            } else {
              const novasComissoes: LancamentoFinanceiro[] = [];
              const hoje = new Date();
              let current = new Date(hoje.getFullYear(), hoje.getMonth(), 15);
              const fim = new Date(current.getFullYear() + 2, current.getMonth(), current.getDate());
              while (current <= fim) {
                novasComissoes.push({
                  id: generateId(),
                  tipo: 'Pagamos',
                  valor: valorEstimado,
                  data: new Date(current),
                  descricao: `Comissão ${funcionarioAtualizado.nome} - ${funcionarioAtualizado.percentualComissaoContratos}% sobre base pós-imposto - Recorrente`,
                  classificacao: `Comissão ${funcionarioAtualizado.nome}`,
                  categoria: 'Fixo',
                  centroCusto: 'Financeiro',
                  formaPagamento: 'Transferência',
                  status: 'Previsto',
                  funcionarioResponsavelId: id,
                  ehRecorrente: true,
                  grupoRecorrenciaId: grupoComissaoId,
                  ehComissaoSocio: funcionarioAtualizado.ehSocio,
                });
                current = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
              }
              set((s) => ({ lancamentos: [...s.lancamentos, ...novasComissoes] }));
              upsertLancamentos(novasComissoes).catch(() => {});
            }
          } else {
            if (lancamentosComissao.length > 0) {
              get().removeGrupoRecorrenciaFuturo(grupoComissaoId);
            }
          }
        }
      },

      removeFuncionario: (id) => {
        const { lancamentos } = get();
        // Remover apenas lançamentos FUTUROS (Previsto/Pendente) vinculados ao funcionário
        // Preservar histórico (Pago/Recebido) para auditoria financeira
        const gruposParaRemover = new Set<string>();
        const idsParaRemover: string[] = [];

        for (const l of lancamentos) {
          if (l.funcionarioResponsavelId !== id) continue;
          if (l.status === 'Previsto' || l.status === 'Pendente') {
            idsParaRemover.push(l.id);
            if (l.grupoRecorrenciaId) gruposParaRemover.add(l.grupoRecorrenciaId);
          }
        }

        // Remover instâncias futuras
        set((state) => ({
          lancamentos: state.lancamentos.filter((l) => !idsParaRemover.includes(l.id)),
          funcionarios: state.funcionarios.filter((f) => f.id !== id),
        }));

        // Persistir remoções
        for (const lid of idsParaRemover) {
          dbDeleteLancamento(lid).catch(() => {});
        }
      },

      // --- PecaSlice ---
      pecas: [],
      addPeca: (peca) => {
        set((state) => ({ pecas: [...state.pecas, peca] }));
        upsertPeca(peca).catch(() => {});
      },
      updatePeca: (id, data) =>
        set((state) => {
          const updated = state.pecas.map((p) => (p.id === id ? { ...p, ...data } : p));
          const peca = updated.find((p) => p.id === id);
          if (peca) upsertPeca(peca).catch(() => {});
          return { pecas: updated };
        }),
      removePeca: (id) => {
        set((state) => ({ pecas: state.pecas.filter((p) => p.id !== id) }));
        dbDeletePeca(id).catch(() => {});
      },

      // --- TestRideSlice ---
      testRides: [],
      addTestRide: (tr) => {
        set((state) => ({ testRides: [...state.testRides, tr] }));
        upsertTestRide(tr).catch(() => {});
        // Alterar status das motos vinculadas para "Em Test Ride" e localização para "Cliente"
        for (const motoId of tr.motosVinculadas) {
          get().updateMoto(motoId, { status: 'Em Test Ride', localizacao: 'Cliente' });
        }
      },
      updateTestRide: (id, data) => {
        set((state) => {
          const updated = state.testRides.map((tr) => (tr.id === id ? { ...tr, ...data } : tr));
          const testRide = updated.find((tr) => tr.id === id);
          if (testRide) upsertTestRide(testRide).catch(() => {});
          return { testRides: updated };
        });
      },
      removeTestRide: (id) => {
        const tr = get().testRides.find((t) => t.id === id);
        set((state) => ({ testRides: state.testRides.filter((t) => t.id !== id) }));
        dbDeleteTestRide(id).catch(() => {});
        // Retornar motos ao estoque com status padrão
        if (tr) {
          const statusRetorno = tr.statusRetornoMoto || 'Disponível para Operar';
          for (const motoId of tr.motosVinculadas) {
            get().updateMoto(motoId, { status: statusRetorno });
          }
        }
      },
      finalizarTestRide: (id, statusRetornoMoto) => {
        const tr = get().testRides.find((t) => t.id === id);
        if (!tr) return;
        // Atualizar o test ride como finalizado
        set((state) => ({
          testRides: state.testRides.map((t) => (t.id === id ? { ...t, status: 'Finalizado' as const, statusRetornoMoto } : t)),
        }));
        const updatedTr = { ...tr, status: 'Finalizado' as const, statusRetornoMoto };
        upsertTestRide(updatedTr).catch(() => {});
        // Retornar motos ao estoque com o status selecionado e localização Galpão
        for (const motoId of tr.motosVinculadas) {
          get().updateMoto(motoId, { status: statusRetornoMoto, localizacao: 'Galpão' });
        }
      },

      // --- VendaSlice ---
      historicoVendas: [],
      addHistoricoVenda: (venda) => {
        set((state) => ({ historicoVendas: [...state.historicoVendas, venda] }));
      },
      updateHistoricoVenda: (id, data) => {
        set((state) => ({
          historicoVendas: state.historicoVendas.map((v) => (v.id === id ? { ...v, ...data } : v)),
        }));
      },
      removeHistoricoVenda: (id) => {
        const venda = get().historicoVendas.find((v) => v.id === id);
        const chassi = venda?.chassi;

        // 1) Remover lançamentos de parcelas vinculados via vendaId (novo sistema)
        if (venda?.ehParcelada) {
          const grupoId = `venda-${id}`;
          get().removeGrupoRecorrenciaFuturo(grupoId);
        }

        // 2) Remover TODOS os lançamentos pendentes/previstos vinculados a esta venda
        //    — por vendaId (novo) OU por motoChassi + classificação Venda de Moto (legado)
        const idsParaRemover = new Set<string>();
        const lancamentosActuais = get().lancamentos;

        for (const l of lancamentosActuais) {
          if (l.status === 'Recebido' || l.status === 'Pago') continue; // nunca remover já recebidos
          const vinculadoPorVendaId = l.vendaId === id;
          const vinculadoPorChassi = chassi != null && l.motoChassi === chassi &&
            (l.classificacao === 'Venda de Moto' || l.classificacao === 'Venda de Moto (Parcela)');
          if (vinculadoPorVendaId || vinculadoPorChassi) {
            idsParaRemover.add(l.id);
          }
        }

        // 3) Remover lançamento de comissão associado
        if (venda?.lancamentoComissaoId) {
          idsParaRemover.add(venda.lancamentoComissaoId);
        }
        // Também buscar comissão por chassi (legado sem lancamentoComissaoId)
        if (chassi) {
          for (const l of lancamentosActuais) {
            if (l.motoChassi === chassi && l.classificacao === 'Comissão' &&
                (l.status === 'Pendente' || l.status === 'Previsto')) {
              idsParaRemover.add(l.id);
            }
          }
        }

        if (idsParaRemover.size > 0) {
          const idsArray = Array.from(idsParaRemover);
          set((state) => ({
            lancamentos: state.lancamentos.filter((l) => !idsParaRemover.has(l.id)),
          }));
          // Persistir remoção no Supabase
          import('./sync').then(({ deleteLancamento }) => {
            idsArray.forEach((lid) => deleteLancamento(lid).catch(() => {}));
          });
        }

        // 4) Remover o registro da venda do histórico
        set((state) => ({ historicoVendas: state.historicoVendas.filter((v) => v.id !== id) }));
      },

      // --- AporteSocioSlice ---
      aportes: [],
      parcelas: [],

      addAporte: (aporte) => {
        set((state) => ({ aportes: [...state.aportes, aporte] }));
        upsertAporte(aporte).catch((err) => console.error('[Store] addAporte persist error:', err));
      },
      updateAporte: (id, data) => {
        const updated = { ...get().aportes.find((a) => a.id === id), ...data } as AporteSocio;
        set((state) => ({
          aportes: state.aportes.map((a) => (a.id === id ? { ...a, ...data } : a)),
        }));
        if (updated) upsertAporte(updated).catch((err) => console.error('[Store] updateAporte persist error:', err));
      },
      removeAporte: (id) => {
        set((state) => ({
          aportes: state.aportes.filter((a) => a.id !== id),
          parcelas: state.parcelas.filter((p) => p.aporteId !== id),
        }));
        dbDeleteAporte(id).catch((err) => console.error('[Store] removeAporte persist error:', err));
        deleteParcelasByAporte(id).catch((err) => console.error('[Store] removeAporte parcelas persist error:', err));
      },

      addParcela: (parcela) => {
        set((state) => ({ parcelas: [...state.parcelas, parcela] }));
        upsertParcela(parcela).catch((err) => console.error('[Store] addParcela persist error:', err));
      },
      updateParcela: (id, data) => {
        const updated = { ...get().parcelas.find((p) => p.id === id), ...data } as ParcelaRepagamento;
        set((state) => ({
          parcelas: state.parcelas.map((p) => (p.id === id ? { ...p, ...data } : p)),
        }));
        if (updated) upsertParcela(updated).catch((err) => console.error('[Store] updateParcela persist error:', err));
      },
      removeParcela: (id) => {
        set((state) => ({ parcelas: state.parcelas.filter((p) => p.id !== id) }));
        dbDeleteParcela(id).catch((err) => console.error('[Store] removeParcela persist error:', err));
      },

      gerarParcelasRepagamento: (aporteId, qtdParcelas, valorPorParcela, dataInicio) => {
        const state = get();
        const aporte = state.aportes.find((a) => a.id === aporteId);
        if (!aporte || qtdParcelas <= 0) return;

        const valorParcela = valorPorParcela || Math.round((aporte.valor / qtdParcelas) * 100) / 100;
        const inicio = dataInicio || new Date(aporte.data);
        const novasParcelas: ParcelaRepagamento[] = [];

        for (let i = 0; i < qtdParcelas; i++) {
          const dataPrevista = new Date(inicio);
          dataPrevista.setMonth(dataPrevista.getMonth() + i + 1);
          dataPrevista.setDate(10); // Dia 10 de cada mês

          novasParcelas.push({
            id: generateId(),
            aporteId,
            socioId: aporte.socioId,
            numero: i + 1,
            valorOriginal: valorParcela,
            valorPago: 0,
            dataPrevista,
            status: 'Pendente',
          });
        }

        set((s) => ({ parcelas: [...s.parcelas, ...novasParcelas] }));
        upsertParcelas(novasParcelas).catch((err) => console.error('[Store] gerarParcelasRepagamento persist error:', err));
      },

      reconfigurarParcelas: (aporteId, novaQtd, novoValorPorParcela) => {
        const state = get();
        const aporte = state.aportes.find((a) => a.id === aporteId);
        if (!aporte || novaQtd <= 0) return;

        // Manter parcelas já pagas/amortizadas
        const parcelasPagas = state.parcelas.filter(
          (p) => p.aporteId === aporteId && (p.status === 'Pago' || p.status === 'Amortizado')
        );
        const totalDevolvido = parcelasPagas.reduce((acc, p) => acc + p.valorPago, 0);
        const saldoRestante = aporte.valor - totalDevolvido;

        if (saldoRestante <= 0) return;

        const valorParcela = novoValorPorParcela || Math.round((saldoRestante / novaQtd) * 100) / 100;

        // Data de início: mês seguinte à última parcela paga, ou mês seguinte ao aporte
        let dataBase: Date;
        if (parcelasPagas.length > 0) {
          const ultimaPaga = parcelasPagas.reduce((max, p) =>
            p.dataPrevista > max.dataPrevista ? p : max
          );
          dataBase = new Date(ultimaPaga.dataPrevista);
        } else {
          dataBase = new Date(aporte.data);
        }

        const novasParcelas: ParcelaRepagamento[] = [];
        for (let i = 0; i < novaQtd; i++) {
          const dataPrevista = new Date(dataBase);
          dataPrevista.setMonth(dataPrevista.getMonth() + i + 1);
          dataPrevista.setDate(10);

          novasParcelas.push({
            id: generateId(),
            aporteId,
            socioId: aporte.socioId,
            numero: parcelasPagas.length + i + 1,
            valorOriginal: valorParcela,
            valorPago: 0,
            dataPrevista,
            status: 'Pendente',
          });
        }

        const removedIds = state.parcelas
          .filter((p) => p.aporteId === aporteId && p.status !== 'Pago' && p.status !== 'Amortizado')
          .map((p) => p.id);

        set((s) => ({
          parcelas: [
            ...s.parcelas.filter((p) => p.aporteId !== aporteId || p.status === 'Pago' || p.status === 'Amortizado'),
            ...novasParcelas,
          ],
        }));

        // Delete old pending parcelas from Supabase and upsert new ones
        Promise.all(removedIds.map((id) => dbDeleteParcela(id)))
          .then(() => upsertParcelas(novasParcelas))
          .catch((err) => console.error('[Store] reconfigurarParcelas persist error:', err));
      },

      pagarParcela: (parcelaId, valorPago, dataPagamento) => {
        const state = get();
        const parcela = state.parcelas.find((p) => p.id === parcelaId);
        if (!parcela) return;

        const sobra = valorPago - parcela.valorOriginal;

        // Atualizar parcela
        set((s) => ({
          parcelas: s.parcelas.map((p) =>
            p.id === parcelaId
              ? { ...p, valorPago, dataPagamento, status: 'Pago' as const }
              : p
          ),
        }));

        // Criar lançamento financeiro vinculado
        const socio = state.funcionarios.find((f) => f.id === parcela.socioId);
        const lancamento: LancamentoFinanceiro = {
          id: generateId(),
          tipo: 'Pagamos',
          valor: valorPago,
          data: dataPagamento,
          descricao: `Repagamento parcela ${parcela.numero} - ${socio?.nome || 'Sócio'}`,
          classificacao: 'Repagamento Sócio',
          categoria: 'Extraordinário',
          centroCusto: 'Financeiro',
          formaPagamento: 'Transferência',
          status: 'Pago',
          funcionarioResponsavelId: parcela.socioId,
          ehRecorrente: false,
        };
        get().addLancamento(lancamento);

        // Vincular lançamento à parcela e persistir
        const parcelaAtualizada = { ...parcela, valorPago, dataPagamento, status: 'Pago' as const, lancamentoId: lancamento.id };
        set((s) => ({
          parcelas: s.parcelas.map((p) =>
            p.id === parcelaId ? { ...p, lancamentoId: lancamento.id } : p
          ),
        }));
        upsertParcela(parcelaAtualizada).catch((err) => console.error('[Store] pagarParcela persist error:', err));

        // Amortizar parcelas futuras se houver sobra
        if (sobra > 0) {
          const mesRef = `${dataPagamento.getFullYear()}-${String(dataPagamento.getMonth() + 1).padStart(2, '0')}`;
          get().amortizarParcelasFuturas(parcela.socioId, sobra, mesRef);
        }
      },

      amortizarParcelasFuturas: (socioId, valorSobra, mesReferencia) => {
        const state = get();
        let sobra = valorSobra;

        const parcelasFuturas = state.parcelas
          .filter((p) => p.socioId === socioId && p.status === 'Pendente')
          .sort((a, b) => a.dataPrevista.getTime() - b.dataPrevista.getTime());

        const atualizacoes: Record<string, Partial<ParcelaRepagamento>> = {};

        for (const parcela of parcelasFuturas) {
          if (sobra <= 0) break;
          const restante = parcela.valorOriginal - parcela.valorPago;
          if (restante <= 0) continue;

          const amortizacao = Math.min(sobra, restante);
          const novoValorPago = parcela.valorPago + amortizacao;
          const novoStatus = novoValorPago >= parcela.valorOriginal ? 'Amortizado' : 'Pendente';

          atualizacoes[parcela.id] = {
            valorPago: novoValorPago,
            status: novoStatus as 'Pendente' | 'Amortizado',
            observacoes: `Amortizado com sobra de ${mesReferencia}`,
          };

          sobra -= amortizacao;
        }

        if (Object.keys(atualizacoes).length > 0) {
          const parcelasAtualizadas = state.parcelas
            .filter((p) => atualizacoes[p.id])
            .map((p) => ({ ...p, ...atualizacoes[p.id] } as ParcelaRepagamento));

          set((s) => ({
            parcelas: s.parcelas.map((p) =>
              atualizacoes[p.id] ? { ...p, ...atualizacoes[p.id] } : p
            ),
          }));

          upsertParcelas(parcelasAtualizadas).catch((err) =>
            console.error('[Store] amortizarParcelasFuturas persist error:', err)
          );
        }
      },

      getDividaTotalSocios: () => {
        const state = get();
        return state.aportes.reduce((acc, aporte) => {
          const devolvido = state.parcelas
            .filter((p) => p.aporteId === aporte.id)
            .reduce((sum, p) => sum + p.valorPago, 0);
          return acc + Math.max(0, aporte.valor - devolvido);
        }, 0);
      },

      getDividaPorSocio: (socioId) => {
        const state = get();
        const aportesSocio = state.aportes.filter((a) => a.socioId === socioId);
        return aportesSocio.reduce((acc, aporte) => {
          const devolvido = state.parcelas
            .filter((p) => p.aporteId === aporte.id)
            .reduce((sum, p) => sum + p.valorPago, 0);
          return acc + Math.max(0, aporte.valor - devolvido);
        }, 0);
      },

      getTotalAportadoPorSocio: (socioId) => {
        return get().aportes
          .filter((a) => a.socioId === socioId)
          .reduce((acc, a) => acc + a.valor, 0);
      },

      getTotalDevolvidoPorSocio: (socioId) => {
        return get().parcelas
          .filter((p) => p.socioId === socioId)
          .reduce((acc, p) => acc + p.valorPago, 0);
      },

      getParcelasPendentes: (socioId) => {
        return get().parcelas.filter((p) =>
          p.status === 'Pendente' && (!socioId || p.socioId === socioId)
        );
      },

      getParcelasDoMes: (mes, socioId) => {
        const [ano, m] = mes.split('-').map(Number);
        return get().parcelas.filter((p) => {
          const d = new Date(p.dataPrevista);
          const matchMes = d.getMonth() === m - 1 && d.getFullYear() === ano;
          const matchSocio = !socioId || p.socioId === socioId;
          return matchMes && matchSocio;
        });
      },

      getHistoricoAportes: () => {
        return [...get().aportes].sort((a, b) =>
          new Date(b.data).getTime() - new Date(a.data).getTime()
        );
      },

      getHistoricoRepagamentos: () => {
        return [...get().parcelas]
          .filter((p) => p.status === 'Pago' || p.status === 'Amortizado')
          .sort((a, b) => {
            const da = a.dataPagamento ? new Date(a.dataPagamento).getTime() : new Date(a.dataPrevista).getTime();
            const db = b.dataPagamento ? new Date(b.dataPagamento).getTime() : new Date(b.dataPrevista).getTime();
            return db - da;
          });
      },

      getSaldoAporte: (aporteId) => {
        const state = get();
        const aporte = state.aportes.find((a) => a.id === aporteId);
        if (!aporte) return 0;
        const devolvido = state.parcelas
          .filter((p) => p.aporteId === aporteId)
          .reduce((sum, p) => sum + p.valorPago, 0);
        return Math.max(0, aporte.valor - devolvido);
      },

      getEstudoFluxoCaixa: (mes) => {
        const state = get();
        const now = new Date();
        const mesRef = mes || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const [ano, m] = mesRef.split('-').map(Number);
        const targetMonth = m - 1;
        const targetYear = ano;

        // Receita Fixa Prevista (contratos ativos)
        const receitaFixaPrevista = state.lancamentos
          .filter((l) =>
            l.tipo === 'Recebemos' &&
            (l.status === 'Previsto' || l.status === 'Pendente') &&
            new Date(l.data).getMonth() === targetMonth &&
            new Date(l.data).getFullYear() === targetYear &&
            l.categoria === 'Fixo'
          )
          .reduce((acc, l) => acc + l.valor, 0);

        // Receita Variável Estimada (média dos últimos 3 meses recebidos)
        let receitaVariavelEstimada = 0;
        let mesesComDados = 0;
        for (let i = 1; i <= 3; i++) {
          const d = new Date(targetYear, targetMonth - i, 1);
          const recVar = state.lancamentos
            .filter((l) =>
              l.tipo === 'Recebemos' &&
              l.status === 'Recebido' &&
              new Date(l.data).getMonth() === d.getMonth() &&
              new Date(l.data).getFullYear() === d.getFullYear() &&
              l.categoria !== 'Fixo'
            )
            .reduce((acc, l) => acc + l.valor, 0);
          if (recVar > 0) {
            receitaVariavelEstimada += recVar;
            mesesComDados++;
          }
        }
        receitaVariavelEstimada = mesesComDados > 0 ? receitaVariavelEstimada / mesesComDados : 0;

        const receitaTotalPrevista = receitaFixaPrevista + receitaVariavelEstimada;

        // Despesas Fixas
        const despesasFixas = state.lancamentos
          .filter((l) =>
            l.tipo === 'Pagamos' &&
            l.categoria === 'Fixo' &&
            (l.status === 'Previsto' || l.status === 'Pendente') &&
            new Date(l.data).getMonth() === targetMonth &&
            new Date(l.data).getFullYear() === targetYear
          )
          .reduce((acc, l) => acc + l.valor, 0);

        // Imposto Estimado
        const impostoEstimado = receitaTotalPrevista * (state.percentualImposto / 100);

        // Comissões Estimadas (apenas funcionários com origem em contratos)
        const basePosImposto = receitaTotalPrevista * (1 - state.percentualImposto / 100);
        const comissoesEstimadas = state.funcionarios
          .filter((f) => f.percentualComissaoContratos > 0 && f.origemComissao !== 'Nenhum' && f.origemComissao !== 'Vendas de Motos')
          .reduce((acc, f) => acc + basePosImposto * (f.percentualComissaoContratos / 100), 0);

        // Sobra Líquida
        const sobraLiquida = receitaTotalPrevista - despesasFixas - impostoEstimado - comissoesEstimadas;

        // Parcelas Pendentes
        const parcelasPendentes = state.parcelas.filter((p) => p.status === 'Pendente');
        const parcelasPendentesCount = parcelasPendentes.length;

        // Parcela Sugerida
        const parcelaSugerida = parcelasPendentesCount > 0 && sobraLiquida > 0
          ? Math.round((sobraLiquida / parcelasPendentesCount) * 100) / 100
          : 0;

        return {
          receitaFixaPrevista,
          receitaVariavelEstimada,
          receitaTotalPrevista,
          despesasFixas,
          impostoEstimado,
          comissoesEstimadas,
          sobraLiquida,
          parcelaSugerida,
          parcelasPendentesCount,
        };
      },
    }),
    {
      name: 'fmm_data',
      storage: createJSONStorage(() => localStorage, {
        reviver: (_key: string, value: unknown) => {
          // Revive ISO date strings back to Date objects
          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
            return new Date(value);
          }
          return value;
        },
      }),
      // Migração automática: garante que campos novos existam em dados antigos do localStorage
      merge: (persisted: unknown, current: AppStore) => {
        const p = persisted as Partial<AppStore> | undefined;
        const merged = {
          ...current,
          ...(p || {}),
          // Campos novos que podem não existir em dados antigos
          percentualImpostoMauUso: p?.percentualImpostoMauUso ?? 10,
          setPercentualImpostoMauUso: current.setPercentualImpostoMauUso,
          // Garantir que funções/métodos do store atual prevaleçam sobre dados persistidos
          gerarCobrancaMauUso: current.gerarCobrancaMauUso,
          getValorMauUsoPago: current.getValorMauUsoPago,
          getValorMauUsoPendenteCount: current.getValorMauUsoPendenteCount,
          getValorMauUsoPagoCount: current.getValorMauUsoPagoCount,
          getCobrancasMauUsoMes: current.getCobrancasMauUsoMes,
          getLucroMauUsoMes: current.getLucroMauUsoMes,
          getLucroMauUsoDetalhado: current.getLucroMauUsoDetalhado,
          getQuadroRecebimentos: current.getQuadroRecebimentos,
          limparLancamentosDuplicados: current.limparLancamentosDuplicados,
          // Garantir que historicoVendas exista em dados antigos
          historicoVendas: p?.historicoVendas ?? [],
          addHistoricoVenda: current.addHistoricoVenda,
          updateHistoricoVenda: current.updateHistoricoVenda,
          removeHistoricoVenda: current.removeHistoricoVenda,
        } as AppStore;

        // DEDUPLICAÇÃO NO MERGE: Remover lançamentos duplicados que vêm do localStorage/Supabase
        // Isso garante que mesmo dados persistidos com duplicatas sejam limpos ao carregar
        if (merged.lancamentos && merged.lancamentos.length > 0) {
          const padraoSalarioComissao = /salário|pró-labore|comiss/i;
          const lancamentosRelevantes = merged.lancamentos.filter((l: any) =>
            padraoSalarioComissao.test(l.classificacao || '')
          );

          if (lancamentosRelevantes.length > 0) {
            const vistos = new Map<string, string>();
            const idsParaRemover: string[] = [];

            for (const l of lancamentosRelevantes) {
              const d = new Date(l.data);
              const mesAno = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              const ehComissao = (l.classificacao || '').toLowerCase().includes('comiss');
              const tipo = ehComissao ? 'comissao' : 'salario';
              const chave = `${l.funcionarioResponsavelId || 'sem-func'}-${mesAno}-${tipo}`;

              if (vistos.has(chave)) {
                idsParaRemover.push(l.id);
              } else {
                vistos.set(chave, l.id);
              }
            }

            if (idsParaRemover.length > 0) {
              merged.lancamentos = merged.lancamentos.filter((l: any) => !idsParaRemover.includes(l.id));
              // Remove do Supabase também (fire-and-forget)
              idsParaRemover.forEach((id) => dbDeleteLancamento(id).catch(() => {}));
              console.log(`[Store Merge] Limpeza duplicados: ${idsParaRemover.length} removidos do persisted data`);
            }
          }
        }

        return merged;
      },
    }
  )
);