"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Wrench, AlertTriangle, Plus, Trash2, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { generateId, formatCurrency } from "@/lib/utils";
import type { TipoVisitaTecnico, CategoriaCustoVisita, LancamentoFinanceiro, PecaEstoque } from "@/types";

interface PecaSelecionada {
  pecaId: string;
  quantidade: number;
}

const TIPOS_VISITA: TipoVisitaTecnico[] = [
  "Contrato Ativo",
  "Test Ride",
  "Inesperada",
  "Manutenção Preventiva",
  "Manutenção Corretiva",
];

const CATEGORIAS_CUSTO: CategoriaCustoVisita[] = [
  "Mão de Obra",
  "Gasolina/Transporte",
  "Peças",
  "Ferramentas",
  "Outros",
];

const FORMAS_PAGAMENTO = ["PIX", "Boleto", "Cartão", "Transferência", "Dinheiro", "Outros"] as const;
const STATUSES = ["Pago", "Pendente", "Previsto"] as const;

const visitaSchema = z.object({
  tipoVisita: z.enum(["Contrato Ativo", "Test Ride", "Inesperada", "Manutenção Preventiva", "Manutenção Corretiva"]),
  categoriaCustoVisita: z.enum(["Mão de Obra", "Gasolina/Transporte", "Peças", "Ferramentas", "Outros"]),
  valor: z.preprocess(
    (v) => (typeof v === "string" ? (v === "" ? 0 : parseFloat(v.replace(",", "."))) : Number(v) || 0),
    z.number().min(0.01, "Valor deve ser maior que zero")
  ),
  data: z.string().min(1, "Data é obrigatória"),
  tecnicoResponsavel: z.string().min(2, "Nome do técnico é obrigatório"),
  contratoId: z.string().optional().or(z.literal("")),
  ehMauUso: z.boolean().default(false),
  valorCobrarCliente: z.preprocess(
    (v) => (typeof v === "string" ? (v === "" ? undefined : parseFloat(v.replace(",", ".")) || undefined) : (v != null ? Number(v) || undefined : undefined)),
    z.number().optional()
  ),
  observacoesVisita: z.string().optional(),
  descricao: z.string().min(3, "Descrição mínima de 3 caracteres"),
  formaPagamento: z.enum(["PIX", "Boleto", "Cartão", "Transferência", "Dinheiro", "Outros"]),
  status: z.enum(["Pago", "Pendente", "Previsto"]),
});

type VisitaFormValues = z.infer<typeof visitaSchema>;

interface VisitaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillContratoId?: string;
  editingLancamento?: LancamentoFinanceiro | null;
}

export function VisitaFormDialog({ open, onOpenChange, prefillContratoId, editingLancamento }: VisitaFormDialogProps) {
  const addLancamento = useStore((s) => s.addLancamento);
  const updateLancamento = useStore((s) => s.updateLancamento);
  const gerarCobrancaMauUso = useStore((s) => s.gerarCobrancaMauUso);
  const pecas = useStore((s) => s.pecas);
  const updatePeca = useStore((s) => s.updatePeca);
  const contratos = useStore((s) => s.contratos);
  const contratosAtivos = contratos.filter((c) => c.status === "Ativo");

  // Estado local para peças selecionadas do estoque
  const [pecasSelecionadas, setPecasSelecionadas] = useState<PecaSelecionada[]>([]);

  // Calcular valor total das peças selecionadas
  const valorTotalPecas = pecasSelecionadas.reduce((acc, ps) => {
    const peca = pecas.find((p) => p.id === ps.pecaId);
    return acc + (peca?.custoUnitario || 0) * ps.quantidade;
  }, 0);

  function adicionarPeca() {
    setPecasSelecionadas([...pecasSelecionadas, { pecaId: "", quantidade: 1 }]);
  }

  function removerPeca(index: number) {
    setPecasSelecionadas(pecasSelecionadas.filter((_, i) => i !== index));
  }

  function atualizarPeca(index: number, campo: keyof PecaSelecionada, valor: string | number) {
    const updated = [...pecasSelecionadas];
    if (campo === "quantidade") {
      updated[index] = { ...updated[index], quantidade: Number(valor) || 1 };
    } else {
      updated[index] = { ...updated[index], [campo]: valor as string };
    }
    setPecasSelecionadas(updated);
  }

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    resolver: zodResolver(visitaSchema) as any,
    defaultValues: {
      tipoVisita: "Contrato Ativo",
      categoriaCustoVisita: "Mão de Obra",
      valor: 0,
      data: new Date().toISOString().split("T")[0],
      tecnicoResponsavel: "",
      contratoId: prefillContratoId || "",
      ehMauUso: false,
      valorCobrarCliente: 0,
      observacoesVisita: "",
      descricao: "",
      formaPagamento: "PIX",
      status: "Pendente",
    },
  });

  const watchedTipo = watch("tipoVisita");
  const watchedMauUso = watch("ehMauUso");
  const isContratoAtivo = watchedTipo === "Contrato Ativo";

  useEffect(() => {
    if (open && editingLancamento) {
      reset({
        tipoVisita: (editingLancamento.tipoVisita as TipoVisitaTecnico) || "Contrato Ativo",
        categoriaCustoVisita: (editingLancamento.categoriaCustoVisita as CategoriaCustoVisita) || "Mão de Obra",
        valor: editingLancamento.valor,
        data: editingLancamento.data instanceof Date
          ? editingLancamento.data.toISOString().split("T")[0]
          : String(editingLancamento.data).split("T")[0],
        tecnicoResponsavel: editingLancamento.tecnicoResponsavel || "",
        contratoId: editingLancamento.contratoId || "",
        ehMauUso: editingLancamento.ehMauUso || false,
        valorCobrarCliente: editingLancamento.valorCobrarCliente || 0,
        observacoesVisita: editingLancamento.observacoesVisita || "",
        descricao: editingLancamento.descricao,
        formaPagamento: editingLancamento.formaPagamento,
        status: editingLancamento.status === "Recebido" ? "Pago" : editingLancamento.status,
      });
    } else if (open && !editingLancamento) {
      reset({
        tipoVisita: "Contrato Ativo",
        categoriaCustoVisita: "Mão de Obra",
        valor: 0,
        data: new Date().toISOString().split("T")[0],
        tecnicoResponsavel: "",
        contratoId: prefillContratoId || "",
        ehMauUso: false,
        valorCobrarCliente: 0,
        observacoesVisita: "",
        descricao: "",
        formaPagamento: "PIX",
        status: "Pendente",
      });
    }
  }, [open, editingLancamento, prefillContratoId, reset]);

  // When tipo changes away from Contrato Ativo, clear mau uso
  useEffect(() => {
    if (!isContratoAtivo) {
      setValue("ehMauUso", false);
      setValue("valorCobrarCliente", 0);
      setValue("contratoId", "");
    }
  }, [isContratoAtivo, setValue]);

  function onSubmit(values: VisitaFormValues) {
    try {
      // Calcular peças usadas e validar estoque
      const pecasUsadasLista: Array<{ pecaId: string; nome: string; quantidade: number; custoUnitario: number; subtotal: number }> = [];
      let totalPecas = 0;
      for (const ps of pecasSelecionadas) {
        if (!ps.pecaId) continue;
        const peca = pecas.find((p) => p.id === ps.pecaId);
        if (!peca) continue;
        if (ps.quantidade > peca.quantidade) {
          toast.error(`Estoque insuficiente para "${peca.nome}" (disponível: ${peca.quantidade})`);
          return;
        }
        const subtotal = (peca.custoUnitario || 0) * ps.quantidade;
        pecasUsadasLista.push({
          pecaId: peca.id,
          nome: peca.nome,
          quantidade: ps.quantidade,
          custoUnitario: peca.custoUnitario || 0,
          subtotal,
        });
        totalPecas += subtotal;
      }

      // Custo total = valor informado (mão de obra/outros) + peças do estoque
      const custoTotal = values.valor + totalPecas;

      const lancamento: LancamentoFinanceiro = {
        id: editingLancamento?.id || generateId(),
        tipo: "Pagamos",
        valor: custoTotal,
        data: new Date(values.data),
        descricao: values.descricao,
        classificacao: "Visita Técnica",
        categoria: "Variável",
        centroCusto: "Operacional",
        formaPagamento: values.formaPagamento,
        status: values.status as LancamentoFinanceiro["status"],
        // Visit-specific fields
        ehVisitaTecnico: true,
        tipoVisita: values.tipoVisita,
        categoriaCustoVisita: values.categoriaCustoVisita,
        tecnicoResponsavel: values.tecnicoResponsavel,
        observacoesVisita: values.observacoesVisita || undefined,
        // Contract link (only for Contrato Ativo)
        contratoId: isContratoAtivo && values.contratoId ? values.contratoId : undefined,
        // Mau uso (only for Contrato Ativo)
        ehMauUso: isContratoAtivo ? values.ehMauUso : false,
        valorCobrarCliente: isContratoAtivo && values.ehMauUso ? values.valorCobrarCliente : undefined,
        // Peças usadas (para rastreabilidade e histórico)
        pecasUsadas: pecasUsadasLista.length > 0 ? pecasUsadasLista : undefined,
      };

      if (editingLancamento) {
        updateLancamento(lancamento.id, lancamento);
        toast.success("Visita técnica atualizada");
      } else {
        addLancamento(lancamento);
        toast.success("Visita técnica registrada");
      }

      // Dar baixa no estoque das peças usadas
      for (const pu of pecasUsadasLista) {
        const peca = pecas.find((p) => p.id === pu.pecaId);
        if (peca) {
          const novaQtd = Math.max(0, peca.quantidade - pu.quantidade);
          updatePeca(peca.id, { quantidade: novaQtd });
        }
      }
      if (pecasUsadasLista.length > 0) {
        toast.success(`${pecasUsadasLista.length} peça(s) baixada(s) do estoque (${formatCurrency(totalPecas)})`);
      }

      // Se mau uso foi marcado e há valor a cobrar, gerar lançamento "Recebemos" pendente automaticamente
      if (lancamento.ehMauUso && lancamento.valorCobrarCliente && lancamento.valorCobrarCliente > 0) {
        gerarCobrancaMauUso(lancamento);
        toast.success("Cobrança de mau uso gerada como lançamento pendente");
      }

      // Limpar peças selecionadas e fechar
      setPecasSelecionadas([]);
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar visita técnica");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="size-4 text-[#14B8A6]" />
            {editingLancamento ? "Editar Visita Técnica" : "Nova Visita Técnica"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
          {/* Row: Tipo + Categoria */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de Visita</Label>
              <Select value={watch("tipoVisita")} onValueChange={(v) => setValue("tipoVisita", v as TipoVisitaTecnico)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_VISITA.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.tipoVisita && <p className="text-[10px] text-destructive">{errors.tipoVisita.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Categoria de Custo</Label>
              <Select value={watch("categoriaCustoVisita")} onValueChange={(v) => setValue("categoriaCustoVisita", v as CategoriaCustoVisita)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_CUSTO.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoriaCustoVisita && <p className="text-[10px] text-destructive">{errors.categoriaCustoVisita.message}</p>}
            </div>
          </div>

          {/* Row: Valor + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[var(--motriz-vermelho)]">Custo da Empresa (R$) — A Pagar</Label>
              <Input type="number" step="0.01" min="0.01" className="h-9 text-sm border-[var(--motriz-vermelho)]/30" {...register("valor")} />
              <p className="text-[10px] text-muted-foreground">
                💰 Valor que <strong>nós pagamos</strong> (técnico + peças). Vai direto para Lançamentos como <strong>Pagamos / Variável</strong>.
              </p>
              {errors.valor && <p className="text-[10px] text-destructive">{errors.valor.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data da Visita</Label>
              <Input type="date" className="h-9 text-sm" {...register("data")} />
              {errors.data && <p className="text-[10px] text-destructive">{errors.data.message}</p>}
            </div>
          </div>

          {/* Técnico */}
          <div className="space-y-1.5">
            <Label className="text-xs">Técnico Responsável</Label>
            <Input className="h-9 text-sm" placeholder="Nome do técnico" {...register("tecnicoResponsavel")} />
            {errors.tecnicoResponsavel && <p className="text-[10px] text-destructive">{errors.tecnicoResponsavel.message}</p>}
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label className="text-xs">Descrição</Label>
            <Input className="h-9 text-sm" placeholder="Ex: Troca de pneu traseiro, verificação de bateria..." {...register("descricao")} />
            {errors.descricao && <p className="text-[10px] text-destructive">{errors.descricao.message}</p>}
          </div>

          {/* Contrato (only for Contrato Ativo) */}
          {isContratoAtivo && (
            <div className="space-y-1.5 rounded-md border border-dashed border-[#14B8A6]/30 bg-[#14B8A6]/5 p-3">
              <Label className="text-xs font-semibold text-[#14B8A6] uppercase tracking-wider">Vínculo com Contrato</Label>
              <Select value={watch("contratoId") || ""} onValueChange={(v) => setValue("contratoId", v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecionar contrato ativo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Sem vínculo —</SelectItem>
                  {contratosAtivos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome || c.id} — R$ {c.valorMensalTotal.toLocaleString("pt-BR")}/mês
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Mau Uso (only for Contrato Ativo) */}
          {isContratoAtivo && (
            <div className="space-y-2 rounded-md border border-dashed border-[var(--motriz-vermelho)]/30 bg-[var(--motriz-vermelho)]/5 p-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ehMauUso"
                  checked={watchedMauUso}
                  onCheckedChange={(checked) => setValue("ehMauUso", checked === true)}
                />
                <Label htmlFor="ehMauUso" className="text-xs font-semibold text-[var(--motriz-vermelho)] flex items-center gap-1 cursor-pointer">
                  <AlertTriangle className="size-3" />
                  Mau Uso Identificado
                </Label>
              </div>
              <p className="text-[10px] text-muted-foreground">Marque se o cliente causou dano e o custo deve ser cobrado dele.</p>
              {watchedMauUso && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-green-600">Valor a Cobrar do Cliente (R$) — A Receber</Label>
                  <Input type="number" step="0.01" min="0" className="h-9 text-sm border-green-500/30" {...register("valorCobrarCliente", { valueAsNumber: true })} />
                  <p className="text-[10px] text-muted-foreground">
                    💰 Valor que <strong>o cliente nos paga</strong>. Vai direto para Lançamentos como <strong>Recebemos / Variável</strong> (pendente até o cliente pagar).
                    Este valor é a base para calcular o lucro: <strong>Valor Cobrado − 10% Imposto − Custo da Empresa − Comissão Técnico</strong>.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Info box for non-contract visits */}
          {!isContratoAtivo && (
            <div className="rounded-md border border-dashed border-muted-foreground/20 bg-muted/30 p-2.5">
              <p className="text-[10px] text-muted-foreground">
                💡 Visitas do tipo <strong>{watchedTipo}</strong> são custeadas integralmente pela empresa e não geram cobrança ao cliente.
              </p>
            </div>
          )}

          {/* Row: Forma Pagamento + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Forma de Pagamento</Label>
              <Select value={watch("formaPagamento")} onValueChange={(v) => setValue("formaPagamento", v as VisitaFormValues["formaPagamento"])}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAS_PAGAMENTO.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v as VisitaFormValues["status"])}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Peças do Estoque */}
          <div className="space-y-2 rounded-md border border-dashed border-blue-500/30 bg-blue-500/5 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-blue-600 flex items-center gap-1">
                <Package className="size-3" />
                Peças do Estoque Usadas
              </Label>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={adicionarPeca}>
                <Plus className="size-3" /> Adicionar Peça
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Selecione peças cadastradas no estoque. Ao salvar, a quantidade será baixada automaticamente e o valor somado ao custo da manutenção.
            </p>
            {pecasSelecionadas.length === 0 && (
              <p className="text-[10px] text-muted-foreground italic">Nenhuma peça adicionada. O custo será apenas o valor informado acima.</p>
            )}
            {pecasSelecionadas.map((ps, idx) => {
              const peca = pecas.find((p) => p.id === ps.pecaId);
              const subtotal = (peca?.custoUnitario || 0) * ps.quantidade;
              return (
                <div key={idx} className="flex items-center gap-2 rounded-md border border-blue-500/10 bg-white/50 dark:bg-black/20 p-2">
                  <div className="flex-1">
                    <Select value={ps.pecaId} onValueChange={(v) => atualizarPeca(idx, "pecaId", v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecionar peça..." />
                      </SelectTrigger>
                      <SelectContent>
                        {pecas.filter((p) => p.quantidade > 0 || p.id === ps.pecaId).map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nome} — Estoque: {p.quantidade} — R$ {(p.custoUnitario || 0).toFixed(2)}/un
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-16">
                    <Input
                      type="number"
                      min={1}
                      max={peca?.quantidade || 999}
                      className="h-8 text-xs text-center"
                      value={ps.quantidade}
                      onChange={(e) => atualizarPeca(idx, "quantidade", e.target.value)}
                    />
                  </div>
                  <div className="w-20 text-right">
                    <p className="text-xs font-bold tabular-nums text-blue-600">{formatCurrency(subtotal)}</p>
                    {peca && ps.quantidade > peca.quantidade && (
                      <p className="text-[9px] text-destructive">Estoque insuficiente!</p>
                    )}
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => removerPeca(idx)}>
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              );
            })}
            {valorTotalPecas > 0 && (
              <div className="flex items-center justify-between rounded-md border border-blue-500/20 bg-blue-500/10 px-3 py-2">
                <span className="text-xs font-medium text-blue-600">Total das Peças:</span>
                <span className="text-sm font-bold tabular-nums text-blue-600">{formatCurrency(valorTotalPecas)}</span>
              </div>
            )}
            {valorTotalPecas > 0 && (
              <p className="text-[10px] text-muted-foreground">
                💡 O custo total da manutenção será: <strong>{formatCurrency(Number(watch("valor") || 0) + valorTotalPecas)}</strong> (R$ {Number(watch("valor") || 0).toFixed(2)} informado + {formatCurrency(valorTotalPecas)} em peças).
              </p>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label className="text-xs">Observações da Visita</Label>
            <textarea
              className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Detalhes adicionais da visita..."
              {...register("observacoesVisita")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-[#14B8A6] hover:bg-[#0D9488]">
              {editingLancamento ? "Salvar Alterações" : "Registrar Visita"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}