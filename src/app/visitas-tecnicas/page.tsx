"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Wrench,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  CalendarClock,
  User,
  FileText,
  TrendingDown,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { LancamentoFinanceiro, TipoVisitaTecnico } from "@/types";
import { VisitaFormDialog } from "@/components/visita-form-dialog";

/* ── Helpers ── */

const TIPO_BADGE: Record<string, { label: string; className: string }> = {
  "Contrato Ativo": { label: "Contrato", className: "bg-blue-500/10 text-blue-600" },
  "Test Ride": { label: "Test Ride", className: "bg-purple-500/10 text-purple-600" },
  "Inesperada": { label: "Inesperada", className: "bg-orange-500/10 text-orange-600" },
  "Manutenção Preventiva": { label: "Prev.", className: "bg-green-500/10 text-green-600" },
  "Manutenção Corretiva": { label: "Corr.", className: "bg-red-500/10 text-red-600" },
};

const CATEGORIA_ICON: Record<string, string> = {
  "Mão de Obra": "🔧",
  "Gasolina/Transporte": "⛽",
  "Peças": "🔩",
  "Ferramentas": "🛠️",
  "Outros": "📦",
};

const STATUS_BADGE: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  Pago: { label: "Pago", className: "bg-green-500/10 text-green-600", icon: <CheckCircle2 className="size-3" /> },
  Pendente: { label: "Pendente", className: "bg-amber-500/10 text-amber-600", icon: <Clock className="size-3" /> },
  Previsto: { label: "Previsto", className: "bg-blue-500/10 text-blue-600", icon: <CalendarClock className="size-3" /> },
  Recebido: { label: "Recebido", className: "bg-green-500/10 text-green-600", icon: <CheckCircle2 className="size-3" /> },
};

/* ── KPI Card ── */

function KpiCard({ title, value, icon, subtitle, tone = "default" }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle?: string;
  tone?: "default" | "teal" | "warning" | "danger";
}) {
  const toneClass =
    tone === "teal" ? "text-[#14B8A6]" :
    tone === "warning" ? "text-[var(--motriz-ambar)]" :
    tone === "danger" ? "text-[var(--motriz-vermelho)]" :
    "text-muted-foreground";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={toneClass}>{icon}</div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums tracking-tight">{value}</p>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

/* ── Page ── */

export default function VisitasTecnicasPage() {
  const lancamentos = useStore((s) => s.lancamentos);
  const contratos = useStore((s) => s.contratos);
  const removeLancamento = useStore((s) => s.removeLancamento);
  const getVisitasTecnicasMes = useStore((s) => s.getVisitasTecnicasMes);
  const getCustoTotalVisitasMes = useStore((s) => s.getCustoTotalVisitasMes);
  const getCustoVisitasPorCategoria = useStore((s) => s.getCustoVisitasPorCategoria);
  const getValorMauUsoPendente = useStore((s) => s.getValorMauUsoPendente);
  const getValorMauUsoPago = useStore((s) => s.getValorMauUsoPago);
  const getValorMauUsoPendenteCount = useStore((s) => s.getValorMauUsoPendenteCount);
  const getValorMauUsoPagoCount = useStore((s) => s.getValorMauUsoPagoCount);
  const getVisitasPorTecnico = useStore((s) => s.getVisitasPorTecnico);

  // Prevent hydration mismatch — only read store data after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Current month filter
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterTecnico, setFilterTecnico] = useState<string>("all");

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingLancamento, setEditingLancamento] = useState<LancamentoFinanceiro | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Data — only compute after mount to avoid hydration mismatch
  const visitasMes = useMemo(() => mounted ? getVisitasTecnicasMes(selectedMonth) : [], [mounted, getVisitasTecnicasMes, selectedMonth]);
  const custoTotal = useMemo(() => mounted ? getCustoTotalVisitasMes(selectedMonth) : 0, [mounted, getCustoTotalVisitasMes, selectedMonth]);
  const custoPorCategoria = useMemo(() => mounted ? getCustoVisitasPorCategoria(selectedMonth) : {}, [mounted, getCustoVisitasPorCategoria, selectedMonth]);
  const mauUsoPendente = useMemo(() => mounted ? getValorMauUsoPendente() : 0, [mounted, getValorMauUsoPendente]);
  const mauUsoPago = useMemo(() => mounted ? getValorMauUsoPago() : 0, [mounted, getValorMauUsoPago]);
  const mauUsoPendenteCount = useMemo(() => mounted ? getValorMauUsoPendenteCount() : 0, [mounted, getValorMauUsoPendenteCount]);
  const mauUsoPagoCount = useMemo(() => mounted ? getValorMauUsoPagoCount() : 0, [mounted, getValorMauUsoPagoCount]);
  const visitasPorTecnico = useMemo(() => mounted ? getVisitasPorTecnico(selectedMonth) : {}, [mounted, getVisitasPorTecnico, selectedMonth]);

  // Filtered visits
  const visitasFiltradas = useMemo(() => {
    let result = visitasMes;
    if (filterTipo !== "all") {
      result = result.filter((v) => v.tipoVisita === filterTipo);
    }
    if (filterTecnico !== "all") {
      result = result.filter((v) => v.tecnicoResponsavel === filterTecnico);
    }
    return result;
  }, [visitasMes, filterTipo, filterTecnico]);

  // Unique technicians for filter
  const tecnicosUnicos = useMemo(() => {
    const set = new Set<string>();
    for (const v of visitasMes) {
      if (v.tecnicoResponsavel) set.add(v.tecnicoResponsavel);
    }
    return Array.from(set).sort();
  }, [visitasMes]);

  // Contract name lookup
  function getContratoNome(contratoId?: string): string {
    if (!contratoId) return "—";
    const c = contratos.find((ct) => ct.id === contratoId);
    return c?.nome || c?.id || "—";
  }

  // Counts
  const visitasContratoCount = visitasMes.filter((v) => v.tipoVisita === "Contrato Ativo").length;

  function handleEdit(lancamento: LancamentoFinanceiro) {
    setEditingLancamento(lancamento);
    setFormOpen(true);
  }

  function handleDelete() {
    if (!deleteId) return;
    try {
      removeLancamento(deleteId);
      toast.success("Visita técnica removida");
    } catch {
      toast.error("Erro ao remover visita");
    }
    setDeleteId(null);
  }

  function handleNew() {
    setEditingLancamento(null);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="size-6 text-[#14B8A6]" />
            Custo de Visita de Técnico
          </h1>
          <p className="text-sm text-muted-foreground">
            Controle e acompanhamento dos gastos com visitas técnicas da frota
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <CalendarClock className="size-4 text-muted-foreground" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-semibold outline-none focus:ring-0"
            />
          </div>
          <Button onClick={handleNew} className="bg-[#14B8A6] hover:bg-[#0D9488]">
            <Plus className="mr-1.5 size-4" />
            Nova Visita
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Custo Total (Mês)"
          value={formatCurrency(custoTotal)}
          icon={<TrendingDown className="size-4" />}
          subtitle={`${visitasMes.length} visita${visitasMes.length !== 1 ? "s" : ""} neste mês`}
          tone="teal"
        />
        <KpiCard
          title="Visitas em Contratos"
          value={String(visitasContratoCount)}
          icon={<FileText className="size-4" />}
          subtitle="Vinculadas a contratos ativos"
        />
        <div className="grid grid-cols-2 gap-2">
          <KpiCard
            title="Mau Uso Pago"
            value={formatCurrency(mauUsoPago)}
            icon={<CheckCircle2 className="size-4" />}
            subtitle={`${mauUsoPagoCount} cobrança(s) recebida(s)`}
            tone="teal"
          />
          <KpiCard
            title="Mau Uso Pendente"
            value={formatCurrency(mauUsoPendente)}
            icon={<AlertTriangle className="size-4" />}
            subtitle={`${mauUsoPendenteCount} cobrança(s) a receber`}
            tone={mauUsoPendente > 0 ? "danger" : "default"}
          />
        </div>
        <KpiCard
          title="Técnicos Ativos"
          value={String(Object.keys(visitasPorTecnico).length)}
          icon={<User className="size-4" />}
          subtitle="Técnicos com visitas no mês"
        />
      </section>

      {/* Breakdown by Category + Technician */}
      <section className="grid gap-4 md:grid-cols-2">
        {/* By Category */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="size-4 text-[#14B8A6]" />
              Custos por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(custoPorCategoria).length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhum custo registrado neste mês.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(custoPorCategoria)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, val]) => {
                    const pct = custoTotal > 0 ? (val / custoTotal) * 100 : 0;
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5">
                            <span>{CATEGORIA_ICON[cat] || "📦"}</span>
                            <span className="font-medium">{cat}</span>
                          </span>
                          <span className="font-semibold tabular-nums">{formatCurrency(val)}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted">
                          <div
                            className="h-1.5 rounded-full bg-[#14B8A6] transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Technician */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="size-4 text-[#14B8A6]" />
              Custos por Técnico
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(visitasPorTecnico).length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhum técnico registrado neste mês.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(visitasPorTecnico)
                  .sort(([, a], [, b]) => b.total - a.total)
                  .map(([tec, data]) => (
                    <div key={tec} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="size-3.5 text-muted-foreground" />
                        <span className="font-medium">{tec}</span>
                        <Badge variant="secondary" className="text-[10px]">{data.count} visita{data.count !== 1 ? "s" : ""}</Badge>
                      </div>
                      <span className="font-semibold tabular-nums">{formatCurrency(data.total)}</span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Filters */}
      <section className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Tipo:</span>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="Contrato Ativo">Contrato Ativo</SelectItem>
              <SelectItem value="Test Ride">Test Ride</SelectItem>
              <SelectItem value="Inesperada">Inesperada</SelectItem>
              <SelectItem value="Manutenção Preventiva">Manutenção Preventiva</SelectItem>
              <SelectItem value="Manutenção Corretiva">Manutenção Corretiva</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Técnico:</span>
          <Select value={filterTecnico} onValueChange={setFilterTecnico}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os técnicos</SelectItem>
              {tecnicosUnicos.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-xs text-muted-foreground ml-auto">
          {visitasFiltradas.length} de {visitasMes.length} visita{visitasMes.length !== 1 ? "s" : ""}
        </span>
      </section>

      {/* Data Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="size-4 text-[#14B8A6]" />
            Registro de Visitas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {visitasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Wrench className="size-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhuma visita técnica registrada</p>
              <p className="text-xs mt-1">Clique em &quot;Nova Visita&quot; para registrar um custo de visita técnica.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Categoria</TableHead>
                  <TableHead className="text-xs">Técnico</TableHead>
                  <TableHead className="text-xs">Contrato</TableHead>
                  <TableHead className="text-xs">Descrição</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                  <TableHead className="text-xs text-center">Mau Uso</TableHead>
                  <TableHead className="text-xs text-center">Status</TableHead>
                  <TableHead className="text-xs text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visitasFiltradas.map((v) => {
                  const tipoBadge = TIPO_BADGE[v.tipoVisita || ""] || { label: v.tipoVisita || "—", className: "bg-muted text-muted-foreground" };
                  const statusBadge = STATUS_BADGE[v.status] || { label: v.status, className: "bg-muted text-muted-foreground", icon: null };
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="text-xs tabular-nums whitespace-nowrap">
                        {formatDate(v.data)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${tipoBadge.className}`}>
                          {tipoBadge.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="flex items-center gap-1">
                          <span>{CATEGORIA_ICON[v.categoriaCustoVisita || ""] || "📦"}</span>
                          {v.categoriaCustoVisita || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {v.tecnicoResponsavel || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                        {getContratoNome(v.contratoId)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                        {v.descricao}
                      </TableCell>
                      <TableCell className="text-xs font-semibold tabular-nums text-right">
                        {formatCurrency(v.valor)}
                      </TableCell>
                      <TableCell className="text-center">
                        {v.ehMauUso ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-600">
                            <AlertTriangle className="size-2.5" />
                            {v.valorCobrarCliente ? formatCurrency(v.valorCobrarCliente) : "Sim"}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge.className}`}>
                          {statusBadge.icon}
                          {statusBadge.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(v)}>
                            <Pencil className="size-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteId(v.id)}>
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <VisitaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingLancamento={editingLancamento}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Visita Técnica</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este registro de visita técnica? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}