"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bike,
  Plus,
  Trash2,
  DollarSign,
  User,
  Calendar,
  FileText,
  Percent,
  Calculator,
  Filter,
  Lock,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import type { HistoricoVendaMoto } from "@/types";

interface Comprador {
  id: string;
  nome: string;
  cpf: string;
  celular: string;
}

const STORAGE_KEY_COMPRADORES = "fmm_compradores";
// Senha carregada de variável de ambiente ou config segura em produção
// Em desenvolvimento, usar prompt ou backend para validação real
const SENHA_AUTORIZACAO = process.env.NEXT_PUBLIC_SENHA_VENDAS || "3283";

// Status bloqueados para venda
const STATUS_BLOQUEADOS = new Set([
  "Em Contrato",
  "Em Test Ride",
  "Em Manutenção",
  "Aguardando Peça",
  "Aguardando Conserto",
]);

export default function VendasPage() {
  const motos = useStore((s) => s.motos);
  const funcionarios = useStore((s) => s.funcionarios);
  const historicoVendas = useStore((s) => s.historicoVendas);
  const addHistoricoVenda = useStore((s) => s.addHistoricoVenda);
  const updateHistoricoVenda = useStore((s) => s.updateHistoricoVenda);
  const removeHistoricoVenda = useStore((s) => s.removeHistoricoVenda);
  const removeMoto = useStore((s) => s.removeMoto);
  const addMoto = useStore((s) => s.addMoto);
  const addLancamento = useStore((s) => s.addLancamento);
  const updateLancamento = useStore((s) => s.updateLancamento);
  const lancamentos = useStore((s) => s.lancamentos);
  const addLancamentosParceladosParaVenda = useStore((s) => s.addLancamentosParceladosParaVenda);
  const getParcelasRecebidasPorVenda = useStore((s) => s.getParcelasRecebidasPorVenda);

  // ── Compradores state ──
  const [compradores, setCompradores] = useState<Comprador[]>([]);
  const [novoCompradorNome, setNovoCompradorNome] = useState("");
  const [novoCompradorCpf, setNovoCompradorCpf] = useState("");
  const [novoCompradorCelular, setNovoCompradorCelular] = useState("");

  // Load compradores from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_COMPRADORES);
      if (stored) {
        const parsed = JSON.parse(stored) as Comprador[];
        if (Array.isArray(parsed)) setCompradores(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  // Persist compradores to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COMPRADORES, JSON.stringify(compradores));
    } catch { /* ignore */ }
  }, [compradores]);

  // ── Filtro por mês ──
  const [mesFiltro, setMesFiltro] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // ── Sale form state ──
  const [selectedMotoId, setSelectedMotoId] = useState<string>("");
  const [selectedCompradorId, setSelectedCompradorId] = useState<string>("");
  const [valorVenda, setValorVenda] = useState<string>("");
  const [dataVenda, setDataVenda] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [impostoPercentual, setImpostoPercentual] = useState<string>("0");
  const [funcionarioVendedorId, setFuncionarioVendedorId] = useState<string>("");
  const [comissaoPercentual, setComissaoPercentual] = useState<string>("0");
  const [statusPagamento, setStatusPagamento] = useState<"Recebido" | "Previsto" | "Pendente">("Recebido");
  const [observacoes, setObservacoes] = useState("");

  // ── Parcelamento state ──
  const [ehParcelada, setEhParcelada] = useState<boolean>(false);
  const [numeroParcelas, setNumeroParcelas] = useState<string>("2");

  // ── Password modal state ──
  const [senhaModalOpen, setSenhaModalOpen] = useState(false);
  const [senhaInput, setSenhaInput] = useState("");
  const [senhaCallback, setSenhaCallback] = useState<((ok: boolean) => void) | null>(null);
  const [senhaMensagem, setSenhaMensagem] = useState("");

  // ── Status change dialog ──
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [vendaParaStatusChange, setVendaParaStatusChange] = useState<HistoricoVendaMoto | null>(null);
  const [novoStatusSelecionado, setNovoStatusSelecionado] = useState<"Recebido" | "Previsto" | "Pendente">("Recebido");

  // ── Delete state (must be declared before functions that use it) ──
  const [vendaToDelete, setVendaToDelete] = useState<string | null>(null);

  function pedirSenha(mensagem: string): Promise<boolean> {
    return new Promise((resolve) => {
      setSenhaMensagem(mensagem);
      setSenhaInput("");
      setSenhaCallback(() => resolve);
      setSenhaModalOpen(true);
    });
  }

  function confirmarSenha() {
    const ok = senhaInput === SENHA_AUTORIZACAO;
    if (senhaCallback) senhaCallback(ok);
    setSenhaModalOpen(false);
    setSenhaInput("");
    setSenhaCallback(null);
    if (!ok) toast.error("Senha incorreta. Operação cancelada.");
  }

  function cancelarSenha() {
    if (senhaCallback) senhaCallback(false);
    setSenhaModalOpen(false);
    setSenhaInput("");
    setSenhaCallback(null);
  }

  // ── Available motos: only "Disponível para Operar" ──
  const motosDisponiveis = useMemo(
    () => motos.filter((m) => !STATUS_BLOQUEADOS.has(m.status)),
    [motos]
  );

  // ── Selected moto ──
  const selectedMoto = useMemo(
    () => motos.find((m) => m.id === selectedMotoId) ?? null,
    [motos, selectedMotoId]
  );

  // ── Profit preview ──
  const profitPreview = useMemo(() => {
    const venda = parseFloat(valorVenda) || 0;
    const imposto = parseFloat(impostoPercentual) || 0;
    const comissao = parseFloat(comissaoPercentual) || 0;
    const custoContabil = selectedMoto?.valorContabil ?? 0;
    const valorImposto = venda * (imposto / 100);
    const valorComissao = venda * (comissao / 100);
    const lucro = venda - valorImposto - valorComissao - custoContabil;
    return { valorImposto, valorComissao, lucro, custoContabil };
  }, [valorVenda, impostoPercentual, comissaoPercentual, selectedMoto]);

  // ── Vendas filtradas por mês ──
  // Vendas parceladas aparecem em qualquer mês que tenha parcela (pendente ou recebida)
  const vendasFiltradas = useMemo(() => {
    if (!mesFiltro) return historicoVendas;
    const [year, month] = mesFiltro.split("-").map(Number);
    return historicoVendas.filter((v) => {
      const d = new Date(v.dataVenda);
      // Venda no mês selecionado sempre aparece
      if (d.getFullYear() === year && d.getMonth() === month - 1) return true;
      // Venda parcelada: aparece se houver parcela no mês selecionado
      if (v.ehParcelada) {
        return lancamentos.some(
          (l) =>
            l.vendaId === v.id &&
            new Date(l.data).getFullYear() === year &&
            new Date(l.data).getMonth() === month - 1
        );
      }
      return false;
    });
  }, [historicoVendas, mesFiltro, lancamentos]);

  // ── KPIs (baseados no filtro de mês) ──
  const kpis = useMemo(() => {
    const totalVendido = vendasFiltradas.reduce((acc, v) => acc + (v.valorVenda || 0), 0);
    const lucroLiquidoTotal = vendasFiltradas.reduce((acc, v) => acc + (v.lucroLiquido || 0), 0);
    const comissoesAPagar = vendasFiltradas.reduce((acc, v) => acc + (v.comissaoValor || 0), 0);
    const vendasRecebidas = vendasFiltradas.filter((v) => v.statusPagamento === "Recebido").length;
    return { totalVendido, lucroLiquidoTotal, comissoesAPagar, vendasRecebidas };
  }, [vendasFiltradas]);

  // ── Register buyer ──
  const handleSalvarComprador = () => {
    const nome = novoCompradorNome.trim();
    const cpf = novoCompradorCpf.trim();
    const celular = novoCompradorCelular.trim();
    if (!nome) { toast.error("Informe o nome completo do comprador."); return; }
    if (!cpf) { toast.error("Informe o CPF do comprador."); return; }
    const novoComprador: Comprador = { id: crypto.randomUUID(), nome, cpf, celular };
    setCompradores((prev) => [...prev, novoComprador]);
    setNovoCompradorNome("");
    setNovoCompradorCpf("");
    setNovoCompradorCelular("");
    toast.success("Comprador cadastrado com sucesso!");
  };

  // ── Register sale ──
  const handleRegistrarVenda = () => {
    if (!selectedMoto) { toast.error("Selecione uma moto disponível."); return; }
    const comprador = compradores.find((c) => c.id === selectedCompradorId);
    if (!comprador) { toast.error("Selecione um comprador cadastrado."); return; }
    const venda = parseFloat(valorVenda);
    if (!venda || venda <= 0) { toast.error("Informe um valor de venda válido."); return; }
    if (!dataVenda) { toast.error("Informe a data da venda."); return; }
    if (!funcionarioVendedorId) { toast.error("Selecione o funcionário/sócio que realizou a venda."); return; }

    const funcionario = funcionarios.find((f) => f.id === funcionarioVendedorId);
    const impPct = parseFloat(impostoPercentual) || 0;
    const comPct = parseFloat(comissaoPercentual) || 0;
    const valorImposto = venda * (impPct / 100);
    const valorComissao = venda * (comPct / 100);
    const custoContabil = selectedMoto.valorContabil ?? 0;
    const lucroLiquido = venda - valorImposto - valorComissao - custoContabil;
    const vendaData = new Date(dataVenda + "T12:00:00");

    const novaVenda: HistoricoVendaMoto = {
      id: crypto.randomUUID(),
      motoId: selectedMoto.id,
      chassi: selectedMoto.chassi,
      modelo: selectedMoto.modelo,
      cor: selectedMoto.cor,
      valorContabil: custoContabil,
      valorVenda: venda,
      impostoPercentual: impPct,
      impostoValor: valorImposto,
      comissaoPercentual: comPct,
      comissaoValor: valorComissao,
      lucroLiquido,
      dataVenda: vendaData,
      statusPagamento,
      funcionarioResponsavelId: funcionarioVendedorId,
      compradorNome: comprador.nome,
      compradorCpf: comprador.cpf,
      compradorCelular: comprador.celular,
      observacoes: observacoes.trim() || undefined,
      ehParcelada: ehParcelada || undefined,
      numeroParcelas: ehParcelada ? parseInt(numeroParcelas) : undefined,
      valorParcela: ehParcelada ? Math.round((venda / parseInt(numeroParcelas)) * 100) / 100 : undefined,
      parcelasRecebidasCount: 0,
    };

    addHistoricoVenda(novaVenda);

    // Remover moto do estoque imediatamente (independente de parcelamento)
    removeMoto(selectedMoto.id);

    if (ehParcelada) {
      const nParcelas = parseInt(numeroParcelas);
      const valorParc = Math.round((venda / nParcelas) * 100) / 100;
      addLancamentosParceladosParaVenda({
        vendaId: novaVenda.id,
        motoChassi: selectedMoto.chassi,
        modelo: selectedMoto.modelo,
        compradorNome: comprador.nome,
        funcionarioResponsavelId: funcionarioVendedorId,
        dataPrimeiraParcela: vendaData,
        numeroParcelas: nParcelas,
        valorParcela: valorParc,
      });

      // Comissão como entrada única no mês da venda (valor cheio)
      if (comPct > 0 && valorComissao > 0) {
        addLancamento({
          id: crypto.randomUUID(),
          tipo: "Pagamos",
          classificacao: "Comissão",
          descricao: `Comissão venda ${selectedMoto.modelo} (${selectedMoto.chassi}) — ${comprador.nome}`,
          valor: valorComissao,
          data: vendaData,
          status: "Pendente",
          categoria: "Variável",
          centroCusto: "Comercial",
          formaPagamento: "Transferência",
          motoChassi: selectedMoto.chassi,
          funcionarioResponsavelId: funcionarioVendedorId,
        });
      }
    } else {
      criarLancamentosParaVenda(novaVenda, selectedMoto, comprador, funcionario, vendaData, venda, valorComissao, comPct);
    }

    toast.success("Venda registrada com sucesso!");

    // Reset form
    setSelectedMotoId("");
    setSelectedCompradorId("");
    setValorVenda("");
    setDataVenda(new Date().toISOString().split("T")[0]);
    setImpostoPercentual("0");
    setFuncionarioVendedorId("");
    setComissaoPercentual("0");
    setStatusPagamento("Recebido");
    setObservacoes("");
    setEhParcelada(false);
    setNumeroParcelas("2");
  };

  // ── Criar lançamentos conforme status da venda ──
  function criarLancamentosParaVenda(
    venda: HistoricoVendaMoto,
    moto: { id: string; chassi: string; modelo: string; cor?: string },
    comprador: Comprador,
    funcionario: { nome: string } | undefined,
    vendaData: Date,
    valorVendaNum: number,
    valorComissao: number,
    comPct: number
  ) {
    const statusLancamento = venda.statusPagamento === "Recebido" ? "Recebido" : "Pendente";
    const tipoLancamento = "Recebemos";

    // Lançamento de receita da venda
    const lancamentoReceitaId = crypto.randomUUID();
    addLancamento({
      id: lancamentoReceitaId,
      tipo: tipoLancamento,
      classificacao: "Venda de Moto",
      descricao: `Venda da moto ${moto.modelo} (${moto.chassi}) para ${comprador.nome}`,
      valor: valorVendaNum,
      data: vendaData,
      status: statusLancamento,
      funcionarioResponsavelId: venda.funcionarioResponsavelId,
      motoChassi: moto.chassi,
      categoria: "Variável",
      centroCusto: "Comercial",
      formaPagamento: "Transferência",
    });

    // Lançamento de comissão se houver
    if (comPct > 0 && valorComissao > 0) {
      const nomeVendedor = funcionario?.nome || "Vendedor";
      const comissaoId = crypto.randomUUID();
      addLancamento({
        id: comissaoId,
        tipo: "Pagamos",
        classificacao: "Comissão Venda",
        descricao: `Comissão de ${comPct}% sobre venda da moto ${moto.chassi} — Vendedor: ${nomeVendedor}`,
        valor: valorComissao,
        data: vendaData,
        status: "Pendente",
        funcionarioResponsavelId: venda.funcionarioResponsavelId,
        motoChassi: moto.chassi,
        categoria: "Variável",
        centroCusto: "Comercial",
        formaPagamento: "Transferência",
      });
    }
  }

  // ── Change status of existing sale ──
  const handleConfirmarMudancaStatus = async () => {
    if (!vendaParaStatusChange) return;

    const antigoStatus = vendaParaStatusChange.statusPagamento;
    const novoStatus = novoStatusSelecionado;

    if (antigoStatus === novoStatus) {
      toast.info("Status já é o mesmo selecionado.");
      setStatusChangeDialogOpen(false);
      return;
    }

    // Atualizar o status da venda no histórico (dados da moto/comprador permanecem salvos)
    updateHistoricoVenda(vendaParaStatusChange.id, { statusPagamento: novoStatus });

    // Dados do comprador reconstruídos do histórico (não dependem do estoque)
    const comprador: Comprador = {
      id: "",
      nome: vendaParaStatusChange.compradorNome,
      cpf: vendaParaStatusChange.compradorCpf,
      celular: vendaParaStatusChange.compradorCelular,
    };
    const funcionario = funcionarios.find((f) => f.id === vendaParaStatusChange.funcionarioResponsavelId);

    // Moto pode ou não existir no estoque atual (se já foi vendida como Recebido, não existe mais)
    const motoNoEstoque = motos.find((m) => m.id === vendaParaStatusChange.motoId);
    // Objeto moto para criação de lançamentos (usa dados do histórico se não estiver no estoque)
    const motoParaLancamento = motoNoEstoque ?? {
      id: vendaParaStatusChange.motoId,
      chassi: vendaParaStatusChange.chassi,
      modelo: vendaParaStatusChange.modelo,
      cor: vendaParaStatusChange.cor,
    };

    // Encontrar lançamentos existentes desta venda (por chassi + classificação)
    const lancamentosReceita = lancamentos.filter(
      (l) => l.motoChassi === vendaParaStatusChange.chassi && l.classificacao === "Venda de Moto"
    );
    const lancamentosComissao = lancamentos.filter(
      (l) => l.motoChassi === vendaParaStatusChange.chassi && l.classificacao === "Comissão Venda"
    );

    if (novoStatus === "Recebido" && antigoStatus !== "Recebido") {
      // Mudando para Recebido:
      // 1. Atualizar/criar lançamento de receita como "Recebido"
      // 2. Garantir que lançamento de comissão exista e fique SEMPRE "Pendente" (independente do status da venda)
      // 3. Remover moto do estoque (se ainda estiver lá)

      // --- Receita da venda ---
      if (lancamentosReceita.length > 0) {
        for (const lanc of lancamentosReceita) {
          updateLancamento(lanc.id, { status: "Recebido" });
        }
      } else {
        // Criar apenas o lançamento de receita (comissão é tratada separadamente abaixo)
        const statusLancamento = "Recebido";
        addLancamento({
          id: crypto.randomUUID(),
          tipo: "Recebemos",
          classificacao: "Venda de Moto",
          descricao: `Venda da moto ${vendaParaStatusChange.modelo} (${vendaParaStatusChange.chassi}) para ${vendaParaStatusChange.compradorNome}`,
          valor: vendaParaStatusChange.valorVenda,
          data: new Date(vendaParaStatusChange.dataVenda),
          status: statusLancamento,
          funcionarioResponsavelId: vendaParaStatusChange.funcionarioResponsavelId,
          motoChassi: vendaParaStatusChange.chassi,
          categoria: "Variável",
          centroCusto: "Comercial",
          formaPagamento: "Transferência",
        });
      }

      // --- Comissão de venda (SEMPRE Pendente, independente do status da venda) ---
      if (vendaParaStatusChange.comissaoPercentual > 0 && vendaParaStatusChange.comissaoValor > 0) {
        if (lancamentosComissao.length > 0) {
          // Já existe: garantir que fique Pendente (nunca mudar para Recebido automaticamente)
          for (const lanc of lancamentosComissao) {
            if (lanc.status !== "Pago") {
              updateLancamento(lanc.id, { status: "Pendente" });
            }
          }
        } else {
          // Não existe: criar lançamento de comissão como Pendente
          const nomeVendedor = funcionario?.nome || "Vendedor";
          addLancamento({
            id: crypto.randomUUID(),
            tipo: "Pagamos",
            classificacao: "Comissão Venda",
            descricao: `Comissão de ${vendaParaStatusChange.comissaoPercentual}% sobre venda da moto ${vendaParaStatusChange.chassi} — Vendedor: ${nomeVendedor}`,
            valor: vendaParaStatusChange.comissaoValor,
            data: new Date(vendaParaStatusChange.dataVenda),
            status: "Pendente",
            funcionarioResponsavelId: vendaParaStatusChange.funcionarioResponsavelId,
            motoChassi: vendaParaStatusChange.chassi,
            categoria: "Variável",
            centroCusto: "Comercial",
            formaPagamento: "Transferência",
          });
        }
      }
      // Remover moto do estoque apenas se ainda existir
      if (motoNoEstoque) {
        removeMoto(motoNoEstoque.id);
        toast.success("Status alterado para Recebido. Moto removida do estoque e lançamentos atualizados.");
      } else {
        toast.success("Status alterado para Recebido. Lançamentos criados/atualizados. (Moto já não estava no estoque)");
      }
    } else if (novoStatus !== "Recebido" && antigoStatus === "Recebido") {
      // Mudando de Recebido para Previsto/Pendente:
      // 1. Atualizar lançamentos para "Pendente" (a receber / previsto)
      // 2. Devolver a moto ao estoque (usando dados do histórico)
      for (const lanc of lancamentosReceita) {
        updateLancamento(lanc.id, { status: "Pendente" });
      }
      for (const lanc of lancamentosComissao) {
        updateLancamento(lanc.id, { status: "Pendente" });
      }
      // Devolver moto ao estoque se não estiver mais lá
      if (!motoNoEstoque) {
        const motoRestaurada = {
          id: vendaParaStatusChange.motoId,
          chassi: vendaParaStatusChange.chassi,
          modelo: vendaParaStatusChange.modelo as any,
          status: "Disponível para Operar" as const,
          cor: (vendaParaStatusChange.cor || undefined) as any,
          valorContabil: vendaParaStatusChange.valorContabil,
          localizacao: "Galpão" as const,
        };
        addMoto(motoRestaurada as any);
        toast.success(`Status alterado para ${novoStatus}. Moto devolvida ao estoque. Lançamentos marcados como Pendente.`);
      } else {
        toast.success(`Status alterado para ${novoStatus}. Lançamentos marcados como Pendente (a receber).`);
      }
    } else {
      // Mudança entre Previsto e Pendente: atualizar status dos lançamentos
      for (const lanc of lancamentosReceita) {
        updateLancamento(lanc.id, { status: "Pendente" });
      }
      toast.success(`Status alterado para ${novoStatus}.`);
    }

    setStatusChangeDialogOpen(false);
    setVendaParaStatusChange(null);
  };

  const openStatusChangeDialog = (venda: HistoricoVendaMoto) => {
    setVendaParaStatusChange(venda);
    setNovoStatusSelecionado(venda.statusPagamento);
    setStatusChangeDialogOpen(true);
  };

  // ── Delete sale with password ──
  const handleConfirmDelete = async (deleteId?: string) => {
    const idToDelete = deleteId || vendaToDelete;
    if (!idToDelete) return;

    const venda = historicoVendas.find((v) => v.id === idToDelete);
    if (!venda) return;

    // Pedir senha para exclusão
    const ok = await pedirSenha(
      `EXCLUSÃO DE VENDA\n\nMoto: ${venda.modelo} (${venda.chassi})\nValor: ${formatCurrency(venda.valorVenda)}\nStatus: ${venda.statusPagamento}\n\nEsta ação removerá o histórico e os lançamentos associados.\n\nDigite a senha de autorização:`
    );

    if (!ok) return;

    // Remover lançamentos associados — usar vendaId para vínculo preciso; fallback por chassi apenas para registros legados
    const lancamentosDaVenda = lancamentos.filter(
      (l) =>
        (l.vendaId === idToDelete) ||
        (!l.vendaId && l.motoChassi === venda.chassi && (l.classificacao === "Venda de Moto" || l.classificacao === "Comissão Venda"))
    );
    for (const lanc of lancamentosDaVenda) {
      useStore.getState().removeLancamento(lanc.id);
    }

    // Remover a venda do histórico
    removeHistoricoVenda(idToDelete);
    toast.success("Venda e lançamentos associados removidos com sucesso.");
    setVendaToDelete(null);
  };

  // ── Helper: get seller name ──
  const getSellerName = (funcionarioId: string) => {
    const f = funcionarios.find((fn) => fn.id === funcionarioId);
    return f?.nome || "—";
  };

  // ── Month label ──
  const mesLabel = useMemo(() => {
    if (!mesFiltro) return "Todos";
    const [year, month] = mesFiltro.split("-").map(Number);
    const d = new Date(year, month - 1, 1);
    return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [mesFiltro]);

  // ── Status badge helper ──
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Recebido":
        return <Badge className="text-[10px] bg-green-500/10 text-green-600"><CheckCircle2 className="mr-1 h-3 w-3" />Recebido</Badge>;
      case "Previsto":
        return <Badge className="text-[10px] bg-blue-500/10 text-blue-600"><Clock className="mr-1 h-3 w-3" />Previsto</Badge>;
      case "Pendente":
        return <Badge className="text-[10px] bg-amber-500/10 text-amber-600"><AlertCircle className="mr-1 h-3 w-3" />Pendente</Badge>;
      default:
        return <Badge className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Page Title + Month Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="h-7 w-7 text-[var(--motriz-verde-esmeralda)]" />
          <h1 className="text-xl font-bold tracking-tight">Gestão de Vendas</h1>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Input
            type="month"
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value)}
            className="w-44 h-9 text-sm"
          />
          <span className="text-xs text-muted-foreground capitalize">{mesLabel}</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-l-4 border-l-[var(--motriz-verde-esmeralda)]">
          <CardContent className="pt-4">
            <p className="text-xs font-medium text-muted-foreground">Total Vendido</p>
            <p className="text-xl font-bold tabular-nums text-[var(--motriz-verde-esmeralda)]">{formatCurrency(kpis.totalVendido)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-teal-500">
          <CardContent className="pt-4">
            <p className="text-xs font-medium text-muted-foreground">Lucro Líquido</p>
            <p className={`text-xl font-bold tabular-nums ${kpis.lucroLiquidoTotal >= 0 ? "text-[var(--motriz-verde-esmeralda)]" : "text-[var(--motriz-vermelho)]"}`}>{formatCurrency(kpis.lucroLiquidoTotal)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[var(--motriz-ambar)]">
          <CardContent className="pt-4">
            <p className="text-xs font-medium text-muted-foreground">Comissões a Pagar</p>
            <p className="text-xl font-bold tabular-nums text-[var(--motriz-ambar)]">{formatCurrency(kpis.comissoesAPagar)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <p className="text-xs font-medium text-muted-foreground">Vendas Recebidas</p>
            <p className="text-xl font-bold tabular-nums text-blue-600">{kpis.vendasRecebidas} / {vendasFiltradas.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Section: Cadastrar Comprador + Registrar Venda */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Cadastrar Comprador */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <User className="h-4 w-4 text-[var(--motriz-verde-esmeralda)]" />
              Cadastrar Comprador (PF)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome Completo *</Label>
              <Input placeholder="Nome do comprador" value={novoCompradorNome} onChange={(e) => setNovoCompradorNome(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CPF *</Label>
              <Input placeholder="000.000.000-00" value={novoCompradorCpf} onChange={(e) => setNovoCompradorCpf(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Celular</Label>
              <Input placeholder="(00) 00000-0000" value={novoCompradorCelular} onChange={(e) => setNovoCompradorCelular(e.target.value)} className="h-8 text-sm" />
            </div>
            <Button onClick={handleSalvarComprador} className="w-full h-8 text-xs bg-[var(--motriz-verde-esmeralda)] hover:bg-[var(--motriz-verde-esmeralda)]/90">
              <Plus className="mr-1 h-3 w-3" /> Salvar Comprador
            </Button>
            {compradores.length > 0 && (
              <div className="mt-3 border-t pt-3">
                <p className="mb-2 text-[10px] font-semibold text-muted-foreground uppercase">Cadastrados ({compradores.length})</p>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {compradores.map((c) => (
                    <div key={c.id} className="rounded bg-muted/50 px-2 py-1.5 text-xs">
                      <p className="font-medium">{c.nome}</p>
                      <p className="text-[10px] text-muted-foreground">CPF: {c.cpf} | Cel: {c.celular || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Registrar Venda */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Bike className="h-4 w-4 text-[var(--motriz-verde-esmeralda)]" />
              Registrar Venda
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Select Moto */}
              <div className="space-y-1">
                <Label className="text-xs">Moto Disponível *</Label>
                <Select value={selectedMotoId} onValueChange={setSelectedMotoId}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione a moto" /></SelectTrigger>
                  <SelectContent>
                    {motosDisponiveis.length === 0 ? (
                      <SelectItem value="__none__" disabled>Nenhuma moto disponível</SelectItem>
                    ) : (
                      motosDisponiveis.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.modelo} — {m.chassi}{m.cor ? ` (${m.cor})` : ""} — Custo: {formatCurrency(m.valorContabil || 0)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedMoto && (
                  <p className="text-[10px] text-muted-foreground">
                    Valor contábil: {formatCurrency(selectedMoto.valorContabil || 0)} | Status: {selectedMoto.status}
                  </p>
                )}
              </div>

              {/* Select Comprador */}
              <div className="space-y-1">
                <Label className="text-xs">Comprador *</Label>
                <Select value={selectedCompradorId} onValueChange={setSelectedCompradorId}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione o comprador" /></SelectTrigger>
                  <SelectContent>
                    {compradores.length === 0 ? (
                      <SelectItem value="__none__" disabled>Cadastre um comprador primeiro</SelectItem>
                    ) : (
                      compradores.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome} — {c.cpf}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Valor da Venda */}
              <div className="space-y-1">
                <Label className="text-xs">Valor da Venda (R$) *</Label>
                <Input type="number" min="0" step="0.01" placeholder="0,00" value={valorVenda} onChange={(e) => setValorVenda(e.target.value)} className="h-8 text-sm" />
              </div>

              {/* Data da Venda */}
              <div className="space-y-1">
                <Label className="text-xs">Data da Venda *</Label>
                <Input type="date" value={dataVenda} onChange={(e) => setDataVenda(e.target.value)} className="h-8 text-sm" />
              </div>

              {/* Porcentagem de Imposto */}
              <div className="space-y-1">
                <Label className="text-xs">Imposto (%)</Label>
                <Input type="number" min="0" max="100" step="0.1" value={impostoPercentual} onChange={(e) => setImpostoPercentual(e.target.value)} className="h-8 text-sm" />
              </div>

              {/* Funcionário Vendedor */}
              <div className="space-y-1">
                <Label className="text-xs">Vendedor (Funcionário/Sócio) *</Label>
                <Select value={funcionarioVendedorId} onValueChange={setFuncionarioVendedorId}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione o vendedor" /></SelectTrigger>
                  <SelectContent>
                    {funcionarios.filter((f) => f.ativo).map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.nome} ({f.funcao})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Comissão */}
              <div className="space-y-1">
                <Label className="text-xs">Comissão do Vendedor (%)</Label>
                <Input type="number" min="0" max="100" step="0.1" value={comissaoPercentual} onChange={(e) => setComissaoPercentual(e.target.value)} className="h-8 text-sm" />
                <p className="text-[10px] text-muted-foreground">0 = sem comissão (não gera lançamento)</p>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <Label className="text-xs">Status do Pagamento</Label>
                <Select value={statusPagamento} onValueChange={(v) => setStatusPagamento(v as "Recebido" | "Previsto" | "Pendente")}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Recebido">Recebido (remove moto do estoque)</SelectItem>
                    <SelectItem value="Previsto">Previsto (moto permanece)</SelectItem>
                    <SelectItem value="Pendente">Pendente (moto permanece)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Parcelamento */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ehParcelada"
                  checked={ehParcelada}
                  onCheckedChange={(v) => setEhParcelada(!!v)}
                />
                <Label htmlFor="ehParcelada" className="text-xs cursor-pointer">Venda parcelada</Label>
              </div>
              {ehParcelada && (
                <div className="space-y-1 pl-6">
                  <Label className="text-xs">Número de Parcelas</Label>
                  <Input
                    type="number"
                    min={2}
                    max={48}
                    value={numeroParcelas}
                    onChange={(e) => setNumeroParcelas(e.target.value)}
                    className="h-8 w-24 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Valor de cada parcela: {formatCurrency((parseFloat(valorVenda) || 0) / (parseInt(numeroParcelas) || 1))}
                  </p>
                </div>
              )}
            </div>

            {/* Observações */}
            <div className="space-y-1">
              <Label className="text-xs">Observações</Label>
              <Input placeholder="Observações opcionais" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className="h-8 text-sm" />
            </div>

            {/* Profit Preview */}
            <div className="rounded-lg border border-[var(--motriz-verde-esmeralda)]/30 bg-[var(--motriz-verde-esmeralda)]/5 p-3">
              <div className="mb-2 flex items-center gap-1.5">
                <Calculator className="h-3.5 w-3.5 text-[var(--motriz-verde-esmeralda)]" />
                <span className="text-xs font-semibold text-[var(--motriz-verde-esmeralda)]">Prévia do Lucro</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                <div>
                  <span className="text-muted-foreground">Custo Contábil:</span>
                  <p className="font-medium tabular-nums">{formatCurrency(profitPreview.custoContabil)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Imposto ({impostoPercentual}%):</span>
                  <p className="font-medium tabular-nums text-[var(--motriz-ambar)]">-{formatCurrency(profitPreview.valorImposto)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Comissão ({comissaoPercentual}%):</span>
                  <p className="font-medium tabular-nums text-[var(--motriz-ambar)]">-{formatCurrency(profitPreview.valorComissao)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Lucro Líquido:</span>
                  <p className={`font-bold tabular-nums ${profitPreview.lucro >= 0 ? "text-[var(--motriz-verde-esmeralda)]" : "text-[var(--motriz-vermelho)]"}`}>{formatCurrency(profitPreview.lucro)}</p>
                </div>
              </div>
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                Fórmula: Lucro = Valor Venda − (Venda × Imposto%) − (Venda × Comissão%) − Custo Contábil
              </p>
            </div>

            <Button onClick={handleRegistrarVenda} className="w-full h-9 text-sm bg-[var(--motriz-verde-esmeralda)] hover:bg-[var(--motriz-verde-esmeralda)]/90">
              <DollarSign className="mr-1.5 h-4 w-4" /> Registrar Venda
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4 text-[var(--motriz-verde-esmeralda)]" />
            Histórico de Vendas — {mesLabel} ({vendasFiltradas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vendasFiltradas.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <Calendar className="mx-auto mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">Nenhuma venda registrada neste período.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Moto</TableHead>
                    <TableHead className="text-xs">Chassi</TableHead>
                    <TableHead className="text-xs">Cor</TableHead>
                    <TableHead className="text-xs">Comprador</TableHead>
                    <TableHead className="text-xs">CPF</TableHead>
                    <TableHead className="text-xs">Celular</TableHead>
                    <TableHead className="text-xs">Vendedor</TableHead>
                    <TableHead className="text-xs text-right">Custo</TableHead>
                    <TableHead className="text-xs text-right">Venda</TableHead>
                    <TableHead className="text-xs text-right">Imposto</TableHead>
                    <TableHead className="text-xs text-right">Comissão</TableHead>
                    <TableHead className="text-xs text-right">Lucro Líq.</TableHead>
                    <TableHead className="text-xs">Parcelamento</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendasFiltradas
                    .sort((a, b) => new Date(b.dataVenda).getTime() - new Date(a.dataVenda).getTime())
                    .map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="text-xs tabular-nums whitespace-nowrap">{new Date(v.dataVenda).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-xs font-medium">{v.modelo}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{v.chassi}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{v.cor || "—"}</TableCell>
                      <TableCell className="text-xs">{v.compradorNome}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{v.compradorCpf}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{v.compradorCelular || "—"}</TableCell>
                      <TableCell className="text-xs">{getSellerName(v.funcionarioResponsavelId)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{formatCurrency(v.valorContabil)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-medium">{formatCurrency(v.valorVenda)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-[var(--motriz-ambar)]">{formatCurrency(v.impostoValor || 0)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-[var(--motriz-ambar)]">{formatCurrency(v.comissaoValor || 0)}</TableCell>
                      <TableCell className={`text-xs text-right tabular-nums font-bold ${(v.lucroLiquido || 0) >= 0 ? "text-[var(--motriz-verde-esmeralda)]" : "text-[var(--motriz-vermelho)]"}`}>{formatCurrency(v.lucroLiquido || 0)}</TableCell>
                      <TableCell className="text-xs">
                        {v.ehParcelada ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--motriz-ambar)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--motriz-ambar)]">
                              {v.numeroParcelas}x {formatCurrency(v.valorParcela || 0)}
                            </span>
                            <p className="text-[10px] text-muted-foreground">
                              {getParcelasRecebidasPorVenda(v.id).recebidas}/{v.numeroParcelas} recebidas
                            </p>
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            À vista
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openStatusChangeDialog(v)}
                          className="h-7 px-2 text-xs"
                        >
                          {getStatusBadge(v.statusPagamento)}
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" onClick={() => handleConfirmDelete(v.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Modal */}
      <Dialog open={senhaModalOpen} onOpenChange={(open) => { if (!open) cancelarSenha(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4 text-[var(--motriz-ambar)]" />
              Autorização Necessária
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground whitespace-pre-line">{senhaMensagem}</p>
            <Input
              type="password"
              placeholder="Digite a senha"
              value={senhaInput}
              onChange={(e) => setSenhaInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") confirmarSenha(); }}
              className="h-9"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={cancelarSenha}>Cancelar</Button>
            <Button size="sm" onClick={confirmarSenha} disabled={!senhaInput}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={statusChangeDialogOpen} onOpenChange={setStatusChangeDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Alterar Status da Venda</DialogTitle>
          </DialogHeader>
          {vendaParaStatusChange && (
            <div className="space-y-3">
              <div className="rounded bg-muted/50 p-3 text-xs">
                <p><strong>Moto:</strong> {vendaParaStatusChange.modelo} ({vendaParaStatusChange.chassi})</p>
                <p><strong>Valor:</strong> {formatCurrency(vendaParaStatusChange.valorVenda)}</p>
                <p><strong>Status atual:</strong> {vendaParaStatusChange.statusPagamento}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Novo Status</Label>
                <Select value={novoStatusSelecionado} onValueChange={(v) => setNovoStatusSelecionado(v as "Recebido" | "Previsto" | "Pendente")}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Recebido">Recebido (remove moto do estoque se ainda existir)</SelectItem>
                    <SelectItem value="Previsto">Previsto (lançamento fica Pendente)</SelectItem>
                    <SelectItem value="Pendente">Pendente (lançamento fica Pendente)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {novoStatusSelecionado === "Recebido" && vendaParaStatusChange.statusPagamento !== "Recebido"
                  ? "⚠️ Ao marcar como Recebido, a moto será removida do estoque e os lançamentos serão marcados como Recebido."
                  : novoStatusSelecionado !== "Recebido" && vendaParaStatusChange.statusPagamento === "Recebido"
                  ? "⚠️ Ao mudar de Recebido, os lançamentos serão marcados como Pendente. A moto NÃO será devolvida ao estoque automaticamente."
                  : "Os lançamentos associados serão atualizados conforme o novo status."}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setStatusChangeDialogOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleConfirmarMudancaStatus}>Confirmar Alteração</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}