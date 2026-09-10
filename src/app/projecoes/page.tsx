"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calculator,
  Shield,
  LineChart as LineChartIcon,
  Bike,
  DollarSign,
  Wrench,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ChartErrorBoundary } from "@/components/chart-error-boundary";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { loadSeedData } from "@/data/seed";

/* ── Chart palette (Motriz brand — matches dashboard page.tsx) ── */
const CHART_COLORS = {
  pessimista: "#EF4444",
  base: "#3B82F6",
  otimista: "#10B981",
} as const;

/* ── Scenario types ── */

type ScenarioKey = "base" | "pessimista" | "otimista";

interface ScenarioPreset {
  label: string;
  color: string;
  icon: React.ReactNode;
  receitaAdj: number; // % adjustment to revenue
  custosAdj: number; // % adjustment to costs
}

const SCENARIO_PRESETS: Record<ScenarioKey, ScenarioPreset> = {
  pessimista: {
    label: "Pessimista",
    color: CHART_COLORS.pessimista,
    icon: <TrendingDown className="size-4" />,
    receitaAdj: -15,
    custosAdj: 10,
  },
  base: {
    label: "Base",
    color: CHART_COLORS.base,
    icon: <Minus className="size-4" />,
    receitaAdj: 0,
    custosAdj: 0,
  },
  otimista: {
    label: "Otimista",
    color: CHART_COLORS.otimista,
    icon: <TrendingUp className="size-4" />,
    receitaAdj: 20,
    custosAdj: -5,
  },
};

/* ── Custom tooltip ── */

function ProjectionTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
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
          <span className="font-semibold tabular-nums">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Page ── */

export default function ProjecoesPage() {
  const receitaRecorrente = useStore((s) => s.getReceitaRecorrente());
  const saldoCaixa = useStore((s) => s.getSaldoCaixa());
  const runway = useStore((s) => s.getRunway());
  const pontoEquilibrio = useStore((s) => s.getPontoEquilibrio());
  const lancamentos = useStore((s) => s.lancamentos);
  const contratos = useStore((s) => s.contratos);
  const motos = useStore((s) => s.motos);

  // Prevent hydration mismatch — only read store data after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    // loadSeedData(); // Seed disabled — using real data only
  }, []);

  /* ── Scenario state ── */
  const [receitaAdj, setReceitaAdj] = useState(0);
  const [custosAdj, setCustosAdj] = useState(0);
  const [activePreset, setActivePreset] = useState<ScenarioKey | "custom">("base");

  /* ── Growth simulator state ── */
  const [newMotos, setNewMotos] = useState(0);
  const [avgRevenuePerMoto, setAvgRevenuePerMoto] = useState(0);
  const [additionalCostPerMoto, setAdditionalCostPerMoto] = useState(0);

  /* ── Buffer state ── */
  const [bufferOverride, setBufferOverride] = useState<number | null>(null);

  /* ── Derived values ── */

  // Average revenue per moto from current fleet
  const computedAvgRevenuePerMoto = useMemo(() => {
    const ativos = contratos.filter((c) => c.status === "Ativo");
    const totalMotos = ativos.reduce((acc, c) => acc + c.motosVinculadas.length, 0);
    const totalReceita = ativos.reduce((acc, c) => acc + c.valorMensalTotal, 0);
    return totalMotos > 0 ? totalReceita / totalMotos : 0;
  }, [contratos]);

  // Set default avg revenue when store loads (only once)
  const avgRevenueInitialized = useRef(false);
  useEffect(() => {
    if (!avgRevenueInitialized.current && computedAvgRevenuePerMoto > 0) {
      avgRevenueInitialized.current = true;
      setAvgRevenuePerMoto(Math.round(computedAvgRevenuePerMoto));
    }
  }, [computedAvgRevenuePerMoto]);

  // Buffer de Imprevistos: average of last 3 months extraordinary expenses
  const bufferAuto = useMemo(() => {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const extraDespesas = lancamentos.filter(
      (l) =>
        l.tipo === "Pagamos" &&
        l.status === "Pago" &&
        l.categoria === "Extraordinário" &&
        new Date(l.data) >= threeMonthsAgo
    );
    const total = extraDespesas.reduce((acc, l) => acc + l.valor, 0);
    return total / 3;
  }, [lancamentos]);

  const bufferValue = bufferOverride ?? bufferAuto;

  // Base monthly costs (average last 3 months, excluding CAPEX)
  const baseMonthlyCosts = useMemo(() => {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const despesas = lancamentos.filter(
      (l) =>
        l.tipo === "Pagamos" &&
        l.status === "Pago" &&
        !l.ehInvestimento &&
        new Date(l.data) >= threeMonthsAgo
    );
    const total = despesas.reduce((acc, l) => acc + l.valor, 0);
    return total / 3;
  }, [lancamentos]);

  /* ── Apply preset ── */

  function applyPreset(key: ScenarioKey) {
    setActivePreset(key);
    setReceitaAdj(SCENARIO_PRESETS[key].receitaAdj);
    setCustosAdj(SCENARIO_PRESETS[key].custosAdj);
  }

  function handleReceitaChange(value: number[]) {
    setReceitaAdj(value[0]);
    setActivePreset("custom");
  }

  function handleCustosChange(value: number[]) {
    setCustosAdj(value[0]);
    setActivePreset("custom");
  }

  /* ── Projection engine ── */

  const projectionData = useMemo(() => {
    const months = 12;
    const now = new Date();
    const data: Array<{
      month: string;
      monthDate: Date;
      base: number;
      pessimista: number;
      otimista: number;
    }> = [];

    for (let m = 1; m <= months; m++) {
      const monthDate = addMonths(now, m);
      const label = format(monthDate, "MMM/yy", { locale: ptBR });

      // For each scenario, compute adjusted revenue and costs
      const scenarios: Record<ScenarioKey, number> = { base: 0, pessimista: 0, otimista: 0 };

      for (const key of Object.keys(SCENARIO_PRESETS) as ScenarioKey[]) {
        const preset = SCENARIO_PRESETS[key];
        const adjReceita = receitaRecorrente * (1 + preset.receitaAdj / 100);
        const adjCustos = baseMonthlyCosts * (1 + preset.custosAdj / 100);
        const growthRevenue = newMotos * avgRevenuePerMoto;
        const growthCost = newMotos * additionalCostPerMoto;
        const netMonthly = adjReceita + growthRevenue - adjCustos - growthCost - bufferValue;
        scenarios[key] = netMonthly;
      }

      data.push({
        month: label,
        monthDate,
        base: scenarios.base,
        pessimista: scenarios.pessimista,
        otimista: scenarios.otimista,
      });
    }

    return data;
  }, [receitaRecorrente, baseMonthlyCosts, bufferValue, newMotos, avgRevenuePerMoto, additionalCostPerMoto]);

  // Cumulative cash flow for chart
  const cumulativeData = useMemo(() => {
    let cumBase = saldoCaixa;
    let cumPess = saldoCaixa;
    let cumOtim = saldoCaixa;

    return projectionData.map((row) => {
      cumBase += row.base;
      cumPess += row.pessimista;
      cumOtim += row.otimista;
      return {
        month: row.month,
        Base: cumBase,
        Pessimista: cumPess,
        Otimista: cumOtim,
      };
    });
  }, [projectionData, saldoCaixa]);

  // Breakeven point: first month where base scenario cumulative turns positive (if starting negative)
  const breakevenMonth = useMemo(() => {
    if (saldoCaixa >= 0) return null;
    const idx = cumulativeData.findIndex((d) => d.Base >= 0);
    return idx >= 0 ? cumulativeData[idx].month : null;
  }, [cumulativeData, saldoCaixa]);

  // Growth impact calculations
  const growthImpact = useMemo(() => {
    const additionalRevenue = newMotos * avgRevenuePerMoto;
    const additionalCost = newMotos * additionalCostPerMoto;
    const netImpact = additionalRevenue - additionalCost;
    const newRunway = baseMonthlyCosts + additionalCost > 0
      ? saldoCaixa / ((baseMonthlyCosts + additionalCost) / (1 + (netImpact > 0 ? netImpact / (baseMonthlyCosts + additionalCost) : 0)))
      : runway;
    const newPontoEq = avgRevenuePerMoto > 0
      ? Math.ceil((baseMonthlyCosts + additionalCost) / avgRevenuePerMoto)
      : pontoEquilibrio;
    const newReceitaRecorrente = receitaRecorrente + additionalRevenue;

    return {
      additionalRevenue,
      additionalCost,
      netImpact,
      newRunway: isFinite(newRunway) ? newRunway : runway,
      newPontoEq,
      newReceitaRecorrente,
    };
  }, [newMotos, avgRevenuePerMoto, additionalCostPerMoto, baseMonthlyCosts, saldoCaixa, runway, pontoEquilibrio, receitaRecorrente]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Projeções e Cenários</h1>

      {/* ── Scenario Simulator ── */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Calculator className="size-5 text-muted-foreground" />
          Simulador de Cenários
        </h2>

        {/* Preset buttons */}
        <div className="mb-4 flex flex-wrap gap-2">
          {(Object.keys(SCENARIO_PRESETS) as ScenarioKey[]).map((key) => (
            <Button
              key={key}
              variant={activePreset === key ? "default" : "outline"}
              size="sm"
              onClick={() => applyPreset(key)}
              className="gap-1.5"
              style={
                activePreset === key
                  ? { backgroundColor: SCENARIO_PRESETS[key].color, borderColor: SCENARIO_PRESETS[key].color }
                  : undefined
              }
            >
              {SCENARIO_PRESETS[key].icon}
              {SCENARIO_PRESETS[key].label}
            </Button>
          ))}
          {activePreset === "custom" && (
            <span className="flex items-center px-3 text-xs font-medium text-muted-foreground">
              Personalizado
            </span>
          )}
        </div>

        {/* Sliders */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <DollarSign className="size-4 text-muted-foreground" />
                Ajuste de Receita
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Ajuste manual</span>
                <span className={`tabular-nums font-medium ${receitaAdj >= 0 ? "text-[var(--motriz-verde-esmeralda)]" : "text-[var(--motriz-vermelho)]"}`}>
                  {receitaAdj > 0 ? "+" : ""}{receitaAdj}%
                </span>
              </div>
              <Slider min={-50} max={100} step={1} value={[receitaAdj]} onValueChange={handleReceitaChange} />
              <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                <span>-50%</span>
                <span>0%</span>
                <span>+100%</span>
              </div>
              <div className="border-t border-border pt-2">
                <p className="text-xs text-muted-foreground">Receita projetada</p>
                <p className="text-sm font-bold tabular-nums">
                  {mounted ? formatCurrency(receitaRecorrente * (1 + receitaAdj / 100)) : "R$ 0,00"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Wrench className="size-4 text-muted-foreground" />
                Ajuste de Custos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Ajuste manual</span>
                <span className={`tabular-nums font-medium ${custosAdj <= 0 ? "text-[var(--motriz-verde-esmeralda)]" : "text-[var(--motriz-vermelho)]"}`}>
                  {custosAdj > 0 ? "+" : ""}{custosAdj}%
                </span>
              </div>
              <Slider min={-30} max={50} step={1} value={[custosAdj]} onValueChange={handleCustosChange} />
              <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                <span>-30%</span>
                <span>0%</span>
                <span>+50%</span>
              </div>
              <div className="border-t border-border pt-2">
                <p className="text-xs text-muted-foreground">Custo mensal projetado</p>
                <p className="text-sm font-bold tabular-nums">
                  {formatCurrency(baseMonthlyCosts * (1 + custosAdj / 100))}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Growth Simulator ── */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Bike className="size-5 text-muted-foreground" />
          Simulador de Crescimento (Novas Motos)
        </h2>
        <Card>
          <CardContent className="grid gap-6 py-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="new-motos">Quantidade de novas motos</Label>
              <Input
                id="new-motos"
                type="number"
                min={0}
                max={100}
                step={1}
                value={newMotos}
                onChange={(e) => setNewMotos(Math.max(0, Number(e.target.value)))}
                className="tabular-nums"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avg-revenue">Receita média/moto (R$)</Label>
              <Input
                id="avg-revenue"
                type="number"
                min={0}
                step={50}
                value={avgRevenuePerMoto}
                onChange={(e) => setAvgRevenuePerMoto(Math.max(0, Number(e.target.value)))}
                className="tabular-nums"
              />
              <p className="text-xs text-muted-foreground">
                Média atual da frota: {formatCurrency(computedAvgRevenuePerMoto)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-cost">Custo fixo adicional/moto (R$)</Label>
              <Input
                id="add-cost"
                type="number"
                min={0}
                step={50}
                value={additionalCostPerMoto}
                onChange={(e) => setAdditionalCostPerMoto(Math.max(0, Number(e.target.value)))}
                className="tabular-nums"
              />
              <p className="text-xs text-muted-foreground">Manutenção, seguro, etc.</p>
            </div>
          </CardContent>
        </Card>

        {/* Growth impact summary */}
        {newMotos > 0 && (
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <Card className="py-3">
              <CardContent className="py-0">
                <p className="text-xs text-muted-foreground">Receita Recorrente</p>
                <p className="text-sm font-bold tabular-nums text-[var(--motriz-verde-esmeralda)]">
                  {formatCurrency(growthImpact.newReceitaRecorrente)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  +{formatCurrency(growthImpact.additionalRevenue)}
                </p>
              </CardContent>
            </Card>
            <Card className="py-3">
              <CardContent className="py-0">
                <p className="text-xs text-muted-foreground">Impacto Líquido/mês</p>
                <p className={`text-sm font-bold tabular-nums ${growthImpact.netImpact >= 0 ? "text-[var(--motriz-verde-esmeralda)]" : "text-[var(--motriz-vermelho)]"}`}>
                  {formatCurrency(growthImpact.netImpact)}
                </p>
              </CardContent>
            </Card>
            <Card className="py-3">
              <CardContent className="py-0">
                <p className="text-xs text-muted-foreground">Runway Projetado</p>
                <p className="text-sm font-bold tabular-nums">
                  {growthImpact.newRunway.toFixed(1)} meses
                </p>
              </CardContent>
            </Card>
            <Card className="py-3">
              <CardContent className="py-0">
                <p className="text-xs text-muted-foreground">Ponto de Equilíbrio</p>
                <p className="text-sm font-bold tabular-nums">
                  {growthImpact.newPontoEq} motos
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      {/* ── Buffer de Imprevistos ── */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Shield className="size-5 text-muted-foreground" />
          Buffer de Imprevistos
        </h2>
        <Card>
          <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label>Valor calculado (média últimos 3 meses extraordinários)</Label>
              <div className="flex items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-2 text-sm tabular-nums">
                {formatCurrency(bufferAuto)}
              </div>
              <p className="text-xs text-muted-foreground">
                Calculado automaticamente a partir das despesas extraordinárias dos últimos 3 meses.
              </p>
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="buffer-override">Sobrescrever valor (opcional)</Label>
              <Input
                id="buffer-override"
                type="number"
                min={0}
                step={100}
                placeholder={formatCurrency(bufferAuto)}
                value={bufferOverride ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setBufferOverride(v === "" ? null : Math.max(0, Number(v)));
                }}
                className="tabular-nums"
              />
              <p className="text-xs text-muted-foreground">
                Valor ativo: <span className="font-medium tabular-nums">{formatCurrency(bufferValue)}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Projection Chart ── */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold tracking-tight">
          <LineChartIcon className="size-5 text-muted-foreground" />
          Projeção de Fluxo de Caixa (12 meses)
        </h2>
        <Card className="min-h-[400px]">
          <CardContent className="py-4">
            <ChartErrorBoundary>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={cumulativeData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }} role="img" aria-label="Gráfico de projeção de fluxo de caixa para os próximos 12 meses em três cenários">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => formatCurrency(v)}
                  width={90}
                />
                <Tooltip content={<ProjectionTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  iconType="circle"
                  iconSize={8}
                />
                {breakevenMonth && (
                  <ReferenceLine
                    x={breakevenMonth}
                    stroke="var(--motriz-ambar)"
                    strokeDasharray="4 4"
                    label={{ value: "Break-even", position: "top", fontSize: 10, fill: "var(--motriz-ambar)" }}
                  />
                )}
                <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="2 2" />
                <Line
                  type="monotone"
                  dataKey="Pessimista"
                  stroke={CHART_COLORS.pessimista}
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 2 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="Base"
                  stroke={CHART_COLORS.base}
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 2 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="Otimista"
                  stroke={CHART_COLORS.otimista}
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 2 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </LineChart>
              </ResponsiveContainer>
            </ChartErrorBoundary>
          </CardContent>
        </Card>
      </section>

      {/* ── Summary Table ── */}
      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Detalhamento Mensal</h2>
        <Card>
          <CardContent className="overflow-x-auto py-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 text-left font-medium text-muted-foreground">Mês</th>
                  <th className="py-3 text-right font-medium tabular-nums" style={{ color: CHART_COLORS.pessimista }}>
                    Pessimista
                  </th>
                  <th className="py-3 text-right font-medium tabular-nums" style={{ color: CHART_COLORS.base }}>
                    Base
                  </th>
                  <th className="py-3 text-right font-medium tabular-nums" style={{ color: CHART_COLORS.otimista }}>
                    Otimista
                  </th>
                </tr>
              </thead>
              <tbody>
                {cumulativeData.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 tabular-nums text-muted-foreground">{row.month}</td>
                    <td className="py-2 text-right tabular-nums font-medium">{formatCurrency(row.Pessimista)}</td>
                    <td className="py-2 text-right tabular-nums font-medium">{formatCurrency(row.Base)}</td>
                    <td className="py-2 text-right tabular-nums font-medium">{formatCurrency(row.Otimista)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}