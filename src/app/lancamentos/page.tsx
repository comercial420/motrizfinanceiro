"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Trash2,
  AlertTriangle,
  Pencil,
  CalendarClock,
  RefreshCw,
  CheckCircle2,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useStore } from "@/lib/store";
import { formatCurrency, formatDate, generateId } from "@/lib/utils";
import type { LancamentoFinanceiro } from "@/types";

/* ── Form Schema ── */

const lancamentoSchema = z.object({
  tipo: z.enum(["Recebemos", "Pagamos"]),
  valor: z.coerce.number().positive("Valor deve ser maior que zero"),
  data: z.string().min(1, "Data é obrigatória"),
  descricao: z.string().min(3, "Descrição deve ter pelo menos 3 caracteres"),
  classificacao: z.string().min(1, "Classificação é obrigatória"),
  categoria: z.enum(["Fixo", "Variável", "Extraordinário", "CAPEX"]),
  centroCusto: z.enum(["Operacional", "Comercial", "Administrativo", "Financeiro", "Marketing"]),
  formaPagamento: z.enum(["PIX", "Boleto", "Cartão", "Transferência", "Dinheiro", "Outros"]),
  status: z.enum(["Pago", "Recebido", "Pendente", "Previsto"]),
  contratoId: z.string().optional(),
  nomeEmpresa: z.string().optional(),
  recorrenciaFim: z.string().optional(),
});

type LancamentoFormValues = z.infer<typeof lancamentoSchema>;

/* ── Filters ── */

interface Filters {
  mes: string;
  status: string;
  tipo: string;
}

/* ── Inline Edit Cell (text fields) ── */

function EditableCell({
  value,
  onSave,
}: {
  value: string;
  onSave: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <div
        className="group flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 hover:bg-muted/50"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
      >
        <span>{value}</span>
        <Pencil className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSave(draft);
            setEditing(false);
          }
          if (e.key === "Escape") setEditing(false);
        }}
        className="h-7 w-full text-xs"
      />
      <button
        type="button"
        onClick={() => {
          onSave(draft);
          setEditing(false);
        }}
        className="shrink-0 rounded p-1 text-[var(--motriz-verde-esmeralda)] hover:bg-[var(--motriz-verde-esmeralda)]/10"
        title="Confirmar"
      >
        <CheckCircle2 className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted"
        title="Cancelar"
      >
        <Trash2 className="size-3" />
      </button>
    </div>
  );
}

/* ── Editable Currency Cell (dedicated for monetary values) ── */

function EditableCurrencyCell({
  value,
  onSave,
}: {
  value: number;
  onSave: (val: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [rawInput, setRawInput] = useState("");

  // Format number to BRL display
  const formattedDisplay = formatCurrency(value);

  // Parse raw input (handles both "5000" and "5.000,00" formats)
  const parseCurrencyInput = (input: string): number => {
    // Remove everything except digits and comma
    const cleaned = input.replace(/[^\d,]/g, "");
    // Replace comma with dot for parsing
    const normalized = cleaned.replace(",", ".");
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Format input as user types (add thousand separators)
  const formatAsTyping = (input: string): string => {
    // Remove non-digits
    const digits = input.replace(/\D/g, "");
    if (!digits) return "";
    // Add thousand separators from right to left
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAsTyping(e.target.value);
    setRawInput(formatted);
  };

  const handleSave = () => {
    const parsed = parseCurrencyInput(rawInput);
    if (parsed > 0) {
      onSave(parsed);
      setEditing(false);
    }
  };

  if (!editing) {
    return (
      <div
        className="group flex cursor-pointer items-center justify-end gap-1 rounded px-1 py-0.5 hover:bg-muted/50"
        onClick={() => {
          // Initialize with raw number (no formatting) for easier editing
          setRawInput(String(value));
          setEditing(true);
        }}
      >
        <span className="tabular-nums font-medium">{formattedDisplay}</span>
        <Pencil className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
      </div>
    );
  }

  const previewValue = parseCurrencyInput(rawInput);
  const previewFormatted = previewValue > 0 ? formatCurrency(previewValue) : "R$ 0,00";

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            R$
          </span>
          <Input
            autoFocus
            value={rawInput}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") setEditing(false);
            }}
            placeholder="0"
            className="h-7 w-full pl-8 pr-2 text-right text-xs tabular-nums"
            inputMode="numeric"
          />
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={previewValue <= 0}
          className="shrink-0 rounded p-1 text-[var(--motriz-verde-esmeralda)] hover:bg-[var(--motriz-verde-esmeralda)]/10 disabled:opacity-50 disabled:hover:bg-transparent"
          title="Confirmar"
        >
          <CheckCircle2 className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted"
          title="Cancelar"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
      {/* Live preview of formatted value */}
      <p className="text-right text-[10px] text-muted-foreground">
        Preview: <span className="font-medium text-foreground">{previewFormatted}</span>
      </p>
    </div>
  );
}

/* ── Status Toggle Button ── */

function StatusToggle({
  currentStatus,
  tipo,
  onToggle,
}: {
  currentStatus: LancamentoFinanceiro["status"];
  tipo: LancamentoFinanceiro["tipo"];
  onToggle: () => void;
}) {
  const isDone =
    (tipo === "Pagamos" && currentStatus === "Pago") ||
    (tipo === "Recebemos" && currentStatus === "Recebido");

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
        isDone
          ? "bg-[var(--motriz-verde-esmeralda)]/10 text-[var(--motriz-verde-esmeralda)] hover:bg-[var(--motriz-verde-esmeralda)]/20"
          : "bg-[var(--motriz-ambar)]/10 text-[var(--motriz-ambar)] hover:bg-[var(--motriz-ambar)]/20"
      }`}
      title={isDone ? "Marcar como pendente" : "Marcar como concluído"}
    >
      {isDone ? (
        <>
          <CheckCircle2 className="size-3" />
          {tipo === "Pagamos" ? "Pago" : "Recebido"}
        </>
      ) : (
        <>
          <CalendarClock className="size-3" />
          Pendente
        </>
      )}
    </button>
  );
}

/* ── Page ── */

export default function LancamentosPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  // Filtro de mês obrigatório — default = mês atual (YYYY-MM)
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const [filters, setFilters] = useState<Filters>({ mes: currentMonth, status: "", tipo: "" });
  const [deleteTarget, setDeleteTarget] = useState<LancamentoFinanceiro | null>(null);
  const [activeTab, setActiveTab] = useState<"todos" | "fixos">("todos");
  // Edit dialog state
  const [editTarget, setEditTarget] = useState<LancamentoFinanceiro | null>(null);
  const [editForm, setEditForm] = useState({
    tipo: "Pagamos" as "Recebemos" | "Pagamos",
    valor: 0,
    data: "",
    descricao: "",
    classificacao: "",
    categoria: "Variável" as "Fixo" | "Variável" | "Extraordinário" | "CAPEX",
    centroCusto: "Operacional" as "Operacional" | "Comercial" | "Administrativo" | "Financeiro" | "Marketing",
    formaPagamento: "PIX" as "PIX" | "Boleto" | "Cartão" | "Transferência" | "Dinheiro" | "Outros",
    status: "Pendente" as "Pago" | "Recebido" | "Pendente" | "Previsto",
  });
  const [confirmEditOpen, setConfirmEditOpen] = useState(false);
  const [applyDateToFuture, setApplyDateToFuture] = useState(false);

  const lancamentos = useStore((s) => s.lancamentos);
  const addLancamento = useStore((s) => s.addLancamento);
  const addLancamentoRecorrente = useStore((s) => s.addLancamentoRecorrente);
  const updateLancamento = useStore((s) => s.updateLancamento);
  const updateGrupoRecorrenciaFuturo = useStore((s) => s.updateGrupoRecorrenciaFuturo);
  const updateDiaGrupoRecorrenciaFuturo = useStore((s) => s.updateDiaGrupoRecorrenciaFuturo);
  const removeLancamento = useStore((s) => s.removeLancamento);
  const removeGrupoRecorrenciaFuturo = useStore((s) => s.removeGrupoRecorrenciaFuturo);
  const getPendenciasFimMes = useStore((s) => s.getPendenciasFimMes);
  const getPendenciasParcelasFimMes = useStore((s) => s.getPendenciasParcelasFimMes);
  const getParcelasRecebidasPorVenda = useStore((s) => s.getParcelasRecebidasPorVenda);
  const updateHistoricoVenda = useStore((s) => s.updateHistoricoVenda);
  const isPeriodoFechamentoMes = useStore((s) => s.isPeriodoFechamentoMes);
  const contratos = useStore((s) => s.contratos);
  const contratosAtivos = useMemo(() => contratos.filter((c) => c.status === "Ativo"), [contratos]);

  // Fechamento de mês warning — calculado no client para evitar hydration mismatch
  const [mounted, setMounted] = useState(false);
  const [pendenciasFimMes, setPendenciasFimMes] = useState<LancamentoFinanceiro[]>([]);
  const [pendenciasParcelasFimMes, setPendenciasParcelasFimMes] = useState<LancamentoFinanceiro[]>([]);
  const [isFechamento, setIsFechamento] = useState(false);

  useEffect(() => {
    setMounted(true);
    setPendenciasFimMes(getPendenciasFimMes());
    setPendenciasParcelasFimMes(getPendenciasParcelasFimMes());
    setIsFechamento(isPeriodoFechamentoMes());
  }, [getPendenciasFimMes, getPendenciasParcelasFimMes, isPeriodoFechamentoMes, lancamentos]);

  const form = useForm<LancamentoFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(lancamentoSchema) as any,
    defaultValues: {
      tipo: "Pagamos",
      valor: 0,
      data: "",
      descricao: "",
      classificacao: "",
      categoria: "Variável",
      centroCusto: "Operacional",
      formaPagamento: "PIX",
      status: "Pendente",
      contratoId: "",
      nomeEmpresa: "",
      recorrenciaFim: "",
    },
  });

  // Set today's date only on client to avoid hydration mismatch
  useEffect(() => {
    if (!form.getValues("data")) {
      form.setValue("data", new Date().toISOString().split("T")[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const watchedTipo = form.watch("tipo");
  const watchedCategoria = form.watch("categoria");
  const watchedClassificacao = form.watch("classificacao");
  const watchedContratoId = form.watch("contratoId");

  /* ── Contextual logic ── */

  const isAluguel =
    watchedTipo === "Recebemos" &&
    /loca[çc][ãa]o|aluguel/i.test(watchedClassificacao ?? "");

  const showCapexWarning = watchedTipo === "Pagamos" && watchedCategoria === "CAPEX";
  const isFixo = watchedCategoria === "Fixo";

  /* ── Auto-pull suggested value from contract ── */

  useEffect(() => {
    if (!watchedContratoId) return;
    const isAluguelNow =
      watchedTipo === "Recebemos" &&
      /loca[çc][ãa]o|aluguel/i.test(watchedClassificacao ?? "");
    if (!isAluguelNow) return;
    const contrato = contratosAtivos.find((c) => c.id === watchedContratoId);
    if (contrato && form.getValues("valor") === 0) {
      form.setValue("valor", contrato.valorMensalTotal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedContratoId, watchedTipo, watchedClassificacao, contratosAtivos]);

  function onSubmit(values: z.infer<typeof lancamentoSchema>) {
    try {
      // Usar values.categoria diretamente (não a variável isFixo do closure)
      // para garantir que a categoria selecionada no formulário seja respeitada no submit
      const categoriaEhFixo = values.categoria === "Fixo";
      const baseLancamento: LancamentoFinanceiro = {
        id: generateId(),
        tipo: values.tipo,
        valor: values.valor,
        data: new Date(values.data),
        descricao: values.descricao,
        classificacao: values.classificacao,
        categoria: values.categoria,
        centroCusto: values.centroCusto,
        formaPagamento: values.formaPagamento,
        status: categoriaEhFixo ? "Pendente" : values.status,
        contratoId: isAluguel ? values.contratoId : undefined,
        nomeEmpresa: isAluguel ? values.nomeEmpresa : undefined,
        ehInvestimento: values.categoria === "CAPEX" ? true : undefined,
      };

      if (categoriaEhFixo) {
        // Recurring: replicate to future months
        const fimStr = values.recorrenciaFim;
        if (fimStr) {
          baseLancamento.recorrenciaFim = new Date(fimStr);
        }
        addLancamentoRecorrente(baseLancamento);
        toast.success("Lançamento fixo criado e replicado para os próximos meses");
      } else {
        addLancamento(baseLancamento);
        toast.success("Lançamento criado com sucesso");
      }

      form.reset();
      setDialogOpen(false);
    } catch {
      toast.error("Erro ao criar lançamento");
    }
  }

  /* ── Delete handler ── */

  function handleDelete() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.ehRecorrente && deleteTarget.grupoRecorrenciaId) {
        removeGrupoRecorrenciaFuturo(deleteTarget.grupoRecorrenciaId);
        toast.success("Lançamento fixo removido dos meses futuros");
      } else {
        removeLancamento(deleteTarget.id);
        toast.success("Lançamento removido");
      }
    } catch {
      toast.error("Erro ao remover lançamento");
    }
    setDeleteTarget(null);
  }

  /* ── Full Edit Dialog handlers ── */

  function openEditLancamento(l: LancamentoFinanceiro) {
    setEditTarget(l);
    const d = l.data instanceof Date ? l.data : new Date(l.data);
    setEditForm({
      tipo: l.tipo,
      valor: l.valor,
      data: d.toISOString().split("T")[0],
      descricao: l.descricao,
      classificacao: l.classificacao || "",
      categoria: l.categoria || "Variável",
      centroCusto: l.centroCusto || "Operacional",
      formaPagamento: l.formaPagamento || "PIX",
      status: l.status,
    });
    setConfirmEditOpen(false);
  }

  function getEditDiffs(): { field: string; oldVal: string; newVal: string }[] {
    if (!editTarget) return [];
    const diffs: { field: string; oldVal: string; newVal: string }[] = [];
    const oldDate = editTarget.data instanceof Date ? editTarget.data : new Date(editTarget.data);
    if (editForm.tipo !== editTarget.tipo) diffs.push({ field: "Tipo", oldVal: editTarget.tipo, newVal: editForm.tipo });
    if (editForm.valor !== editTarget.valor) diffs.push({ field: "Valor", oldVal: `R$ ${editTarget.valor.toFixed(2)}`, newVal: `R$ ${editForm.valor.toFixed(2)}` });
    if (editForm.data !== oldDate.toISOString().split("T")[0]) diffs.push({ field: "Data", oldVal: oldDate.toLocaleDateString("pt-BR"), newVal: new Date(editForm.data).toLocaleDateString("pt-BR") });
    if (editForm.descricao !== editTarget.descricao) diffs.push({ field: "Descrição", oldVal: editTarget.descricao, newVal: editForm.descricao });
    if (editForm.classificacao !== (editTarget.classificacao || "")) diffs.push({ field: "Classificação", oldVal: editTarget.classificacao || "—", newVal: editForm.classificacao || "—" });
    if (editForm.categoria !== (editTarget.categoria || "Variável")) diffs.push({ field: "Categoria", oldVal: editTarget.categoria || "Variável", newVal: editForm.categoria });
    if (editForm.centroCusto !== (editTarget.centroCusto || "Operacional")) diffs.push({ field: "Centro de Custo", oldVal: editTarget.centroCusto || "Operacional", newVal: editForm.centroCusto });
    if (editForm.formaPagamento !== (editTarget.formaPagamento || "PIX")) diffs.push({ field: "Forma Pagamento", oldVal: editTarget.formaPagamento || "PIX", newVal: editForm.formaPagamento });
    if (editForm.status !== editTarget.status) diffs.push({ field: "Status", oldVal: editTarget.status, newVal: editForm.status });
    return diffs;
  }

  function handleConfirmEdit() {
    if (!editTarget) return;
    try {
      const newData = new Date(editForm.data);
      updateLancamento(editTarget.id, {
        tipo: editForm.tipo,
        valor: editForm.valor,
        data: newData,
        descricao: editForm.descricao,
        classificacao: editForm.classificacao,
        categoria: editForm.categoria,
        centroCusto: editForm.centroCusto,
        formaPagamento: editForm.formaPagamento,
        status: editForm.status,
      });

      // Se marcou "aplicar data a todos os futuros" e o lançamento pertence a um grupo recorrente
      const oldDate = editTarget.data instanceof Date ? editTarget.data : new Date(editTarget.data);
      const dateChanged = editForm.data !== oldDate.toISOString().split("T")[0];
      if (applyDateToFuture && dateChanged && editTarget.grupoRecorrenciaId) {
        // Propagar apenas o DIA do mês para os lançamentos futuros, preservando mês/ano de cada um
        const novoDia = newData.getDate();
        updateDiaGrupoRecorrenciaFuturo(editTarget.grupoRecorrenciaId, novoDia);
        toast.success(`Lançamento atualizado — dia ${novoDia} aplicado a todos os eventos futuros`);
      } else {
        toast.success("Lançamento atualizado com sucesso");
      }

      setEditTarget(null);
      setConfirmEditOpen(false);
      setApplyDateToFuture(false);
    } catch {
      toast.error("Erro ao atualizar lançamento");
    }
  }

  /* ── Inline edit save with recurrence propagation ── */

  const handleInlineSave = useCallback(
    (id: string, field: keyof LancamentoFinanceiro, val: string) => {
      try {
        const lancamento = lancamentos.find((l) => l.id === id);
        if (!lancamento) return;

        let updateData: Partial<LancamentoFinanceiro> = {};

        if (field === "valor") {
          const num = parseFloat(val.replace(",", "."));
          if (isNaN(num) || num <= 0) {
            toast.error("Valor inválido");
            return;
          }
          updateData = { valor: num };
        } else if (field === "descricao") {
          if (val.length < 3) {
            toast.error("Descrição muito curta");
            return;
          }
          updateData = { descricao: val };
        } else if (field === "classificacao") {
          updateData = { classificacao: val };
        }

        // Update the single instance
        updateLancamento(id, updateData);

        // If recurring and has future instances, propagate
        if (lancamento.ehRecorrente && lancamento.grupoRecorrenciaId) {
          updateGrupoRecorrenciaFuturo(lancamento.grupoRecorrenciaId, updateData);
          toast.success("Atualizado neste e nos meses futuros");
        } else {
          toast.success("Atualizado");
        }
      } catch {
        toast.error("Erro ao atualizar");
      }
    },
    [lancamentos, updateLancamento, updateGrupoRecorrenciaFuturo]
  );

  /* ── Quick status toggle ── */

  const handleStatusToggle = useCallback(
    (lancamento: LancamentoFinanceiro) => {
      const isDone =
        (lancamento.tipo === "Pagamos" && lancamento.status === "Pago") ||
        (lancamento.tipo === "Recebemos" && lancamento.status === "Recebido");

      const newStatus = isDone
        ? "Pendente"
        : lancamento.tipo === "Pagamos"
          ? "Pago"
          : "Recebido";

      updateLancamento(lancamento.id, { status: newStatus });
      toast.success(isDone ? "Marcado como pendente" : "Marcado como concluído");

      // Se for uma parcela de venda, recalcular parcelasRecebidasCount diretamente dos lançamentos
      // para evitar race condition com state assíncrono do updateLancamento
      if (lancamento.vendaId) {
        // Filtra todos os lançamentos da venda e conta quantos estão como Recebido,
        // considerando o status atualizado deste lançamento específico
        const countRecebidas = lancamentos
          .filter((l) => l.vendaId === lancamento.vendaId && l.id !== lancamento.id)
          .filter((l) => l.status === "Recebido").length + (newStatus === "Recebido" ? 1 : 0);
        updateHistoricoVenda(lancamento.vendaId, { parcelasRecebidasCount: countRecebidas });
      }
    },
    [updateLancamento, getParcelasRecebidasPorVenda, updateHistoricoVenda]
  );

  /* ── Filtering ── */

  const filtered = useMemo(() => {
    let result = [...lancamentos];

    // Tab filter — aba Fixos inclui categoria Fixo E lançamentos recorrentes (ex: comissão variável recorrente)
    if (activeTab === "fixos") {
      result = result.filter((l) => l.categoria === "Fixo" || l.ehRecorrente === true);
    } else {
      result = result.filter((l) => l.categoria !== "Fixo" && l.ehRecorrente !== true);
    }

    if (filters.mes) {
      result = result.filter((l) => {
        const d = new Date(l.data);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return ym === filters.mes;
      });
    }
    if (filters.status) {
      result = result.filter((l) => l.status === filters.status);
    }
    if (filters.tipo) {
      result = result.filter((l) => l.tipo === filters.tipo);
    }

    return result.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [lancamentos, filters, activeTab]);

  /* ── Mini-totals ── */

  const totals = useMemo(() => {
    const recebidos = filtered.filter((l) => l.tipo === "Recebemos").reduce((a, l) => a + l.valor, 0);
    const pagos = filtered.filter((l) => l.tipo === "Pagamos").reduce((a, l) => a + l.valor, 0);
    return { recebidos, pagos, liquido: recebidos - pagos, count: filtered.length };
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Lançamentos Financeiros</h1>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Novo Lançamento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Lançamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-2">
              {/* Tipo */}
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={form.getValues("tipo")}
                  onValueChange={(v) => {
                    form.setValue("tipo", v as "Recebemos" | "Pagamos");
                    form.setValue("status", "Pendente");
                    form.clearErrors("contratoId");
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Recebemos">Recebimento</SelectItem>
                    <SelectItem value="Pagamos">Pagamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Classificação (primary label) */}
              <div className="space-y-1.5">
                <Label>Classificação</Label>
                <Input
                  {...form.register("classificacao")}
                  placeholder={
                    watchedTipo === "Recebemos"
                      ? "Ex: Aluguel Grupo JRV, Venda Tokio"
                      : "Ex: Aluguel Galpão, Energia, Internet"
                  }
                />
                <p className="text-[11px] text-muted-foreground">
                  Nome curto que identifica esta conta (aparece nos relatórios)
                </p>
                {form.formState.errors.classificacao && (
                  <p className="text-xs text-destructive">{form.formState.errors.classificacao.message}</p>
                )}
              </div>

              {/* Descrição (extended details) */}
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Input
                  {...form.register("descricao")}
                  placeholder={
                    watchedTipo === "Recebemos"
                      ? "Ex: Contrato Grupo JRV Cond Alta Vista — Chassi MH8TKO001"
                      : "Ex: Aluguel galpão Porto Feliz nº 42 — ref. setembro"
                  }
                />
                <p className="text-[11px] text-muted-foreground">
                  Detalhes completos da operação (para quem, chassi, endereço, etc.)
                </p>
                {form.formState.errors.descricao && (
                  <p className="text-xs text-destructive">{form.formState.errors.descricao.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" min="0" {...form.register("valor")} />
                  {form.formState.errors.valor && (
                    <p className="text-xs text-destructive">{form.formState.errors.valor.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>{isFixo ? "Data de Vencimento" : "Data"}</Label>
                  <Input type="date" {...form.register("data")} />
                  <p className="text-[11px] text-muted-foreground">
                    {isFixo ? "Último dia para pagar/receber esta conta" : "Data da operação"}
                  </p>
                  {form.formState.errors.data && (
                    <p className="text-xs text-destructive">{form.formState.errors.data.message}</p>
                  )}
                </div>
              </div>

              {/* Nome da Empresa (only for rental income) */}
              {isAluguel && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Building2 className="size-3.5" />
                    Empresa Locatária
                  </Label>
                  <Input
                    {...form.register("nomeEmpresa")}
                    placeholder="Ex: Grupo JRV Logística LTDA"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Nome da empresa que paga o aluguel/contrato
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select
                    value={form.getValues("categoria")}
                    onValueChange={(v) => form.setValue("categoria", v as LancamentoFormValues["categoria"])}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fixo">Fixo</SelectItem>
                      <SelectItem value="Variável">Variável</SelectItem>
                      <SelectItem value="Extraordinário">Extraordinário</SelectItem>
                      <SelectItem value="CAPEX">CAPEX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Centro de Custo</Label>
                  <Select
                    value={form.getValues("centroCusto")}
                    onValueChange={(v) => form.setValue("centroCusto", v as LancamentoFormValues["centroCusto"])}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Operacional">Operacional</SelectItem>
                      <SelectItem value="Comercial">Comercial</SelectItem>
                      <SelectItem value="Administrativo">Administrativo</SelectItem>
                      <SelectItem value="Financeiro">Financeiro</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* CAPEX Warning Banner */}
              {showCapexWarning && (
                <div className="flex items-center gap-2 rounded-md border border-[var(--motriz-ambar)]/30 bg-[var(--motriz-ambar)]/10 px-3 py-2 text-sm text-[var(--motriz-ambar)]">
                  <AlertTriangle className="size-4 shrink-0" />
                  Isso não afeta o lucro operacional
                </div>
              )}

              {/* Contrato Dropdown (for rental income) */}
              {isAluguel && (
                <div className="space-y-1.5">
                  <Label>Contrato Vinculado</Label>
                  <Select
                    value={form.getValues("contratoId") ?? ""}
                    onValueChange={(v) => form.setValue("contratoId", v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione um contrato" /></SelectTrigger>
                    <SelectContent>
                      {contratosAtivos.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.numeroContrato} — {formatCurrency(c.valorMensalTotal)}/mês
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Recorrência fields (only when Fixo) */}
              {isFixo && (
                <div className="space-y-3 rounded-md border border-dashed border-border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <RefreshCw className="size-4 text-[var(--motriz-ambar)]" />
                    Replicar mensalmente
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Este lançamento será copiado automaticamente para todos os meses futuros até a data final informada.
                    Ao editar ou excluir, você poderá aplicar a mudança também aos meses seguintes.
                  </p>
                  <div className="space-y-1.5">
                    <Label>Data Final da Recorrência</Label>
                    <Input type="date" {...form.register("recorrenciaFim")} />
                    <p className="text-[11px] text-muted-foreground">
                      Deixe em branco para replicar indefinidamente
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Forma Pagamento</Label>
                  <Select
                    value={form.getValues("formaPagamento")}
                    onValueChange={(v) => form.setValue("formaPagamento", v as LancamentoFormValues["formaPagamento"])}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="Boleto">Boleto</SelectItem>
                      <SelectItem value="Cartão">Cartão</SelectItem>
                      <SelectItem value="Transferência">Transferência</SelectItem>
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!isFixo && (
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select
                      value={form.getValues("status")}
                      onValueChange={(v) => form.setValue("status", v as LancamentoFormValues["status"])}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pago">Pago</SelectItem>
                        <SelectItem value="Recebido">Recebido</SelectItem>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Previsto">Previsto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {isFixo && (
                <p className="text-xs text-muted-foreground italic">
                  Status inicial: Pendente (atualize para Pago/Recebido quando concluir)
                </p>
              )}

              <Button type="submit" className="mt-2 w-full">Salvar Lançamento</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Fechamento de Mês Warning */}
      {mounted && isFechamento && pendenciasFimMes.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-[var(--motriz-ambar)]/30 bg-[var(--motriz-ambar)]/5 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[var(--motriz-ambar)]" />
          <div>
            <p className="text-sm font-medium text-[var(--motriz-ambar)]">
              Atenção: faltam poucos dias úteis para o fim do mês
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Você tem <strong>{pendenciasFimMes.length} lançamento{pendenciasFimMes.length > 1 ? "s" : ""} fixo{pendenciasFimMes.length > 1 ? "s" : ""}</strong>{" "}
              pendente{pendenciasFimMes.length > 1 ? "s" : ""} de confirmação neste mês. Atualize o status para manter seus registros em dia.
            </p>
          </div>
        </div>
      )}

      {/* Aviso de Parcelas de Venda Pendentes */}
      {mounted && isFechamento && pendenciasParcelasFimMes.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-[var(--motriz-vermelho)]/30 bg-[var(--motriz-vermelho)]/5 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[var(--motriz-vermelho)]" />
          <div>
            <p className="text-sm font-medium text-[var(--motriz-vermelho)]">
              Parcelas de venda pendentes de confirmação
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Você tem <strong>{pendenciasParcelasFimMes.length} parcela{pendenciasParcelasFimMes.length > 1 ? "s" : ""}</strong> de venda parcelada{" "}
              pendente{pendenciasParcelasFimMes.length > 1 ? "s" : ""} de confirmação neste mês. Confirme o recebimento para manter os resultados previstos atualizados.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("todos")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "todos"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Variáveis e Outros
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("fixos")}
          className={`relative rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "fixos"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Receitas e Custos Fixos
          {mounted && pendenciasFimMes.length > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-[var(--motriz-ambar)] text-[10px] font-bold text-white">
              {pendenciasFimMes.length}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 py-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Mês</Label>
            <Input
              type="month"
              value={filters.mes}
              onChange={(e) => setFilters((f) => ({ ...f, mes: e.target.value }))}
              className="w-40"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="Pago">Pago</SelectItem>
                <SelectItem value="Recebido">Recebido</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Previsto">Previsto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tipo</Label>
            <Select value={filters.tipo} onValueChange={(v) => setFilters((f) => ({ ...f, tipo: v }))}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="Recebemos">Recebimentos</SelectItem>
                <SelectItem value="Pagamos">Pagamentos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={() => setFilters({ mes: currentMonth, status: "", tipo: "" })}>
            Limpar
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-[100px] text-xs font-medium text-muted-foreground uppercase tracking-wider">{activeTab === "fixos" ? "Vencimento" : "Data"}</TableHead>
                  <TableHead className="w-[160px] text-xs font-medium text-muted-foreground uppercase tracking-wider">Classificação</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Descrição</TableHead>
                  <TableHead className="w-[110px] text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo</TableHead>
                  <TableHead className="w-[120px] text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Valor</TableHead>
                  <TableHead className="w-[110px] text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</TableHead>
                  <TableHead className="w-[50px] text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Nenhum lançamento encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="tabular-nums whitespace-nowrap">{formatDate(l.data)}</TableCell>
                      <TableCell className="w-[140px] min-w-[140px]">
                        <div className="flex items-center gap-1">
                          <EditableCell
                            value={l.classificacao}
                            onSave={(val) => handleInlineSave(l.id, "classificacao", val)}
                          />
                          {l.ehVisitaTecnico && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#14B8A6]/10 px-1.5 py-0.5 text-[9px] font-medium text-[#14B8A6] flex-shrink-0" title="Visita Técnica">
                              🔧 VT
                            </span>
                          )}
                          {l.ehRecorrente && (
                            <RefreshCw className="size-3 text-[var(--motriz-ambar)] flex-shrink-0" title="Recorrente" />
                          )}
                          {l.nomeEmpresa && (
                            <span className="ml-1 text-[10px] text-muted-foreground truncate" title={l.nomeEmpresa}>
                              {l.nomeEmpresa}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] overflow-hidden">
                        <div className="truncate w-full whitespace-nowrap text-ellipsis overflow-hidden">
                          <EditableCell
                            value={l.descricao}
                            onSave={(val) => handleInlineSave(l.id, "descricao", val)}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                          l.tipo === "Recebemos"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400 dark:ring-emerald-500/30"
                            : "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/30 dark:text-rose-400 dark:ring-rose-500/30"
                        }`}>
                          {l.tipo === "Recebemos" ? "Recebimento" : "Pagamento"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        <EditableCurrencyCell
                          value={l.valor}
                          onSave={(val) => handleInlineSave(l.id, "valor", String(val))}
                        />
                      </TableCell>
                      <TableCell>
                        <StatusToggle
                          currentStatus={l.status}
                          tipo={l.tipo}
                          onToggle={() => handleStatusToggle(l)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => openEditLancamento(l)}
                            className="text-muted-foreground hover:text-[#14B8A6]"
                            title="Editar lançamento"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setDeleteTarget(l)}
                            className="text-muted-foreground hover:text-destructive"
                            title="Excluir lançamento"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Mini-totals sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Resumo Filtros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Lançamentos</span>
                <span className="font-medium tabular-nums">{totals.count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--motriz-verde-esmeralda)]">Recebidos</span>
                <span className="font-medium tabular-nums text-[var(--motriz-verde-esmeralda)]">
                  {formatCurrency(totals.recebidos)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--motriz-vermelho)]">Pagos</span>
                <span className="font-medium tabular-nums text-[var(--motriz-vermelho)]">
                  {formatCurrency(totals.pagos)}
                </span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between text-sm font-semibold">
                <span>Líquido</span>
                <span className={`tabular-nums ${totals.liquido >= 0 ? "text-[var(--motriz-verde-esmeralda)]" : "text-[var(--motriz-vermelho)]"}`}>
                  {formatCurrency(totals.liquido)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.ehRecorrente
                ? "Este lançamento faz parte de uma série recorrente. Ao confirmar, ele será removido deste mês e de todos os meses futuros. Meses já pagos/recebidos serão preservados."
                : "Tem certeza que deseja remover este lançamento? Esta ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteTarget?.ehRecorrente ? "Excluir deste e futuros" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Full Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Lançamento</DialogTitle>
            <DialogDescription>Altere os campos desejados e confirme as mudanças.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo</Label>
                <Select value={editForm.tipo} onValueChange={(v) => setEditForm({ ...editForm, tipo: v as "Recebemos" | "Pagamos" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Recebemos">Recebimento</SelectItem>
                    <SelectItem value="Pagamos">Pagamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Valor (R$)</Label>
                <Input type="number" min={0} step={0.01} value={editForm.valor} onChange={(e) => setEditForm({ ...editForm, valor: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Data</Label>
                <Input type="date" value={editForm.data} onChange={(e) => setEditForm({ ...editForm, data: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v as "Pago" | "Recebido" | "Pendente" | "Previsto" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Previsto">Previsto</SelectItem>
                    <SelectItem value="Pago">Pago</SelectItem>
                    <SelectItem value="Recebido">Recebido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Descrição</Label>
              <Input value={editForm.descricao} onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Classificação</Label>
                <Input value={editForm.classificacao} onChange={(e) => setEditForm({ ...editForm, classificacao: e.target.value })} placeholder="Ex: Aluguel, Comissão..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Categoria</Label>
                <Select value={editForm.categoria} onValueChange={(v) => setEditForm({ ...editForm, categoria: v as "Fixo" | "Variável" | "Extraordinário" | "CAPEX" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fixo">Fixo</SelectItem>
                    <SelectItem value="Variável">Variável</SelectItem>
                    <SelectItem value="Extraordinário">Extraordinário</SelectItem>
                    <SelectItem value="CAPEX">CAPEX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Centro de Custo</Label>
                <Select value={editForm.centroCusto} onValueChange={(v) => setEditForm({ ...editForm, centroCusto: v as "Operacional" | "Comercial" | "Administrativo" | "Financeiro" | "Marketing" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Operacional">Operacional</SelectItem>
                    <SelectItem value="Comercial">Comercial</SelectItem>
                    <SelectItem value="Administrativo">Administrativo</SelectItem>
                    <SelectItem value="Financeiro">Financeiro</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Forma Pagamento</Label>
                <Select value={editForm.formaPagamento} onValueChange={(v) => setEditForm({ ...editForm, formaPagamento: v as "PIX" | "Boleto" | "Cartão" | "Transferência" | "Dinheiro" | "Outros" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                    <SelectItem value="Cartão">Cartão</SelectItem>
                    <SelectItem value="Transferência">Transferência</SelectItem>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button onClick={() => setConfirmEditOpen(true)} className="bg-[#14B8A6] hover:bg-[#0D9488]">
              Revisar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Edit Dialog with Diffs */}
      <AlertDialog open={confirmEditOpen} onOpenChange={setConfirmEditOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Alterações</AlertDialogTitle>
            <AlertDialogDescription>
              Revise as mudanças abaixo antes de confirmar:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-60 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 space-y-2 my-2">
            {getEditDiffs().length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">Nenhuma alteração detectada.</p>
            ) : (
              getEditDiffs().map((d, i) => (
                <div key={i} className="flex flex-col gap-0.5 text-xs border-b border-border/50 pb-1.5 last:border-0">
                  <span className="font-semibold text-foreground">{d.field}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-destructive line-through">{d.oldVal}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-[#14B8A6] font-medium">{d.newVal}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Opção: aplicar data a todos os eventos futuros do grupo recorrente */}
          {editTarget?.grupoRecorrenciaId && getEditDiffs().some((d) => d.field === "Data") && (
            <label className="flex items-start gap-2 rounded-md border border-[var(--motriz-ambar)]/30 bg-[var(--motriz-ambar)]/5 p-2.5 my-2 cursor-pointer">
              <input
                type="checkbox"
                checked={applyDateToFuture}
                onChange={(e) => setApplyDateToFuture(e.target.checked)}
                className="mt-0.5 accent-[var(--motriz-ambar)]"
              />
              <span className="text-xs leading-relaxed">
                <strong>Aplicar esta data a todos os eventos futuros</strong> deste grupo recorrente (salários, comissões, contratos). Se não marcar, apenas este mês será alterado.
              </span>
            </label>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar e Editar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEdit} className="bg-[#14B8A6] text-white hover:bg-[#0D9488]" disabled={getEditDiffs().length === 0}>
              Confirmar Alterações
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}