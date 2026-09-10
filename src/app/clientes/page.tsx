"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Bike,
  MapPin,
  Phone,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { formatCurrency, generateId } from "@/lib/utils";
import type { Cliente, LocalOperacao, Moto, LocacaoExtra, Contrato } from "@/types";
import { Battery, Zap } from "lucide-react";

/* ── Schemas ── */
const clienteSchema = z.object({
  nome: z.string().min(2, "Nome da empresa é obrigatório"),
  cnpj: z.string().optional(),
  contato: z.string().optional(),
  responsavel: z.string().optional(),
});
type ClienteFormValues = z.infer<typeof clienteSchema>;

const localSchema = z.object({
  nome: z.string().min(2, "Nome do local é obrigatório"),
  endereco: z.string().min(5, "Endereço é obrigatório"),
  observacoes: z.string().optional(),
});
type LocalFormValues = z.infer<typeof localSchema>;

/* ── Page ── */
export default function ClientesPage() {
  const clientes = useStore((s) => s.clientes);
  const addCliente = useStore((s) => s.addCliente);
  const updateCliente = useStore((s) => s.updateCliente);
  const removeCliente = useStore((s) => s.removeCliente);
  const motos = useStore((s) => s.motos);
  const contratos = useStore((s) => s.contratos);
  const updateMoto = useStore((s) => s.updateMoto);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [clienteDialogOpen, setClienteDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [localDialogOpen, setLocalDialogOpen] = useState(false);
  const [localClienteId, setLocalClienteId] = useState<string | null>(null);
  const [motoLocalDialogOpen, setMotoLocalDialogOpen] = useState(false);
  const [motoLocalMotoId, setMotoLocalMotoId] = useState<string | null>(null);
  const [motoLocalOptions, setMotoLocalOptions] = useState<LocalOperacao[]>([]);
  const updateExtraLocalOperacao = useStore((s) => s.updateExtraLocalOperacao);

  // Extra local assignment state
  const [extraLocalDialogOpen, setExtraLocalDialogOpen] = useState(false);
  const [extraLocalContratoId, setExtraLocalContratoId] = useState<string | null>(null);
  const [extraLocalExtraId, setExtraLocalExtraId] = useState<string | null>(null);
  const [extraLocalOptions, setExtraLocalOptions] = useState<LocalOperacao[]>([]);

  // Controlled selects
  const [selectedLocalId, setSelectedLocalId] = useState<string>("");
  const [selectedExtraLocalId, setSelectedExtraLocalId] = useState<string>("");

  const form = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema) as any,
    defaultValues: { nome: "", cnpj: "", contato: "", responsavel: "" },
  });

  const localForm = useForm<LocalFormValues>({
    resolver: zodResolver(localSchema) as any,
    defaultValues: { nome: "", endereco: "", observacoes: "" },
  });

  // Map contratos por cliente
  const contratosPorCliente = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of contratos) {
      const existing = map.get(c.clienteId) || [];
      existing.push(c.id);
      map.set(c.clienteId, existing);
    }
    return map;
  }, [contratos]);

  // Motos vinculadas a contratos de cada cliente
  const motosPorCliente = useMemo(() => {
    const map = new Map<string, Moto[]>();
    for (const [clienteId, contratoIds] of contratosPorCliente) {
      const clienteContratos = contratos.filter((c) => contratoIds.includes(c.id));
      const motoIds = new Set<string>();
      for (const c of clienteContratos) {
        for (const id of c.motosVinculadas) motoIds.add(id);
      }
      const clienteMotos = motos.filter((m) => motoIds.has(m.id));
      map.set(clienteId, clienteMotos);
    }
    return map;
  }, [contratosPorCliente, contratos, motos]);

  function openAddCliente() {
    setEditingCliente(null);
    form.reset({ nome: "", cnpj: "", contato: "", responsavel: "" });
    setClienteDialogOpen(true);
  }

  function openEditCliente(cliente: Cliente) {
    setEditingCliente(cliente);
    form.reset({
      nome: cliente.nome,
      cnpj: cliente.cnpj || "",
      contato: cliente.contato || "",
      responsavel: cliente.responsavel || "",
    });
    setClienteDialogOpen(true);
  }

  function onSubmitCliente(values: ClienteFormValues) {
    try {
      if (editingCliente) {
        updateCliente(editingCliente.id, {
          nome: values.nome,
          cnpj: values.cnpj || undefined,
          contato: values.contato || undefined,
          responsavel: values.responsavel || undefined,
        });
        toast.success("Cliente atualizado com sucesso");
      } else {
        const novo: Cliente = {
          id: generateId(),
          nome: values.nome,
          cnpj: values.cnpj || undefined,
          contato: values.contato || undefined,
          responsavel: values.responsavel || undefined,
          locaisOperacao: [],
        };
        addCliente(novo);
        toast.success("Cliente cadastrado com sucesso");
      }
      setClienteDialogOpen(false);
      setEditingCliente(null);
    } catch {
      toast.error("Erro ao salvar cliente");
    }
  }

  function handleRemoveCliente(id: string) {
    if (!confirm("Tem certeza que deseja remover este cliente?")) return;
    removeCliente(id);
    toast.success("Cliente removido");
  }

  function openAddLocal(clienteId: string) {
    setLocalClienteId(clienteId);
    localForm.reset({ nome: "", endereco: "", observacoes: "" });
    setLocalDialogOpen(true);
  }

  function onSubmitLocal(values: LocalFormValues) {
    if (!localClienteId) return;
    try {
      const cliente = clientes.find((c) => c.id === localClienteId);
      if (!cliente) return;
      const novoLocal: LocalOperacao = {
        id: generateId(),
        nome: values.nome,
        endereco: values.endereco,
        observacoes: values.observacoes || undefined,
      };
      updateCliente(localClienteId, {
        locaisOperacao: [...(cliente.locaisOperacao || []), novoLocal],
      });
      toast.success("Local de operação adicionado");
      setLocalDialogOpen(false);
      setLocalClienteId(null);
    } catch {
      toast.error("Erro ao adicionar local");
    }
  }

  function handleRemoveLocal(clienteId: string, localId: string) {
    if (!confirm("Remover este local de operação?")) return;
    const cliente = clientes.find((c) => c.id === clienteId);
    if (!cliente) return;
    updateCliente(clienteId, {
      locaisOperacao: (cliente.locaisOperacao || []).filter((l) => l.id !== localId),
    });
    toast.success("Local removido");
  }

  function openAssignMotoLocal(motoId: string, clienteLocais: LocalOperacao[]) {
    setMotoLocalMotoId(motoId);
    setMotoLocalOptions(clienteLocais);
    const moto = motos.find((m) => m.id === motoId);
    setSelectedLocalId(moto?.localOperacaoId || "");
    setMotoLocalDialogOpen(true);
  }

  function handleAssignMotoLocal() {
    if (!motoLocalMotoId) return;
    try {
      updateMoto(motoLocalMotoId, {
        localOperacaoId: selectedLocalId || undefined,
      });
      toast.success("Local de operação da moto atualizado");
      setMotoLocalDialogOpen(false);
      setMotoLocalMotoId(null);
    } catch {
      toast.error("Erro ao atualizar local da moto");
    }
  }

  function getLocalName(cliente: Cliente, localId?: string): string {
    if (!localId || !cliente.locaisOperacao) return "—";
    const local = cliente.locaisOperacao.find((l) => l.id === localId);
    return local?.nome || "—";
  }

  // Extras alugados por cliente (baterias / carregadores dos contratos ativos)
  const extrasPorCliente = useMemo(() => {
    const map = new Map<string, Array<{ extra: LocacaoExtra; contratoId: string; contratoNome: string }>>();
    for (const [clienteId, contratoIds] of contratosPorCliente) {
      const items: Array<{ extra: LocacaoExtra; contratoId: string; contratoNome: string }> = [];
      for (const cId of contratoIds) {
        const contrato = contratos.find((c) => c.id === cId);
        if (!contrato || contrato.status !== "Ativo") continue;
        for (const extra of contrato.locacoesExtras || []) {
          items.push({ extra, contratoId: cId, contratoNome: contrato.nome || contrato.id });
        }
      }
      if (items.length > 0) map.set(clienteId, items);
    }
    return map;
  }, [contratosPorCliente, contratos]);

  function openAssignExtraLocal(contratoId: string, extraId: string, clienteLocais: LocalOperacao[], currentLocalId?: string) {
    setExtraLocalContratoId(contratoId);
    setExtraLocalExtraId(extraId);
    setExtraLocalOptions(clienteLocais);
    setSelectedExtraLocalId(currentLocalId || "");
    setExtraLocalDialogOpen(true);
  }

  function handleAssignExtraLocal() {
    if (!extraLocalContratoId || !extraLocalExtraId) return;
    try {
      updateExtraLocalOperacao(extraLocalContratoId, extraLocalExtraId, selectedExtraLocalId || undefined);
      toast.success("Local do item extra atualizado");
      setExtraLocalDialogOpen(false);
      setExtraLocalContratoId(null);
      setExtraLocalExtraId(null);
    } catch {
      toast.error("Erro ao atualizar local do item extra");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Cadastro e acompanhamento de clientes, contratos e locais de operação
          </p>
        </div>
        <Button size="sm" onClick={openAddCliente}>
          <Plus className="mr-1.5 size-3.5" />
          Novo Cliente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--motriz-verde-esmeralda)]/10">
                <Building2 className="size-5 text-[var(--motriz-verde-esmeralda)]" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{clientes.length}</p>
                <p className="text-xs text-muted-foreground">Clientes Cadastrados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Bike className="size-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {Array.from(motosPorCliente.values()).flat().length}
                </p>
                <p className="text-xs text-muted-foreground">Motos em Operação</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--motriz-ambar)]/10">
                <MapPin className="size-5 text-[var(--motriz-ambar)]" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {clientes.reduce((acc, c) => acc + (c.locaisOperacao?.length || 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground">Locais de Operação</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clientes List */}
      {clientes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="mx-auto mb-3 size-10 opacity-30" />
            <p>Nenhum cliente cadastrado ainda.</p>
            <p className="text-xs mt-1">Clique em "Novo Cliente" para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {clientes.map((cliente) => {
            const isExpanded = expandedId === cliente.id;
            const clienteMotos = motosPorCliente.get(cliente.id) || [];
            const clienteContratoIds = contratosPorCliente.get(cliente.id) || [];
            const totalMensal = contratos
              .filter((c) => clienteContratoIds.includes(c.id) && c.status === "Ativo")
              .reduce((acc, c) => {
                const extrasTotal = (c.locacoesExtras || []).reduce((a, e) => a + e.valorMensal, 0);
                return acc + c.valorMensalTotal + extrasTotal;
              }, 0);

            return (
              <Card key={cliente.id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : cliente.id)}
                  className="w-full text-left"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--motriz-verde-esmeralda)]/10">
                          <Building2 className="size-5 text-[var(--motriz-verde-esmeralda)]" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold">{cliente.nome}</CardTitle>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {cliente.cnpj && <span>CNPJ: {cliente.cnpj}</span>}
                            {cliente.responsavel && (
                              <span className="flex items-center gap-1">
                                <User className="size-3" />
                                {cliente.responsavel}
                              </span>
                            )}
                            {cliente.contato && (
                              <span className="flex items-center gap-1">
                                <Phone className="size-3" />
                                {cliente.contato}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-bold tabular-nums text-[var(--motriz-verde-esmeralda)]">
                            {formatCurrency(totalMensal)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {clienteMotos.length} moto{clienteMotos.length !== 1 ? "s" : ""} · {clienteContratoIds.length} contrato{clienteContratoIds.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </button>

                {isExpanded && (
                  <CardContent className="border-t border-border pt-4 space-y-4">
                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditCliente(cliente)}>
                        <Pencil className="mr-1.5 size-3" />
                        Editar Cliente
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openAddLocal(cliente.id)}>
                        <MapPin className="mr-1.5 size-3" />
                        Add Local de Operação
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemoveCliente(cliente.id)}
                      >
                        <Trash2 className="mr-1.5 size-3" />
                        Remover
                      </Button>
                    </div>

                    {/* Locais de Operação */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Locais de Operação ({cliente.locaisOperacao?.length || 0})
                      </p>
                      {(!cliente.locaisOperacao || cliente.locaisOperacao.length === 0) ? (
                        <p className="text-xs text-muted-foreground italic">Nenhum local cadastrado.</p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {cliente.locaisOperacao.map((local) => {
                            const motosNoLocal = clienteMotos.filter((m) => m.localOperacaoId === local.id);
                            const extrasNoLocal = (extrasPorCliente.get(cliente.id) || []).filter(({ extra }) => extra.localOperacaoId === local.id);
                            return (
                              <div key={local.id} className="rounded-md border border-border p-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="text-sm font-medium flex items-center gap-1.5">
                                      <MapPin className="size-3.5 text-[var(--motriz-ambar)]" />
                                      {local.nome}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{local.endereco}</p>
                                    {local.observacoes && (
                                      <p className="text-[11px] text-muted-foreground italic mt-1">{local.observacoes}</p>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLocal(cliente.id, local.id)}
                                    className="text-muted-foreground hover:text-destructive p-1"
                                  >
                                    <Trash2 className="size-3" />
                                  </button>
                                </div>
                                {motosNoLocal.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-border">
                                    <p className="text-[10px] text-muted-foreground mb-1">Motos neste local:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {motosNoLocal.map((m) => (
                                        <span key={m.id} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px]">
                                          <Bike className="size-2.5" />
                                          {m.modelo} · {m.chassi}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {extrasNoLocal.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-border">
                                    <p className="text-[10px] text-muted-foreground mb-1">Extras neste local:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {extrasNoLocal.map(({ extra }) => (
                                        <span key={extra.id} className="inline-flex items-center gap-1 rounded-full bg-[var(--motriz-ambar)]/10 px-2 py-0.5 text-[10px] text-[var(--motriz-ambar)]">
                                          {extra.tipo === "Bateria" ? <Battery className="size-2.5" /> : <Zap className="size-2.5" />}
                                          {extra.tipo}{extra.modelo ? ` · ${extra.modelo}` : ""}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Motos do Cliente */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Motos em Contrato ({clienteMotos.length})
                      </p>
                      {clienteMotos.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Nenhuma moto vinculada a este cliente.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {clienteMotos.map((moto) => (
                            <div
                              key={moto.id}
                              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <Bike className="size-3.5 text-muted-foreground" />
                                <span className="font-medium">{moto.modelo}</span>
                                <span className="font-mono text-muted-foreground tabular-nums">{moto.chassi}</span>
                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                  moto.status === "Em Contrato"
                                    ? "bg-blue-500/10 text-blue-600"
                                    : "bg-muted text-muted-foreground"
                                }`}>
                                  {moto.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <MapPin className="size-3" />
                                  {getLocalName(cliente, moto.localOperacaoId)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-[10px]"
                                  onClick={() => openAssignMotoLocal(moto.id, cliente.locaisOperacao || [])}
                                >
                                  Alterar Local
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Itens Extras Alugados (Baterias / Carregadores) */}
                    {(() => {
                      const clienteExtras = extrasPorCliente.get(cliente.id) || [];
                      if (clienteExtras.length === 0) return null;
                      return (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Itens Extras Alugados ({clienteExtras.length})
                          </p>
                          <div className="space-y-1.5">
                            {clienteExtras.map(({ extra, contratoId }) => (
                              <div
                                key={extra.id}
                                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  {extra.tipo === "Bateria" ? (
                                    <Battery className="size-3.5 text-green-600" />
                                  ) : (
                                    <Zap className="size-3.5 text-yellow-500" />
                                  )}
                                  <span className="font-medium">
                                    {extra.tipo === "Bateria" ? "🔋 Bateria" : "⚡ Carregador"}
                                  </span>
                                  {extra.modelo && (
                                    <span className="text-muted-foreground">{extra.modelo}</span>
                                  )}
                                  <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
                                    {formatCurrency(extra.valorMensal)}/mês
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground flex items-center gap-1">
                                    <MapPin className="size-3" />
                                    {getLocalName(cliente, extra.localOperacaoId)}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-[10px]"
                                    onClick={() => openAssignExtraLocal(contratoId, extra.id, cliente.locaisOperacao || [], extra.localOperacaoId)}
                                  >
                                    Alterar Local
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Cliente Modal */}
      <Dialog open={clienteDialogOpen} onOpenChange={setClienteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCliente ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmitCliente)} className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome da Empresa *</Label>
              <Input {...form.register("nome")} placeholder="Ex: Grupo Samuray Segurança" />
              {form.formState.errors.nome && (
                <p className="text-xs text-destructive">{form.formState.errors.nome.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>CNPJ</Label>
                <Input {...form.register("cnpj")} placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone / Contato</Label>
                <Input {...form.register("contato")} placeholder="(11) 99999-0000" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Responsável pelo Contato</Label>
              <Input {...form.register("responsavel")} placeholder="Nome do responsável" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setClienteDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">{editingCliente ? "Salvar Alterações" : "Cadastrar Cliente"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Local de Operação Modal */}
      <Dialog open={localDialogOpen} onOpenChange={setLocalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Local de Operação</DialogTitle>
          </DialogHeader>
          <form onSubmit={localForm.handleSubmit(onSubmitLocal)} className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome do Local / Condomínio *</Label>
              <Input {...localForm.register("nome")} placeholder="Ex: Condomínio Solar dos Lagos" />
              {localForm.formState.errors.nome && (
                <p className="text-xs text-destructive">{localForm.formState.errors.nome.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Endereço *</Label>
              <Input {...localForm.register("endereco")} placeholder="Rua, número, bairro, cidade" />
              {localForm.formState.errors.endereco && (
                <p className="text-xs text-destructive">{localForm.formState.errors.endereco.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Observações (opcional)</Label>
              <Input {...localForm.register("observacoes")} placeholder="Detalhes adicionais do local" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLocalDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">Adicionar Local</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Moto Local Modal */}
      <Dialog open={motoLocalDialogOpen} onOpenChange={setMotoLocalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Local de Operação da Moto</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <p className="text-sm text-muted-foreground">
              Selecione onde esta moto está atuando (condomínio/local do cliente).
            </p>
            <div className="space-y-1.5">
              <Label>Local de Operação</Label>
              <select
                value={selectedLocalId}
                onChange={(e) => setSelectedLocalId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">— Nenhum local selecionado —</option>
                {motoLocalOptions.map((local) => (
                  <option key={local.id} value={local.id}>
                    {local.nome} — {local.endereco}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMotoLocalDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAssignMotoLocal}>Confirmar</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Extra Local Modal */}
      <Dialog open={extraLocalDialogOpen} onOpenChange={setExtraLocalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Local do Item Extra Alugado</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <p className="text-sm text-muted-foreground">
              Selecione onde este item extra (bateria/carregador) está localizado.
            </p>
            <div className="space-y-1.5">
              <Label>Local de Operação</Label>
              <select
                value={selectedExtraLocalId}
                onChange={(e) => setSelectedExtraLocalId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">— Nenhum local selecionado —</option>
                {extraLocalOptions.map((local) => (
                  <option key={local.id} value={local.id}>
                    {local.nome} — {local.endereco}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setExtraLocalDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAssignExtraLocal}>Confirmar</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}