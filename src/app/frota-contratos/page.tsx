"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Bike,
  Link2,
  ChevronDown,
  ChevronUp,
  FileText,
  Users,
  Plus,
  RefreshCw,
  Pencil,
  CheckCircle2,
  Circle,
  MapPin,
  Wrench,
  BarChart3,
  Package,
  Battery,
  Zap,
  Trash2,
  AlertTriangle,
  CalendarClock,
  Unlink,
  TestTube2,
  Flag,
  RotateCcw,
  ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { formatCurrency, formatDate, generateId } from "@/lib/utils";
import type { Moto, Contrato, Cliente, MotoModel, MotoCor, MotoPreparacao, MotoPecaFaltante, MotoLocalizacao, PecaEstoque, MotoContratoValor, LocacaoExtra, CarregadorTipo, TestRide } from "@/types";

/* ── Constants ── */
const MOTO_MODELS: MotoModel[] = ["M3K", "Z3K", "U3K", "U5K", "Tóquio", "S8K", "R8K", "Vespa"];
const MOTO_STATUSES = ["Disponível para Operar", "Em Contrato", "Em Test Ride", "Em Manutenção", "Aguardando Peça", "Aguardando Conserto"] as const;
const MOTO_CORES: MotoCor[] = ["Azul", "Preto", "Cinza", "Amarelo", "Vermelho", "Verde", "Branco", "Marrom", "Bege"];
const MOTO_LOCALIZACOES_FORM: MotoLocalizacao[] = ["Galpão", "Cliente", "Loja"];
const MOTO_LOCALIZACOES: MotoLocalizacao[] = ["Galpão", "Cliente", "Técnico", "Fazenda Boa Vista", "Loja"];
const COR_COLORS: Record<MotoCor, string> = {
  Azul: "bg-blue-500", Preto: "bg-gray-900", Cinza: "bg-gray-400",
  Amarelo: "bg-yellow-400", Vermelho: "bg-red-500", Verde: "bg-green-500",
  Branco: "bg-white border border-gray-300", Marrom: "bg-amber-800", Bege: "bg-amber-200",
};
const LOCALIZACAO_ICONS: Record<MotoLocalizacao, string> = {
  "Galpão": "🏭", "Cliente": "👤", "Técnico": "🔧", "Fazenda Boa Vista": "🌾", "Loja": "🏪",
};
const PREPARACAO_LABELS: { key: keyof MotoPreparacao; label: string }[] = [
  { key: "suporteInstalado", label: "Suporte Instalado" },
  { key: "bau", label: "Baú" },
  { key: "giroflex", label: "Giroflex" },
  { key: "mataCachorro", label: "Mata-Cachorro" },
  { key: "plotagem", label: "Plotagem (Logo/Artes)" },
];
const PECAS_FALTANTES_LIST: MotoPecaFaltante[] = [
  "Bateria", "Motor", "Carenagem Lateral Direita", "Carenagem Lateral Esquerda",
  "Pneus", "Módulo", "Módulo de Ignição", "Módulo de Controle",
  "Painel de Controle", "Farol", "Manete de Aceleração", "Manete de Controle",
  "Freios", "Pastilha de Freio", "Paralama", "Banco", "Retrovisores",
];
const PECA_CATEGORIAS = ["Elétrica", "Mecânica", "Carroceria", "Acessório", "Consumível", "Outros"];

/* ── Helpers ─ */
function motoStatusColor(status: Moto["status"]): string {
  switch (status) {
    case "Disponível para Operar": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "Em Contrato": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "Em Test Ride": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    case "Em Manutenção": return "bg-[var(--motriz-ambar)]/10 text-[var(--motriz-ambar)] border-[var(--motriz-ambar)]/20";
    case "Aguardando Peça": case "Aguardando Conserto": return "bg-[var(--motriz-vermelho)]/10 text-[var(--motriz-vermelho)] border-[var(--motriz-vermelho)]/20";
    default: return "bg-muted text-muted-foreground border-border";
  }
}
function contratoStatusColor(status: Contrato["status"]): string {
  switch (status) {
    case "Ativo": return "bg-emerald-500/10 text-emerald-600";
    case "Encerrado": return "bg-muted text-muted-foreground";
    case "Suspenso": return "bg-[var(--motriz-ambar)]/10 text-[var(--motriz-ambar)]";
    default: return "bg-muted text-muted-foreground";
  }
}
function isPreparada(moto: Moto): boolean {
  if (!moto.preparacao) return false;
  const count = PREPARACAO_LABELS.filter((item) => moto.preparacao?.[item.key]).length;
  return count >= 3;
}
function getPrepCount(moto: Moto): number {
  if (!moto.preparacao) return 0;
  return PREPARACAO_LABELS.filter((item) => moto.preparacao?.[item.key]).length;
}

/* ── Schemas ── */
const motoSchema = z.object({
  chassi: z.string().min(3, "Chassi deve ter pelo menos 3 caracteres"),
  modelo: z.enum(["M3K", "Z3K", "U3K", "U5K", "Tóquio", "S8K", "R8K", "Vespa"]),
  status: z.enum(["Disponível para Operar", "Em Contrato", "Em Test Ride", "Em Manutenção", "Aguardando Peça", "Aguardando Conserto"]),
  cor: z.enum(["Azul", "Preto", "Cinza", "Amarelo", "Vermelho", "Verde", "Branco", "Marrom", "Bege"]).optional(),
  localizacao: z.enum(["Galpão", "Cliente", "Técnico", "Fazenda Boa Vista", "Loja"]).optional(),
  valorContabil: z.coerce.number().min(0).optional(),
  observacoes: z.string().optional(),
  suporteInstalado: z.boolean().optional(),
  bau: z.boolean().optional(),
  giroflex: z.boolean().optional(),
  mataCachorro: z.boolean().optional(),
  plotagem: z.boolean().optional(),
  pecasFaltantes: z.array(z.string()).optional(),
});
type MotoFormValues = z.infer<typeof motoSchema>;

const novoContratoSchema = z.object({
  clienteId: z.string().min(1, "Selecione um cliente"),
  numeroContrato: z.string().optional(),
  dataInicio: z.string().min(1, "Data de início é obrigatória"),
  dataTermino: z.string().optional(),
  diaVencimento: z.coerce.number().min(1).max(31),
  valorMensalTotal: z.coerce.number().positive("Valor deve ser maior que zero"),
  motosVinculadas: z.array(z.string()).min(1, "Selecione ao menos uma moto"),
  regraComissaoSocio: z.coerce.number().min(0).max(100).optional(),
  regraComissaoTecnico: z.coerce.number().min(0).max(100).optional(),
});
type NovoContratoFormValues = z.infer<typeof novoContratoSchema>;

const pecaSchema = z.object({
  nome: z.string().min(2, "Nome da peça é obrigatório"),
  categoria: z.string().min(1, "Selecione uma categoria"),
  quantidade: z.coerce.number().min(0),
  quantidadeMinima: z.coerce.number().min(0).optional(),
  custoUnitario: z.coerce.number().min(0).optional(),
  fornecedor: z.string().optional(),
  observacoes: z.string().optional(),
});
type PecaFormValues = z.infer<typeof pecaSchema>;

/* ══════════════════════════════════════════════════════════
   TAB A: ESTOQUE DE MOTOS
   ══════════════════════════════════════════════════════════ */
function EstoqueMotos() {
  const motos = useStore((s) => s.motos);
  const addMoto = useStore((s) => s.addMoto);
  const updateMoto = useStore((s) => s.updateMoto);
  const removeMoto = useStore((s) => s.removeMoto);
  const getMotoByChassi = useStore((s) => s.getMotoByChassi);
  const contratos = useStore((s) => s.contratos);
  const clientes = useStore((s) => s.clientes);
  const testRides = useStore((s) => s.testRides);
  const contratosAtivos = useMemo(() => contratos.filter((c) => c.status === "Ativo"), [contratos]);

  // Resolver nome do local de operação para uma moto
  function getLocalOperacaoNome(moto: Moto): string | null {
    // 1) Se a moto tem localOperacaoId próprio, resolver o nome
    if (moto.localOperacaoId) {
      for (const cliente of clientes) {
        const local = (cliente.locaisOperacao || []).find(l => l.id === moto.localOperacaoId);
        if (local) return local.nome;
      }
    }
    // 2) Verificar se a moto está em um test ride com localOperacaoId
    for (const tr of testRides) {
      if (tr.motosVinculadas.includes(moto.id) && tr.localOperacaoId) {
        for (const cliente of clientes) {
          const local = (cliente.locaisOperacao || []).find(l => l.id === tr.localOperacaoId);
          if (local) return local.nome;
        }
      }
    }
    return null;
  }

  const [filterToggle, setFilterToggle] = useState<"todos" | "ativa" | "manutencao" | "pecas">("todos");
  const [motoDialogOpen, setMotoDialogOpen] = useState(false);
  const [editingMoto, setEditingMoto] = useState<Moto | null>(null);
  const [vincularOpen, setVincularOpen] = useState(false);
  const [selectedMotoId, setSelectedMotoId] = useState<string | null>(null);
  const [vincularContratoId, setVincularContratoId] = useState("");
  const [deleteMotoId, setDeleteMotoId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");

  const [modeloSelect, setModeloSelect] = useState("M3K");
  const [statusSelect, setStatusSelect] = useState("Disponível para Operar");
  const [corSelect, setCorSelect] = useState("");
  const [localizacaoSelect, setLocalizacaoSelect] = useState("");
  const [pecasSelected, setPecasSelected] = useState<string[]>([]);

  const form = useForm<MotoFormValues>({
    resolver: zodResolver(motoSchema) as any,
    defaultValues: { chassi: "", modelo: "M3K", status: "Disponível para Operar", cor: undefined, localizacao: undefined, valorContabil: 0, observacoes: "", suporteInstalado: false, bau: false, giroflex: false, mataCachorro: false, plotagem: false, pecasFaltantes: [] },
  });

  const showPecasChecklist = statusSelect === "Aguardando Peça" || statusSelect === "Aguardando Conserto";

  const filteredMotos = useMemo(() => {
    if (filterToggle === "ativa") return motos.filter((m) => m.status === "Disponível para Operar" || m.status === "Em Contrato");
    if (filterToggle === "manutencao") return motos.filter((m) => m.status === "Em Manutenção");
    if (filterToggle === "pecas") return motos.filter((m) => m.status === "Aguardando Peça" || m.status === "Aguardando Conserto");
    return motos;
  }, [motos, filterToggle]);

  const pecasReport = useMemo(() => {
    const motosComPecas = motos.filter((m) => m.pecasFaltantes && m.pecasFaltantes.length > 0);
    const byModel: Record<string, { total: number; pecas: Record<string, number>; chassis: string[] }> = {};
    for (const moto of motosComPecas) {
      if (!byModel[moto.modelo]) byModel[moto.modelo] = { total: 0, pecas: {}, chassis: [] };
      byModel[moto.modelo].total += moto.pecasFaltantes!.length;
      byModel[moto.modelo].chassis.push(moto.chassi);
      for (const peca of moto.pecasFaltantes!) byModel[moto.modelo].pecas[peca] = (byModel[moto.modelo].pecas[peca] || 0) + 1;
    }
    return byModel;
  }, [motos]);

  function openAddMoto() {
    setEditingMoto(null);
    form.reset({ chassi: "", modelo: "M3K", status: "Disponível para Operar", cor: undefined, localizacao: undefined, valorContabil: 0, observacoes: "", suporteInstalado: false, bau: false, giroflex: false, mataCachorro: false, plotagem: false, pecasFaltantes: [] });
    setModeloSelect("M3K"); setStatusSelect("Disponível para Operar"); setCorSelect(""); setLocalizacaoSelect(""); setPecasSelected([]);
    setMotoDialogOpen(true);
  }

  function openEditMoto(moto: Moto) {
    setEditingMoto(moto);
    form.reset({ chassi: moto.chassi, modelo: moto.modelo, status: moto.status, cor: moto.cor, localizacao: moto.localizacao, valorContabil: moto.valorContabil || 0, observacoes: moto.observacoes || "", suporteInstalado: moto.preparacao?.suporteInstalado || false, bau: moto.preparacao?.bau || false, giroflex: moto.preparacao?.giroflex || false, mataCachorro: moto.preparacao?.mataCachorro || false, plotagem: moto.preparacao?.plotagem || false, pecasFaltantes: moto.pecasFaltantes || [] });
    setModeloSelect(moto.modelo); setStatusSelect(moto.status); setCorSelect(moto.cor || ""); setLocalizacaoSelect(moto.localizacao || ""); setPecasSelected(moto.pecasFaltantes || []);
    setMotoDialogOpen(true);
  }

  function togglePeca(peca: string) { setPecasSelected((prev) => prev.includes(peca) ? prev.filter((p) => p !== peca) : [...prev, peca]); }

  function onSubmitMoto(values: MotoFormValues) {
    if (!editingMoto) { const existing = getMotoByChassi(values.chassi); if (existing) { toast.error(`Chassi ${values.chassi} já cadastrado`); return; } }
    try {
      const preparacao: MotoPreparacao = { suporteInstalado: values.suporteInstalado || false, bau: values.bau || false, giroflex: values.giroflex || false, mataCachorro: values.mataCachorro || false, plotagem: values.plotagem || false };
      const pecas = showPecasChecklist ? pecasSelected as MotoPecaFaltante[] : undefined;
      if (editingMoto) {
        updateMoto(editingMoto.id, { chassi: values.chassi, modelo: values.modelo as MotoModel, status: values.status, cor: (values.cor as MotoCor) || undefined, localizacao: (values.localizacao as MotoLocalizacao) || undefined, valorContabil: values.valorContabil || undefined, observacoes: values.observacoes || undefined, preparacao, pecasFaltantes: pecas });
        toast.success("Moto atualizada com sucesso");
      } else {
        addMoto({ id: generateId(), chassi: values.chassi, modelo: values.modelo as MotoModel, status: values.status, cor: (values.cor as MotoCor) || undefined, localizacao: (values.localizacao as MotoLocalizacao) || undefined, valorContabil: values.valorContabil || undefined, observacoes: values.observacoes || undefined, preparacao, pecasFaltantes: pecas });
        toast.success("Moto adicionada com sucesso");
      }
      form.reset(); setMotoDialogOpen(false); setEditingMoto(null);
    } catch { toast.error("Erro ao salvar moto"); }
  }

  function handleVincular() {
    if (!selectedMotoId || !vincularContratoId) return;
    try {
      const store = useStore.getState();
      const contrato = store.contratos.find((c) => c.id === vincularContratoId);
      // Atualizar localização da moto para "Cliente" quando vinculada a contrato
      updateMoto(selectedMotoId, { status: "Em Contrato", localizacao: "Cliente" });
      if (contrato && !contrato.motosVinculadas.includes(selectedMotoId)) store.updateContrato(vincularContratoId, { motosVinculadas: [...contrato.motosVinculadas, selectedMotoId] });
      toast.success("Moto vinculada ao contrato — localização atualizada para Cliente"); setVincularOpen(false); setSelectedMotoId(null); setVincularContratoId("");
    } catch { toast.error("Erro ao vincular moto"); }
  }

  function openVincular(motoId: string) { setSelectedMotoId(motoId); setVincularContratoId(""); setVincularOpen(true); }

  /* ── Moto Card ── */
  function MotoCard({ moto }: { moto: Moto }) {
    const preparada = isPreparada(moto);
    const prepCount = getPrepCount(moto);
    return (
      <Card className="relative">
        <CardContent className="pt-5">
          <div className="absolute right-2 top-2 flex items-center gap-0.5">
            <button type="button" onClick={() => openEditMoto(moto)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="Editar moto"><Pencil className="size-3.5" /></button>
            <button type="button" onClick={() => setDeleteMotoId(moto.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Excluir moto"><Trash2 className="size-3.5" /></button>
          </div>
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-secondary relative">
                <Bike className="size-5 text-muted-foreground" />
                {moto.cor && <span className={`absolute -bottom-1 -right-1 size-3 rounded-full border border-background ${COR_COLORS[moto.cor]}`} title={moto.cor} />}
              </div>
              <div>
                <p className="font-semibold text-sm">{moto.modelo}</p>
                <p className="text-xs font-mono text-muted-foreground tabular-nums">{moto.chassi}</p>
                {moto.cor && <p className="text-[10px] text-muted-foreground">{moto.cor}</p>}
              </div>
            </div>
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${motoStatusColor(moto.status)}`}>{moto.status}</span>
          </div>
          {(() => {
            const localNome = getLocalOperacaoNome(moto);
            if (localNome) {
              return <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground"><MapPin className="size-3" /><span>📍 {localNome}</span></div>;
            }
            if (moto.localizacao) {
              return <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground"><MapPin className="size-3" /><span>{LOCALIZACAO_ICONS[moto.localizacao]} {moto.localizacao}</span></div>;
            }
            return null;
          })()}
          {moto.valorContabil != null && <div className="mt-2 flex justify-between text-xs"><span className="text-muted-foreground">Valor contábil</span><span className="tabular-nums font-medium">{formatCurrency(moto.valorContabil)}</span></div>}
          {/* Badge Preparação — aparece em TODOS os status quando ≥3 itens */}
          {(moto.status === "Em Contrato" || moto.status === "Disponível para Operar") && (
            <div className="mt-2 flex items-center gap-1.5">
              {preparada ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600"><CheckCircle2 className="size-3" />Preparada ({prepCount}/5)</span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--motriz-ambar)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--motriz-ambar)]"><Circle className="size-3" />{prepCount}/5 itens</span>
              )}
            </div>
          )}
          {(moto.status === "Aguardando Peça" || moto.status === "Aguardando Conserto") && moto.pecasFaltantes && moto.pecasFaltantes.length > 0 && (
            <div className="mt-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--motriz-vermelho)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--motriz-vermelho)]"><Wrench className="size-3" />{moto.pecasFaltantes.length} peça{moto.pecasFaltantes.length > 1 ? "s" : ""} faltando</span>
              <p className="mt-1 text-[10px] text-muted-foreground line-clamp-1">{moto.pecasFaltantes.join(", ")}</p>
            </div>
          )}
          {moto.observacoes && <p className="mt-2 text-[11px] text-muted-foreground line-clamp-2 italic">{moto.observacoes}</p>}
          {moto.status === "Disponível para Operar" && <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={() => openVincular(moto.id)}><Link2 className="mr-1.5 size-3" />Vincular a Contrato</Button>}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-border">
          {([{ key: "todos", label: "Todos" }, { key: "ativa", label: "Frota Ativa" }, { key: "manutencao", label: "Em Manutenção" }, { key: "pecas", label: "Aguardando Peça/Conserto" }] as const).map((item) => (
            <button key={item.key} type="button" onClick={() => setFilterToggle(item.key)} className={`px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md ${filterToggle === item.key ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>{item.label}</button>
          ))}
        </div>
        <Button size="sm" onClick={openAddMoto}><Plus className="mr-1.5 size-3.5" />Nova Moto</Button>
      </div>
      {/* Quadro Resumo — por modelo com breakdown de status */}
      {motos.length > 0 && (() => {
        // Agrupar motos por modelo → { modelo: { total, statusCounts: { status: qtd } } }
        const resumo: Record<string, { total: number; statusCounts: Record<string, number> }> = {};
        for (const m of motos) {
          if (!resumo[m.modelo]) resumo[m.modelo] = { total: 0, statusCounts: {} };
          resumo[m.modelo].total++;
          resumo[m.modelo].statusCounts[m.status] = (resumo[m.modelo].statusCounts[m.status] || 0) + 1;
        }
        const statusColors: Record<string, string> = {
          "Disponível para Operar": "text-[var(--motriz-verde-esmeralda)]",
          "Em Contrato": "text-blue-600",
          "Em Test Ride": "text-purple-600",
          "Em Manutenção": "text-[var(--motriz-ambar)]",
          "Aguardando Peça": "text-[var(--motriz-vermelho)]",
          "Aguardando Conserto": "text-[var(--motriz-vermelho)]",
        };
        const statusBg: Record<string, string> = {
          "Disponível para Operar": "bg-[var(--motriz-verde-esmeralda)]/8",
          "Em Contrato": "bg-blue-500/8",
          "Em Test Ride": "bg-purple-500/8",
          "Em Manutenção": "bg-[var(--motriz-ambar)]/8",
          "Aguardando Peça": "bg-[var(--motriz-vermelho)]/8",
          "Aguardando Conserto": "bg-[var(--motriz-vermelho)]/8",
        };
        // Ordenar modelos por total decrescente
        const modelosOrdenados = Object.entries(resumo).sort(([, a], [, b]) => b.total - a.total);
        return (
          <Card className="border-blue-500/20">
            <CardContent className="pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Bike className="size-3.5" />
                Resumo da Frota — {motos.length} moto{motos.length !== 1 ? "s" : ""} no total
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {modelosOrdenados.map(([modelo, data]) => (
                  <div key={modelo} className="rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold">{modelo}</span>
                      <span className="text-lg font-black tabular-nums text-blue-600">{data.total}</span>
                    </div>
                    <div className="space-y-1">
                      {Object.entries(data.statusCounts)
                        .sort(([, a], [, b]) => b - a)
                        .map(([status, qtd]) => (
                          <div key={status} className={`flex items-center justify-between rounded px-2 py-0.5 text-[11px] ${statusBg[status] || "bg-muted/50"}`}>
                            <span className={`font-medium ${statusColors[status] || "text-muted-foreground"}`}>{status}</span>
                            <span className="font-bold tabular-nums">{qtd}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filteredMotos.map((m) => <MotoCard key={m.id} moto={m} />)}</div>
      {filteredMotos.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma moto encontrada para o filtro selecionado.</CardContent></Card>}
      {filterToggle === "pecas" && Object.keys(pecasReport).length > 0 && (
        <Card className="border-[var(--motriz-vermelho)]/20 bg-gradient-to-r from-[var(--motriz-vermelho)]/5 to-transparent">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="size-4 text-[var(--motriz-vermelho)]" />Relatório de Peças Faltantes por Modelo</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(pecasReport).map(([modelo, data]) => (
                <div key={modelo} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2"><Bike className="size-4 text-muted-foreground" /><span className="font-semibold text-sm">{modelo}</span><Badge variant="secondary" className="text-[10px]">{data.chassis.length} moto{data.chassis.length > 1 ? "s" : ""}</Badge></div>
                    <span className="text-xs font-bold text-[var(--motriz-vermelho)] tabular-nums">{data.total} peça{data.total > 1 ? "s" : ""} no total</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2 font-mono">Chassis: {data.chassis.join(", ")}</p>
                  <div className="flex flex-wrap gap-1.5">{Object.entries(data.pecas).sort(([, a], [, b]) => b - a).map(([peca, qtd]) => (<span key={peca} className="inline-flex items-center gap-1 rounded-full bg-[var(--motriz-vermelho)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--motriz-vermelho)]">{peca}{qtd > 1 && <span className="font-bold">×{qtd}</span>}</span>))}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {/* Add/Edit Moto Modal */}
      <Dialog open={motoDialogOpen} onOpenChange={setMotoDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingMoto ? "Editar Moto" : "Nova Moto"}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmitMoto)} className="grid gap-4 py-2">
            <div className="space-y-1.5"><Label>Chassi *</Label><Input {...form.register("chassi")} placeholder="Ex: MH8M3K004" />{form.formState.errors.chassi && <p className="text-xs text-destructive">{form.formState.errors.chassi.message}</p>}{editingMoto && <p className="text-[10px] text-muted-foreground">Editar o chassi apenas se cadastrou errado. Esta alteração será salva permanentemente.</p>}</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Modelo</Label><Select value={modeloSelect} onValueChange={(v) => { setModeloSelect(v); form.setValue("modelo", v as any); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MOTO_MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Status</Label><Select value={statusSelect} onValueChange={(v) => { setStatusSelect(v); form.setValue("status", v as any); if (v !== "Aguardando Peça" && v !== "Aguardando Conserto") setPecasSelected([]); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MOTO_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Cor</Label><Select value={corSelect} onValueChange={(v) => { setCorSelect(v); form.setValue("cor", v as any); }}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{MOTO_CORES.map((c) => <SelectItem key={c} value={c}><span className="flex items-center gap-2"><span className={`size-3 rounded-full ${COR_COLORS[c]}`} />{c}</span></SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Localização</Label><Select value={localizacaoSelect} onValueChange={(v) => { setLocalizacaoSelect(v); form.setValue("localizacao", v as any); }}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{MOTO_LOCALIZACOES_FORM.map((loc) => <SelectItem key={loc} value={loc}><span className="flex items-center gap-2"><span>{LOCALIZACAO_ICONS[loc]}</span>{loc}</span></SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-1.5"><Label>Valor Contábil (opcional)</Label><Input type="number" step="0.01" min="0" {...form.register("valorContabil")} /></div>
            <div className="space-y-1.5"><Label>Observações (opcional)</Label><Input {...form.register("observacoes")} placeholder="Detalhes adicionais da moto" /></div>
            <div className="space-y-2 rounded-md border border-dashed border-border p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Checklist de Preparação</p>
              <p className="text-[11px] text-muted-foreground">≥3 itens = Preparada</p>
              <div className="grid grid-cols-2 gap-2">{PREPARACAO_LABELS.map((item) => (<label key={item.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50"><Checkbox checked={form.watch(item.key) || false} onCheckedChange={(checked) => form.setValue(item.key, !!checked)} /><span className="text-xs">{item.label}</span></label>))}</div>
            </div>
            {showPecasChecklist && (
              <div className="space-y-2 rounded-md border border-dashed border-[var(--motriz-vermelho)]/30 bg-[var(--motriz-vermelho)]/5 p-3">
                <p className="text-xs font-semibold text-[var(--motriz-vermelho)] uppercase tracking-wider flex items-center gap-1.5"><Wrench className="size-3.5" />Peças Faltantes</p>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">{PECAS_FALTANTES_LIST.map((peca) => (<label key={peca} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-[var(--motriz-vermelho)]/10"><Checkbox checked={pecasSelected.includes(peca)} onCheckedChange={() => togglePeca(peca)} /><span className="text-[11px]">{peca}</span></label>))}</div>
                {pecasSelected.length > 0 && <p className="text-[10px] text-[var(--motriz-vermelho)] font-medium">{pecasSelected.length} peça(s) selecionada(s)</p>}
              </div>
            )}
            <DialogFooter><Button type="button" variant="outline" onClick={() => setMotoDialogOpen(false)}>Cancelar</Button><Button type="submit">{editingMoto ? "Salvar Alterações" : "Salvar Moto"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Vincular Modal */}
      <Dialog open={vincularOpen} onOpenChange={setVincularOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Vincular Moto a Contrato</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5"><Label>Contrato *</Label><Select value={vincularContratoId} onValueChange={setVincularContratoId}><SelectTrigger><SelectValue placeholder="Selecione um contrato" /></SelectTrigger><SelectContent>{contratosAtivos.map((c) => <SelectItem key={c.id} value={c.id}>{c.numeroContrato || c.id.slice(0, 8)} — {formatCurrency(c.valorMensalTotal)}/mês</SelectItem>)}</SelectContent></Select></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setVincularOpen(false)}>Cancelar</Button><Button onClick={handleVincular} disabled={!vincularContratoId}>Vincular</Button></DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      {/* AlertDialog: Confirmar Exclusão de Moto com Senha para Alto Valor */}
      <AlertDialog open={!!deleteMotoId} onOpenChange={(open) => { if (!open) { setDeleteMotoId(null); setDeletePassword(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir moto definitivamente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Use apenas para cadastro errado ou perda total/furto. Se a moto estiver em contrato ou test ride, desvincule antes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteMotoId && (() => {
            const moto = motos.find((m) => m.id === deleteMotoId);
            const valor = moto?.valorContabil || 0;
            const precisaSenha = valor >= 2000;
            return precisaSenha ? (
              <div className="space-y-2 py-2">
                <p className="text-sm text-muted-foreground">Esta moto tem valor contábil de {formatCurrency(valor)} (acima de R$ 2.000). Digite a senha de exclusão para confirmar.</p>
                <Input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Senha de exclusão" className="max-w-xs" />
              </div>
            ) : null;
          })()}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeleteMotoId(null); setDeletePassword(""); }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteMotoId) return;
                const moto = motos.find((m) => m.id === deleteMotoId);
                if (!moto) return;
                if (moto.status === "Em Contrato" || moto.status === "Em Test Ride") {
                  toast.error(`Não é possível excluir — a moto ${moto.modelo} está ${moto.status.toLowerCase()}. Desvincule primeiro.`);
                  setDeleteMotoId(null); setDeletePassword("");
                  return;
                }
                const valor = moto.valorContabil || 0;
                if (valor >= 2000 && deletePassword !== "3283") {
                  toast.error("Senha incorreta. A senha para exclusão de itens acima de R$ 2.000 é obrigatória.");
                  return;
                }
                removeMoto(deleteMotoId);
                toast.success("Moto excluída permanentemente");
                setDeleteMotoId(null); setDeletePassword("");
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
          </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TAB B: CONTRATOS
   ══════════════════════════════════════════════════════════ */
function ContratosAtivos() {
  const contratos = useStore((s) => s.contratos);
  const clientes = useStore((s) => s.clientes);
  const motos = useStore((s) => s.motos);
  const funcionarios = useStore((s) => s.funcionarios);
  const addContrato = useStore((s) => s.addContrato);
  const updateContrato = useStore((s) => s.updateContrato);
  const updateMoto = useStore((s) => s.updateMoto);
  const removeContrato = useStore((s) => s.removeContrato);
  const syncLancamentosFuncionarioContrato = useStore((s) => s.syncLancamentosFuncionarioContrato);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [novoContratoOpen, setNovoContratoOpen] = useState(false);
  const [editarContratoOpen, setEditarContratoOpen] = useState(false);
  const [editingContrato, setEditingContrato] = useState<Contrato | null>(null);
  const [trocarMotoOpen, setTrocarMotoOpen] = useState(false);
  const [trocarContratoId, setTrocarContratoId] = useState<string | null>(null);
  const [trocarOldMotoId, setTrocarOldMotoId] = useState<string | null>(null);
  const [trocarNewMotoId, setTrocarNewMotoId] = useState("");
  const [vincularChassiOpen, setVincularChassiOpen] = useState(false);
  const [vincularChassiContratoId, setVincularChassiContratoId] = useState("");
  const [vincularChassiValue, setVincularChassiValue] = useState("");
  const [clienteSelect, setClienteSelect] = useState("");

  // Desvincular moto state
  const [desvincularMotoOpen, setDesvincularMotoOpen] = useState(false);
  const [desvincularMotoId, setDesvincularMotoId] = useState<string | null>(null);
  const [desvincularNovoStatus, setDesvincularNovoStatus] = useState<string>("Disponível para Operar");

  // Adicionar moto ao contrato state
  const [addMotoContratoOpen, setAddMotoContratoOpen] = useState(false);
  const [addMotoSelectedId, setAddMotoSelectedId] = useState("");

  // Edit contract state
  const [editValoresPorMoto, setEditValoresPorMoto] = useState<Record<string, number>>({});
  const [editLocacoesExtras, setEditLocacoesExtras] = useState<LocacaoExtra[]>([]);
  const [editValorBaseManual, setEditValorBaseManual] = useState<number | null>(null);
  // Modal de senha genérico (substitui window.prompt que é bloqueado no Next.js)
  const [senhaModalOpen, setSenhaModalOpen] = useState(false);
  const [senhaInput, setSenhaInput] = useState("");
  const [senhaCallback, setSenhaCallback] = useState<((ok: boolean) => void) | null>(null);
  const [senhaMensagem, setSenhaMensagem] = useState("");
  function pedirSenha(mensagem: string): Promise<boolean> {
    return new Promise((resolve) => {
      setSenhaMensagem(mensagem);
      setSenhaInput("");
      setSenhaCallback(() => (ok: boolean) => resolve(ok));
      setSenhaModalOpen(true);
    });
  }
  function confirmarSenha() {
    const ok = senhaInput === "3283";
    if (!ok) toast.error("Senha incorreta.");
    setSenhaModalOpen(false);
    setSenhaInput("");
    if (senhaCallback) senhaCallback(ok);
    setSenhaCallback(null);
  }
  function cancelarSenha() {
    setSenhaModalOpen(false);
    setSenhaInput("");
    if (senhaCallback) senhaCallback(false);
    setSenhaCallback(null);
  }
  // Local input buffers to prevent typing lag (commit on blur)
  const [localValorInputs, setLocalValorInputs] = useState<Record<string, string>>({});
  const [localExtraValorInputs, setLocalExtraValorInputs] = useState<Record<string, string>>({});
  const [localExtraQtdInputs, setLocalExtraQtdInputs] = useState<Record<string, string>>({});
  const [localExtraVUnitInputs, setLocalExtraVUnitInputs] = useState<Record<string, string>>({});

  const clienteMap = useMemo(() => { const map = new Map<string, Cliente>(); for (const c of clientes) map.set(c.id, c); return map; }, [clientes]);
  const motoMap = useMemo(() => { const map = new Map<string, Moto>(); for (const m of motos) map.set(m.id, m); return map; }, [motos]);
  const availableMotos = useMemo(() => { const linkedIds = new Set<string>(); for (const c of contratos) { if (c.status === "Ativo") for (const id of c.motosVinculadas) linkedIds.add(id); } return motos.filter((m) => !linkedIds.has(m.id)); }, [motos, contratos]);

  const contratoForm = useForm<NovoContratoFormValues>({
    resolver: zodResolver(novoContratoSchema) as any,
    defaultValues: { clienteId: "", numeroContrato: "", dataInicio: "", diaVencimento: 10, valorMensalTotal: 0, motosVinculadas: [], regraComissaoSocio: 0, regraComissaoTecnico: 0 },
  });

  // Valores por moto no formulário de novo contrato
  const [newValoresPorMoto, setNewValoresPorMoto] = useState<Record<string, number>>({});
  const [newLocacoesExtras, setNewLocacoesExtras] = useState<LocacaoExtra[]>([]);
  // Local input buffers for new contract form (prevent typing lag)
  const [localNewValorInputs, setLocalNewValorInputs] = useState<Record<string, string>>({});
  const [localNewExtraValorInputs, setLocalNewExtraValorInputs] = useState<Record<string, string>>({});

  useEffect(() => { if (!contratoForm.getValues("dataInicio")) contratoForm.setValue("dataInicio", new Date().toISOString().split("T")[0]); }, []);

  function onSubmitContrato(values: NovoContratoFormValues) {
    try {
      const valoresPorMoto: MotoContratoValor[] = values.motosVinculadas.map((id) => ({ motoId: id, valorMensal: newValoresPorMoto[id] || 0 }));
      const somaMotos = valoresPorMoto.reduce((a, v) => a + v.valorMensal, 0);
      const extrasTotal = newLocacoesExtras.reduce((a, e) => a + e.valorMensal, 0);
      // Usar soma dos valores individuais se preenchidos, senão usar o valor total manual
      const valorBaseReal = somaMotos > 0 ? somaMotos : values.valorMensalTotal;
      const dataTermino = values.dataTermino ? new Date(values.dataTermino) : undefined;
      const novo: Contrato = {
        id: generateId(),
        clienteId: values.clienteId,
        numeroContrato: values.numeroContrato || "",
        dataInicio: new Date(values.dataInicio),
        dataTermino,
        diaVencimento: values.diaVencimento,
        valorMensalTotal: valorBaseReal,
        motosVinculadas: values.motosVinculadas,
        valoresPorMoto,
        locacoesExtras: newLocacoesExtras.length > 0 ? newLocacoesExtras : undefined,
        regraComissaoSocio: values.regraComissaoSocio || undefined,
        regraComissaoTecnico: values.regraComissaoTecnico || undefined,
        status: "Ativo",
      };
      addContrato(novo);
      for (const motoId of values.motosVinculadas) updateMoto(motoId, { status: "Em Contrato", localizacao: "Cliente" });
      const totalLancamentos = valorBaseReal + extrasTotal;
      toast.success(`Contrato criado! ${dataTermino ? `Lançamentos gerados até ${dataTermino.toLocaleDateString('pt-BR')}` : 'Lançamentos gerados por 24 meses'}. Total/mês: R$ ${totalLancamentos.toFixed(2).replace('.', ',')}`);
      contratoForm.reset(); setClienteSelect(""); setNewValoresPorMoto({}); setNewLocacoesExtras([]); setLocalNewValorInputs({}); setLocalNewExtraValorInputs({}); setNovoContratoOpen(false);
    } catch { toast.error("Erro ao criar contrato"); }
  }

  function openEditarContrato(contrato: Contrato) {
    setEditingContrato(contrato);
    const vp: Record<string, number> = {};
    for (const v of contrato.valoresPorMoto || []) vp[v.motoId] = v.valorMensal;
    for (const id of contrato.motosVinculadas) { if (!(id in vp)) vp[id] = 0; }
    setEditValoresPorMoto(vp);
    setEditLocacoesExtras(contrato.locacoesExtras ? [...contrato.locacoesExtras] : []);
    setEditValorBaseManual(null);
    // Limpar buffers locais para evitar valores fantasmas de edições anteriores
    setLocalValorInputs({});
    setLocalExtraValorInputs({});
    setLocalExtraQtdInputs({});
    setLocalExtraVUnitInputs({});
    setLocalExtraModeloInputs({});
    // Inicializar data de término no formato YYYY-MM-DD para o input type="date"
    setEditDataTermino(contrato.dataTermino ? contrato.dataTermino.toISOString().split('T')[0] : "");
    setEditarContratoOpen(true);
  }

  // Estado para data de término no modal de edição
  const [editDataTermino, setEditDataTermino] = useState<string>("");

  // Estado para exclusão de contrato
  const [excluirContratoOpen, setExcluirContratoOpen] = useState(false);
  const [contratoParaExcluir, setContratoParaExcluir] = useState<Contrato | null>(null);
  const [statusMotosExclusao, setStatusMotosExclusao] = useState<Record<string, string>>({});

  async function handleSalvarEdicaoContrato() {
    if (!editingContrato) return;
    try {
      // Forçar commit de todos os buffers locais pendentes (valores ainda não "blurred")
      // para que o último dígito digitado não se perca ao clicar direto em Salvar.
      const valoresPorMotoFinal: Record<string, number> = { ...editValoresPorMoto };
      for (const id of editingContrato.motosVinculadas) {
        if (localValorInputs[id] !== undefined) {
          valoresPorMotoFinal[id] = parseFloat(localValorInputs[id] || "0") || 0;
        }
      }
      const locacoesExtrasFinal: LocacaoExtra[] = editLocacoesExtras.map((extra) => {
        let updated = { ...extra };
        // Commit buffers pendentes de quantidade e valor unitário
        const bufQtd = localExtraQtdInputs[extra.id];
        const bufVUnit = localExtraVUnitInputs[extra.id];
        if (bufQtd !== undefined) updated = { ...updated, quantidadeAlugada: Math.max(1, parseInt(bufQtd || "1") || 1) };
        if (bufVUnit !== undefined) updated = { ...updated, valorUnitario: parseFloat(bufVUnit || "0") || 0 };
        // Recalcular valorMensal = quantidade * valorUnitario
        const qtd = updated.quantidadeAlugada || 1;
        const vUnit = updated.valorUnitario || 0;
        updated.valorMensal = qtd * vUnit;
        const bufMod = localExtraModeloInputs[extra.id];
        if (bufMod !== undefined) updated = { ...updated, modelo: bufMod };
        return updated;
      });

      const valoresPorMoto: MotoContratoValor[] = editingContrato.motosVinculadas.map((id) => ({ motoId: id, valorMensal: valoresPorMotoFinal[id] || 0 }));
      const somaMotos = valoresPorMoto.reduce((a, v) => a + v.valorMensal, 0);
      const extrasTotal = locacoesExtrasFinal.reduce((a, e) => a + e.valorMensal, 0);
      // Se o valor base foi alterado manualmente (diferente do original), exigir senha via modal React
      let novoValorTotal: number;
      const valorOriginal = editingContrato.valorMensalTotal;
      const valorManual = editValorBaseManual;
      if (valorManual !== null && valorManual !== valorOriginal) {
        const ok = await pedirSenha(`ALTERAÇÃO DE VALOR BASE\nDe: ${formatCurrency(valorOriginal)}\nPara: ${formatCurrency(valorManual)}\n\nDigite a senha de autorização:`);
        if (!ok) return;
        novoValorTotal = valorManual;
      } else {
        novoValorTotal = somaMotos > 0 ? somaMotos : valorOriginal;
      }

      // Processar data de término
      const novaDataTermino = editDataTermino ? new Date(editDataTermino) : undefined;

      updateContrato(editingContrato.id, {
        valoresPorMoto,
        locacoesExtras: locacoesExtrasFinal.length > 0 ? locacoesExtrasFinal : undefined,
        valorMensalTotal: novoValorTotal,
        dataTermino: novaDataTermino,
      });

      toast.success("Contrato atualizado com sucesso");

      setEditarContratoOpen(false); setEditingContrato(null);
      setLocalValorInputs({}); setLocalExtraValorInputs({}); setLocalExtraModeloInputs({});
      setEditDataTermino("");
    } catch { toast.error("Erro ao atualizar contrato"); }
  }

  function openTrocarMoto(contratoId: string, oldMotoId: string) { setTrocarContratoId(contratoId); setTrocarOldMotoId(oldMotoId); setTrocarNewMotoId(""); setTrocarMotoOpen(true); }

  function openDesvincularMoto(motoId: string) {
    setDesvincularMotoId(motoId);
    setDesvincularNovoStatus("Disponível para Operar");
    setDesvincularMotoOpen(true);
  }

  function handleDesvincularMoto() {
    if (!desvincularMotoId || !editingContrato) return;
    try {
      const novasMotos = editingContrato.motosVinculadas.filter((id) => id !== desvincularMotoId);
      const novosValoresPorMoto = (editingContrato.valoresPorMoto || []).filter((v) => v.motoId !== desvincularMotoId);
      const somaMotos = novosValoresPorMoto.reduce((a, v) => a + v.valorMensal, 0);
      // Preservar override manual do valor base se foi definido pelo usuário
      // Caso contrário, usar soma das motos restantes (ou valor original se soma for 0)
      const novoValorTotal = (editValorBaseManual !== null && editValorBaseManual !== editingContrato.valorMensalTotal)
        ? editValorBaseManual
        : (somaMotos > 0 ? somaMotos : editingContrato.valorMensalTotal);
      updateContrato(editingContrato.id, {
        motosVinculadas: novasMotos,
        valoresPorMoto: novosValoresPorMoto,
        valorMensalTotal: novoValorTotal,
      });
      updateMoto(desvincularMotoId, { status: desvincularNovoStatus as Moto["status"], localizacao: "Galpão" });
      // Atualizar estado local do modal
      setEditingContrato({ ...editingContrato, motosVinculadas: novasMotos, valoresPorMoto: novosValoresPorMoto, valorMensalTotal: novoValorTotal });
      const vp = { ...editValoresPorMoto };
      delete vp[desvincularMotoId];
      setEditValoresPorMoto(vp);
      toast.success(`Moto desvinculada! Status alterado para "${desvincularNovoStatus}"`);
      setDesvincularMotoOpen(false);
    } catch { toast.error("Erro ao desvincular moto"); }
  }

  function handleAddMotoAoContrato() {
    if (!addMotoSelectedId || !editingContrato) return;
    try {
      const novasMotos = [...editingContrato.motosVinculadas, addMotoSelectedId];
      const novosValoresPorMoto = [...(editingContrato.valoresPorMoto || []), { motoId: addMotoSelectedId, valorMensal: 0 }];
      updateContrato(editingContrato.id, {
        motosVinculadas: novasMotos,
        valoresPorMoto: novosValoresPorMoto,
      });
      updateMoto(addMotoSelectedId, { status: "Em Contrato", localizacao: "Cliente" });
      // Atualizar estado local do modal
      setEditingContrato({ ...editingContrato, motosVinculadas: novasMotos, valoresPorMoto: novosValoresPorMoto });
      setEditValoresPorMoto({ ...editValoresPorMoto, [addMotoSelectedId]: 0 });
      toast.success("Moto adicionada ao contrato!");
      setAddMotoContratoOpen(false);
      setAddMotoSelectedId("");
    } catch { toast.error("Erro ao adicionar moto"); }
  }

  function handleTrocarMoto() {
    if (!trocarContratoId || !trocarOldMotoId || !trocarNewMotoId) return;
    try {
      const store = useStore.getState();
      const contrato = store.contratos.find((c) => c.id === trocarContratoId);
      if (!contrato) { toast.error("Contrato não encontrado"); return; }
      updateMoto(trocarOldMotoId, { status: "Disponível para Operar", localizacao: "Galpão" });
      updateMoto(trocarNewMotoId, { status: "Em Contrato", localizacao: "Cliente" });
      const newLinked = contrato.motosVinculadas.map((id) => id === trocarOldMotoId ? trocarNewMotoId : id);
      // Atualizar valoresPorMoto também
      const novosValores = (contrato.valoresPorMoto || []).filter((v) => v.motoId !== trocarOldMotoId);
      novosValores.push({ motoId: trocarNewMotoId, valorMensal: 0 });
      updateContrato(trocarContratoId, { motosVinculadas: newLinked, valoresPorMoto: novosValores });
      toast.success("Moto trocada com sucesso"); setTrocarMotoOpen(false);
    } catch { toast.error("Erro ao trocar moto"); }
  }

  function handleVincularChassi() {
    if (!vincularChassiContratoId || !vincularChassiValue.trim()) return;
    try {
      const store = useStore.getState();
      const moto = store.motos.find((m) => m.chassi.toLowerCase() === vincularChassiValue.trim().toLowerCase());
      if (!moto) { toast.error(`Chassi "${vincularChassiValue}" não encontrado`); return; }
      const contrato = store.contratos.find((c) => c.id === vincularChassiContratoId);
      if (!contrato) { toast.error("Contrato não encontrado"); return; }
      if (contrato.motosVinculadas.includes(moto.id)) { toast.error("Esta moto já está vinculada"); return; }
      updateMoto(moto.id, { status: "Em Contrato", localizacao: "Cliente" });
      updateContrato(vincularChassiContratoId, { motosVinculadas: [...contrato.motosVinculadas, moto.id], valoresPorMoto: [...(contrato.valoresPorMoto || []), { motoId: moto.id, valorMensal: 0 }] });
      toast.success(`Moto ${moto.modelo} vinculada`); setVincularChassiOpen(false); setVincularChassiValue(""); setVincularChassiContratoId("");
    } catch { toast.error("Erro ao vincular chassi"); }
  }

  function toggleMotoSelection(motoId: string) {
    const current = contratoForm.getValues("motosVinculadas") || [];
    if (current.includes(motoId)) { contratoForm.setValue("motosVinculadas", current.filter((id) => id !== motoId)); const nv = { ...newValoresPorMoto }; delete nv[motoId]; setNewValoresPorMoto(nv); }
    else { contratoForm.setValue("motosVinculadas", [...current, motoId]); setNewValoresPorMoto({ ...newValoresPorMoto, [motoId]: 0 }); }
  }

  const pecasEstoque = useStore((s) => s.pecas);
  const updatePecaEstoque = useStore((s) => s.updatePeca);

  function addLocacaoExtra(target: "new" | "edit") {
    const nova: LocacaoExtra = { id: generateId(), tipo: "Peça Estoque", quantidadeAlugada: 1, valorUnitario: 0, valorMensal: 0 };
    if (target === "new") setNewLocacoesExtras([...newLocacoesExtras, nova]);
    else setEditLocacoesExtras([...editLocacoesExtras, nova]);
  }

  function updateLocacaoExtra(target: "new" | "edit", id: string, data: Partial<LocacaoExtra>) {
    const list = target === "new" ? newLocacoesExtras : editLocacoesExtras;
    const setList = target === "new" ? setNewLocacoesExtras : setEditLocacoesExtras;
    const old = list.find((l) => l.id === id);
    const merged = { ...old, ...data } as LocacaoExtra;

    // Recalcular valorMensal = quantidade * valorUnitario
    const qtd = merged.quantidadeAlugada || 1;
    const vUnit = merged.valorUnitario || 0;
    merged.valorMensal = qtd * vUnit;

    // Gerenciar estoque: usar getState() para leitura fresca (evita drift em edições rápidas)
    if (merged.pecaEstoqueId) {
      const pecasFrescas = useStore.getState().pecas;
      const peca = pecasFrescas.find((p) => p.id === merged.pecaEstoqueId);
      if (peca) {
        const oldQtd = (old?.pecaEstoqueId === merged.pecaEstoqueId) ? (old?.quantidadeAlugada || 0) : 0;
        const newQtd = merged.quantidadeAlugada || 1;
        const diff = newQtd - oldQtd;
        if (diff !== 0) {
          const novaQtdEstoque = peca.quantidade - diff;
          if (novaQtdEstoque >= 0) {
            updatePecaEstoque(peca.id, { quantidade: novaQtdEstoque });
          } else {
            toast.error(`Estoque insuficiente. Disponível: ${peca.quantidade}`);
            return; // Não aplicar a mudança
          }
        }
      }
      // Se trocou de peça, devolver a antiga (também com leitura fresca)
      if (old?.pecaEstoqueId && old.pecaEstoqueId !== merged.pecaEstoqueId) {
        const oldPeca = pecasFrescas.find((p) => p.id === old.pecaEstoqueId);
        if (oldPeca) updatePecaEstoque(oldPeca.id, { quantidade: oldPeca.quantidade + (old.quantidadeAlugada || 1) });
      }
    }

    setList(list.map((l) => l.id === id ? merged : l));
  }

  async function removeLocacaoExtra(target: "new" | "edit", id: string) {
    const list = target === "new" ? newLocacoesExtras : editLocacoesExtras;
    const extra = list.find((l) => l.id === id);
    // Se valor >= 2000, exigir senha via modal React
    if (extra && extra.valorMensal >= 2000) {
      const ok = await pedirSenha(`EXCLUSÃO DE LOCAÇÃO EXTRA\nValor: ${formatCurrency(extra.valorMensal)}/mês\n\nDigite a senha de autorização:`);
      if (!ok) return;
    }
    // Devolver peças ao estoque
    if (extra?.pecaEstoqueId) {
      const peca = pecasEstoque.find((p) => p.id === extra.pecaEstoqueId);
      if (peca) updatePecaEstoque(peca.id, { quantidade: peca.quantidade + (extra.quantidadeAlugada || 1) });
    }
    const setList = target === "new" ? setNewLocacoesExtras : setEditLocacoesExtras;
    setList(list.filter((l) => l.id !== id));
    toast.success("Locação extra removida");
  }

  // ── Excluir Contrato com senha e seleção de status para motos ──
  function openExcluirContrato(contrato: Contrato) {
    setContratoParaExcluir(contrato);
    // Inicializar status padrão para cada moto como "Disponível para Operar"
    const statusInicial: Record<string, string> = {};
    for (const motoId of contrato.motosVinculadas) {
      statusInicial[motoId] = "Disponível para Operar";
    }
    setStatusMotosExclusao(statusInicial);
    setExcluirContratoOpen(true);
  }

  async function handleConfirmarExclusaoContrato() {
    if (!contratoParaExcluir) return;

    // Pedir senha de autorização
    const ok = await pedirSenha(
      `EXCLUSÃO DE CONTRATO\nContrato: ${contratoParaExcluir.numeroContrato || contratoParaExcluir.id.slice(0, 6)}\nValor Mensal: ${formatCurrency(contratoParaExcluir.valorMensalTotal)}\nMotos Vinculadas: ${contratoParaExcluir.motosVinculadas.length}\n\nEsta ação removerá o contrato e todos os lançamentos associados.\nAs motos voltarão ao estoque com o status selecionado.\n\nDigite a senha de autorização:`
    );
    if (!ok) return;

    // Devolver motos ao estoque com o status selecionado
    for (const motoId of contratoParaExcluir.motosVinculadas) {
      const novoStatus = statusMotosExclusao[motoId] || "Disponível para Operar";
      updateMoto(motoId, {
        status: novoStatus as any,
        localizacao: "Galpão",
      });
    }

    // Remover o contrato (isso também remove os lançamentos associados via store)
    removeContrato(contratoParaExcluir.id);

    toast.success(`Contrato excluído. ${contratoParaExcluir.motosVinculadas.length} moto(s) devolvida(s) ao estoque.`);
    setExcluirContratoOpen(false);
    setContratoParaExcluir(null);
    setStatusMotosExclusao({});
  }

  /* ── Locações Extras UI (reusable) ── */
  // Local buffers for modelo field (prevent typing lag)
  const [localExtraModeloInputs, setLocalExtraModeloInputs] = useState<Record<string, string>>({});

  function LocacoesExtrasUI({ extras, target }: { extras: LocacaoExtra[]; target: "new" | "edit" }) {
    // Buffers locais para quantidade e valor unitário (commit on blur)
    const qtdBufKey = target === "new" ? "newQtd" : "editQtd";
    const vUnitBufKey = target === "new" ? "newVUnit" : "editVUnit";
    const [qtdBufs, setQtdBufs] = useState<Record<string, string>>({});
    const [vUnitBufs, setVUnitBufs] = useState<Record<string, string>>({});

    const totalExtras = extras.reduce((a, e) => a + (e.valorMensal || 0), 0);

    return (
      <div className="space-y-2 rounded-md border border-dashed border-[var(--motriz-ambar)]/30 bg-[var(--motriz-ambar)]/5 p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[var(--motriz-ambar)] uppercase tracking-wider flex items-center gap-1.5"><Package className="size-3.5" />Peças Alugadas (do Estoque)</p>
          <Button type="button" variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => addLocacaoExtra(target)}><Plus className="mr-1 size-3" />Add Peça</Button>
        </div>
        {extras.length === 0 && <p className="text-[11px] text-muted-foreground italic">Nenhuma peça alugada. Clique "Add Peça" para selecionar do estoque.</p>}
        {extras.map((extra) => {
          const pecaSelecionada = pecasEstoque.find((p) => p.id === extra.pecaEstoqueId);
          return (
            <div key={extra.id} className="rounded border border-border bg-background p-2.5 space-y-2">
              <div className="flex items-center gap-2">
                {/* Seleção da peça do estoque */}
                <Select value={extra.pecaEstoqueId || ""} onValueChange={(v) => updateLocacaoExtra(target, extra.id, { pecaEstoqueId: v })}>
                  <SelectTrigger className="flex-1 h-7 text-xs"><SelectValue placeholder="Selecionar peça do estoque" /></SelectTrigger>
                  <SelectContent>
                    {pecasEstoque.filter((p) => p.quantidade > 0 || p.id === extra.pecaEstoqueId).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-1.5">
                          <span>{p.nome}</span>
                          <span className="text-muted-foreground">({p.quantidade} disp.)</span>
                          {p.custoUnitario ? <span className="text-muted-foreground">— custo {formatCurrency(p.custoUnitario)}</span> : null}
                        </span>
                      </SelectItem>
                    ))}
                    {pecasEstoque.filter((p) => p.quantidade > 0 || p.id === extra.pecaEstoqueId).length === 0 && (
                      <div className="px-2 py-1.5 text-[10px] text-muted-foreground italic">Nenhuma peça disponível — cadastre no Estoque de Peças primeiro</div>
                    )}
                  </SelectContent>
                </Select>
                <button type="button" onClick={() => removeLocacaoExtra(target, extra.id)} className="text-muted-foreground hover:text-destructive shrink-0"><Trash2 className="size-3.5" /></button>
              </div>
              {extra.pecaEstoqueId && (
                <div className="flex items-center gap-2">
                  {/* Quantidade */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">Qtd:</span>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      className="w-16 h-7 text-xs text-center"
                      value={qtdBufs[extra.id] ?? (extra.quantidadeAlugada || 1)}
                      onChange={(e) => setQtdBufs({ ...qtdBufs, [extra.id]: e.target.value })}
                      onBlur={() => {
                        const v = Math.max(1, parseInt(qtdBufs[extra.id] || "1") || 1);
                        updateLocacaoExtra(target, extra.id, { quantidadeAlugada: v });
                        setQtdBufs((prev) => { const n = { ...prev }; delete n[extra.id]; return n; });
                      }}
                    />
                  </div>
                  {/* Valor por unidade */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">R$/unid:</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-24 h-7 text-xs text-center"
                      value={vUnitBufs[extra.id] ?? (extra.valorUnitario || 0)}
                      onChange={(e) => setVUnitBufs({ ...vUnitBufs, [extra.id]: e.target.value })}
                      onBlur={() => {
                        const v = parseFloat(vUnitBufs[extra.id] || "0") || 0;
                        updateLocacaoExtra(target, extra.id, { valorUnitario: v });
                        setVUnitBufs((prev) => { const n = { ...prev }; delete n[extra.id]; return n; });
                      }}
                    />
                  </div>
                  {/* Total calculado */}
                  <div className="ml-auto text-right">
                    <p className="text-[10px] text-muted-foreground">Total/mês</p>
                    <p className="text-xs font-bold tabular-nums text-[var(--motriz-ambar)]">{formatCurrency(extra.valorMensal || 0)}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {extras.length > 0 && <p className="text-[10px] text-[var(--motriz-ambar)] font-medium">Total peças alugadas: {formatCurrency(totalExtras)}/mês</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Todos os Contratos ({contratos.length})</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setVincularChassiOpen(true); setVincularChassiValue(""); setVincularChassiContratoId(""); }}><Link2 className="mr-1.5 size-3.5" />Vincular Chassi</Button>
          <Button size="sm" onClick={() => { setNovoContratoOpen(true); setClienteSelect(""); setNewValoresPorMoto({}); setNewLocacoesExtras([]); }}><Plus className="mr-1.5 size-3.5" />Novo Contrato</Button>
        </div>
      </div>
      {contratos.length === 0 ? <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum contrato encontrado.</CardContent></Card> : (
        <div className="space-y-3">
          {contratos.map((contrato) => {
            const cliente = clienteMap.get(contrato.clienteId);
            const isExpanded = expandedId === contrato.id;
            const linkedMotos = contrato.motosVinculadas.map((id) => motoMap.get(id)).filter(Boolean) as Moto[];
            const extrasTotal = (contrato.locacoesExtras || []).reduce((a, e) => a + e.valorMensal, 0);
            // Calcular valor real: soma dos valores individuais das motos (se existirem) ou valorMensalTotal + extras
            const somaValoresMotos = (contrato.valoresPorMoto || []).reduce((a, v) => a + v.valorMensal, 0);
            const valorBaseReal = somaValoresMotos > 0 ? somaValoresMotos : contrato.valorMensalTotal;
            const valorTotalReal = valorBaseReal + extrasTotal;
            return (
              <Card key={contrato.id} className="overflow-hidden">
                <button type="button" onClick={() => setExpandedId(isExpanded ? null : contrato.id)} className="w-full text-left">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--motriz-verde-esmeralda)]/10"><FileText className="size-4 text-[var(--motriz-verde-esmeralda)]" /></div>
                        <div>
                          <CardTitle className="text-sm font-semibold">{contrato.numeroContrato || `Contrato ${contrato.id.slice(0, 6)}`}</CardTitle>
                          <p className="text-xs text-muted-foreground">{cliente?.nome ?? "Cliente desconhecido"}{cliente?.contato && ` — ${cliente.contato}`}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${contratoStatusColor(contrato.status)}`}>{contrato.status}</span>
                        <div className="text-right">
                          <p className="text-sm font-bold tabular-nums text-[var(--motriz-verde-esmeralda)]">{formatCurrency(valorTotalReal)}</p>
                          <p className="text-xs text-muted-foreground">mensal{extrasTotal > 0 && ` (+${formatCurrency(extrasTotal)} extras)`}</p>
                        </div>
                        {isExpanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </CardHeader>
                </button>
                {isExpanded && (
                  <CardContent className="border-t border-border pt-4">
                    {/* Botões Editar e Excluir Contrato */}
                    <div className="mb-4 flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => openEditarContrato(contrato)}><Pencil className="mr-1.5 size-3" />Editar Contrato</Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => openExcluirContrato(contrato)}>
                        <Trash2 className="mr-1.5 size-3" />Excluir Contrato
                      </Button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Início</span><span className="tabular-nums">{formatDate(contrato.dataInicio)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Dia Vencimento</span><span className="tabular-nums">Dia {contrato.diaVencimento}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Valor Base (Motos)</span><span className="tabular-nums font-medium">{formatCurrency(valorBaseReal)}</span></div>
                        {extrasTotal > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Extras</span><span className="tabular-nums text-[var(--motriz-ambar)]">+{formatCurrency(extrasTotal)}</span></div>}
                        <div className="flex justify-between border-t border-border pt-1 mt-1"><span className="text-muted-foreground font-medium">Total Mensal</span><span className="tabular-nums font-bold text-[var(--motriz-verde-esmeralda)]">{formatCurrency(valorTotalReal)}</span></div>
                        {contrato.regraComissaoSocio != null && <div className="flex justify-between"><span className="text-muted-foreground">Comissão Sócio</span><span className="tabular-nums">{contrato.regraComissaoSocio}%</span></div>}
                        {contrato.regraComissaoTecnico != null && <div className="flex justify-between"><span className="text-muted-foreground">Comissão Técnico</span><span className="tabular-nums">{contrato.regraComissaoTecnico}%</span></div>}
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Motos Vinculadas ({linkedMotos.length})</p>
                        {linkedMotos.length === 0 ? <p className="text-xs text-muted-foreground italic">Nenhuma moto vinculada.</p> : (
                          <div className="space-y-1.5">
                            {linkedMotos.map((moto) => {
                              const preparada = isPreparada(moto);
                              const valorIndividual = contrato.valoresPorMoto?.find((v) => v.motoId === moto.id)?.valorMensal;
                              return (
                                <div key={moto.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Bike className="size-3 text-muted-foreground" />
                                    <span className="font-medium">{moto.modelo}</span>
                                    <span className="font-mono text-muted-foreground tabular-nums">{moto.chassi}</span>
                                    {moto.cor && <span className={`size-2.5 rounded-full ${COR_COLORS[moto.cor]}`} title={moto.cor} />}
                                    {preparada ? <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600"><CheckCircle2 className="size-2.5" />OK</span> : <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--motriz-ambar)]/10 px-1.5 py-0.5 text-[9px] font-medium text-[var(--motriz-ambar)]"><Circle className="size-2.5" />{getPrepCount(moto)}/5</span>}
                                    {valorIndividual != null && valorIndividual > 0 && <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-medium text-blue-600">{formatCurrency(valorIndividual)}</span>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${motoStatusColor(moto.status)}`}>{moto.status}</span>
                                    <Button variant="ghost" size="icon-xs" onClick={(e) => { e.stopPropagation(); openTrocarMoto(contrato.id, moto.id); }} title="Trocar moto"><RefreshCw className="size-3" /></Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {/* Locações extras do contrato */}
                        {contrato.locacoesExtras && contrato.locacoesExtras.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-border">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Locações Extras</p>
                            {contrato.locacoesExtras.map((extra) => {
                              const pecaNome = extra.pecaEstoqueId ? (pecasEstoque.find((p) => p.id === extra.pecaEstoqueId)?.nome || "Peça") : "Peça";
                              const qtd = extra.quantidadeAlugada || 1;
                              return (
                                <div key={extra.id} className="flex items-center gap-2 text-[11px] py-0.5">
                                  <Package className="size-3 text-[var(--motriz-ambar)]" />
                                  <span className="truncate">{pecaNome}{qtd > 1 ? ` ×${qtd}` : ""}</span>
                                  <span className="ml-auto tabular-nums font-medium">{formatCurrency(extra.valorMensal)}/mês</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Novo Contrato Modal ── */}
      <Dialog open={novoContratoOpen} onOpenChange={setNovoContratoOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Contrato</DialogTitle></DialogHeader>
          <form onSubmit={contratoForm.handleSubmit(onSubmitContrato)} className="grid gap-4 py-2">
            <div className="space-y-1.5"><Label>Cliente *</Label><Select value={clienteSelect} onValueChange={(v) => { setClienteSelect(v); contratoForm.setValue("clienteId", v); }}><SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger><SelectContent>{clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}{c.contato ? ` — ${c.contato}` : ""}</SelectItem>)}</SelectContent></Select>{contratoForm.formState.errors.clienteId && <p className="text-xs text-destructive">{contratoForm.formState.errors.clienteId.message}</p>}</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Número Contrato (opcional)</Label><Input {...contratoForm.register("numeroContrato")} placeholder="Identificador interno" /></div>
              <div className="space-y-1.5"><Label>Data Início *</Label><Input type="date" {...contratoForm.register("dataInicio")} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Data Término (opcional)</Label><Input type="date" {...contratoForm.register("dataTermino")} /><p className="text-[10px] text-muted-foreground">Se vazio, gera lançamentos por 24 meses</p></div>
              <div className="space-y-1.5"><Label>Dia Vencimento</Label><Input type="number" min="1" max="31" {...contratoForm.register("diaVencimento")} /></div>
            </div>
            <div className="space-y-1.5"><Label>Valor Mensal Total (R$) *</Label><Input type="number" step="0.01" min="0" {...contratoForm.register("valorMensalTotal")} />{contratoForm.formState.errors.valorMensalTotal && <p className="text-xs text-destructive">{contratoForm.formState.errors.valorMensalTotal.message}</p>}<p className="text-[10px] text-muted-foreground">Este valor será recalculado automaticamente pela soma dos valores individuais das motos ao salvar</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Comissão Sócio (%)</Label><Input type="number" step="0.1" min="0" max="100" {...contratoForm.register("regraComissaoSocio")} /></div>
              <div className="space-y-1.5"><Label>Comissão Técnico (%)</Label><Input type="number" step="0.1" min="0" max="100" {...contratoForm.register("regraComissaoTecnico")} /></div>
            </div>
            {/* Multi-select motos com valor individual */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between"><Label>Motos para Vincular *</Label>{(contratoForm.watch("motosVinculadas") || []).length > 0 && <span className="text-[10px] font-medium text-[var(--motriz-verde-esmeralda)]">{(contratoForm.watch("motosVinculadas") || []).length} selecionada(s)</span>}</div>
              {availableMotos.length === 0 ? <p className="text-xs text-muted-foreground italic">Todas as motos já estão vinculadas.</p> : (
                <div className="max-h-52 overflow-y-auto rounded-md border border-border p-2 space-y-1">
                  {availableMotos.map((moto) => {
                    const selected = (contratoForm.watch("motosVinculadas") || []).includes(moto.id);
                    return (
                      <div key={moto.id} className={`rounded-md border transition-colors ${selected ? "bg-[var(--motriz-verde-esmeralda)]/10 border-[var(--motriz-verde-esmeralda)]/30" : "border-transparent hover:bg-muted/50"}`}>
                        <div className="flex cursor-pointer items-center gap-2 px-2.5 py-2" onClick={() => toggleMotoSelection(moto.id)}>
                          <Checkbox checked={selected} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2"><span className="text-sm font-medium">{moto.modelo}</span><span className="text-xs font-mono text-muted-foreground tabular-nums">{moto.chassi}</span>{moto.cor && <span className={`size-2.5 rounded-full ${COR_COLORS[moto.cor]}`} />}</div>
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${motoStatusColor(moto.status)}`}>{moto.status}</span>
                          </div>
                          {selected && <CheckCircle2 className="size-4 text-[var(--motriz-verde-esmeralda)] shrink-0" />}
                        </div>
                        {selected && (
                          <div className="px-2.5 pb-2 pt-0">
                            <div className="flex items-center gap-2">
                              <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Valor/mês desta moto:</Label>
                              <Input type="number" step="0.01" min="0" className="h-7 w-28 text-xs" placeholder="R$ 0,00" value={localNewValorInputs[moto.id] ?? (newValoresPorMoto[moto.id] || "")} onChange={(e) => setLocalNewValorInputs({ ...localNewValorInputs, [moto.id]: e.target.value })} onBlur={() => { const v = parseFloat(localNewValorInputs[moto.id] || "0") || 0; setNewValoresPorMoto({ ...newValoresPorMoto, [moto.id]: v }); setLocalNewValorInputs((prev) => { const n = { ...prev }; delete n[moto.id]; return n; }); }} onClick={(e) => e.stopPropagation()} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {contratoForm.formState.errors.motosVinculadas && <p className="text-xs text-destructive">{contratoForm.formState.errors.motosVinculadas.message}</p>}
            </div>
            {/* Locações Extras */}
            <LocacoesExtrasUI extras={newLocacoesExtras} target="new" />
            <DialogFooter><Button type="button" variant="outline" onClick={() => setNovoContratoOpen(false)}>Cancelar</Button><Button type="submit">Criar Contrato</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Editar Contrato Modal ── */}
      <Dialog open={editarContratoOpen} onOpenChange={setEditarContratoOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Contrato — {editingContrato?.numeroContrato || editingContrato?.id.slice(0, 6)}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <p className="text-sm text-muted-foreground">Ajuste os valores individuais de cada moto e as locações extras deste contrato.</p>
            {/* Valores por moto */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider">Valores por Moto</Label>
              {editingContrato?.motosVinculadas.map((motoId) => {
                const moto = motoMap.get(motoId);
                if (!moto) return null;
                return (
                  <div key={motoId} className="flex items-center gap-3 rounded-md border border-border p-2">
                    <Bike className="size-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{moto.modelo} <span className="font-mono text-xs text-muted-foreground">{moto.chassi}</span></p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] text-muted-foreground whitespace-nowrap">R$/mês:</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="h-7 w-28 text-xs"
                        value={localValorInputs[motoId] ?? (editValoresPorMoto[motoId] || "")}
                        onChange={(e) => setLocalValorInputs({ ...localValorInputs, [motoId]: e.target.value })}
                        onBlur={() => { const v = parseFloat(localValorInputs[motoId] || "0") || 0; setEditValoresPorMoto({ ...editValoresPorMoto, [motoId]: v }); setLocalValorInputs((prev) => { const n = { ...prev }; delete n[motoId]; return n; }); }}
                      />
                    </div>
                    <Button variant="ghost" size="icon-xs" onClick={() => openTrocarMoto(editingContrato!.id, motoId)} title="Trocar moto"><RefreshCw className="size-3" /></Button>
                    <Button variant="ghost" size="icon-xs" onClick={() => openDesvincularMoto(motoId)} title="Desvincular moto" className="text-[var(--motriz-vermelho)] hover:text-[var(--motriz-vermelho)]"><Unlink className="size-3" /></Button>
                  </div>
                );
              })}
              {/* Botão Adicionar Moto */}
              <Button variant="outline" size="sm" className="w-full mt-2 gap-1.5" onClick={() => { setAddMotoSelectedId(""); setAddMotoContratoOpen(true); }}>
                <Plus className="size-3.5" />
                Adicionar Moto ao Contrato
              </Button>
              <div className="flex justify-between text-xs pt-1 border-t border-border">
                <span className="text-muted-foreground">Soma dos valores individuais:</span>
                <span className="tabular-nums font-medium">{formatCurrency(Object.values(editValoresPorMoto).reduce((a, b) => a + b, 0))}</span>
              </div>
            </div>
            {/* Locações Extras */}
            {/* Valor Base Manual (com senha) */}
            <div className="space-y-1.5 rounded-md border border-dashed border-blue-500/30 bg-blue-500/5 p-3">
              <Label className="text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                💰 Valor Base do Contrato (override manual)
              </Label>
              <p className="text-[10px] text-muted-foreground">
                Padrão: soma automática dos valores por moto ({formatCurrency(Object.values(editValoresPorMoto).reduce((a, v) => a + v, 0))}).
                Para alterar manualmente, preencha abaixo — será exigida senha ao salvar.
              </p>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder={String(editingContrato?.valorMensalTotal || 0)}
                value={editValorBaseManual ?? ""}
                onChange={(e) => {
                  const v = e.target.value === "" ? null : parseFloat(e.target.value) || 0;
                  setEditValorBaseManual(v);
                }}
                className="h-8 text-sm"
              />
              {editValorBaseManual !== null && editValorBaseManual !== editingContrato?.valorMensalTotal && (
                <p className="text-[10px] text-[var(--motriz-ambar)] font-medium">⚠️ Senha 3283 será exigida ao salvar para confirmar a alteração.</p>
              )}
            </div>

            <LocacoesExtrasUI extras={editLocacoesExtras} target="edit" />

            {/* Data de Encerramento */}
            <div className="space-y-1.5 rounded-md border border-dashed border-[var(--motriz-ambar)]/30 bg-[var(--motriz-ambar)]/5 p-3">
              <Label className="text-xs font-semibold text-[var(--motriz-ambar)] uppercase tracking-wider flex items-center gap-1.5">
                <CalendarClock className="size-3.5" />
                Data de Encerramento do Contrato
              </Label>
              <p className="text-[11px] text-muted-foreground">Defina até quando este contrato estará ativo. Isso afeta a projeção de receita recorrente nos próximos meses.</p>
              <Input
                type="date"
                value={editDataTermino}
                onChange={(e) => setEditDataTermino(e.target.value)}
                className="h-8 text-sm"
              />
              {!editDataTermino && <p className="text-[10px] text-[var(--motriz-ambar)] font-medium">⚠ Sem data definida — a receita será projetada por 24 meses a partir do início</p>}
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setEditarContratoOpen(false)}>Cancelar</Button><Button onClick={handleSalvarEdicaoContrato}>Salvar Alterações</Button></DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Senha Genérico (substitui window.prompt bloqueado no Next.js) */}
      <Dialog open={senhaModalOpen} onOpenChange={(open) => { if (!open) cancelarSenha(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--motriz-vermelho)]">
              🔒 Autorização Necessária
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <p className="text-sm text-muted-foreground whitespace-pre-line">{senhaMensagem}</p>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Senha de autorização *</Label>
              <Input
                type="password"
                value={senhaInput}
                onChange={(e) => setSenhaInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") confirmarSenha(); }}
                placeholder="Digite a senha"
                autoFocus
                className="h-9"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={cancelarSenha}>Cancelar</Button>
              <Button onClick={confirmarSenha} disabled={!senhaInput}>Confirmar</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Excluir Contrato Modal */}
      <Dialog open={excluirContratoOpen} onOpenChange={setExcluirContratoOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--motriz-vermelho)]">
              <Trash2 className="size-4" />
              Excluir Contrato
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {contratoParaExcluir && (
              <>
                <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 space-y-1">
                  <p className="text-sm font-semibold">Contrato: {contratoParaExcluir.numeroContrato || contratoParaExcluir.id.slice(0, 6)}</p>
                  <p className="text-xs text-muted-foreground">Valor Mensal: {formatCurrency(contratoParaExcluir.valorMensalTotal)}</p>
                  <p className="text-xs text-muted-foreground">Motos Vinculadas: {contratoParaExcluir.motosVinculadas.length}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Selecione o status de retorno para cada moto no estoque. Após confirmar, será solicitada a senha de autorização.
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {contratoParaExcluir.motosVinculadas.map((motoId) => {
                    const moto = motos.find((m) => m.id === motoId);
                    return (
                      <div key={motoId} className="flex items-center gap-3 rounded-md border p-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{moto?.modelo || "Moto"} — {moto?.chassi || motoId.slice(0, 8)}</p>
                          <p className="text-[10px] text-muted-foreground">Status atual: {moto?.status || "—"}</p>
                        </div>
                        <Select
                          value={statusMotosExclusao[motoId] || "Disponível para Operar"}
                          onValueChange={(val) => setStatusMotosExclusao((prev) => ({ ...prev, [motoId]: val }))}
                        >
                          <SelectTrigger className="w-48 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Disponível para Operar">Disponível para Operar</SelectItem>
                            <SelectItem value="Em Manutenção">Em Manutenção</SelectItem>
                            <SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem>
                            <SelectItem value="Aguardando Conserto">Aguardando Conserto</SelectItem>
                            <SelectItem value="Em Test Ride">Em Test Ride</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-destructive font-medium">
                  ⚠️ Esta ação removerá o contrato e todos os lançamentos pendentes/previstos associados. Requer senha de autorização.
                </p>
              </>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setExcluirContratoOpen(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleConfirmarExclusaoContrato}>
                <Trash2 className="mr-1.5 size-3" />Confirmar Exclusão
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trocar Moto Modal */}
      <Dialog open={trocarMotoOpen} onOpenChange={setTrocarMotoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Trocar Moto</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <p className="text-sm text-muted-foreground">Selecione uma nova moto disponível para substituir a atual.</p>
            <div className="space-y-1.5"><Label>Nova Moto *</Label><Select value={trocarNewMotoId} onValueChange={setTrocarNewMotoId}><SelectTrigger><SelectValue placeholder="Selecione uma moto" /></SelectTrigger><SelectContent>{availableMotos.map((m) => <SelectItem key={m.id} value={m.id}>{m.modelo} — {m.chassi}</SelectItem>)}</SelectContent></Select></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setTrocarMotoOpen(false)}>Cancelar</Button><Button onClick={handleTrocarMoto} disabled={!trocarNewMotoId}>Confirmar Troca</Button></DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Desvincular Moto Modal */}
      <Dialog open={desvincularMotoOpen} onOpenChange={setDesvincularMotoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--motriz-vermelho)]">
              <Unlink className="size-4" />
              Desvincular Moto do Contrato
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="rounded-md border border-[var(--motriz-ambar)]/30 bg-[var(--motriz-ambar)]/5 p-3">
              <p className="text-sm font-medium mb-1">⚠️ Confirmação necessária</p>
              <p className="text-xs text-muted-foreground">
                A moto <strong>{desvincularMotoId ? motoMap.get(desvincularMotoId)?.modelo : ""} {desvincularMotoId ? motoMap.get(desvincularMotoId)?.chassi : ""}</strong> será removida deste contrato e retornará ao estoque. Selecione o novo status abaixo.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Novo Status da Moto *</Label>
              <Select value={desvincularNovoStatus} onValueChange={setDesvincularNovoStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Disponível para Operar">✅ Disponível para Operar</SelectItem>
                  <SelectItem value="Em Manutenção">🔧 Em Manutenção</SelectItem>
                  <SelectItem value="Aguardando Peça">📦 Aguardando Peça</SelectItem>
                  <SelectItem value="Aguardando Conserto">⚙️ Aguardando Conserto</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                "Disponível para Operar" = moto pronta para novo contrato. As outras opções indicam que a moto precisa de atenção antes de voltar à operação.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDesvincularMotoOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleDesvincularMoto}
                disabled={!desvincularMotoId}
                className="bg-[var(--motriz-vermelho)] hover:bg-[var(--motriz-vermelho)]/90"
              >
                <Unlink className="mr-1.5 size-3.5" />
                Confirmar Desvinculação
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Adicionar Moto ao Contrato Modal */}
      <Dialog open={addMotoContratoOpen} onOpenChange={setAddMotoContratoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--motriz-verde-esmeralda)]">
              <Plus className="size-4" />
              Adicionar Moto ao Contrato
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <p className="text-sm text-muted-foreground">
              Selecione uma moto disponível para vincular a este contrato. O status da moto será alterado automaticamente para "Em Contrato".
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Moto Disponível *</Label>
              {(() => {
                const linkedIds = new Set<string>();
                if (editingContrato) for (const id of editingContrato.motosVinculadas) linkedIds.add(id);
                for (const c of contratos) { if (c.status === "Ativo" && c.id !== editingContrato?.id) for (const id of c.motosVinculadas) linkedIds.add(id); }
                const disponiveis = motos.filter((m) => !linkedIds.has(m.id));
                return disponiveis.length === 0
                  ? <p className="text-xs text-muted-foreground italic rounded-md border border-border p-3">Nenhuma moto disponível para vincular.</p>
                  : (
                    <Select value={addMotoSelectedId} onValueChange={setAddMotoSelectedId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma moto" />
                      </SelectTrigger>
                      <SelectContent>
                        {disponiveis.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.modelo} — {m.chassi} ({m.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
              })()}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddMotoContratoOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleAddMotoAoContrato}
                disabled={!addMotoSelectedId}
                className="bg-[var(--motriz-verde-esmeralda)] hover:bg-[var(--motriz-verde-esmeralda)]/90"
              >
                <Plus className="mr-1.5 size-3.5" />
                Adicionar ao Contrato
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vincular Chassi Modal */}
      <Dialog open={vincularChassiOpen} onOpenChange={setVincularChassiOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Vincular Chassi a Contrato</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5"><Label>Chassi da Moto *</Label><Input value={vincularChassiValue} onChange={(e) => setVincularChassiValue(e.target.value)} placeholder="Ex: MH8M3K004" /></div>
            <div className="space-y-1.5"><Label>Contrato *</Label><Select value={vincularChassiContratoId} onValueChange={setVincularChassiContratoId}><SelectTrigger><SelectValue placeholder="Selecione um contrato" /></SelectTrigger><SelectContent>{contratos.filter((c) => c.status === "Ativo").map((c) => <SelectItem key={c.id} value={c.id}>{c.numeroContrato || c.id.slice(0, 6)} — {formatCurrency(c.valorMensalTotal)}/mês</SelectItem>)}</SelectContent></Select></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setVincularChassiOpen(false)}>Cancelar</Button><Button onClick={handleVincularChassi} disabled={!vincularChassiValue.trim() || !vincularChassiContratoId}>Vincular</Button></DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TAB B2: TEST RIDES ATIVOS
   ══════════════════════════════════════════════════════════ */
function TestRidesAtivos() {
  const testRides = useStore((s) => s.testRides);
  const addTestRide = useStore((s) => s.addTestRide);
  const updateTestRide = useStore((s) => s.updateTestRide);
  const removeTestRide = useStore((s) => s.removeTestRide);
  const finalizarTestRide = useStore((s) => s.finalizarTestRide);
  const motos = useStore((s) => s.motos);
  const clientes = useStore((s) => s.clientes);
  const addCliente = useStore((s) => s.addCliente);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTR, setEditingTR] = useState<TestRide | null>(null);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [finalizingTR, setFinalizingTR] = useState<TestRide | null>(null);
  const [statusRetornoSelect, setStatusRetornoSelect] = useState<string>("Disponível para Operar");

  // Form state
  const [formClienteId, setFormClienteId] = useState("");
  const [formNovoCliente, setFormNovoCliente] = useState(false);
  const [formNomeCliente, setFormNomeCliente] = useState("");
  const [formCnpjCliente, setFormCnpjCliente] = useState("");
  const [formMotosSelecionadas, setFormMotosSelecionadas] = useState<string[]>([]);
  const [formDataInicio, setFormDataInicio] = useState("");
  const [formDataPrevisao, setFormDataPrevisao] = useState("");
  const [formLocalOperacaoId, setFormLocalOperacaoId] = useState("");
  const [formObservacoes, setFormObservacoes] = useState("");

  // Substituir veículo
  const [substituirDialogOpen, setSubstituirDialogOpen] = useState(false);
  const [substituirTRId, setSubstituirTRId] = useState("");
  const [substituirMotoOldId, setSubstituirMotoOldId] = useState("");

  // Confirmar remoção
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [removingTRId, setRemovingTRId] = useState("");
  const [removeStatusRetorno, setRemoveStatusRetorno] = useState<string>("Disponível para Operar");

  const testRidesAtivos = useMemo(() => testRides.filter((tr) => tr.status === "Ativo"), [testRides]);

  // Motos disponíveis para test ride (status "Disponível para Operar" ou já vinculadas ao TR sendo editado)
  const motosDisponiveis = useMemo(() => {
    const motosEmOutroTR = new Set<string>();
    for (const tr of testRidesAtivos) {
      if (editingTR && tr.id === editingTR.id) continue;
      for (const mid of tr.motosVinculadas) motosEmOutroTR.add(mid);
    }
    return motos.filter((m) =>
      (m.status === "Disponível para Operar" || m.status === "Em Test Ride") && !motosEmOutroTR.has(m.id)
    );
  }, [motos, testRidesAtivos, editingTR]);

  function resetForm() {
    setFormClienteId(""); setFormNovoCliente(false); setFormNomeCliente(""); setFormCnpjCliente("");
    setFormMotosSelecionadas([]); setFormDataInicio(new Date().toISOString().split("T")[0]);
    setFormDataPrevisao(""); setFormLocalOperacaoId(""); setFormObservacoes("");
  }

  function openAdd() { setEditingTR(null); resetForm(); setDialogOpen(true); }

  function openEdit(tr: TestRide) {
    setEditingTR(tr);
    setFormClienteId(tr.clienteId);
    setFormNovoCliente(false);
    const cli = clientes.find((c) => c.id === tr.clienteId);
    setFormNomeCliente(cli?.nome || "");
    setFormCnpjCliente(cli?.cnpj || "");
    setFormMotosSelecionadas([...tr.motosVinculadas]);
    setFormDataInicio(tr.dataInicio instanceof Date ? tr.dataInicio.toISOString().split("T")[0] : String(tr.dataInicio).split("T")[0]);
    setFormDataPrevisao(tr.dataPrevisaoRetorno ? (tr.dataPrevisaoRetorno instanceof Date ? tr.dataPrevisaoRetorno.toISOString().split("T")[0] : String(tr.dataPrevisaoRetorno).split("T")[0]) : "");
    setFormLocalOperacaoId(tr.localOperacaoId || "");
    setFormObservacoes(tr.observacoes || "");
    setDialogOpen(true);
  }

  function toggleMoto(motoId: string) {
    setFormMotosSelecionadas((prev) => prev.includes(motoId) ? prev.filter((id) => id !== motoId) : [...prev, motoId]);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validação depende do modo: cliente existente vs novo
    if (!formNovoCliente && !editingTR) {
      if (!formClienteId) { toast.error("Selecione um cliente existente"); return; }
    } else {
      if (!formNomeCliente.trim()) { toast.error("Informe o nome do cliente"); return; }
    }
    if (formMotosSelecionadas.length === 0) { toast.error("Selecione pelo menos uma moto"); return; }

    let clienteId = formClienteId;

    // Criar novo cliente se necessário (modo "Novo Cliente" ou edição sem cliente vinculado)
    if (formNovoCliente || (!editingTR && !clienteId)) {
      const novoCliente: Cliente = {
        id: generateId(),
        nome: formNomeCliente.trim(),
        cnpj: formCnpjCliente.trim() || undefined,
        tipo: "PJ",
        locaisOperacao: [],
      };
      addCliente(novoCliente);
      clienteId = novoCliente.id;
    }

    if (editingTR) {
      // Verificar motos removidas — retornar ao estoque
      const removedMotos = editingTR.motosVinculadas.filter((id) => !formMotosSelecionadas.includes(id));
      for (const mid of removedMotos) {
        const moto = motos.find((m) => m.id === mid);
        if (moto && moto.status === "Em Test Ride") {
          useStore.getState().updateMoto(mid, { status: "Disponível para Operar" });
        }
      }
      updateTestRide(editingTR.id, {
        clienteId,
        motosVinculadas: formMotosSelecionadas,
        dataInicio: new Date(formDataInicio),
        dataPrevisaoRetorno: formDataPrevisao ? new Date(formDataPrevisao) : undefined,
        localOperacaoId: formLocalOperacaoId || undefined,
        observacoes: formObservacoes || undefined,
      });
      // Atualizar status das motos novas para "Em Test Ride"
      const newMotos = formMotosSelecionadas.filter((id) => !editingTR.motosVinculadas.includes(id));
      for (const mid of newMotos) {
        useStore.getState().updateMoto(mid, { status: "Em Test Ride", localizacao: "Cliente" });
      }
      toast.success("Test Ride atualizado");
    } else {
      const tr: TestRide = {
        id: generateId(),
        clienteId,
        motosVinculadas: formMotosSelecionadas,
        dataInicio: new Date(formDataInicio),
        dataPrevisaoRetorno: formDataPrevisao ? new Date(formDataPrevisao) : undefined,
        localOperacaoId: formLocalOperacaoId || undefined,
        observacoes: formObservacoes || undefined,
        status: "Ativo",
      };
      addTestRide(tr);
      toast.success("Test Ride criado");
    }
    setDialogOpen(false); setEditingTR(null);
  }

  function handleRemove(id: string) {
    setRemovingTRId(id);
    setRemoveStatusRetorno("Disponível para Operar");
    setConfirmRemoveOpen(true);
  }

  function confirmRemove() {
    if (!removingTRId) return;
    const tr = testRides.find((t) => t.id === removingTRId);
    if (tr) {
      // Atualizar status das motos antes de remover
      for (const motoId of tr.motosVinculadas) {
        useStore.getState().updateMoto(motoId, { status: removeStatusRetorno as Moto["status"], localizacao: "Galpão" });
      }
    }
    removeTestRide(removingTRId);
    setConfirmRemoveOpen(false);
    setRemovingTRId("");
    toast.success("Test Ride removido — motos retornaram ao estoque");
  }

  function openFinalize(tr: TestRide) {
    setFinalizingTR(tr);
    setStatusRetornoSelect("Disponível para Operar");
    setFinalizeDialogOpen(true);
  }

  function handleFinalize() {
    if (!finalizingTR) return;
    finalizarTestRide(finalizingTR.id, statusRetornoSelect as Moto["status"]);
    setFinalizeDialogOpen(false); setFinalizingTR(null);
    toast.success("Test Ride finalizado — motos retornaram ao estoque");
  }

  function openSubstituir(trId: string, motoOldId: string) {
    setSubstituirTRId(trId); setSubstituirMotoOldId(motoOldId); setSubstituirDialogOpen(true);
  }

  function handleSubstituir(novaMotoId: string) {
    const tr = testRides.find((t) => t.id === substituirTRId);
    if (!tr) return;
    // Retornar moto antiga ao estoque
    useStore.getState().updateMoto(substituirMotoOldId, { status: "Disponível para Operar" });
    // Vincular nova moto
    const novasMotos = tr.motosVinculadas.map((id) => id === substituirMotoOldId ? novaMotoId : id);
    updateTestRide(substituirTRId, { motosVinculadas: novasMotos });
    useStore.getState().updateMoto(novaMotoId, { status: "Em Test Ride" });
    setSubstituirDialogOpen(false);
    toast.success("Veículo substituído no Test Ride");
  }

  function handleDesvincularMoto(trId: string, motoId: string) {
    const tr = testRides.find((t) => t.id === trId);
    if (!tr) return;
    if (tr.motosVinculadas.length <= 1) { toast.error("O Test Ride precisa ter pelo menos 1 moto"); return; }
    const novasMotos = tr.motosVinculadas.filter((id) => id !== motoId);
    updateTestRide(trId, { motosVinculadas: novasMotos });
    useStore.getState().updateMoto(motoId, { status: "Disponível para Operar" });
    toast.success("Moto desvinculada do Test Ride");
  }

  // Locais de operação de todos os clientes
  const todosLocais = useMemo(() => {
    const locs: { id: string; nome: string; clienteNome: string }[] = [];
    for (const c of clientes) {
      for (const l of (c.locaisOperacao || [])) {
        locs.push({ id: l.id, nome: l.nome, clienteNome: c.nome });
      }
    }
    return locs;
  }, [clientes]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-5"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-lg bg-purple-500/10"><TestTube2 className="size-5 text-purple-500" /></div><div><p className="text-2xl font-bold tabular-nums">{testRidesAtivos.length}</p><p className="text-xs text-muted-foreground">Test Rides Ativos</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10"><Bike className="size-5 text-blue-500" /></div><div><p className="text-2xl font-bold tabular-nums">{testRidesAtivos.reduce((acc, tr) => acc + tr.motosVinculadas.length, 0)}</p><p className="text-xs text-muted-foreground">Motos em Test Ride</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10"><Users className="size-5 text-emerald-500" /></div><div><p className="text-2xl font-bold tabular-nums">{new Set(testRidesAtivos.map((tr) => tr.clienteId)).size}</p><p className="text-xs text-muted-foreground">Clientes em Avaliação</p></div></div></CardContent></Card>
      </div>

      {/* Add button */}
      <div className="flex justify-end">
        <Button size="sm" onClick={openAdd}><Plus className="mr-1.5 size-3.5" />Novo Test Ride</Button>
      </div>

      {/* Lista de Test Rides Ativos */}
      {testRidesAtivos.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><TestTube2 className="mx-auto mb-3 size-8 opacity-30" /><p>Nenhum Test Ride ativo no momento.</p><p className="text-xs mt-1">Crie um novo Test Ride para vincular motos a clientes em avaliação.</p></CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {testRidesAtivos.map((tr) => {
            const cliente = clientes.find((c) => c.id === tr.clienteId);
            const trMotos = tr.motosVinculadas.map((mid) => motos.find((m) => m.id === mid)).filter(Boolean) as Moto[];
            const local = todosLocais.find((l) => l.id === tr.localOperacaoId);
            return (
              <Card key={tr.id} className="border-purple-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{cliente?.nome || "Cliente não encontrado"}</h3>
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[10px]">Test Ride</Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><CalendarClock className="size-3" />Início: {formatDate(tr.dataInicio)}</span>
                        {tr.dataPrevisaoRetorno && <span className="flex items-center gap-1"><Flag className="size-3" />Previsão retorno: {formatDate(tr.dataPrevisaoRetorno)}</span>}
                        {local && <span className="flex items-center gap-1"><MapPin className="size-3" />{local.nome}</span>}
                      </div>
                      {tr.observacoes && <p className="mt-1 text-xs text-muted-foreground italic">{tr.observacoes}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                      {tr.dataPrevisaoRetorno && (() => {
                        const hoje = new Date();
                        hoje.setHours(0, 0, 0, 0);
                        const previsao = new Date(tr.dataPrevisaoRetorno);
                        previsao.setHours(0, 0, 0, 0);
                        const atrasado = previsao < hoje;
                        return atrasado ? (
                          <button type="button" onClick={() => openFinalize(tr)} className="inline-flex items-center gap-1 rounded-md bg-[var(--motriz-ambar)] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[var(--motriz-ambar)]/90" title="Prazo vencido — finalizar Test Ride e devolver moto ao estoque"><AlertTriangle className="size-3" />Finalizar</button>
                        ) : (
                          <button type="button" onClick={() => openFinalize(tr)} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-700" title="Concluir Test Ride — moto volta ao estoque"><CheckCircle2 className="size-3" />Concluído</button>
                        );
                      })()}
                      <button type="button" onClick={() => openEdit(tr)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Editar"><Pencil className="size-3.5" /></button>
                      <button type="button" onClick={() => openFinalize(tr)} className="rounded p-1.5 text-emerald-600 hover:bg-emerald-500/10" title="Finalizar Test Ride"><RotateCcw className="size-3.5" /></button>
                      <button type="button" onClick={() => handleRemove(tr.id)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive" title="Remover"><Trash2 className="size-3.5" /></button>
                    </div>
                  </div>

                  {/* Motos vinculadas */}
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Motos em Test Ride</p>
                    {trMotos.map((moto) => (
                      <div key={moto.id} className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Bike className="size-3.5 text-purple-500" />
                          <span className="text-xs font-medium">{moto.modelo}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{moto.chassi}</span>
                          {moto.cor && <Badge variant="outline" className="text-[9px] h-4 px-1.5">{moto.cor}</Badge>}
                        </div>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => openSubstituir(tr.id, moto.id)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Substituir veículo"><ArrowLeftRight className="size-3" /></button>
                          <button type="button" onClick={() => handleDesvincularMoto(tr.id, moto.id)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive" title="Desvincular moto"><Unlink className="size-3" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog: Criar/Editar Test Ride */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingTR ? "Editar Test Ride" : "Novo Test Ride"}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="grid gap-4 py-2">
            {/* Cliente */}
            <div className="space-y-2">
              <Label>Cliente *</Label>
              {!editingTR && (
                <div className="flex gap-2 mb-2">
                  <button type="button" onClick={() => { setFormNovoCliente(false); setFormClienteId(""); }} className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${!formNovoCliente ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>Cliente Existente</button>
                  <button type="button" onClick={() => { setFormNovoCliente(true); setFormClienteId(""); }} className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${formNovoCliente ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>Novo Cliente</button>
                </div>
              )}
              {formNovoCliente || editingTR ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs">Nome *</Label><Input value={formNomeCliente} onChange={(e) => setFormNomeCliente(e.target.value)} placeholder="Nome do cliente" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">CNPJ</Label><Input value={formCnpjCliente} onChange={(e) => setFormCnpjCliente(e.target.value)} placeholder="00.000.000/0000-00" /></div>
                </div>
              ) : (
                <Select value={formClienteId} onValueChange={setFormClienteId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}{c.cnpj ? ` (${c.cnpj})` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Motos */}
            <div className="space-y-2">
              <Label>Motos em Test Ride * <span className="text-muted-foreground font-normal">({formMotosSelecionadas.length} selecionadas)</span></Label>
              <div className="max-h-40 overflow-y-auto rounded-md border border-border p-2 space-y-1">
                {motosDisponiveis.length === 0 ? <p className="text-xs text-muted-foreground py-2 text-center">Nenhuma moto disponível para Test Ride</p> :
                  motosDisponiveis.map((moto) => (
                    <label key={moto.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted cursor-pointer text-xs">
                      <input type="checkbox" checked={formMotosSelecionadas.includes(moto.id)} onChange={() => toggleMoto(moto.id)} className="rounded border-border" />
                      <Bike className="size-3 text-purple-500" />
                      <span className="font-medium">{moto.modelo}</span>
                      <span className="text-muted-foreground font-mono text-[10px]">{moto.chassi}</span>
                      {moto.cor && <span className="text-muted-foreground">· {moto.cor}</span>}
                    </label>
                  ))
                }
              </div>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Data Início *</Label><Input type="date" value={formDataInicio} onChange={(e) => setFormDataInicio(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Previsão Retorno</Label><Input type="date" value={formDataPrevisao} onChange={(e) => setFormDataPrevisao(e.target.value)} /></div>
            </div>

            {/* Local */}
            <div className="space-y-1.5">
              <Label>Local de Operação</Label>
              <Select value={formLocalOperacaoId || "__none__"} onValueChange={(v) => setFormLocalOperacaoId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione um local (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {todosLocais.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome} ({l.clienteNome})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Observações */}
            <div className="space-y-1.5"><Label>Observações</Label><Input value={formObservacoes} onChange={(e) => setFormObservacoes(e.target.value)} placeholder="Detalhes adicionais do Test Ride" /></div>

            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit">{editingTR ? "Salvar Alterações" : "Criar Test Ride"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Finalizar Test Ride */}
      <Dialog open={finalizeDialogOpen} onOpenChange={setFinalizeDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Finalizar Test Ride</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <p className="text-sm text-muted-foreground">As motos voltarão ao estoque. Selecione o status de retorno:</p>
            <Select value={statusRetornoSelect} onValueChange={setStatusRetornoSelect}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Disponível para Operar">Disponível para Operar</SelectItem>
                <SelectItem value="Em Manutenção">Em Manutenção</SelectItem>
                <SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem>
                <SelectItem value="Aguardando Conserto">Aguardando Conserto</SelectItem>
              </SelectContent>
            </Select>
            {finalizingTR && (
              <div className="rounded-md bg-muted/50 p-3 space-y-1">
                <p className="text-xs font-medium">Cliente: {clientes.find((c) => c.id === finalizingTR.clienteId)?.nome}</p>
                <p className="text-xs text-muted-foreground">Motos: {finalizingTR.motosVinculadas.map((mid) => motos.find((m) => m.id === mid)?.chassi).join(", ")}</p>
              </div>
            )}
            <DialogFooter><Button type="button" variant="outline" onClick={() => setFinalizeDialogOpen(false)}>Cancelar</Button><Button type="button" onClick={handleFinalize} className="bg-emerald-600 hover:bg-emerald-700">Finalizar e Retornar Motos</Button></DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Substituir Veículo */}
      <Dialog open={substituirDialogOpen} onOpenChange={setSubstituirDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Substituir Veículo no Test Ride</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <p className="text-xs text-muted-foreground">Moto atual: <strong>{motos.find((m) => m.id === substituirMotoOldId)?.chassi}</strong> — será devolvida ao estoque.</p>
            <Label>Nova Moto</Label>
            <div className="max-h-48 overflow-y-auto rounded-md border border-border p-2 space-y-1">
              {motosDisponiveis.filter((m) => m.id !== substituirMotoOldId).map((moto) => (
                <button key={moto.id} type="button" onClick={() => handleSubstituir(moto.id)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-muted text-xs text-left">
                  <Bike className="size-3 text-purple-500" />
                  <span className="font-medium">{moto.modelo}</span>
                  <span className="text-muted-foreground font-mono text-[10px]">{moto.chassi}</span>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar Remoção */}
      <Dialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Remover Test Ride</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <p className="text-sm text-muted-foreground">Tem certeza que deseja remover este Test Ride? Selecione o status de retorno das motos:</p>
            <Select value={removeStatusRetorno} onValueChange={setRemoveStatusRetorno}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Disponível para Operar">Disponível para Operar</SelectItem>
                <SelectItem value="Em Manutenção">Em Manutenção</SelectItem>
                <SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem>
                <SelectItem value="Aguardando Conserto">Aguardando Conserto</SelectItem>
              </SelectContent>
            </Select>
            {removingTRId && (() => {
              const tr = testRides.find((t) => t.id === removingTRId);
              const cli = tr ? clientes.find((c) => c.id === tr.clienteId) : null;
              return tr ? (
                <div className="rounded-md bg-muted/50 p-3 space-y-1">
                  <p className="text-xs font-medium">Cliente: {cli?.nome || "—"}</p>
                  <p className="text-xs text-muted-foreground">Motos: {tr.motosVinculadas.map((mid) => motos.find((m) => m.id === mid)?.chassi).join(", ")}</p>
                </div>
              ) : null;
            })()}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirmRemoveOpen(false)}>Cancelar</Button>
              <Button type="button" variant="destructive" onClick={confirmRemove}>Sim, Remover</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TAB C: ESTOQUE DE PEÇAS
   ══════════════════════════════════════════════════════════ */
function EstoquePecas() {
  const pecas = useStore((s) => s.pecas);
  const addPeca = useStore((s) => s.addPeca);
  const updatePeca = useStore((s) => s.updatePeca);
  const removePeca = useStore((s) => s.removePeca);
  const contratos = useStore((s) => s.contratos);
  const clientes = useStore((s) => s.clientes);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPeca, setEditingPeca] = useState<PecaEstoque | null>(null);
  const [categoriaSelect, setCategoriaSelect] = useState("");
  const [filterCategoria, setFilterCategoria] = useState<string>("todas");

  // Painel de Peças Locadas — extrair todas as locações extras do tipo "Peça Estoque" dos contratos ativos
  const pecasLocadas = useMemo(() => {
    const resultado: {
      pecaId: string;
      pecaNome: string;
      categoria: string;
      custoUnitario: number;
      quantidadeAlugada: number;
      valorAluguel: number;
      lucroMensal: number;
      contratoId: string;
      contratoNumero: string;
      clienteNome: string;
      localNome: string;
      dataInicio: Date;
      mesesAtivos: number;
      lucroAcumulado: number;
    }[] = [];
    const hoje = new Date();
    for (const contrato of contratos) {
      if (contrato.status !== "Ativo") continue;
      const cliente = clientes.find((c) => c.id === contrato.clienteId);
      for (const extra of (contrato.locacoesExtras || [])) {
        if (extra.tipo !== "Peça Estoque" || !extra.pecaEstoqueId) continue;
        const peca = pecas.find((p) => p.id === extra.pecaEstoqueId);
        if (!peca) continue;
        const qtd = extra.quantidadeAlugada || 1;
        // Resolver nome do local de operação
        let localNome = "—";
        if (extra.localOperacaoId && cliente) {
          const local = (cliente.locaisOperacao || []).find((l) => l.id === extra.localOperacaoId);
          if (local) localNome = local.nome;
        }
        // Calcular meses ativos desde o início do contrato até hoje
        const inicio = new Date(contrato.dataInicio);
        const mesesAtivos = Math.max(0, (hoje.getFullYear() - inicio.getFullYear()) * 12 + (hoje.getMonth() - inicio.getMonth()));
        // Lucro mensal = receita total - (custo unitário × quantidade alugada)
        const custoTotalMensal = (peca.custoUnitario || 0) * qtd;
        const lucroMensal = (extra.valorMensal || 0) - custoTotalMensal;
        const lucroAcumulado = lucroMensal * mesesAtivos;
        resultado.push({
          pecaId: peca.id,
          pecaNome: peca.nome,
          categoria: peca.categoria,
          custoUnitario: peca.custoUnitario || 0,
          quantidadeAlugada: qtd,
          valorAluguel: extra.valorMensal || 0,
          lucroMensal,
          contratoId: contrato.id,
          contratoNumero: contrato.numeroContrato || contrato.id.slice(0, 6),
          clienteNome: cliente?.nome || "Cliente",
          localNome,
          dataInicio: contrato.dataInicio,
          mesesAtivos,
          lucroAcumulado,
        });
      }
    }
    return resultado;
  }, [contratos, clientes, pecas]);

  const totalLucroPecasLocadas = useMemo(() => pecasLocadas.reduce((acc, p) => acc + p.lucroAcumulado, 0), [pecasLocadas]);
  const totalLucroMensalPecas = useMemo(() => pecasLocadas.reduce((acc, p) => acc + p.lucroMensal, 0), [pecasLocadas]);
  const totalReceitaPecasLocadas = useMemo(() => pecasLocadas.reduce((acc, p) => acc + p.valorAluguel, 0), [pecasLocadas]);

  const form = useForm<PecaFormValues>({
    resolver: zodResolver(pecaSchema) as any,
    defaultValues: { nome: "", categoria: "", quantidade: 0, quantidadeMinima: 0, custoUnitario: 0, fornecedor: "", observacoes: "" },
  });

  const filteredPecas = useMemo(() => {
    if (filterCategoria === "todas") return pecas;
    return pecas.filter((p) => p.categoria === filterCategoria);
  }, [pecas, filterCategoria]);

  const pecasAbaixoMinimo = useMemo(() => pecas.filter((p) => p.quantidadeMinima != null && p.quantidade < p.quantidadeMinima), [pecas]);
  const valorTotalEstoque = useMemo(() => pecas.reduce((acc, p) => acc + (p.custoUnitario || 0) * p.quantidade, 0), [pecas]);

  function openAdd() { setEditingPeca(null); form.reset({ nome: "", categoria: "", quantidade: 0, quantidadeMinima: 0, custoUnitario: 0, fornecedor: "", observacoes: "" }); setCategoriaSelect(""); setDialogOpen(true); }
  function openEdit(peca: PecaEstoque) { setEditingPeca(peca); form.reset({ nome: peca.nome, categoria: peca.categoria, quantidade: peca.quantidade, quantidadeMinima: peca.quantidadeMinima || 0, custoUnitario: peca.custoUnitario || 0, fornecedor: peca.fornecedor || "", observacoes: peca.observacoes || "" }); setCategoriaSelect(peca.categoria); setDialogOpen(true); }

  function onSubmit(values: PecaFormValues) {
    try {
      if (editingPeca) {
        updatePeca(editingPeca.id, { nome: values.nome, categoria: values.categoria, quantidade: values.quantidade, quantidadeMinima: values.quantidadeMinima || undefined, custoUnitario: values.custoUnitario || undefined, fornecedor: values.fornecedor || undefined, observacoes: values.observacoes || undefined });
        toast.success("Peça atualizada");
      } else {
        addPeca({ id: generateId(), nome: values.nome, categoria: values.categoria, quantidade: values.quantidade, quantidadeMinima: values.quantidadeMinima || undefined, custoUnitario: values.custoUnitario || undefined, fornecedor: values.fornecedor || undefined, observacoes: values.observacoes || undefined });
        toast.success("Peça adicionada");
      }
      setDialogOpen(false); setEditingPeca(null);
    } catch { toast.error("Erro ao salvar peça"); }
  }

  function handleRemove(id: string) { if (!confirm("Remover esta peça?")) return; removePeca(id); toast.success("Peça removida"); }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-5"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10"><Package className="size-5 text-blue-500" /></div><div><p className="text-2xl font-bold tabular-nums">{pecas.length}</p><p className="text-xs text-muted-foreground">Itens Cadastrados</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-lg bg-[var(--motriz-verde-esmeralda)]/10"><BarChart3 className="size-5 text-[var(--motriz-verde-esmeralda)]" /></div><div><p className="text-2xl font-bold tabular-nums">{formatCurrency(valorTotalEstoque)}</p><p className="text-xs text-muted-foreground">Valor Total em Estoque</p></div></div></CardContent></Card>
        <Card className={pecasAbaixoMinimo.length > 0 ? "border-[var(--motriz-vermelho)]/30" : ""}><CardContent className="pt-5"><div className="flex items-center gap-3"><div className={`flex size-10 items-center justify-center rounded-lg ${pecasAbaixoMinimo.length > 0 ? "bg-[var(--motriz-vermelho)]/10" : "bg-muted"}`}><AlertTriangle className={`size-5 ${pecasAbaixoMinimo.length > 0 ? "text-[var(--motriz-vermelho)]" : "text-muted-foreground"}`} /></div><div><p className="text-2xl font-bold tabular-nums">{pecasAbaixoMinimo.length}</p><p className="text-xs text-muted-foreground">Abaixo do Mínimo</p></div></div></CardContent></Card>
      </div>

      {/* Filters + Add */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-border">
          <button type="button" onClick={() => setFilterCategoria("todas")} className={`px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-md ${filterCategoria === "todas" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>Todas</button>
          {PECA_CATEGORIAS.map((cat) => (
            <button key={cat} type="button" onClick={() => setFilterCategoria(cat)} className={`px-3 py-1.5 text-xs font-medium transition-colors last:rounded-r-md ${filterCategoria === cat ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>{cat}</button>
          ))}
        </div>
        <Button size="sm" onClick={openAdd}><Plus className="mr-1.5 size-3.5" />Nova Peça</Button>
      </div>

      {/* Alertas */}
      {pecasAbaixoMinimo.length > 0 && (
        <Card className="border-[var(--motriz-vermelho)]/20 bg-[var(--motriz-vermelho)]/5">
          <CardContent className="pt-4">
            <p className="text-xs font-semibold text-[var(--motriz-vermelho)] mb-2 flex items-center gap-1.5"><AlertTriangle className="size-3.5" />Peças Abaixo do Estoque Mínimo</p>
            <div className="flex flex-wrap gap-2">
              {pecasAbaixoMinimo.map((p) => (
                <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-[var(--motriz-vermelho)]/10 px-2.5 py-1 text-[11px] font-medium text-[var(--motriz-vermelho)]">{p.nome} ({p.quantidade}/{p.quantidadeMinima})</span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Peças */}
      {filteredPecas.length === 0 ? <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma peça encontrada.</CardContent></Card> : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPecas.map((peca) => {
            const abaixoMinimo = peca.quantidadeMinima != null && peca.quantidade < peca.quantidadeMinima;
            return (
              <Card key={peca.id} className={abaixoMinimo ? "border-[var(--motriz-vermelho)]/30" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">{peca.nome}</p>
                      <p className="text-[10px] text-muted-foreground">{peca.categoria}</p>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => openEdit(peca)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="size-3" /></button>
                      <button type="button" onClick={() => handleRemove(peca.id)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 className="size-3" /></button>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div><p className="text-muted-foreground">Quantidade</p><p className={`font-bold tabular-nums ${abaixoMinimo ? "text-[var(--motriz-vermelho)]" : ""}`}>{peca.quantidade}{peca.quantidadeMinima != null && <span className="text-muted-foreground font-normal"> / mín {peca.quantidadeMinima}</span>}</p></div>
                    <div><p className="text-muted-foreground">Custo Unit.</p><p className="font-medium tabular-nums">{peca.custoUnitario ? formatCurrency(peca.custoUnitario) : "—"}</p></div>
                  </div>
                  {peca.fornecedor && <p className="mt-1 text-[10px] text-muted-foreground">Fornecedor: {peca.fornecedor}</p>}
                  {peca.observacoes && <p className="mt-1 text-[10px] text-muted-foreground italic">{peca.observacoes}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Painel de Peças Locadas — sempre visível */}
      <Card className="border-[var(--motriz-ambar)]/30 bg-[var(--motriz-ambar)]/5">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <p className="text-sm font-semibold text-[var(--motriz-ambar)] flex items-center gap-1.5">
              <Package className="size-4" />
              Peças Locadas ({pecasLocadas.length})
            </p>
            {pecasLocadas.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span className="text-muted-foreground">Receita/mês: <strong className="text-foreground tabular-nums">{formatCurrency(totalReceitaPecasLocadas)}</strong></span>
                <span className="text-muted-foreground">Lucro/mês: <strong className={`tabular-nums ${totalLucroMensalPecas >= 0 ? 'text-[var(--motriz-verde-esmeralda)]' : 'text-[var(--motriz-vermelho)]'}`}>{formatCurrency(totalLucroMensalPecas)}</strong></span>
                <span className="text-muted-foreground">Lucro acumulado: <strong className={`tabular-nums ${totalLucroPecasLocadas >= 0 ? 'text-[var(--motriz-verde-esmeralda)]' : 'text-[var(--motriz-vermelho)]'}`}>{formatCurrency(totalLucroPecasLocadas)}</strong></span>
              </div>
            )}
          </div>
          {pecasLocadas.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2 text-center">Nenhuma peça locada no momento. Adicione peças do estoque como "Locação Extra" nos contratos para vê-las aqui.</p>
          ) : (
            <div className="space-y-2">
              {pecasLocadas.map((item, idx) => (
                <div key={`${item.contratoId}-${item.pecaId}-${idx}`} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded border border-border bg-background p-2.5 text-xs">
                  <div className="flex size-8 items-center justify-center rounded bg-[var(--motriz-ambar)]/10 shrink-0 self-start">
                    <Package className="size-4 text-[var(--motriz-ambar)]" />
                  </div>
                  <div className="flex-1 min-w-0 grid grid-cols-2 lg:grid-cols-5 gap-x-4 gap-y-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Peça</p>
                      <p className="font-medium truncate">{item.pecaNome} {item.quantidadeAlugada > 1 ? <span className="text-[var(--motriz-ambar)] font-bold">×{item.quantidadeAlugada}</span> : ""}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Contrato / Cliente</p>
                      <p className="font-medium truncate">{item.contratoNumero} — {item.clienteNome}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Local</p>
                      <p className="font-medium truncate">{item.localNome}</p>
                    </div>
                    <div className="col-span-2 lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:text-right">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Aluguel</p>
                        <p className="font-bold tabular-nums text-[var(--motriz-ambar)]">{formatCurrency(item.valorAluguel)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Custo ({item.quantidadeAlugada}×)</p>
                        <p className="tabular-nums text-muted-foreground">{formatCurrency(item.custoUnitario * item.quantidadeAlugada)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Lucro/mês</p>
                        <p className={`font-bold tabular-nums ${item.lucroMensal >= 0 ? 'text-[var(--motriz-verde-esmeralda)]' : 'text-[var(--motriz-vermelho)]'}`}>{formatCurrency(item.lucroMensal)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Acum. ({item.mesesAtivos}m)</p>
                        <p className={`font-bold tabular-nums ${item.lucroAcumulado >= 0 ? 'text-[var(--motriz-verde-esmeralda)]' : 'text-[var(--motriz-vermelho)]'}`}>{formatCurrency(item.lucroAcumulado)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Peça Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingPeca ? "Editar Peça" : "Nova Peça"}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-2">
            <div className="space-y-1.5"><Label>Nome da Peça *</Label><Input {...form.register("nome")} placeholder="Ex: Bateria 60V 20Ah" />{form.formState.errors.nome && <p className="text-xs text-destructive">{form.formState.errors.nome.message}</p>}</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Categoria *</Label><Select value={categoriaSelect} onValueChange={(v) => { setCategoriaSelect(v); form.setValue("categoria", v); }}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{PECA_CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Quantidade *</Label><Input type="number" min="0" {...form.register("quantidade")} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Qtd. Mínima (alerta)</Label><Input type="number" min="0" {...form.register("quantidadeMinima")} /></div>
              <div className="space-y-1.5"><Label>Custo Unitário (R$)</Label><Input type="number" step="0.01" min="0" {...form.register("custoUnitario")} /></div>
            </div>
            <div className="space-y-1.5"><Label>Fornecedor</Label><Input {...form.register("fornecedor")} placeholder="Nome do fornecedor" /></div>
            <div className="space-y-1.5"><Label>Observações</Label><Input {...form.register("observacoes")} placeholder="Detadicionais" /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit">{editingPeca ? "Salvar Alterações" : "Salvar Peça"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════════════ */
export default function FrotaContratosPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Frota & Contratos</h1>
      <Tabs defaultValue="estoque">
        <TabsList>
          <TabsTrigger value="estoque" className="gap-1.5"><Bike className="size-3.5" />Estoque de Motos</TabsTrigger>
          <TabsTrigger value="contratos" className="gap-1.5"><Users className="size-3.5" />Contratos</TabsTrigger>
          <TabsTrigger value="testrides" className="gap-1.5"><TestTube2 className="size-3.5" />Test Rides</TabsTrigger>
          <TabsTrigger value="pecas" className="gap-1.5"><Package className="size-3.5" />Estoque de Peças</TabsTrigger>
        </TabsList>
        <TabsContent value="estoque" className="mt-4"><EstoqueMotos /></TabsContent>
        <TabsContent value="contratos" className="mt-4"><ContratosAtivos /></TabsContent>
        <TabsContent value="testrides" className="mt-4"><TestRidesAtivos /></TabsContent>
        <TabsContent value="pecas" className="mt-4"><EstoquePecas /></TabsContent>
      </Tabs>
    </div>
  );
}