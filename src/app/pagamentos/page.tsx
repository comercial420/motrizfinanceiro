"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  Info,
  Settings,
  CalendarClock,
  TrendingDown,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Zap,
  Users,
  UserPlus,
  Pencil,
  Trash2,
  Briefcase,
  PieChart,
  Bike,
  Timer,
  Activity,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import type { OrigemComissao, MotivoAporte, AporteSocio, ParcelaRepagamento } from "@/types";
import type { Funcionario, FuncaoFuncionario } from "@/types";

const MOTIVOS_APORTE: MotivoAporte[] = [
  'Compra de Motos',
  'Compra de Equipamentos',
  'Preparação de Motos',
  'Bater Contas Faltantes',
  'Compra de Peças',
  'Outros',
];

/* -- Waterfall Step -- */
function WaterfallStep({
  label,
  value,
  tone = "default",
  prefix = "",
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative" | "accent" | "final";
  prefix?: string;
}) {
  const toneClass =
    tone === "positive"
      ? "text-[var(--motriz-verde-esmeralda)] border-[var(--motriz-verde-esmeralda)]/20 bg-[var(--motriz-verde-esmeralda)]/5"
      : tone === "negative"
        ? "text-[var(--motriz-vermelho)] border-[var(--motriz-vermelho)]/20 bg-[var(--motriz-vermelho)]/5"
        : tone === "accent"
          ? "text-[#14B8A6] border-[#14B8A6]/20 bg-[#14B8A6]/5"
          : tone === "final"
            ? "text-blue-600 border-blue-500/20 bg-blue-500/5"
            : "text-foreground border-border bg-card";

  return (
    <div className={`rounded-lg border p-3 text-center ${toneClass}`}>
      <p className="text-[10px] font-medium uppercase tracking-wider opacity-70 mb-1">
        {prefix} {label}
      </p>
      <p className="text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}

function WaterfallArrow() {
  return (
    <div className="flex items-center justify-center py-1">
      <ArrowDown className="size-3.5 text-muted-foreground" />
    </div>
  );
}

const FUNCOES: FuncaoFuncionario[] = ['Comercial', 'Administrativo', 'Operacional', 'Marketing', 'Técnico', 'Sócio', 'Outros'];

/* -- Page -- */
export default function PagamentosPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const contratos = useStore((s) => s.contratos);
  const clientes = useStore((s) => s.clientes);
  const lancamentos = useStore((s) => s.lancamentos);
  const funcionarios = useStore((s) => s.funcionarios);
  const addFuncionario = useStore((s) => s.addFuncionario);
  const updateFuncionario = useStore((s) => s.updateFuncionario);
  const removeFuncionario = useStore((s) => s.removeFuncionario);
  const pctImposto = useStore((s) => s.percentualImposto);
  const setPctImposto = useStore((s) => s.setPercentualImposto);
  const pctImpostoMauUso = useStore((s) => s.percentualImpostoMauUso ?? 10);
  const setPctImpostoMauUso = useStore((s) => s.setPercentualImpostoMauUso);

  const getFaturamentoBrutoMes = useStore((s) => s.getFaturamentoBrutoMes);
  const getReceitaTotalMes = useStore((s) => s.getReceitaTotalMes);
  const getReceitaRecebidaMes = useStore((s) => s.getReceitaRecebidaMes);
  const getReceitaAReceberMes = useStore((s) => s.getReceitaAReceberMes);
  const getFaturamentoBrutoRecebidoMes = useStore((s) => s.getFaturamentoBrutoRecebidoMes);
  const getFaturamentoBrutoAReceberMes = useStore((s) => s.getFaturamentoBrutoAReceberMes);
  const getImpostoMes = useStore((s) => s.getImpostoMes);
  const getBasePosImpostoMes = useStore((s) => s.getBasePosImpostoMes);
  const getDespesasTotaisMes = useStore((s) => s.getDespesasTotaisMes);
  const getComissaoPorFuncionario = useStore((s) => s.getComissaoPorFuncionario);
  const getComissaoComercialMes = useStore((s) => s.getComissaoComercialMes);
  const getResultadoFinalMes = useStore((s) => s.getResultadoFinalMes);
  const getDivisaoSocietaria = useStore((s) => s.getDivisaoSocietaria);
  const getQuadroRecebimentos = useStore((s) => s.getQuadroRecebimentos);
  const addLancamento = useStore((s) => s.addLancamento);
  const motos = useStore((s) => s.motos);
  const historicoVendas = useStore((s) => s.historicoVendas);

  // Aportes e Repagamento
  const aportes = useStore((s) => s.aportes);
  const parcelas = useStore((s) => s.parcelas);
  const addAporte = useStore((s) => s.addAporte);
  const updateAporte = useStore((s) => s.updateAporte);
  const removeAporte = useStore((s) => s.removeAporte);
  const gerarParcelasRepagamento = useStore((s) => s.gerarParcelasRepagamento);
  const reconfigurarParcelas = useStore((s) => s.reconfigurarParcelas);
  const pagarParcela = useStore((s) => s.pagarParcela);
  const getDividaTotalSocios = useStore((s) => s.getDividaTotalSocios);
  const getDividaPorSocio = useStore((s) => s.getDividaPorSocio);
  const getTotalAportadoPorSocio = useStore((s) => s.getTotalAportadoPorSocio);
  const getTotalDevolvidoPorSocio = useStore((s) => s.getTotalDevolvidoPorSocio);
  const getSaldoAporte = useStore((s) => s.getSaldoAporte);
  const getEstudoFluxoCaixa = useStore((s) => s.getEstudoFluxoCaixa);
  const getHistoricoAportes = useStore((s) => s.getHistoricoAportes);
  const getHistoricoRepagamentos = useStore((s) => s.getHistoricoRepagamentos);

  // Dialogs Aportes
  const [aporteDialogOpen, setAporteDialogOpen] = useState(false);
  const [editingAporte, setEditingAporte] = useState<AporteSocio | null>(null);
  const [aporteForm, setAporteForm] = useState({
    socioId: "",
    valor: 0,
    data: new Date().toISOString().slice(0, 10),
    descricao: "",
    motivo: "Compra de Motos" as MotivoAporte,
    tipo: "Operacional" as "Inicial" | "Operacional" | "Expansao",
    percentualSocietarioNaData: 0,
  });

  // Dialog Parcelas
  const [parcelaDialogOpen, setParcelaDialogOpen] = useState(false);
  const [parcelaAporteId, setParcelaAporteId] = useState("");
  const [parcelaForm, setParcelaForm] = useState({ qtdParcelas: 12, valorPorParcela: 0 });

  // Dialog Pagar Parcela
  const [pagarParcelaDialogOpen, setPagarParcelaDialogOpen] = useState(false);
  const [pagarParcelaId, setPagarParcelaId] = useState("");
  const [pagarForm, setPagarForm] = useState({ valorPago: 0, dataPagamento: new Date().toISOString().slice(0, 10) });

  // Dialog Reconfigurar
  const [reconfigDialogOpen, setReconfigDialogOpen] = useState(false);
  const [reconfigAporteId, setReconfigAporteId] = useState("");
  const [reconfigForm, setReconfigForm] = useState({ novaQtd: 12, novoValor: 0 });

  // Confirmar exclusão de aporte
  const [deleteAporteId, setDeleteAporteId] = useState<string | null>(null);

  // Dividas por socio
  const socios = useMemo(() => {
    const filtered = funcionarios.filter((f) => f.ehSocio);
    // Deduplicate by id to prevent React key warnings
    return [...new Map(filtered.map((s) => [s.id, s])).values()];
  }, [funcionarios]);
  const dividaTotal = useMemo(() => mounted ? getDividaTotalSocios() : 0, [mounted, getDividaTotalSocios]);

  // Historico combinado
  const historicoCompleto = useMemo(() => {
    const itens: Array<{ data: Date; tipo: "Aporte" | "Repagamento"; socioNome: string; descricao: string; valor: number; saldoApos?: number }> = [];
    const histAportes = getHistoricoAportes();
    const histRepags = getHistoricoRepagamentos();
    for (const a of histAportes) {
      const socio = funcionarios.find((f) => f.id === a.socioId);
      itens.push({ data: new Date(a.data), tipo: "Aporte", socioNome: socio?.nome || "Sócio", descricao: `${a.motivo} - ${a.descricao}`, valor: a.valor });
    }
    for (const p of histRepags) {
      const socio = funcionarios.find((f) => f.id === p.socioId);
      itens.push({ data: p.dataPagamento ? new Date(p.dataPagamento) : new Date(p.dataPrevista), tipo: "Repagamento", socioNome: socio?.nome || "Sócio", descricao: `Parcela ${p.numero} (${p.status})`, valor: -p.valorPago });
    }
    itens.sort((a, b) => b.data.getTime() - a.data.getTime());
    return itens;
  }, [aportes, parcelas, funcionarios, getHistoricoAportes, getHistoricoRepagamentos]);

  const handleSaveAporte = () => {
    if (!aporteForm.socioId || aporteForm.valor <= 0) return;
    const aporte: AporteSocio = {
      id: editingAporte?.id || `aporte-${Date.now()}`,
      socioId: aporteForm.socioId,
      valor: aporteForm.valor,
      data: new Date(aporteForm.data),
      descricao: aporteForm.descricao,
      motivo: aporteForm.motivo,
      tipo: aporteForm.tipo,
      percentualSocietarioNaData: aporteForm.percentualSocietarioNaData,
      ativo: true,
    };
    if (editingAporte) {
      updateAporte(aporte.id, aporte);
    } else {
      addAporte(aporte);
    }
    setAporteDialogOpen(false);
    setEditingAporte(null);
    setAporteForm({ socioId: "", valor: 0, data: new Date().toISOString().slice(0, 10), descricao: "", motivo: "Compra de Motos", tipo: "Operacional", percentualSocietarioNaData: 0 });
  };

  const handleGerarParcelas = () => {
    if (!parcelaAporteId || parcelaForm.qtdParcelas <= 0) return;
    gerarParcelasRepagamento(parcelaAporteId, parcelaForm.qtdParcelas, parcelaForm.valorPorParcela || undefined);
    setParcelaDialogOpen(false);
    setParcelaAporteId("");
    setParcelaForm({ qtdParcelas: 12, valorPorParcela: 0 });
  };

  const handlePagarParcela = () => {
    if (!pagarParcelaId || pagarForm.valorPago <= 0) return;
    pagarParcela(pagarParcelaId, pagarForm.valorPago, new Date(pagarForm.dataPagamento));
    setPagarParcelaDialogOpen(false);
    setPagarParcelaId("");
    setPagarForm({ valorPago: 0, dataPagamento: new Date().toISOString().slice(0, 10) });
  };

  const handleReconfigurar = () => {
    if (!reconfigAporteId || reconfigForm.novaQtd <= 0) return;
    reconfigurarParcelas(reconfigAporteId, reconfigForm.novaQtd, reconfigForm.novoValor || undefined);
    setReconfigDialogOpen(false);
    setReconfigAporteId("");
    setReconfigForm({ novaQtd: 12, novoValor: 0 });
  };

  // Current month
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  // Estudo de Fluxo (deve vir depois de selectedMonth)
  const estudoFluxo = useMemo(() => mounted ? getEstudoFluxoCaixa(selectedMonth) : null, [mounted, getEstudoFluxoCaixa, selectedMonth, pctImposto]);

  // Dialogs
  const [funcDialogOpen, setFuncDialogOpen] = useState(false);
  const [editingFunc, setEditingFunc] = useState<Funcionario | null>(null);
  const [funcForm, setFuncForm] = useState({
    nome: "",
    funcao: "Comercial" as FuncaoFuncionario,
    salario: 0,
    percentualEmpresa: 0,
    percentualComissaoContratos: 0,
    percentualComissaoManutencao: 0,
    origemComissao: "Contratos de Locação" as OrigemComissao,
    ehSocio: false,
    ativo: true,
    contratosVinculados: [] as string[],
    comissaoPorContrato: {} as Record<string, number>,
  });

  // Computed values
  const faturamentoBruto = useMemo(() => mounted ? getFaturamentoBrutoMes(selectedMonth) : 0, [mounted, getFaturamentoBrutoMes, selectedMonth]);
  const receitaTotal = useMemo(() => mounted ? getReceitaTotalMes(selectedMonth) : 0, [mounted, getReceitaTotalMes, selectedMonth]);
  const receitaRecebida = useMemo(() => mounted ? getReceitaRecebidaMes(selectedMonth) : 0, [mounted, getReceitaRecebidaMes, selectedMonth]);
  const receitaAReceber = useMemo(() => mounted ? getReceitaAReceberMes(selectedMonth) : 0, [mounted, getReceitaAReceberMes, selectedMonth]);
  const fatBrutoRecebido = useMemo(() => mounted ? getFaturamentoBrutoRecebidoMes(selectedMonth) : 0, [mounted, getFaturamentoBrutoRecebidoMes, selectedMonth]);
  const fatBrutoAReceber = useMemo(() => mounted ? getFaturamentoBrutoAReceberMes(selectedMonth) : 0, [mounted, getFaturamentoBrutoAReceberMes, selectedMonth]);
  const imposto = useMemo(() => mounted ? getImpostoMes(selectedMonth) : 0, [mounted, getImpostoMes, selectedMonth, pctImposto]);
  const basePosImposto = useMemo(() => mounted ? getBasePosImpostoMes(selectedMonth) : 0, [mounted, getBasePosImpostoMes, selectedMonth, pctImposto]);
  const despesasTotais = useMemo(() => mounted ? getDespesasTotaisMes(selectedMonth) : 0, [mounted, getDespesasTotaisMes, selectedMonth]);
  const comissoesPorFunc = useMemo(() => mounted ? getComissaoPorFuncionario(selectedMonth) : [], [mounted, getComissaoPorFuncionario, selectedMonth, pctImposto]);
  const totalComissoes = useMemo(() => mounted ? getComissaoComercialMes(selectedMonth) : 0, [mounted, getComissaoComercialMes, selectedMonth, pctImposto]);
  const resultadoFinal = useMemo(() => mounted ? getResultadoFinalMes(selectedMonth) : 0, [mounted, getResultadoFinalMes, selectedMonth, pctImposto]);
  const divisaoSocietaria = useMemo(() => mounted ? getDivisaoSocietaria(selectedMonth) : [], [mounted, getDivisaoSocietaria, selectedMonth, pctImposto]);
  const quadroRecebimentos = useMemo(() => mounted ? getQuadroRecebimentos(selectedMonth) : [], [mounted, getQuadroRecebimentos, selectedMonth, pctImposto]);

  // Estado temporário para o slider de imposto + diálogo de confirmação
  const [pendingPctImposto, setPendingPctImposto] = useState<number | null>(null);
  const [confirmImpostoOpen, setConfirmImpostoOpen] = useState(false);

  function handleImpostoSliderChange(value: number) {
    setPendingPctImposto(value);
    setConfirmImpostoOpen(true);
  }

  function confirmarMudancaImposto() {
    if (pendingPctImposto !== null) {
      setPctImposto(pendingPctImposto);
    }
    setConfirmImpostoOpen(false);
    setPendingPctImposto(null);
  }

  function cancelarMudancaImposto() {
    setConfirmImpostoOpen(false);
    setPendingPctImposto(null);
  }
  
  // Lancamentos de salarios/comissoes do mes (vinculados por funcionarioResponsavelId ou classificacao legada)
  const lancamentosComissao = useMemo(() => {
    if (!mounted) return [];
    return lancamentos.filter((l) => {
      const hasFuncionarioLink = !!l.funcionarioResponsavelId;
      const isLegacyClassificacao = l.classificacao?.startsWith('Comissao') || l.classificacao === 'Pro-labore' || l.classificacao === 'Salario';
      if (!hasFuncionarioLink && !isLegacyClassificacao) return false;
      const d = l.data instanceof Date ? l.data : new Date(l.data);
      const lMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return lMes === selectedMonth;
    });
  }, [mounted, lancamentos, selectedMonth]);

  // Mau Uso selectors
  const getCobrancasMauUsoMes = useStore((s) => s.getCobrancasMauUsoMes);
  const getLucroMauUsoMes = useStore((s) => s.getLucroMauUsoMes);
  const getLucroMauUsoDetalhado = useStore((s) => s.getLucroMauUsoDetalhado);
  const cobrancasMauUso = useMemo(() => mounted ? getCobrancasMauUsoMes(selectedMonth) : [], [mounted, getCobrancasMauUsoMes, selectedMonth]);
  const lucroMauUsoTotal = useMemo(() => mounted ? getLucroMauUsoMes(selectedMonth) : 0, [mounted, getLucroMauUsoMes, selectedMonth]);
  const lucroMauUsoDetalhado = useMemo(() => mounted ? getLucroMauUsoDetalhado(selectedMonth) : [], [mounted, getLucroMauUsoDetalhado, selectedMonth]);

  function openAddFunc() {
    setEditingFunc(null);
    setFuncForm({ nome: "", funcao: "Comercial", salario: 0, percentualEmpresa: 0, percentualComissaoContratos: 0, percentualComissaoManutencao: 0, origemComissao: "Contratos de Locação", ehSocio: false, ativo: true, contratosVinculados: [], comissaoPorContrato: {} });
    setFuncDialogOpen(true);
  }

  function openEditFunc(f: Funcionario) {
    setEditingFunc(f);
    setFuncForm({
      nome: f.nome,
      funcao: f.funcao,
      salario: f.salario,
      percentualEmpresa: f.percentualEmpresa,
      percentualComissaoContratos: f.percentualComissaoContratos,
      percentualComissaoManutencao: f.percentualComissaoManutencao || 0,
      origemComissao: f.origemComissao || "Contratos de Locação",
      ehSocio: f.ehSocio,
      ativo: f.ativo,
      contratosVinculados: f.contratosVinculados || [],
      comissaoPorContrato: f.comissaoPorContrato || {},
    });
    setFuncDialogOpen(true);
  }

  function handleSaveFunc() {
    if (!funcForm.nome.trim()) { toast.error("Nome e obrigatorio"); return; }
    const syncFn = useStore.getState().syncLancamentosFuncionarioContrato;
    const removeFn = useStore.getState().removeLancamentosContratoFuncionario;
    const limparLegadasFn = useStore.getState().limparComissoesLegadas;
    if (editingFunc) {
      // Contratos desvinculados: remover seus lancamentos
      const contratosAntigos = editingFunc.contratosVinculados || [];
      const contratosNovos = funcForm.contratosVinculados || [];
      const desvinculados = contratosAntigos.filter((id: string) => !contratosNovos.includes(id));
      for (const cId of desvinculados) {
        if (removeFn) removeFn(editingFunc.id, cId);
      }
      // Limpar comissoes legadas (sem contratoId) antes de sincronizar as novas
      if (limparLegadasFn) limparLegadasFn(editingFunc.id);
      updateFuncionario(editingFunc.id, funcForm);
      // Sincronizar apos salvar (setTimeout para pegar estado atualizado com comissaoPorContrato)
      setTimeout(() => {
        for (const cId of contratosNovos) {
          syncFn(editingFunc.id, cId);
        }
      }, 150);
      toast.success(`Dados de ${funcForm.nome} atualizados. Lancamentos sincronizados.`);
    } else {
      const newId = `func-${Date.now()}`;
      addFuncionario({ id: newId, ...funcForm });
      setTimeout(() => {
        for (const cId of (funcForm.contratosVinculados || [])) {
          syncFn(newId, cId);
        }
      }, 150);
      toast.success(`${funcForm.nome} adicionado(a). Lancamentos sincronizados.`);
    }
    setFuncDialogOpen(false);
  }

  // Estado para confirmação de exclusão de funcionário via AlertDialog
  const [deleteFuncTarget, setDeleteFuncTarget] = useState<{ id: string; nome: string } | null>(null);

  function handleRemoveFunc(id: string, nome: string) {
    setDeleteFuncTarget({ id, nome });
  }

  function confirmRemoveFunc() {
    if (!deleteFuncTarget) return;
    removeFuncionario(deleteFuncTarget.id);
    toast.success(`${deleteFuncTarget.nome} removido(a)`);
    setDeleteFuncTarget(null);
  }

  const ativosCount = funcionarios.filter((f) => f.ativo).length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="size-6 text-[#14B8A6]" />
            Pagamentos e Comissões
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestão de funcionários, comissões, divisão societária e recebimentos
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <CalendarClock className="size-4 text-muted-foreground" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-semibold outline-none focus:ring-0"
            />
          </div>
                  </div>
      </div>

      {/* KPI Summary */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
            <TrendingDown className="size-4 text-[var(--motriz-verde-esmeralda)]" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums tracking-tight">{formatCurrency(receitaTotal)}</p>
            <div className="mt-1.5 flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="size-3" />Recebido: {formatCurrency(receitaRecebida)}</span>
              <span className="flex items-center gap-1 text-amber-600"><Timer className="size-3" />A Receber: {formatCurrency(receitaAReceber)}</span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">Contratos fixos + variavel do mes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Comissões</CardTitle>
            <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-600">{comissoesPorFunc.length} pessoa(s)</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums tracking-tight text-blue-600">{formatCurrency(totalComissoes)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Sobre base pos-imposto ({pctImposto}% imposto)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resultado Final do Mes</CardTitle>
            <FileText className="size-4 text-[#14B8A6]" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold tabular-nums tracking-tight ${resultadoFinal >= 0 ? 'text-[#14B8A6]' : 'text-[var(--motriz-vermelho)]'}`}>{formatCurrency(resultadoFinal)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Receita - Despesas - Imposto - Comissões</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Equipe Ativa</CardTitle>
            <Users className="size-4 text-[#14B8A6]" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums tracking-tight">{ativosCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">{funcionarios.length} cadastrado(s) no total</p>
          </CardContent>
        </Card>
      </section>

      {/* Lucro Mau Uso Card */}
      <Card className="border-orange-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-orange-600">
              <AlertTriangle className="size-4" />
              Lucro por Manutenção de Mau Uso
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-[10px] text-muted-foreground whitespace-nowrap">% Imposto (só sobre recebido)</Label>
              <div className="flex items-center gap-1.5">
                <Slider min={0} max={30} step={0.5} value={[pctImpostoMauUso]} onValueChange={([v]) => setPctImpostoMauUso(v)} className="w-20" />
                <span className="text-xs font-bold tabular-nums text-orange-600 w-10 text-right">{pctImpostoMauUso}%</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-4">
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wider text-green-600/70 mb-1">Lucro Líquido Total</p>
              <p className={`text-xl font-bold tabular-nums ${lucroMauUsoTotal >= 0 ? 'text-green-600' : 'text-[var(--motriz-vermelho)]'}`}>{formatCurrency(lucroMauUsoTotal)}</p>
            </div>
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wider text-blue-600/70 mb-1">Comissão Técnicos (Total)</p>
              <p className="text-xl font-bold tabular-nums text-blue-600">{formatCurrency(lucroMauUsoDetalhado.reduce((acc, item) => acc + item.comissaoTecnico, 0))}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {lucroMauUsoDetalhado.length > 0
                  ? `${(lucroMauUsoDetalhado.reduce((acc, item) => acc + item.pctComissao, 0) / lucroMauUsoDetalhado.length).toFixed(1)}% média`
                  : '—'}
              </p>
            </div>
            <div className="rounded-lg border border-orange-500/10 bg-orange-500/5 p-3 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wider text-orange-600/70 mb-1">Cobranças Geradas</p>
              <p className="text-xl font-bold tabular-nums text-orange-600">{cobrancasMauUso.length}</p>
            </div>
            <div className="rounded-lg border border-orange-500/10 bg-orange-500/5 p-3 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wider text-orange-600/70 mb-1">Pendentes</p>
              <p className="text-xl font-bold tabular-nums text-amber-600">{cobrancasMauUso.filter(c => c.status === 'Pendente').length}</p>
            </div>
            <div className="rounded-lg border border-orange-500/10 bg-orange-500/5 p-3 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wider text-orange-600/70 mb-1">Recebidas</p>
              <p className="text-xl font-bold tabular-nums text-green-600">{cobrancasMauUso.filter(c => c.status === 'Recebido').length}</p>
            </div>
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wider text-purple-600/70 mb-1">% Comissão Técnico</p>
              <p className="text-xl font-bold tabular-nums text-purple-600">
                {lucroMauUsoDetalhado.length > 0
                  ? `${(lucroMauUsoDetalhado.reduce((acc, item) => acc + item.pctComissao, 0) / lucroMauUsoDetalhado.length).toFixed(1)}%`
                  : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">sobre base pós-imposto</p>
            </div>
          </div>

          {/* Detalhamento por técnico */}
          {lucroMauUsoDetalhado.length > 0 && (() => {
            const porTecnico = lucroMauUsoDetalhado.reduce((acc, item) => {
              const key = item.tecnicoNome || 'Não informado';
              if (!acc[key]) acc[key] = { nome: key, comissao: 0, pct: 0, count: 0 };
              acc[key].comissao += item.comissaoTecnico;
              acc[key].pct += item.pctComissao;
              acc[key].count += 1;
              return acc;
            }, {} as Record<string, { nome: string; comissao: number; pct: number; count: number }>);
            const tecnicos = Object.values(porTecnico);
            return (
              <div className="mb-4 rounded-lg border border-blue-500/10 bg-blue-500/5 p-3">
                <p className="text-xs font-semibold text-blue-600 mb-2 flex items-center gap-1">
                  👷 Comissão por Técnico (Mau Uso)
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {tecnicos.map((tec) => (
                    <div key={tec.nome} className="flex items-center justify-between rounded-md border border-blue-500/10 bg-white/50 dark:bg-black/20 px-3 py-2">
                      <div>
                        <p className="text-xs font-medium">{tec.nome}</p>
                        <p className="text-[10px] text-muted-foreground">{tec.count} cobrança(s) · {(tec.pct / tec.count).toFixed(1)}%</p>
                      </div>
                      <p className="text-sm font-bold tabular-nums text-blue-600">{formatCurrency(tec.comissao)}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {lucroMauUsoDetalhado.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Detalhamento por Cobrança:</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px]">Descrição</TableHead>
                    <TableHead className="text-[10px] text-right">Valor Cobrado</TableHead>
                    <TableHead className="text-[10px] text-right">Imposto ({pctImpostoMauUso}%)</TableHead>
                    <TableHead className="text-[10px] text-right">Custo Itens</TableHead>
                    <TableHead className="text-[10px] text-right">Comissão Téc.</TableHead>
                    <TableHead className="text-[10px] text-right">Lucro Líquido</TableHead>
                    <TableHead className="text-[10px] text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lucroMauUsoDetalhado.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs">{item.descricao}</TableCell>
                      <TableCell className="text-xs tabular-nums text-right">{formatCurrency(item.valorCobrado)}</TableCell>
                      <TableCell className="text-xs tabular-nums text-right text-[var(--motriz-vermelho)]">−{formatCurrency(item.imposto)}</TableCell>
                      <TableCell className="text-xs tabular-nums text-right text-[var(--motriz-vermelho)]">−{formatCurrency(item.custoItens)}</TableCell>
                      <TableCell className="text-xs tabular-nums text-right text-blue-600">−{formatCurrency(item.comissaoTecnico)} ({item.pctComissao}%)</TableCell>
                      <TableCell className={`text-xs tabular-nums text-right font-bold ${item.lucro >= 0 ? 'text-orange-600' : 'text-[var(--motriz-vermelho)]'}`}>{formatCurrency(item.lucro)}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={`text-[10px] ${item.status === 'Recebido' ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'}`}>
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-3 rounded-md border border-dashed border-orange-500/20 bg-orange-500/5 p-2.5">
            <p className="text-[10px] text-muted-foreground">
              💡 <strong>Fórmula:</strong> Lucro = Valor Cobrado − Imposto ({pctImpostoMauUso}%, só sobre o recebido) − Custo dos Itens (sem imposto, já embutido) − Comissão do Técnico (% sobre base pós-imposto).
              O custo da empresa (peças/técnico) já vem com imposto embutido — por isso o imposto só é deduzido do valor que cobramos do cliente.
              Se o mau uso foi identificado mas não cobramos, o valor fica negativo para auditoria.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Relatório de Vendas de Motos */}
      {(() => {
        // Filtra apenas vendas do mês selecionado
        const vendasMesTodas = historicoVendas.filter((v) => {
          if (!selectedMonth) return true;
          const [year, month] = selectedMonth.split("-").map(Number);
          const d = new Date(v.dataVenda);
          return d.getFullYear() === year && d.getMonth() === month - 1;
        });
        // KPIs e tabela consideram APENAS vendas com status "Recebido"
        // (vendas Pendente/Previsto não entram no resultado financeiro do mês)
        const vendasMes = vendasMesTodas.filter((v) => v.statusPagamento === "Recebido");
        const totalVendidoMes = vendasMes.reduce((acc, v) => acc + (v.valorVenda || 0), 0);
        const lucroLiquidoMes = vendasMes.reduce((acc, v) => acc + (v.lucroLiquido || 0), 0);
        const comissoesMes = vendasMes.reduce((acc, v) => acc + (v.comissaoValor || 0), 0);
        const impostosMes = vendasMes.reduce((acc, v) => acc + (v.impostoValor || 0), 0);
        const custoVeiculosMes = vendasMes.reduce((acc, v) => acc + (v.valorContabil || 0), 0);
        const vendasPendentesMes = vendasMesTodas.filter((v) => v.statusPagamento !== "Recebido").length;

        return (
          <Card className="border-[var(--motriz-verde-esmeralda)]/30 bg-[var(--motriz-verde-esmeralda)]/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-[var(--motriz-verde-esmeralda)]">
                <DollarSign className="size-4" />
                Lucro por Venda de Motos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* KPIs Resumo */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-green-600/70 mb-1">Total Vendido</p>
                  <p className="text-xl font-bold tabular-nums text-green-600">{formatCurrency(totalVendidoMes)}</p>
                </div>
                <div className="rounded-lg border border-muted/20 bg-muted/5 p-3 text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Custo Veículos</p>
                  <p className="text-xl font-bold tabular-nums text-muted-foreground">{formatCurrency(custoVeiculosMes)}</p>
                </div>
                <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3 text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-orange-600/70 mb-1">Imposto</p>
                  <p className="text-xl font-bold tabular-nums text-orange-600">{formatCurrency(impostosMes)}</p>
                </div>
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-blue-600/70 mb-1">Comissões</p>
                  <p className="text-xl font-bold tabular-nums text-blue-600">{formatCurrency(comissoesMes)}</p>
                </div>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-600/70 mb-1">Lucro Líquido</p>
                  <p className={`text-xl font-bold tabular-nums ${lucroLiquidoMes >= 0 ? 'text-emerald-600' : 'text-[var(--motriz-vermelho)]'}`}>{formatCurrency(lucroLiquidoMes)}</p>
                </div>
              </div>

              {/* Tabela Detalhada */}
              {vendasMes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Detalhamento por Venda:</p>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[10px]">Data</TableHead>
                          <TableHead className="text-[10px]">Moto / Chassi</TableHead>
                          <TableHead className="text-[10px]">Comprador</TableHead>
                          <TableHead className="text-[10px] text-right">Venda</TableHead>
                          <TableHead className="text-[10px] text-right">Custo</TableHead>
                          <TableHead className="text-[10px] text-right">Imposto</TableHead>
                          <TableHead className="text-[10px] text-right">Comissão Venda</TableHead>
                          <TableHead className="text-[10px] text-right">Lucro Líq.</TableHead>
                          <TableHead className="text-[10px] text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendasMes.sort((a, b) => new Date(b.dataVenda).getTime() - new Date(a.dataVenda).getTime()).map((v) => {
                          const vendedor = funcionarios.find((f) => f.id === v.funcionarioResponsavelId);
                          return (
                            <TableRow key={v.id}>
                              <TableCell className="text-xs tabular-nums whitespace-nowrap">{new Date(v.dataVenda).toLocaleDateString("pt-BR")}</TableCell>
                              <TableCell className="text-xs">
                                <p className="font-medium">{v.modelo}{v.cor ? ` (${v.cor})` : ""}</p>
                                <p className="text-[10px] font-mono text-muted-foreground">{v.chassi}</p>
                              </TableCell>
                              <TableCell className="text-xs">{v.compradorNome}</TableCell>
                              <TableCell className="text-xs tabular-nums text-right font-medium">{formatCurrency(v.valorVenda)}</TableCell>
                              <TableCell className="text-xs tabular-nums text-right text-muted-foreground">{formatCurrency(v.valorContabil)}</TableCell>
                              <TableCell className="text-xs tabular-nums text-right text-orange-600">−{formatCurrency(v.impostoValor || 0)} ({v.impostoPercentual}%)</TableCell>
                              <TableCell className="text-xs tabular-nums text-right text-blue-600">
                                {(v.comissaoValor || 0) > 0 ? (
                                  <>
                                    <p>−{formatCurrency(v.comissaoValor)} ({v.comissaoPercentual}%)</p>
                                    <p className="text-[10px] text-muted-foreground font-normal">{vendedor?.nome || "—"}</p>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className={`text-xs tabular-nums text-right font-bold ${(v.lucroLiquido || 0) >= 0 ? 'text-emerald-600' : 'text-[var(--motriz-vermelho)]'}`}>{formatCurrency(v.lucroLiquido || 0)}</TableCell>
                              <TableCell className="text-center">
                                <Badge className={`text-[10px] ${v.statusPagamento === 'Recebido' ? 'bg-green-500/10 text-green-600' : v.statusPagamento === 'Previsto' ? 'bg-blue-500/10 text-blue-600' : 'bg-amber-500/10 text-amber-600'}`}>
                                  {v.statusPagamento}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {vendasMes.length === 0 && vendasPendentesMes === 0 && (
                <p className="text-xs text-muted-foreground italic text-center py-4">Nenhuma venda de moto registrada neste período.</p>
              )}
              {vendasMes.length === 0 && vendasPendentesMes > 0 && (
                <p className="text-xs text-amber-600 italic text-center py-4">
                  ⚠️ {vendasPendentesMes} venda(s) pendente(s) neste período — não entram no resultado até serem recebidas.
                </p>
              )}
              {vendasPendentesMes > 0 && vendasMes.length > 0 && (
                <p className="text-[10px] text-amber-600 mt-2">
                  ⚠️ +{vendasPendentesMes} venda(s) pendente(s) não contabilizada(s) neste resumo.
                </p>
              )}

              <div className="mt-3 rounded-md border border-dashed border-emerald-500/20 bg-emerald-500/5 p-2.5">
                <p className="text-[10px] text-muted-foreground">
                  💡 <strong>Fórmula:</strong> Lucro Líquido = Valor da Venda − Imposto (X%) − Comissão do Vendedor (Y%) − Custo Contábil do Veículo.
                  A comissão de venda é lançada automaticamente como despesa variável ("Comissão Venda") vinculada ao funcionário responsável pela venda.
                  O lucro líquido das vendas compõe o resultado final da empresa para distribuição societária.
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Waterfall + Divisao Societaria */}
      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="size-4 text-[#14B8A6]" />
              Cascata de Cálculo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              <WaterfallStep label="Faturamento Bruto (Contratos)" value={formatCurrency(faturamentoBruto)} tone="positive" />
              <div className="ml-6 -mt-1 mb-1 flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="size-2.5" />Recebido: {formatCurrency(fatBrutoRecebido)}</span>
                <span className="flex items-center gap-1 text-amber-600"><Timer className="size-2.5" />A Receber: {formatCurrency(fatBrutoAReceber)}</span>
              </div>
              <WaterfallArrow />
              <WaterfallStep label={`Imposto (${pctImposto}%)`} value={`- ${formatCurrency(imposto)}`} tone="negative" prefix="(-)" />
              <WaterfallArrow />
              <WaterfallStep label="Base Pos-Imposto" value={formatCurrency(basePosImposto)} tone="accent" prefix="(=)" />
              <WaterfallArrow />
              <WaterfallStep label="Despesas Operacionais" value={`- ${formatCurrency(despesasTotais)}`} tone="negative" prefix="(-)" />
              <WaterfallArrow />
              <WaterfallStep label="Comissões (pós-imposto)" value={`- ${formatCurrency(totalComissoes)}`} tone="negative" prefix="(-)" />
              <WaterfallArrow />
              <WaterfallStep label="Resultado Final do Mes" value={formatCurrency(resultadoFinal)} tone="final" prefix="(=)" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Imposto %:</Label>
              <Slider min={0} max={30} step={0.5} value={[pctImposto]} onValueChange={([v]) => handleImpostoSliderChange(v)} className="flex-1" />
              <span className="text-xs font-bold tabular-nums w-10 text-right">{pctImposto}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Divisao Societaria */}
        <Card className="border-purple-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-purple-600">
              <PieChart className="size-4" />
              Divisão Societária do Resultado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Resultado Final: <strong className="text-[#14B8A6]">{formatCurrency(resultadoFinal)}</strong> dividido entre os sócios
            </p>
            {divisaoSocietaria.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhum sócio cadastrado com participação.</p>
            ) : (
              <div className="space-y-2">
                {divisaoSocietaria.map((d) => (
                  <div key={d.funcionarioId} className="flex items-center justify-between rounded-md border border-purple-500/10 bg-purple-500/5 p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{d.nome}</span>
                      <Badge className="bg-purple-500/10 text-purple-600 text-[10px]">{d.percentual}%</Badge>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-purple-600">{formatCurrency(d.valor)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Funcionarios e Socios */}
      <section>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="size-4 text-[#14B8A6]" />
              Funcionarios e Socios
            </CardTitle>
            <Button size="sm" onClick={openAddFunc} className="bg-[#14B8A6] hover:bg-[#0D9488]">
              <UserPlus className="mr-1.5 size-3.5" />
              Add Funcionario
            </Button>
          </CardHeader>
          <CardContent>
            {funcionarios.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhum funcionário cadastrado. Clique em "Add Funcionário" para começar.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Nome</TableHead>
                      <TableHead className="text-xs">Funcao</TableHead>
                      <TableHead className="text-xs text-center">Status</TableHead>
                      <TableHead className="text-xs text-right">Salario/Pro-labore</TableHead>
                      <TableHead className="text-xs text-right">% Comissao</TableHead>
                      <TableHead className="text-xs text-right">% Empresa</TableHead>
                      <TableHead className="text-xs text-right">Recebe no Mes</TableHead>
                      <TableHead className="text-xs text-center w-[80px]">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {funcionarios.map((f) => {
                      const quad = quadroRecebimentos.find((q) => q.funcionarioId === f.id);
                      return (
                        <TableRow key={f.id}>
                          <TableCell className="text-sm font-medium">
                            {f.ehSocio && <span className="mr-1">👑</span>}
                            {f.nome}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[10px]">{f.funcao}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`text-[10px] ${f.ativo ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-600'}`}>
                              {f.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm tabular-nums text-right">{formatCurrency(f.salario)}</TableCell>
                          <TableCell className="text-sm tabular-nums text-right text-blue-600">
                            {f.percentualComissaoContratos > 0 ? `${f.percentualComissaoContratos}%` : '--'}
                          </TableCell>
                          <TableCell className="text-sm tabular-nums text-right text-purple-600">
                            {f.percentualEmpresa > 0 ? `${f.percentualEmpresa}%` : '--'}
                          </TableCell>
                          <TableCell className="text-sm tabular-nums text-right font-bold text-[#14B8A6]">
                            {quad ? formatCurrency(quad.total) : formatCurrency(0)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" className="size-7" onClick={() => openEditFunc(f)}>
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="size-7 text-red-500 hover:text-red-600" onClick={() => handleRemoveFunc(f.id, f.nome)}>
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Quadro de Recebimentos do Mes */}
      {quadroRecebimentos.length > 0 && (
        <section>
          <Card className="border-[#14B8A6]/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-[#14B8A6]">
                <Briefcase className="size-4" />
                Quadro de Recebimentos - {selectedMonth}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Nome</TableHead>
                      <TableHead className="text-xs">Funcao</TableHead>
                      <TableHead className="text-xs text-right">Salario/Pro-labore</TableHead>
                      <TableHead className="text-xs text-right">Comissao</TableHead>
                      <TableHead className="text-xs text-right">Participacao</TableHead>
                      <TableHead className="text-xs text-right font-bold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quadroRecebimentos.map((q) => (
                      <TableRow key={q.funcionarioId}>
                        <TableCell className="text-sm font-medium">
                          {q.ehSocio && <span className="mr-1">👑</span>}
                          {q.nome}
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="text-[10px]">{q.funcao}</Badge></TableCell>
                        <TableCell className="text-sm tabular-nums text-right">{formatCurrency(q.salario)}</TableCell>
                        <TableCell className="text-sm tabular-nums text-right text-blue-600">
                          <span
                            className="cursor-help border-b border-dashed border-blue-400/50"
                            title={q.comissaoMauUsoCount > 0
                              ? `Comissão Contratos: ${formatCurrency(q.comissao - q.comissaoMauUso)}\nComissão Mau Uso: ${formatCurrency(q.comissaoMauUso)} (${q.comissaoMauUsoPct.toFixed(1)}% × ${q.comissaoMauUsoCount} cobrança(s))\nTotal Comissão: ${formatCurrency(q.comissao)}`
                              : `Comissão sobre contratos de locação: ${formatCurrency(q.comissao)}`}
                          >
                            {formatCurrency(q.comissao)}
                          </span>
                          {q.comissaoMauUsoCount > 0 && (
                            <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[9px] font-medium text-orange-600" title={`${q.comissaoMauUsoCount} cobrança(s) de mau uso · ${q.comissaoMauUsoPct.toFixed(1)}% sobre base pós-imposto`}>
                              ⚠{q.comissaoMauUsoCount}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums text-right text-purple-600">{formatCurrency(q.participacao)}</TableCell>
                        <TableCell className="text-sm tabular-nums text-right font-bold text-[#14B8A6]">{formatCurrency(q.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Info Box */}
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <Info className="size-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Salario/Pro-labore</strong>: valor fixo mensal cadastrado. <strong>Comissao Contratos</strong>: % sobre o faturamento dos contratos apos deduzir {pctImposto}% de imposto. <strong>% Empresa</strong>: participacao no resultado final do mes (apos todas as deducoes).
            </p>
            <p>
              A porcentagem de cada sócio é editável no cadastro de funcionários abaixo. O resultado final é: Receita Total - Despesas - Imposto - Comissões.
            </p>
          </div>
        </div>
      </div>

      {/* Dialog: Add/Edit Funcionario */}
      <Dialog open={funcDialogOpen} onOpenChange={setFuncDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFunc ? `Editar ${editingFunc.nome}` : 'Adicionar Funcionario/Socio'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome *</Label>
              <Input value={funcForm.nome} onChange={(e) => setFuncForm({ ...funcForm, nome: e.target.value })} placeholder="Ex: Joao, William, Murilo..." />
            </div>

            {/* Funcao */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Funcao *</Label>
              <Select value={funcForm.funcao} onValueChange={(v) => setFuncForm({ ...funcForm, funcao: v as FuncaoFuncionario, ehSocio: v === 'Socio' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FUNCOES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="flex items-center gap-3">
              <Label className="text-xs font-semibold">Ativo?</Label>
              <button
                type="button"
                onClick={() => setFuncForm({ ...funcForm, ativo: !funcForm.ativo })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${funcForm.ativo ? 'bg-[#14B8A6]' : 'bg-gray-300'}`}
              >
                <span className={`inline-block size-3.5 rounded-full bg-white transition-transform ${funcForm.ativo ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-xs text-muted-foreground">{funcForm.ativo ? 'Ativo' : 'Inativo'}</span>
            </div>

            {/* Salario / Pro-labore */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Salario / Pro-labore (R$/mes)</Label>
              <Input type="number" min="0" step="100" value={funcForm.salario || ""} onChange={(e) => setFuncForm({ ...funcForm, salario: parseFloat(e.target.value) || 0 })} placeholder="0" />
              <p className="text-[10px] text-muted-foreground">Valor fixo mensal. Para socios, usar como pro-labore.</p>
            </div>

            {/* % Comissao Contratos */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">% Comissao sobre Alugueis (pos-imposto)</Label>
                <span className="text-sm font-bold tabular-nums text-blue-600">{funcForm.percentualComissaoContratos}%</span>
              </div>
              <Slider min={0} max={20} step={0.5} value={[funcForm.percentualComissaoContratos]} onValueChange={([v]) => setFuncForm({ ...funcForm, percentualComissaoContratos: v })} />
              <p className="text-[10px] text-muted-foreground">
                Comissão sobre o faturamento dos contratos após deduzir {pctImposto}% de imposto. Ex: João = 8%. Deixar 0 se não recebe comissão.
              </p>
            </div>

            {/* % Comissao Manutencao Mau Uso */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">% Comissao sobre Manutencao de Mau Uso</Label>
                <span className="text-sm font-bold tabular-nums text-orange-600">{funcForm.percentualComissaoManutencao}%</span>
              </div>
              <Slider min={0} max={30} step={0.5} value={[funcForm.percentualComissaoManutencao]} onValueChange={([v]) => setFuncForm({ ...funcForm, percentualComissaoManutencao: v })} />
              <p className="text-[10px] text-muted-foreground">
                Comissão sobre o lucro líquido de manutenções por mau uso do cliente. Cálculo: (Valor Cobrado - {pctImposto}% Imposto - Custo dos Itens) x %. Ex: bateria custa R$5.000, cobra R$6.500 - lucro = R$6.500 - R$650 - R$5.000 = R$850 - técnico recebe sua % sobre R$850.
              </p>
            </div>

            {/* Origem da Comissao */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Origem da Comissao</Label>
              <Select value={funcForm.origemComissao || 'Contratos de Locação'} onValueChange={(v) => setFuncForm({ ...funcForm, origemComissao: v as OrigemComissao })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Contratos de Locação">Contratos de Locação</SelectItem>
                  <SelectItem value="Vendas de Motos">Vendas de Motos</SelectItem>
                  <SelectItem value="Ambos">Ambos (Locacao + Vendas)</SelectItem>
                  <SelectItem value="Nenhum">Nenhum</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Define de onde vem a base de calculo da comissao. "Contratos de Locação" = base pos-imposto dos alugueis. "Vendas de Motos" = valor das vendas atribuidas a este funcionario. "Ambos" = soma das duas bases.
              </p>
            </div>

            {/* Contratos Vinculados */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Contratos Vinculados</Label>
              <p className="text-[10px] text-muted-foreground">
                Selecione os contratos que este funcionário atende. Salários e comissões serão gerados apenas durante a vigência destes contratos. Se nenhum for selecionado, será usada a regra padrão de 24 meses.
              </p>
              {contratos.filter((c) => c.status === 'Ativo').length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhum contrato ativo disponivel.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto rounded-md border border-border p-2 space-y-1.5">
                  {contratos.filter((c) => c.status === 'Ativo').map((c) => {
                    const cliente = clientes.find((cl) => cl.id === c.clienteId);
                    const isChecked = funcForm.contratosVinculados.includes(c.id);
                    const pctContrato = funcForm.comissaoPorContrato[c.id] ?? 0;
                    return (
                      <div key={c.id} className="rounded border border-border/50 bg-muted/20 px-2 py-1.5 space-y-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFuncForm({ ...funcForm, contratosVinculados: [...funcForm.contratosVinculados, c.id] });
                              } else {
                                const novosContratos = funcForm.contratosVinculados.filter((id) => id !== c.id);
                                const novaComissao = { ...funcForm.comissaoPorContrato };
                                delete novaComissao[c.id];
                                setFuncForm({ ...funcForm, contratosVinculados: novosContratos, comissaoPorContrato: novaComissao });
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-xs flex-1">
                            {cliente?.nome || 'Cliente'} — {c.numeroContrato || c.id.slice(0, 6)}
                            {c.dataTermino && (
                              <span className="text-muted-foreground ml-1">
                                (até {new Date(c.dataTermino).toLocaleDateString('pt-BR')})
                              </span>
                            )}
                          </span>
                        </label>
                        {isChecked && funcForm.ehSocio && (
                          <div className="flex items-center gap-2 pl-5">
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">% Comissão neste contrato:</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={pctContrato}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setFuncForm({
                                  ...funcForm,
                                  comissaoPorContrato: { ...funcForm.comissaoPorContrato, [c.id]: val },
                                });
                              }}
                              className="w-16 h-6 text-xs rounded border border-border px-1.5 text-center"
                            />
                            <span className="text-[10px] text-blue-600 font-medium">
                              {pctContrato > 0 ? `→ R$ ${(((c.valorMensalTotal || 0) + (c.locacoesExtras || []).reduce((s, ex) => s + (ex.valorMensal || 0), 0)) * (1 - (pctImposto || 10) / 100) * pctContrato / 100).toFixed(2)}/mês` : '—'}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* % Empresa (Socios) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">% Participacao na Empresa (Socios)</Label>
                <span className="text-sm font-bold tabular-nums text-purple-600">{funcForm.percentualEmpresa}%</span>
              </div>
              <Slider min={0} max={100} step={1} value={[funcForm.percentualEmpresa]} onValueChange={([v]) => setFuncForm({ ...funcForm, percentualEmpresa: v, ehSocio: v > 0 })} />
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={funcForm.ehSocio} onChange={(e) => setFuncForm({ ...funcForm, ehSocio: e.target.checked })} className="rounded" />
                <Label className="text-[10px] text-muted-foreground">Marcar como sócio (recebe % do resultado final do mês)</Label>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Ex: Murilo = 90%, João = 10%. A soma dos sócios deve ser 100%. O resultado final = Receita - Despesas - Imposto - Comissões.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFuncDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveFunc} className="bg-[#14B8A6] hover:bg-[#0D9488]">
              {editingFunc ? 'Salvar Alteracoes' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ESTUDO DE FLUXO DE CAIXA */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {estudoFluxo && (
        <div className="space-y-4 mt-8">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="size-5 text-[var(--motriz-azul)]" />
            Estudo de Fluxo de Caixa
          </h2>
          <Card className="border-l-4 border-l-[var(--motriz-azul)]">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-muted-foreground">Receita Fixa Prevista</p>
                  <p className="text-lg font-bold tabular-nums text-[var(--motriz-verde-esmeralda)]">{formatCurrency(estudoFluxo.receitaFixaPrevista)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-muted-foreground">Receita Variavel Estimada</p>
                  <p className="text-lg font-bold tabular-nums text-[var(--motriz-verde-esmeralda)]">{formatCurrency(estudoFluxo.receitaVariavelEstimada)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-muted-foreground">Despesas Fixas</p>
                  <p className="text-lg font-bold tabular-nums text-[var(--motriz-vermelho)]">-{formatCurrency(estudoFluxo.despesasFixas)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-muted-foreground">Imposto + Comissões</p>
                  <p className="text-lg font-bold tabular-nums text-[var(--motriz-vermelho)]">-{formatCurrency(estudoFluxo.impostoEstimado + estudoFluxo.comissoesEstimadas)}</p>
                </div>
              </div>
              <div className="border-t pt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-muted-foreground">Receita Total Prevista</p>
                  <p className="text-xl font-bold tabular-nums">{formatCurrency(estudoFluxo.receitaTotalPrevista)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-muted-foreground">Sobra Liquida (para repagamento)</p>
                  <p className={`text-xl font-bold tabular-nums ${estudoFluxo.sobraLiquida >= 0 ? "text-[var(--motriz-verde-esmeralda)]" : "text-[var(--motriz-vermelho)]"}`}>
                    {formatCurrency(estudoFluxo.sobraLiquida)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-muted-foreground">Parcela Sugerida ({estudoFluxo.parcelasPendentesCount} pendentes)</p>
                  <p className="text-xl font-bold tabular-nums text-[var(--motriz-azul)]">{formatCurrency(estudoFluxo.parcelaSugerida)}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3">
                Cálculo: Receita Total Prevista - Despesas Fixas - Imposto ({pctImposto}%) - Comissões = Sobra Líquida.
                A parcela sugerida divide a sobra pelo numero de parcelas pendentes restantes.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* APORTES DOS SOCIOS */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="space-y-4 mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="size-5 text-[var(--motriz-ambar)]" />
            Aportes dos Socios
          </h2>
          <Button size="sm" onClick={() => { setEditingAporte(null); setAporteForm({ socioId: socios[0]?.id || "", valor: 0, data: new Date().toISOString().slice(0, 10), descricao: "", motivo: "Compra de Motos", tipo: "Operacional", percentualSocietarioNaData: socios[0]?.percentualEmpresa || 0 }); setAporteDialogOpen(true); }} className="bg-[var(--motriz-ambar)] hover:bg-[var(--motriz-ambar)]/90 text-white">
            + Registrar Aporte
          </Button>
        </div>

        {/* Cards de resumo por socio */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {socios.map((socio) => {
            const totalAportado = getTotalAportadoPorSocio(socio.id);
            const totalDevolvido = getTotalDevolvidoPorSocio(socio.id);
            const saldoAPagar = getDividaPorSocio(socio.id);
            return (
              <Card key={socio.id} className="border-l-4 border-l-[var(--motriz-ambar)]">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-sm">{socio.nome}</p>
                      <p className="text-[11px] text-muted-foreground">{socio.percentualEmpresa}% societario</p>
                    </div>
                    <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${saldoAPagar > 0 ? "bg-[var(--motriz-vermelho)]/10 text-[var(--motriz-vermelho)]" : "bg-[var(--motriz-verde-esmeralda)]/10 text-[var(--motriz-verde-esmeralda)]"}`}>
                      {saldoAPagar > 0 ? "Em aberto" : "Quitado"}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Total Aportado</p>
                      <p className="text-sm font-bold tabular-nums">{formatCurrency(totalAportado)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Total Devolvido</p>
                      <p className="text-sm font-bold tabular-nums text-[var(--motriz-verde-esmeralda)]">{formatCurrency(totalDevolvido)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Saldo a Pagar</p>
                      <p className={`text-sm font-bold tabular-nums ${saldoAPagar > 0 ? "text-[var(--motriz-vermelho)]" : "text-[var(--motriz-verde-esmeralda)]"}`}>{formatCurrency(saldoAPagar)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabela de aportes */}
        {aportes.length > 0 && (
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-[11px] text-muted-foreground uppercase tracking-wider">
                      <th className="pb-2 pr-3">Socio</th>
                      <th className="pb-2 pr-3">Data</th>
                      <th className="pb-2 pr-3">Motivo</th>
                      <th className="pb-2 pr-3">Descricao</th>
                      <th className="pb-2 pr-3 text-right">Valor</th>
                      <th className="pb-2 pr-3 text-right">Saldo Restante</th>
                      <th className="pb-2 pr-3 text-center">Status</th>
                      <th className="pb-2 text-center">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aportes.map((aporte) => {
                      const socio = funcionarios.find((f) => f.id === aporte.socioId);
                      const saldo = getSaldoAporte(aporte.id);
                      return (
                        <tr key={aporte.id} className="border-b last:border-0">
                          <td className="py-2 pr-3 font-medium">{socio?.nome || "-"}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{new Date(aporte.data).toLocaleDateString("pt-BR")}</td>
                          <td className="py-2 pr-3">
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted">{aporte.motivo}</span>
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground max-w-[200px] truncate">{aporte.descricao}</td>
                          <td className="py-2 pr-3 text-right font-medium tabular-nums">{formatCurrency(aporte.valor)}</td>
                          <td className={`py-2 pr-3 text-right font-bold tabular-nums ${saldo > 0 ? "text-[var(--motriz-vermelho)]" : "text-[var(--motriz-verde-esmeralda)]"}`}>{formatCurrency(saldo)}</td>
                          <td className="py-2 pr-3 text-center">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${saldo > 0 ? "bg-[var(--motriz-ambar)]/10 text-[var(--motriz-ambar)]" : "bg-[var(--motriz-verde-esmeralda)]/10 text-[var(--motriz-verde-esmeralda)]"}`}>
                              {saldo > 0 ? "Ativo" : "Quitado"}
                            </span>
                          </td>
                          <td className="py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" className="size-7" onClick={() => { setParcelaAporteId(aporte.id); const aporteVal = aporte.valor; const devolvido = parcelas.filter(p => p.aporteId === aporte.id).reduce((s, p) => s + p.valorPago, 0); const restante = aporteVal - devolvido; setParcelaForm({ qtdParcelas: 12, valorPorParcela: Math.round((restante / 12) * 100) / 100 }); setParcelaDialogOpen(true); }} title="Gerar/Reconfigurar Parcelas">
                                <CalendarClock className="size-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="size-7 text-[var(--motriz-vermelho)]" onClick={() => setDeleteAporteId(aporte.id)} title="Excluir aporte">
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* PARCELAS DE REPAGAMENTO */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="space-y-4 mt-8">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CalendarClock className="size-5 text-[var(--motriz-azul)]" />
          Parcelas de Repagamento
        </h2>
        {parcelas.length > 0 ? (
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-[11px] text-muted-foreground uppercase tracking-wider">
                      <th className="pb-2 pr-3">Socio</th>
                      <th className="pb-2 pr-3">Parcela</th>
                      <th className="pb-2 pr-3">Data Prevista</th>
                      <th className="pb-2 pr-3 text-right">Valor Original</th>
                      <th className="pb-2 pr-3 text-right">Valor Pago</th>
                      <th className="pb-2 pr-3 text-center">Status</th>
                      <th className="pb-2 pr-3">Obs.</th>
                      <th className="pb-2 text-center">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...parcelas].sort((a, b) => a.dataPrevista.getTime() - b.dataPrevista.getTime()).map((p) => {
                      const socio = funcionarios.find((f) => f.id === p.socioId);
                      const totalParcelasAporte = parcelas.filter((pp) => pp.aporteId === p.aporteId).length;
                      return (
                        <tr key={p.id} className="border-b last:border-0">
                          <td className="py-2 pr-3 font-medium">{socio?.nome || "-"}</td>
                          <td className="py-2 pr-3 tabular-nums">{p.numero}/{totalParcelasAporte}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{new Date(p.dataPrevista).toLocaleDateString("pt-BR")}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(p.valorOriginal)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums font-medium">{p.valorPago > 0 ? formatCurrency(p.valorPago) : "-"}</td>
                          <td className="py-2 pr-3 text-center">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${p.status === "Pago" ? "bg-[var(--motriz-verde-esmeralda)]/10 text-[var(--motriz-verde-esmeralda)]" : p.status === "Amortizado" ? "bg-[var(--motriz-azul)]/10 text-[var(--motriz-azul)]" : "bg-[var(--motriz-ambar)]/10 text-[var(--motriz-ambar)]"}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-[11px] text-muted-foreground max-w-[150px] truncate">{p.observacoes || "-"}</td>
                          <td className="py-2 text-center">
                            {p.status === "Pendente" && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-[var(--motriz-verde-esmeralda)]" onClick={() => { setPagarParcelaId(p.id); setPagarForm({ valorPago: p.valorOriginal, dataPagamento: new Date().toISOString().slice(0, 10) }); setPagarParcelaDialogOpen(true); }}>
                                Pagar
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card><CardContent className="pt-6 text-center text-muted-foreground text-sm">Nenhuma parcela gerada ainda. Use o botao de calendario na tabela de aportes para gerar parcelas.</CardContent></Card>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* HISTORICO COMPLETO */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="space-y-4 mt-8">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="size-5 text-muted-foreground" />
          Histórico de Aportes e Repagamentos
        </h2>
        {historicoCompleto.length > 0 ? (
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-[11px] text-muted-foreground uppercase tracking-wider">
                      <th className="pb-2 pr-3">Data</th>
                      <th className="pb-2 pr-3">Tipo</th>
                      <th className="pb-2 pr-3">Socio</th>
                      <th className="pb-2 pr-3">Descricao</th>
                      <th className="pb-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicoCompleto.map((item, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-2 pr-3 text-muted-foreground">{item.data.toLocaleDateString("pt-BR")}</td>
                        <td className="py-2 pr-3">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${item.tipo === "Aporte" ? "bg-[var(--motriz-ambar)]/10 text-[var(--motriz-ambar)]" : "bg-[var(--motriz-verde-esmeralda)]/10 text-[var(--motriz-verde-esmeralda)]"}`}>
                            {item.tipo}
                          </span>
                        </td>
                        <td className="py-2 pr-3 font-medium">{item.socioNome}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{item.descricao}</td>
                        <td className={`py-2 text-right font-bold tabular-nums ${item.valor >= 0 ? "text-[var(--motriz-ambar)]" : "text-[var(--motriz-verde-esmeralda)]"}`}>
                          {item.valor >= 0 ? "+" : ""}{formatCurrency(item.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card><CardContent className="pt-6 text-center text-muted-foreground text-sm">Nenhum registro de aporte ou repagamento ainda.</CardContent></Card>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DIALOGS */}
      {/* ═══════════════════════════════════════════════════════════ */}

      {/* Dialog: Registrar Aporte */}
      <Dialog open={aporteDialogOpen} onOpenChange={setAporteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAporte ? "Editar Aporte" : "Registrar Novo Aporte"}</DialogTitle>
            <DialogDescription>Registre um aporte de capital feito por um socio na empresa.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Socio</Label>
              <Select value={aporteForm.socioId} onValueChange={(v) => { const s = funcionarios.find(f => f.id === v); setAporteForm({ ...aporteForm, socioId: v, percentualSocietarioNaData: s?.percentualEmpresa || 0 }); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o socio" /></SelectTrigger>
                <SelectContent>
                  {socios.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome} ({s.percentualEmpresa}%)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Valor do Aporte (R$)</Label>
              <Input type="number" min={0} step={100} value={aporteForm.valor || ""} onChange={(e) => setAporteForm({ ...aporteForm, valor: Number(e.target.value) })} placeholder="0,00" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Data do Aporte</Label>
              <Input type="date" value={aporteForm.data} onChange={(e) => setAporteForm({ ...aporteForm, data: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Motivo</Label>
              <Select value={aporteForm.motivo} onValueChange={(v) => setAporteForm({ ...aporteForm, motivo: v as MotivoAporte })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOTIVOS_APORTE.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tipo</Label>
              <Select value={aporteForm.tipo} onValueChange={(v) => setAporteForm({ ...aporteForm, tipo: v as "Inicial" | "Operacional" | "Expansao" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inicial">Inicial</SelectItem>
                  <SelectItem value="Operacional">Operacional</SelectItem>
                  <SelectItem value="Expansao">Expansao</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Descricao</Label>
              <Input value={aporteForm.descricao} onChange={(e) => setAporteForm({ ...aporteForm, descricao: e.target.value })} placeholder="Ex: Importacao frota inicial - lote 1" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">% Societario na Data</Label>
              <Input type="number" min={0} max={100} value={aporteForm.percentualSocietarioNaData} onChange={(e) => setAporteForm({ ...aporteForm, percentualSocietarioNaData: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAporteDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveAporte} className="bg-[var(--motriz-ambar)] hover:bg-[var(--motriz-ambar)]/90 text-white">Salvar Aporte</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Gerar Parcelas */}
      <Dialog open={parcelaDialogOpen} onOpenChange={setParcelaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar Parcelas de Repagamento</DialogTitle>
            <DialogDescription>Defina a quantidade e o valor das parcelas para devolver este aporte ao socio.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Quantidade de Parcelas</Label>
              <Input type="number" min={1} max={120} value={parcelaForm.qtdParcelas} onChange={(e) => { const qtd = Number(e.target.value); const aporte = aportes.find(a => a.id === parcelaAporteId); const restante = aporte ? aporte.valor - parcelas.filter(p => p.aporteId === parcelaAporteId).reduce((s, p) => s + p.valorPago, 0) : 0; setParcelaForm({ qtdParcelas: qtd, valorPorParcela: qtd > 0 ? Math.round((restante / qtd) * 100) / 100 : 0 }); }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Valor por Parcela (R$) - editavel</Label>
              <Input type="number" min={0} step={100} value={parcelaForm.valorPorParcela || ""} onChange={(e) => setParcelaForm({ ...parcelaForm, valorPorParcela: Number(e.target.value) })} placeholder="Auto-calculado" />
            </div>
            {estudoFluxo && estudoFluxo.parcelaSugerida > 0 && (
              <div className="p-3 rounded-lg bg-[var(--motriz-azul)]/5 border border-[var(--motriz-azul)]/20">
                <p className="text-[11px] text-muted-foreground">Parcela sugerida pelo estudo de fluxo:</p>
                <p className="text-lg font-bold text-[var(--motriz-azul)]">{formatCurrency(estudoFluxo.parcelaSugerida)}/mes</p>
                <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={() => { const qtd = parcelaForm.qtdParcelas; setParcelaForm({ qtdParcelas: qtd, valorPorParcela: estudoFluxo.parcelaSugerida }); }}>
                  Usar valor sugerido
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setParcelaDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleGerarParcelas} className="bg-[var(--motriz-azul)] hover:bg-[var(--motriz-azul)]/90 text-white">Gerar Parcelas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Pagar Parcela */}
      <Dialog open={pagarParcelaDialogOpen} onOpenChange={setPagarParcelaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar Parcela como Paga</DialogTitle>
            <DialogDescription>Registre o pagamento de uma parcela. Se pagar mais que o valor original, a sobra amortiza parcelas futuras automaticamente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Valor Pago (R$) - editavel</Label>
              <Input type="number" min={0} step={100} value={pagarForm.valorPago || ""} onChange={(e) => setPagarForm({ ...pagarForm, valorPago: Number(e.target.value) })} />
              {(() => { const p = parcelas.find(pp => pp.id === pagarParcelaId); return p && pagarForm.valorPago > p.valorOriginal ? <p className="text-[11px] text-[var(--motriz-azul)]">Sobra de {formatCurrency(pagarForm.valorPago - p.valorOriginal)} sera usada para amortizar parcelas futuras.</p> : null; })()}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Data do Pagamento</Label>
              <Input type="date" value={pagarForm.dataPagamento} onChange={(e) => setPagarForm({ ...pagarForm, dataPagamento: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPagarParcelaDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handlePagarParcela} className="bg-[var(--motriz-verde-esmeralda)] hover:bg-[var(--motriz-verde-esmeralda)]/90 text-white">Confirmar Pagamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Reconfigurar Parcelas */}
      <Dialog open={reconfigDialogOpen} onOpenChange={setReconfigDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reconfigurar Parcelas</DialogTitle>
            <DialogDescription>Altere a quantidade e o valor das parcelas pendentes. Parcelas ja pagas serao mantidas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nova Quantidade de Parcelas</Label>
              <Input type="number" min={1} max={120} value={reconfigForm.novaQtd} onChange={(e) => { const qtd = Number(e.target.value); const aporte = aportes.find(a => a.id === reconfigAporteId); const devolvido = parcelas.filter(p => p.aporteId === reconfigAporteId && (p.status === "Pago" || p.status === "Amortizado")).reduce((s, p) => s + p.valorPago, 0); const restante = aporte ? aporte.valor - devolvido : 0; setReconfigForm({ novaQtd: qtd, novoValor: qtd > 0 ? Math.round((restante / qtd) * 100) / 100 : 0 }); }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Novo Valor por Parcela (R$)</Label>
              <Input type="number" min={0} step={100} value={reconfigForm.novoValor || ""} onChange={(e) => setReconfigForm({ ...reconfigForm, novoValor: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReconfigDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleReconfigurar} className="bg-[var(--motriz-azul)] hover:bg-[var(--motriz-azul)]/90 text-white">Reconfigurar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Confirmar Exclusão de Aporte */}
      <AlertDialog open={!!deleteAporteId} onOpenChange={(open) => !open && setDeleteAporteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão de aporte</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Ao excluir este aporte, todas as parcelas de repagamento vinculadas também serão removidas, afetando o cálculo da dívida aos sócios e o histórico financeiro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteAporteId) {
                  removeAporte(deleteAporteId);
                  toast.success("Aporte e parcelas vinculadas excluídos");
                }
                setDeleteAporteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de Confirmação: Mudança de % Imposto */}
      <AlertDialog open={confirmImpostoOpen} onOpenChange={(open) => { if (!open) cancelarMudancaImposto(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-[var(--motriz-ambar)]" />
              Confirmar alteração da taxa de imposto
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  Você está alterando a taxa de imposto de <strong className="text-foreground">{pctImposto}%</strong> para <strong className="text-foreground">{pendingPctImposto ?? pctImposto}%</strong>.
                </p>
                <div className="rounded-md border border-[var(--motriz-ambar)]/30 bg-[var(--motriz-ambar)]/5 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-[var(--motriz-ambar)]">⚠️ Esta mudança impacta TODOS os cálculos:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                    <li><strong>Imposto do mês</strong> — valor deduzido do faturamento bruto</li>
                    <li><strong>Base pós-imposto</strong> — base de cálculo das comissões</li>
                    <li><strong>Comissões dos funcionários</strong> — recalculadas sobre a nova base</li>
                    <li><strong>Resultado Final do Mês</strong> — lucro líquido após todas as deduções</li>
                    <li><strong>Divisão Societária</strong> — participação dos sócios no resultado</li>
                    <li><strong>Dashboard</strong> — todos os cards e gráficos da página inicial</li>
                    <li><strong>Projeções</strong> — cenário base, otimista e pessimista</li>
                  </ul>
                </div>
                <p className="text-xs text-muted-foreground">
                  A alteração é aplicada imediatamente em todos os meses e persistida. Deseja confirmar?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelarMudancaImposto}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirmarMudancaImposto();
                toast.success(`Taxa de imposto alterada para ${pendingPctImposto}% — todos os cálculos foram atualizados`);
              }}
              className="bg-[var(--motriz-ambar)] text-white hover:bg-[var(--motriz-ambar)]/90"
            >
              Confirmar alteração para {pendingPctImposto ?? pctImposto}%
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de exclusão de funcionário */}
      <AlertDialog open={!!deleteFuncTarget} onOpenChange={(open) => !open && setDeleteFuncTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-[var(--motriz-vermelho)]" />
              Confirmar remoção de funcionário
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Você está prestes a remover <strong className="text-foreground">{deleteFuncTarget?.nome}</strong>.
                </p>
                <p className="text-xs text-muted-foreground">
                  Esta ação não pode ser desfeita e afetará cálculos de comissão e divisão societária.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveFunc}
              className="bg-[var(--motriz-vermelho)] text-white hover:bg-[var(--motriz-vermelho)]/90"
            >
              Remover funcionário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}