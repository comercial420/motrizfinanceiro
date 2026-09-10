"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Percent,
  Timer,
  Scale,
  Gauge,
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  CheckCircle2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartErrorBoundary } from "@/components/chart-error-boundary";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, CalendarClock, DollarSign, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { loadSeedData } from "@/data/seed";

/* ── Chart palette (Motriz brand, validated for CVD with direct labels) ── */
const CHART_COLORS = {
  green: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
  blue: "#3B82F6",
  dark: "#0F172A",
} as const;

const PIE_COLORS = [CHART_COLORS.green, CHART_COLORS.amber, CHART_COLORS.blue];

/* ── KPI helpers ── */

function useKpis(selectedMonth?: string) {
  const saldoCaixa = useStore((s) => s.getSaldoCaixa());
  const receitaRecorrente = useStore((s) => s.getReceitaRecorrente());
  const runway = useStore((s) => s.getRunway());
  const taxaUtilizacao = useStore((s) => s.getTaxaUtilizacao());
  const pontoEquilibrio = useStore((s) => s.getPontoEquilibrio());
  const lancamentos = useStore((s) => s.lancamentos);
  const contratos = useStore((s) => s.contratos);
  const getResultadoFinalMes = useStore((s) => s.getResultadoFinalMes);
  const getDividaTotalSocios = useStore((s) => s.getDividaTotalSocios);
  const getDividaPorSocio = useStore((s) => s.getDividaPorSocio);
  const funcionarios = useStore((s) => s.funcionarios);

  // Parse selected month or use current month
  const { targetMonth, targetYear } = useMemo(() => {
    if (selectedMonth) {
      const [year, month] = selectedMonth.split("-").map(Number);
      return { targetMonth: month - 1, targetYear: year };
    }
    const now = new Date();
    return { targetMonth: now.getMonth(), targetYear: now.getFullYear() };
  }, [selectedMonth]);

  // Filtered selectors based on selected month
  const receitaRecebidaMes = useMemo(() => {
    return lancamentos
      .filter((l) => l.tipo === "Recebemos" && l.status === "Recebido" && new Date(l.data).getMonth() === targetMonth && new Date(l.data).getFullYear() === targetYear)
      .reduce((acc, l) => acc + l.valor, 0);
  }, [lancamentos, targetMonth, targetYear]);

  const despesasPagasMes = useMemo(() => {
    return lancamentos
      .filter((l) => l.tipo === "Pagamos" && l.status === "Pago" && !l.ehInvestimento && new Date(l.data).getMonth() === targetMonth && new Date(l.data).getFullYear() === targetYear)
      .reduce((acc, l) => acc + l.valor, 0);
  }, [lancamentos, targetMonth, targetYear]);

  // Resultado líquido real: usa getResultadoFinalMes que inclui deduções de imposto e comissões
  const resultadoLiquido = useMemo(() => {
    const mesRef = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
    return getResultadoFinalMes(mesRef);
  }, [getResultadoFinalMes, targetMonth, targetYear]);

  const percentualPrevisivel = useMemo(() => {
    const total = receitaRecebidaMes;
    if (total === 0) return 0;
    return (receitaRecorrente / total) * 100;
  }, [receitaRecorrente, receitaRecebidaMes]);

  const receitaFixaMes = useMemo(() => {
    return lancamentos
      .filter((l) => l.tipo === "Recebemos" && l.status === "Recebido" && new Date(l.data).getMonth() === targetMonth && new Date(l.data).getFullYear() === targetYear && l.categoria === "Fixo")
      .reduce((acc, l) => acc + l.valor, 0);
  }, [lancamentos, targetMonth, targetYear]);

  const receitaFixaPrevistaMes = useMemo(() => {
    return lancamentos
      .filter((l) => l.tipo === "Recebemos" && (l.status === "Previsto" || l.status === "Pendente") && new Date(l.data).getMonth() === targetMonth && new Date(l.data).getFullYear() === targetYear && l.categoria === "Fixo")
      .reduce((acc, l) => acc + l.valor, 0);
  }, [lancamentos, targetMonth, targetYear]);

  const receitaVariavelMes = useMemo(() => {
    return lancamentos
      .filter((l) => l.tipo === "Recebemos" && l.status === "Recebido" && new Date(l.data).getMonth() === targetMonth && new Date(l.data).getFullYear() === targetYear && l.categoria !== "Fixo")
      .reduce((acc, l) => acc + l.valor, 0);
  }, [lancamentos, targetMonth, targetYear]);

  const previsaoDespesasFixas = useMemo(() => {
    return lancamentos
      .filter((l) => l.tipo === "Pagamos" && l.categoria === "Fixo" && (l.status === "Previsto" || l.status === "Pendente") && new Date(l.data).getMonth() === targetMonth && new Date(l.data).getFullYear() === targetYear)
      .reduce((acc, l) => acc + l.valor, 0);
  }, [lancamentos, targetMonth, targetYear]);

  const resultadoPrevisto = useMemo(() => (receitaFixaMes + receitaFixaPrevistaMes) - previsaoDespesasFixas, [receitaFixaMes, receitaFixaPrevistaMes, previsaoDespesasFixas]);

  const totalReceitasMes = useMemo(() => {
    return lancamentos
      .filter((l) => l.tipo === "Recebemos" && l.status === "Recebido" && new Date(l.data).getMonth() === targetMonth && new Date(l.data).getFullYear() === targetYear)
      .reduce((acc, l) => acc + l.valor, 0);
  }, [lancamentos, targetMonth, targetYear]);

  const totalDespesasMes = useMemo(() => {
    return lancamentos
      .filter((l) => l.tipo === "Pagamos" && l.status === "Pago" && !l.ehInvestimento && new Date(l.data).getMonth() === targetMonth && new Date(l.data).getFullYear() === targetYear)
      .reduce((acc, l) => acc + l.valor, 0);
  }, [lancamentos, targetMonth, targetYear]);

  const resultadoMes = useMemo(() => totalReceitasMes - totalDespesasMes, [totalReceitasMes, totalDespesasMes]);

  // Projeções do mês (receitas previstas + despesas previstas)
  const totalReceitasPrevistas = useMemo(() => {
    return lancamentos
      .filter((l) => l.tipo === "Recebemos" && (l.status === "Previsto" || l.status === "Pendente") && new Date(l.data).getMonth() === targetMonth && new Date(l.data).getFullYear() === targetYear)
      .reduce((acc, l) => acc + l.valor, 0);
  }, [lancamentos, targetMonth, targetYear]);

  const totalDespesasPrevistas = useMemo(() => {
    return lancamentos
      .filter((l) => l.tipo === "Pagamos" && (l.status === "Previsto" || l.status === "Pendente") && !l.ehInvestimento && new Date(l.data).getMonth() === targetMonth && new Date(l.data).getFullYear() === targetYear)
      .reduce((acc, l) => acc + l.valor, 0);
  }, [lancamentos, targetMonth, targetYear]);

  const resultadoPrevistoMes = useMemo(() => totalReceitasPrevistas - totalDespesasPrevistas, [totalReceitasPrevistas, totalDespesasPrevistas]);

  // Derive chart data inside useMemo to avoid new references on every render
  const { evolucaoFinanceira, composicaoGeral, visaoCaixaPorMes } = useMemo(() => {
    const now = new Date();

    // Evolução Financeira (last 6 months)
    const evo: { mes: string; entradas: number; saidas: number; resultado: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      const entradas = lancamentos
        .filter((l) => l.tipo === "Recebemos" && l.status === "Recebido" && new Date(l.data).getMonth() === m && new Date(l.data).getFullYear() === y)
        .reduce((acc, l) => acc + l.valor, 0);
      const saidas = lancamentos
        .filter((l) => l.tipo === "Pagamos" && l.status === "Pago" && !l.ehInvestimento && new Date(l.data).getMonth() === m && new Date(l.data).getFullYear() === y)
        .reduce((acc, l) => acc + l.valor, 0);
      evo.push({ mes: label, entradas, saidas, resultado: entradas - saidas });
    }

    // Composição Geral (Receita vs Despesas por classificação) — mês selecionado
    const receitasPorClass: Record<string, number> = {};
    const despesasPorClass: Record<string, number> = {};
    lancamentos.forEach((l) => {
      const d = new Date(l.data);
      if (d.getMonth() !== targetMonth || d.getFullYear() !== targetYear) return;
      const key = l.classificacao || "Outros";
      if (l.tipo === "Recebemos" && l.status === "Recebido") {
        receitasPorClass[key] = (receitasPorClass[key] || 0) + l.valor;
      } else if (l.tipo === "Pagamos" && l.status === "Pago" && !l.ehInvestimento) {
        despesasPorClass[key] = (despesasPorClass[key] || 0) + l.valor;
      }
    });
    const totalRec = Object.values(receitasPorClass).reduce((a, b) => a + b, 0);
    const totalDesp = Object.values(despesasPorClass).reduce((a, b) => a + b, 0);
    const composicao: { nome: string; valor: number; tipo: "receita" | "despesa" }[] = [];
    if (totalRec === 0 && totalDesp === 0) {
      composicao.push({ nome: "Sem dados", valor: 1, tipo: "receita" });
    } else {
      Object.entries(receitasPorClass).forEach(([nome, valor]) => {
        if (valor > 0) composicao.push({ nome: `📈 ${nome}`, valor, tipo: "receita" });
      });
      Object.entries(despesasPorClass).forEach(([nome, valor]) => {
        if (valor > 0) composicao.push({ nome: `📉 ${nome}`, valor, tipo: "despesa" });
      });
    }

    // Visão de Caixa por mês (últimos 3 meses + mês atual)
    const mesesVisao: { nome: string; receitas: number; despesas: number; resultado: number }[] = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      const rec = lancamentos
        .filter((l) => l.tipo === "Recebemos" && l.status === "Recebido" && new Date(l.data).getMonth() === m && new Date(l.data).getFullYear() === y)
        .reduce((acc, l) => acc + l.valor, 0);
      const desp = lancamentos
        .filter((l) => l.tipo === "Pagamos" && l.status === "Pago" && !l.ehInvestimento && new Date(l.data).getMonth() === m && new Date(l.data).getFullYear() === y)
        .reduce((acc, l) => acc + l.valor, 0);
      mesesVisao.push({ nome: label, receitas: rec, despesas: desp, resultado: rec - desp });
    }

    return { evolucaoFinanceira: evo, composicaoGeral: composicao, visaoCaixaPorMes: mesesVisao };
  }, [lancamentos, contratos, saldoCaixa, targetMonth, targetYear]);

  const pctImpostoGlobal = useStore((s) => s.percentualImposto);
  const resultadoFinalMes = useMemo(() => getResultadoFinalMes(selectedMonth), [getResultadoFinalMes, selectedMonth, pctImpostoGlobal]);

  // Lucro Mau Uso
  const getLucroMauUsoMes = useStore((s) => s.getLucroMauUsoMes);
  const getCobrancasMauUsoMes = useStore((s) => s.getCobrancasMauUsoMes);
  const pctImpostoMauUsoDash = useStore((s) => s.percentualImpostoMauUso ?? 10);
  const lucroMauUsoMes = useMemo(() => getLucroMauUsoMes(selectedMonth), [getLucroMauUsoMes, selectedMonth]);
  const cobrancasMauUsoMes = useMemo(() => getCobrancasMauUsoMes(selectedMonth), [getCobrancasMauUsoMes, selectedMonth]);

  return useMemo(
    () => ({
      saldoCaixa,
      receitaRecebidaMes,
      despesasPagasMes,
      resultadoLiquido,
      receitaRecorrente,
      percentualPrevisivel,
      receitaFixaMes,
      receitaFixaPrevistaMes,
      receitaVariavelMes,
      previsaoDespesasFixas,
      resultadoPrevisto,
      totalReceitasMes,
      totalDespesasMes,
      resultadoMes,
      totalReceitasPrevistas,
      totalDespesasPrevistas,
      resultadoPrevistoMes,
      resultadoFinalMes,
      lucroMauUsoMes,
      cobrancasMauUsoMes,
      pctImpostoMauUso: pctImpostoMauUsoDash,
      runway,
      pontoEquilibrio,
      taxaUtilizacao,
      dividaTotalSocios: getDividaTotalSocios(),
      dividaPorSocio: (id: string) => getDividaPorSocio(id),
      sociosList: funcionarios.filter((f: { ehSocio?: boolean }) => f.ehSocio),
      evolucaoFinanceira,
      composicaoGeral,
      visaoCaixaPorMes,
      hasData: lancamentos.length > 0,
    }),
    [
      saldoCaixa,
      receitaRecebidaMes,
      despesasPagasMes,
      resultadoLiquido,
      receitaRecorrente,
      percentualPrevisivel,
      receitaFixaMes,
      receitaFixaPrevistaMes,
      receitaVariavelMes,
      previsaoDespesasFixas,
      resultadoPrevisto,
      totalReceitasMes,
      totalDespesasMes,
      resultadoMes,
      totalReceitasPrevistas,
      totalDespesasPrevistas,
      resultadoPrevistoMes,
      resultadoFinalMes,
      lucroMauUsoMes,
      cobrancasMauUsoMes,
      pctImpostoMauUsoDash,
      pctImpostoGlobal,
      runway,
      pontoEquilibrio,
      taxaUtilizacao,
      evolucaoFinanceira,
      composicaoGeral,
      visaoCaixaPorMes,
      lancamentos.length,
    ]
  );
}

/* ── KPI Card ── */

/* ── Visão de Caixa Chart (3 meses + filtro) ── */
function VisaoCaixaChart({ data }: { data: { nome: string; receitas: number; despesas: number; resultado: number }[] }) {
  const [viewMode, setViewMode] = useState<"3m" | "anual">("3m");

  // Para visão anual, mostrar jan-dez do ano corrente (ano completo)
  const lancamentos = useStore((s) => s.lancamentos);
  const anualData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const meses: { nome: string; receitas: number; despesas: number; resultado: number }[] = [];
    for (let m = 0; m < 12; m++) {
      const d = new Date(currentYear, m, 1);
      const label = d.toLocaleDateString("pt-BR", { month: "short" });
      const rec = lancamentos
        .filter((l) => l.tipo === "Recebemos" && l.status === "Recebido" && new Date(l.data).getMonth() === m && new Date(l.data).getFullYear() === currentYear)
        .reduce((acc, l) => acc + l.valor, 0);
      const desp = lancamentos
        .filter((l) => l.tipo === "Pagamos" && l.status === "Pago" && !l.ehInvestimento && new Date(l.data).getMonth() === m && new Date(l.data).getFullYear() === currentYear)
        .reduce((acc, l) => acc + l.valor, 0);
      meses.push({ nome: label, receitas: rec, despesas: desp, resultado: rec - desp });
    }
    return meses;
  }, [lancamentos]);

  const chartData = viewMode === "3m" ? data : anualData;

  return (
    <Card className="min-h-[320px]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="size-4" />
          Visão de Caixa
        </CardTitle>
        <div className="flex gap-1 rounded-md border border-border p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("3m")}
            className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
              viewMode === "3m" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            3 Meses
          </button>
          <button
            type="button"
            onClick={() => setViewMode("anual")}
            className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
              viewMode === "anual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Anual
          </button>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartErrorBoundary>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barCategoryGap="20%" role="img" aria-label="Gráfico de visão de caixa por mês mostrando receitas e despesas">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="nome"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`}
              />
              <RechartsTooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar dataKey="receitas" name="Receitas" fill={CHART_COLORS.green} radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill={CHART_COLORS.red} radius={[4, 4, 0, 0]} />
              <Bar dataKey="resultado" name="Resultado" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartErrorBoundary>
      </CardContent>
    </Card>
  );
}

interface KpiCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  subtitle?: string;
  tone?: "default" | "success" | "warning" | "danger";
  onClick?: () => void;
  tooltip?: string;
}

function KpiCard({
  title,
  value,
  icon,
  trend,
  subtitle,
  tone = "default",
  onClick,
  tooltip,
}: KpiCardProps) {
  const toneClass =
    tone === "success"
      ? "text-[var(--motriz-verde-esmeralda)]"
      : tone === "warning"
        ? "text-[var(--motriz-ambar)]"
        : tone === "danger"
          ? "text-[var(--motriz-vermelho)]"
          : "text-muted-foreground";

  const titleElement = tooltip ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <CardTitle className="flex cursor-help items-center gap-1 text-sm font-medium text-muted-foreground">
          {title}
          <Info className="size-3 opacity-50" />
        </CardTitle>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  ) : (
    <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
  );

  return (
    <Card
      className={onClick ? "cursor-pointer transition-shadow hover:shadow-md" : ""}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        {titleElement}
        <div className={toneClass}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums tracking-tight">{value}</span>
          {trend && (
            <span
              className={`flex items-center text-xs font-medium ${
                trend === "up"
                  ? "text-[var(--motriz-verde-esmeralda)]"
                  : trend === "down"
                    ? "text-[var(--motriz-vermelho)]"
                    : "text-muted-foreground"
              }`}
            >
              {trend === "up" ? <TrendingUp className="mr-0.5 size-3" /> : null}
              {trend === "down" ? <TrendingDown className="mr-0.5 size-3" /> : null}
              {trend === "up" ? "+" : trend === "down" ? "-" : ""}
            </span>
          )}
        </div>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

/* ── Custom Tooltip for charts ── */

function ChartTooltip({
  active,
  payload,
  label,
  isCurrency = true,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  isCurrency?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-md">
      {label && <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span
            className="inline-block size-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold tabular-nums">
            {isCurrency ? formatCurrency(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Page ── */

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Filtro de mês — default = mês atual (YYYY-MM)
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  // Seed data disabled — using real data only
  useEffect(() => {
    // loadSeedData();
    // Small delay to allow store to populate
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const kpis = useKpis(selectedMonth);

  // Navigate to lancamentos with filter context
  const navigateToLancamentos = (filter?: string) => {
    const params = filter ? `?filtro=${encodeURIComponent(filter)}` : "";
    router.push(`/lancamentos${params}`);
  };

  /* ── Alertas Inteligentes ── */
  const alertas = useMemo(() => {
    const alerts: {
      id: string;
      message: string;
      level: "success" | "warning" | "danger";
      icon: React.ReactNode;
    }[] = [];

    // Runway alerts
    if (kpis.runway > 0 && kpis.runway < 2) {
      alerts.push({
        id: "runway-critical",
        message: `Runway crítico: apenas ${kpis.runway.toFixed(1)} meses de caixa restante`,
        level: "danger",
        icon: <AlertTriangle className="size-4 shrink-0" />,
      });
    } else if (kpis.runway >= 2 && kpis.runway < 4) {
      alerts.push({
        id: "runway-warning",
        message: `Runway baixo: ${kpis.runway.toFixed(1)} meses de caixa restante`,
        level: "warning",
        icon: <AlertTriangle className="size-4 shrink-0" />,
      });
    }

    // Taxa Utilização
    if (kpis.taxaUtilizacao < 0.6) {
      alerts.push({
        id: "utilizacao-warning",
        message: `Taxa de utilização baixa: ${(kpis.taxaUtilizacao * 100).toFixed(0)}% da frota ativa`,
        level: "warning",
        icon: <Gauge className="size-4 shrink-0" />,
      });
    }

    // Resultado Líquido negativo
    if (kpis.resultadoLiquido < 0) {
      alerts.push({
        id: "resultado-negativo",
        message: `Resultado líquido negativo: ${formatCurrency(kpis.resultadoLiquido)}`,
        level: "danger",
        icon: <TrendingDown className="size-4 shrink-0" />,
      });
    }

    // All clear
    if (alerts.length === 0) {
      alerts.push({
        id: "all-clear",
        message: "Todos os indicadores estão dentro da normalidade.",
        level: "success",
        icon: <CheckCircle2 className="size-4 shrink-0" />,
      });
    }

    return alerts;
  }, [kpis.runway, kpis.taxaUtilizacao, kpis.resultadoLiquido]);

  /* ── Skeleton state ── */
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="mt-2 h-3 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="min-h-[320px]">
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[240px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Financeiro</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral dos indicadores e desempenho financeiro
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <CalendarClock className="size-4 text-muted-foreground" />
            <div className="flex flex-col">
              <label htmlFor="dash-month-filter" className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Mês de Referência
              </label>
              <input
                id="dash-month-filter"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-sm font-semibold outline-none focus:ring-0"
              />
            </div>
          </div>
          {selectedMonth !== currentMonthStr && (
            <button
              type="button"
              onClick={() => setSelectedMonth(currentMonthStr)}
              className="rounded-md bg-[var(--motriz-ambar)]/10 px-3 py-2 text-xs font-medium text-[var(--motriz-ambar)] hover:bg-[var(--motriz-ambar)]/20 transition-colors"
            >
              Voltar para Hoje ({new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })})
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        <KpiCard
          title="Saldo em Caixa"
          value={formatCurrency(kpis.saldoCaixa)}
          icon={<Wallet className="size-4" />}
          trend={kpis.saldoCaixa > 0 ? "up" : "down"}
          subtitle="Recebemos - Pagamos (inclui CAPEX no fluxo de caixa)"
          tooltip="Diferença entre tudo que foi recebido e tudo que foi pago (excluindo investimentos/CAPEX). Representa o dinheiro disponível em caixa neste momento. Fórmula: Total Recebido − Total Pago."
          tone={kpis.saldoCaixa > 0 ? "success" : "danger"}
          onClick={() => navigateToLancamentos("saldo")}
        />
        <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigateToLancamentos("receita-fixa")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <CardTitle className="flex cursor-help items-center gap-1 text-sm font-medium text-muted-foreground">
                  Receita Fixa (Mês)
                  <Info className="size-3 opacity-50" />
                </CardTitle>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p>Receitas previsíveis (contratos ativos e outras classificadas como fixas). Mostra o que já foi recebido e o que ainda está previsto para este mês.</p>
              </TooltipContent>
            </Tooltip>
            <div className="text-[var(--motriz-verde-esmeralda)]"><ArrowUpRight className="size-4" /></div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Recebido</p>
                <p className={`text-lg font-bold tabular-nums tracking-tight ${kpis.receitaFixaMes > 0 ? "text-[var(--motriz-verde-esmeralda)]" : "text-foreground"}`}>
                  {formatCurrency(kpis.receitaFixaMes)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Previsto</p>
                <p className={`text-lg font-bold tabular-nums tracking-tight ${kpis.receitaFixaPrevistaMes > 0 ? "text-[var(--motriz-ambar)]" : "text-foreground"}`}>
                  {formatCurrency(kpis.receitaFixaPrevistaMes)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <KpiCard
          title="Despesas Pagas (Mês)"
          value={formatCurrency(kpis.despesasPagasMes)}
          icon={<ArrowDownRight className="size-4" />}
          trend={kpis.despesasPagasMes > 0 ? "down" : "neutral"}
          subtitle="Total pago no mês corrente (exclui CAPEX)"
          tone={kpis.despesasPagasMes > 0 ? "warning" : "default"}
          tooltip="Soma de todos os lançamentos 'Pagamos' do mês corrente com status 'Pago', excluindo investimentos (CAPEX). Inclui custos fixos, variáveis, extraordinários e operacionais."
          onClick={() => navigateToLancamentos("despesas-mes")}
        />
        <KpiCard
          title="Previsão Despesas Fixas"
          value={formatCurrency(kpis.previsaoDespesasFixas)}
          icon={<CalendarClock className="size-4" />}
          trend={kpis.previsaoDespesasFixas > 0 ? "down" : "neutral"}
          subtitle="Despesas fixas previstas para o mês"
          tone={kpis.previsaoDespesasFixas > 0 ? "warning" : "default"}
          tooltip="Soma dos lançamentos 'Pagamos' com categoria 'Fixo' e status 'Previsto' ou 'Pendente' para o mês corrente. Representa as obrigações fixas já cadastradas que ainda serão pagas neste mês."
          onClick={() => navigateToLancamentos("previsao-despesas")}
        />
        <KpiCard
          title="Resultado Previsto"
          value={formatCurrency(kpis.resultadoPrevisto)}
          icon={<Activity className="size-4" />}
          trend={kpis.resultadoPrevisto >= 0 ? "up" : "down"}
          subtitle="Receita Fixa − Previsão Despesas Fixas"
          tone={kpis.resultadoPrevisto >= 0 ? "success" : "danger"}
          tooltip="Receita Fixa/Previsível (contratos ativos + receitas classificadas como fixas) menos a Previsão de Despesas Fixas do mês. Indica quanto sobrará das receitas garantidas após pagar as obrigações fixas comprometidas. Fórmula: Receita Fixa − Previsão Despesas Fixas."
          onClick={() => navigateToLancamentos("resultado-previsto")}
        />
        <KpiCard
          title="Receita Recorrente Mensal"
          value={formatCurrency(kpis.receitaRecorrente)}
          icon={<TrendingUp className="size-4" />}
          trend="up"
          subtitle="Soma dos contratos ativos"
          tone="success"
          tooltip="Soma do valor mensal total de todos os contratos com status 'Ativo'. Representa a receita garantida todo mês enquanto os contratos estiverem vigentes, independente de ter sido recebida ou não."
          onClick={() => navigateToLancamentos("recorrente")}
        />
        <KpiCard
          title="% Receita Previsível"
          value={`${kpis.percentualPrevisivel.toFixed(1)}%`}
          icon={<Percent className="size-4" />}
          trend={kpis.percentualPrevisivel >= 50 ? "up" : "down"}
          subtitle="Recorrente / Total Receita"
          tone={kpis.percentualPrevisivel >= 50 ? "success" : kpis.percentualPrevisivel >= 30 ? "warning" : "danger"}
          tooltip="Percentual da receita recorrente sobre o total de receitas recebidas no mês. Fórmula: (Receita Recorrente ÷ Receita Total Recebida) × 100. Quanto maior, mais previsível e estável é o faturamento."
          onClick={() => navigateToLancamentos("previsivel")}
        />
        <KpiCard
          title="Runway"
          value={`${kpis.runway.toFixed(1)} meses`}
          icon={<Timer className="size-4" />}
          trend={kpis.runway >= 3 ? "up" : "down"}
          subtitle="Caixa / OpEx médio últimos 3 meses"
          tone={kpis.runway >= 4 ? "success" : kpis.runway >= 2 ? "warning" : "danger"}
          tooltip="Quantos meses a empresa consegue operar sem nenhuma nova entrada de receita. Fórmula: Saldo em Caixa ÷ Média de Despesas Operacionais dos últimos 3 meses. Abaixo de 3 meses é sinal de alerta."
          onClick={() => navigateToLancamentos("runway")}
        />
        <KpiCard
          title="Ponto de Equilíbrio"
          value={`${kpis.pontoEquilibrio} motos`}
          icon={<Scale className="size-4" />}
          trend="neutral"
          subtitle="Motos para cobrir custos fixos"
          tooltip="Número mínimo de motos alugadas necessárias para cobrir todos os custos fixos mensais. Fórmula: Custo Fixo Total ÷ Receita Média por Moto. Acima desse número, cada moto adicional gera lucro."
        />
        <KpiCard
          title="Divida aos Socios"
          value={formatCurrency(kpis.dividaTotalSocios)}
          icon={<Users className="size-4" />}
          trend={kpis.dividaTotalSocios > 0 ? "down" : "neutral"}
          subtitle={kpis.sociosList.length > 0 ? [...new Map(kpis.sociosList.map((s: { id: string; nome: string }) => [s.id, s])).values()].map((s: { id: string; nome: string }) => `${s.nome}: ${formatCurrency(kpis.dividaPorSocio(s.id))}`).join(" · ") : "Sem socios cadastrados"}
          tone={kpis.dividaTotalSocios > 0 ? "warning" : "success"}
          tooltip="Saldo total a devolver aos socios investidores. Formula: Total Aportado - Total Devolvido. Clique para ver detalhamento e parcelas na pagina de Pagamentos."
          onClick={() => window.location.href = '/pagamentos'}
        />
        <KpiCard
          title="Projeção do Resultado do Mês"
          value={formatCurrency(kpis.resultadoFinalMes)}
          icon={<DollarSign className="size-4" />}
          trend={kpis.resultadoFinalMes >= 0 ? "up" : "down"}
          subtitle="Receita − Despesas − Imposto − Comissões (projeção)"
          tone={kpis.resultadoFinalMes >= 0 ? "success" : "danger"}
          tooltip="Projeção do resultado líquido do mês com base no que há para receber e pagar. Inclui receitas previstas/pendentes, despesas previstas/pendentes, impostos (10%) e comissões estimadas. NÃO é o resultado realizado — é uma estimativa baseada nos lançamentos cadastrados. Fórmula: Receita Total (realizada + prevista) − Despesas (realizadas + previstas) − Imposto − Comissões."
          onClick={() => window.location.href = '/pagamentos'}
        />
        <KpiCard
          title="Taxa de Utilização"
          value={`${(kpis.taxaUtilizacao * 100).toFixed(0)}%`}
          icon={<Gauge className="size-4" />}
          trend={kpis.taxaUtilizacao >= 0.7 ? "up" : "down"}
          subtitle="Motos em contrato / Total da frota"
          tone={kpis.taxaUtilizacao >= 0.7 ? "success" : kpis.taxaUtilizacao >= 0.5 ? "warning" : "danger"}
          tooltip="Percentual da frota que está gerando receita ativamente. Fórmula: Motos com status 'Em Contrato' ÷ Total de Motos da Frota (exclui paradas/estoque). Meta saudável: acima de 70%."
          onClick={() => navigateToLancamentos("utilizacao")}
        />
      </section>

      {/* Lucro Mau Uso Card — Dashboard */}
      <Card className="border-orange-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-orange-600">
              <AlertTriangle className="size-4" />
              Lucro por Manutenção de Mau Uso
            </CardTitle>
            <button
              type="button"
              onClick={() => window.location.href = '/pagamentos'}
              className="text-xs text-orange-600 hover:underline"
            >
              Ver detalhes →
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3 mb-3">
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wider text-green-600/70 mb-1">Lucro Líquido Total</p>
              <p className={`text-xl font-bold tabular-nums ${kpis.lucroMauUsoMes >= 0 ? 'text-green-600' : 'text-[var(--motriz-vermelho)]'}`}>{formatCurrency(kpis.lucroMauUsoMes)}</p>
            </div>
            <div className="rounded-lg border border-orange-500/10 bg-orange-500/5 p-3 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wider text-orange-600/70 mb-1">Cobranças Geradas</p>
              <p className="text-xl font-bold tabular-nums text-orange-600">{kpis.cobrancasMauUsoMes.length}</p>
            </div>
            <div className="rounded-lg border border-orange-500/10 bg-orange-500/5 p-3 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wider text-orange-600/70 mb-1">Pendentes / Recebidas</p>
              <p className="text-xl font-bold tabular-nums">
                <span className="text-amber-600">{kpis.cobrancasMauUsoMes.filter(c => c.status === 'Pendente').length}</span>
                <span className="text-muted-foreground mx-1">/</span>
                <span className="text-green-600">{kpis.cobrancasMauUsoMes.filter(c => c.status === 'Recebido').length}</span>
              </p>
            </div>
          </div>
          <div className="rounded-md border border-dashed border-orange-500/20 bg-orange-500/5 p-2.5">
            <p className="text-[10px] text-muted-foreground">
              💡 <strong>Fórmula:</strong> Lucro = Valor Cobrado − Imposto ({kpis.pctImpostoMauUso}%, só sobre o recebido) − Custo dos Itens (sem imposto, já embutido) − Comissão do Técnico (% sobre base pós-imposto).
              O custo da empresa (peças/técnico) já vem com imposto embutido — por isso o imposto só é deduzido do valor que cobramos do cliente.
              Se o mau uso foi identificado mas não cobramos, o valor fica negativo para auditoria.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quadro Resumo Mensal — Realizado vs Projeção */}
      <section className="grid gap-4 md:grid-cols-2">
        {/* Realizado */}
        <Card className="border-[var(--motriz-verde-esmeralda)]/20 bg-gradient-to-r from-[var(--motriz-verde-esmeralda)]/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4 text-[var(--motriz-verde-esmeralda)]" />
              Resumo Realizado
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">O que já foi pago e recebido neste mês</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Receitas</p>
                <p className="text-xl font-bold tabular-nums tracking-tight text-[var(--motriz-verde-esmeralda)]">
                  {formatCurrency(kpis.totalReceitasMes)}
                </p>
                <p className="text-[10px] text-muted-foreground">Recebidas no mês</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Despesas</p>
                <p className="text-xl font-bold tabular-nums tracking-tight text-[var(--motriz-vermelho)]">
                  {formatCurrency(kpis.totalDespesasMes)}
                </p>
                <p className="text-[10px] text-muted-foreground">Pagas no mês</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Resultado</p>
                <p
                  className={`text-xl font-bold tabular-nums tracking-tight ${
                    kpis.resultadoMes >= 0
                      ? "text-[var(--motriz-verde-esmeralda)]"
                      : "text-[var(--motriz-vermelho)]"
                  }`}
                >
                  {formatCurrency(kpis.resultadoMes)}
                </p>
                <p className="text-[10px] text-muted-foreground">Receitas − Despesas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projeção */}
        <Card className="border-[var(--motriz-ambar)]/20 bg-gradient-to-r from-[var(--motriz-ambar)]/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4 text-[var(--motriz-ambar)]" />
              Projeção do Mês
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">Previsão de receitas e despesas pendentes/previstas</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Receitas Previstas</p>
                <p className="text-xl font-bold tabular-nums tracking-tight text-[var(--motriz-ambar)]">
                  {formatCurrency(kpis.totalReceitasPrevistas)}
                </p>
                <p className="text-[10px] text-muted-foreground">A receber (pendente/previsto)</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Despesas Previstas</p>
                <p className="text-xl font-bold tabular-nums tracking-tight text-[var(--motriz-vermelho)]">
                  {formatCurrency(kpis.totalDespesasPrevistas)}
                </p>
                <p className="text-[10px] text-muted-foreground">A pagar (pendente/previsto)</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Resultado Projetado</p>
                <p
                  className={`text-xl font-bold tabular-nums tracking-tight ${
                    kpis.resultadoPrevistoMes >= 0
                      ? "text-[var(--motriz-verde-esmeralda)]"
                      : "text-[var(--motriz-vermelho)]"
                  }`}
                >
                  {formatCurrency(kpis.resultadoPrevistoMes)}
                </p>
                <p className="text-[10px] text-muted-foreground">Projeção receitas − despesas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Charts Row */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Visão de Caixa por Mês — Grouped BarChart (3 meses) */}
        <VisaoCaixaChart data={kpis.visaoCaixaPorMes} />

        {/* Composição Geral — PieChart Receita vs Despesas por classificação */}
        <Card className="min-h-[320px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="size-4" />
              Receita vs Despesas
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              📈 Verde = Receitas · 📉 Vermelho = Despesas (por classificação)
            </p>
          </CardHeader>
          <CardContent className="flex-1">
            <ChartErrorBoundary>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart role="img" aria-label="Gráfico de composição geral receita versus despesas por classificação">
                  <Pie
                    data={kpis.composicaoGeral}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="valor"
                    nameKey="nome"
                    strokeWidth={0}
                  >
                    {kpis.composicaoGeral.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.tipo === "receita" ? CHART_COLORS.green : CHART_COLORS.red}
                        opacity={entry.tipo === "despesa" ? 0.6 + (index % 3) * 0.15 : 1}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<ChartTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span className="text-muted-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartErrorBoundary>
          </CardContent>
        </Card>

        {/* Evolução Financeira — LineChart last 6 months */}
        <Card className="min-h-[320px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LineChartIcon className="size-4" />
              Evolução Financeira
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <ChartErrorBoundary>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={kpis.evolucaoFinanceira} role="img" aria-label="Gráfico de evolução financeira dos últimos 6 meses">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`}
                  />
                  <RechartsTooltip content={<ChartTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Line
                    type="monotone"
                    dataKey="entradas"
                    name="Entradas"
                    stroke={CHART_COLORS.green}
                    strokeWidth={2}
                    dot={{ r: 3, strokeWidth: 2, fill: "var(--card)" }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="saidas"
                    name="Saídas"
                    stroke={CHART_COLORS.red}
                    strokeWidth={2}
                    dot={{ r: 3, strokeWidth: 2, fill: "var(--card)" }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="resultado"
                    name="Resultado"
                    stroke={CHART_COLORS.blue}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3, strokeWidth: 2, fill: "var(--card)" }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartErrorBoundary>
          </CardContent>
        </Card>
      </section>

      {/* Alertas Inteligentes */}
      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Alertas Inteligentes</h2>
        <div className="grid gap-2">
          {alertas.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
                alert.level === "danger"
                  ? "border-[var(--motriz-vermelho)]/30 bg-[var(--motriz-vermelho)]/5 text-[var(--motriz-vermelho)]"
                  : alert.level === "warning"
                    ? "border-[var(--motriz-ambar)]/30 bg-[var(--motriz-ambar)]/5 text-[var(--motriz-ambar)]"
                    : "border-[var(--motriz-verde-esmeralda)]/30 bg-[var(--motriz-verde-esmeralda)]/5 text-[var(--motriz-verde-esmeralda)]"
              }`}
            >
              {alert.icon}
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
    </TooltipProvider>
  );
}