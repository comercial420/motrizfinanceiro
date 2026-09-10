"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  CalendarClock,
  User,
  FileText,
  TrendingDown,
  Filter,
  Package,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { LancamentoFinanceiro } from "@/types";

type FiltroTipo = "todas" | "mau_uso" | "custo_empresa";

export default function HistoricoVisitasPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const lancamentos = useStore((s) => s.lancamentos);
  const contratos = useStore((s) => s.contratos);
  const clientes = useStore((s) => s.clientes);

  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todas");
  const [filtroMes, setFiltroMes] = useState<string>("todos");

  // Todas as visitas técnicas
  const todasVisitas = useMemo(() => {
    if (!mounted) return [];
    return lancamentos
      .filter((l) => l.ehVisitaTecnico === true)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [mounted, lancamentos]);

  // Meses disponíveis
  const mesesDisponiveis = useMemo(() => {
    const meses = new Set<string>();
    todasVisitas.forEach((v) => {
      const d = new Date(v.data);
      meses.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    });
    return Array.from(meses).sort().reverse();
  }, [todasVisitas]);

  // Visitas filtradas
  const visitasFiltradas = useMemo(() => {
    let resultado = todasVisitas;

    // Filtro por tipo
    if (filtroTipo === "mau_uso") {
      resultado = resultado.filter((v) => v.ehMauUso === true);
    } else if (filtroTipo === "custo_empresa") {
      resultado = resultado.filter((v) => !v.ehMauUso);
    }

    // Filtro por mês
    if (filtroMes !== "todos") {
      resultado = resultado.filter((v) => {
        const d = new Date(v.data);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return ym === filtroMes;
      });
    }

    return resultado;
  }, [todasVisitas, filtroTipo, filtroMes]);

  // KPIs
  const totalCustoEmpresa = useMemo(() => {
    return visitasFiltradas
      .filter((v) => !v.ehMauUso)
      .reduce((acc, v) => acc + v.valor, 0);
  }, [visitasFiltradas]);

  const totalCustoMauUso = useMemo(() => {
    return visitasFiltradas
      .filter((v) => v.ehMauUso === true)
      .reduce((acc, v) => acc + v.valor, 0);
  }, [visitasFiltradas]);

  const totalCobradoMauUso = useMemo(() => {
    return visitasFiltradas
      .filter((v) => v.ehMauUso === true)
      .reduce((acc, v) => acc + (v.valorCobrarCliente || 0), 0);
  }, [visitasFiltradas]);

  const visitasSemMauUso = useMemo(() => {
    return visitasFiltradas.filter((v) => !v.ehMauUso).length;
  }, [visitasFiltradas]);

  const visitasComMauUso = useMemo(() => {
    return visitasFiltradas.filter((v) => v.ehMauUso === true).length;
  }, [visitasFiltradas]);

  // KPIs de Peças
  const totalCustoPecas = useMemo(() => {
    return visitasFiltradas.reduce((acc, v) => {
      if (!v.pecasUsadas) return acc;
      return acc + v.pecasUsadas.reduce((a, p) => a + p.subtotal, 0);
    }, 0);
  }, [visitasFiltradas]);

  const resumoPecasMes = useMemo(() => {
    const mapa: Record<string, { nome: string; quantidade: number; custoTotal: number }> = {};
    for (const v of visitasFiltradas) {
      if (!v.pecasUsadas) continue;
      for (const p of v.pecasUsadas) {
        if (!mapa[p.pecaId]) mapa[p.pecaId] = { nome: p.nome, quantidade: 0, custoTotal: 0 };
        mapa[p.pecaId].quantidade += p.quantidade;
        mapa[p.pecaId].custoTotal += p.subtotal;
      }
    }
    return Object.values(mapa).sort((a, b) => b.custoTotal - a.custoTotal);
  }, [visitasFiltradas]);

  // Buscar nome do contrato
  function getContratoNome(contratoId?: string): string {
    if (!contratoId) return "—";
    const contrato = contratos.find((c) => c.id === contratoId);
    if (!contrato) return "—";
    const cliente = clientes.find((c) => c.id === contrato.clienteId);
    return cliente?.nome || contrato.numeroContrato || "—";
  }

  // Formatar mês para display
  function formatMes(ym: string): string {
    const [ano, mes] = ym.split("-");
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    return `${meses[parseInt(mes) - 1]} ${ano}`;
  }

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="size-6 text-[#14B8A6]" />
            Histórico de Visitas Técnicas
          </h1>
          <p className="text-sm text-muted-foreground">
            Todas as visitas realizadas, custos da empresa e cobranças de mau uso
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Filtros:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Tipo:</span>
              <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as FiltroTipo)}>
                <SelectTrigger className="h-8 w-48 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Visitas</SelectItem>
                  <SelectItem value="mau_uso">Apenas Mau Uso</SelectItem>
                  <SelectItem value="custo_empresa">Apenas Custo da Empresa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Período:</span>
              <Select value={filtroMes} onValueChange={setFiltroMes}>
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Meses</SelectItem>
                  {mesesDisponiveis.map((m) => (
                    <SelectItem key={m} value={m}>{formatMes(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Visitas</CardTitle>
            <Wrench className="size-4 text-[#14B8A6]" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{visitasFiltradas.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {visitasSemMauUso} custo empresa · {visitasComMauUso} mau uso
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Custo da Empresa (sem mau uso)</CardTitle>
            <DollarSign className="size-4 text-[var(--motriz-vermelho)]" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-[var(--motriz-vermelho)]">{formatCurrency(totalCustoEmpresa)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {visitasSemMauUso} visita(s) custeadas integralmente pela empresa
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Custo em Visitas com Mau Uso</CardTitle>
            <AlertTriangle className="size-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-orange-600">{formatCurrency(totalCustoMauUso)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Custo das peças/técnico nas visitas com mau uso identificado
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Custo em Peças (Estoque)</CardTitle>
            <Package className="size-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-blue-600">{formatCurrency(totalCustoPecas)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {resumoPecasMes.length} tipo(s) de peça(s) usada(s) no período
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cobrado (Mau Uso)</CardTitle>
            <CheckCircle2 className="size-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-green-600">{formatCurrency(totalCobradoMauUso)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Valor total cobrado dos clientes por mau uso
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Visitas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="size-4" />
            Detalhamento de Todas as Visitas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {visitasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="size-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma visita encontrada com os filtros selecionados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Descrição</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Categoria</TableHead>
                    <TableHead className="text-xs">Técnico</TableHead>
                    <TableHead className="text-xs">Contrato</TableHead>
                    <TableHead className="text-xs text-right">Custo Empresa</TableHead>
                    <TableHead className="text-xs text-right">Peças (Estoque)</TableHead>
                    <TableHead className="text-xs text-center">Mau Uso?</TableHead>
                    <TableHead className="text-xs text-right">Cobrado Cliente</TableHead>
                    <TableHead className="text-xs text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visitasFiltradas.map((visita) => (
                    <TableRow key={visita.id} className={visita.ehMauUso ? "bg-orange-500/5" : ""}>
                      <TableCell className="text-xs tabular-nums whitespace-nowrap">
                        {formatDate(visita.data)}
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">
                        {visita.descricao}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-[10px]">
                          {visita.tipoVisita || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {visita.categoriaCustoVisita || "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1">
                          <User className="size-3 text-muted-foreground" />
                          {visita.tecnicoResponsavel || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate">
                        {getContratoNome(visita.contratoId)}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums text-right text-[var(--motriz-vermelho)] font-medium">
                        {formatCurrency(visita.valor)}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums text-right">
                        {visita.pecasUsadas && visita.pecasUsadas.length > 0 ? (
                          <span
                            className="text-blue-600 font-medium cursor-help"
                            title={visita.pecasUsadas.map((p) => `${p.nome}: ${p.quantidade}x R$ ${p.custoUnitario.toFixed(2)} = R$ ${p.subtotal.toFixed(2)}`).join('\n')}
                          >
                            {formatCurrency(visita.pecasUsadas.reduce((a, p) => a + p.subtotal, 0))}
                            <span className="ml-1 text-[9px] text-muted-foreground">({visita.pecasUsadas.length})</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {visita.ehMauUso ? (
                          <Badge className="text-[10px] bg-orange-500/10 text-orange-600">
                            <AlertTriangle className="size-3 mr-1" />
                            Sim
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Não
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums text-right">
                        {visita.ehMauUso && visita.valorCobrarCliente ? (
                          <span className="text-green-600 font-medium">
                            {formatCurrency(visita.valorCobrarCliente)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={`text-[10px] ${
                            visita.status === "Pago"
                              ? "bg-green-500/10 text-green-600"
                              : visita.status === "Pendente"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-blue-500/10 text-blue-600"
                          }`}
                        >
                          {visita.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo: Visitas que saíram direto de custo da empresa */}
      {visitasSemMauUso > 0 && (
        <Card className="border-red-500/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-[var(--motriz-vermelho)]">
              <TrendingDown className="size-4" />
              Visitas com Custo Integral da Empresa (sem cobrança ao cliente)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Estas visitas foram custeadas integralmente pela empresa — não houve mau uso identificado ou não foi cobrado do cliente.
            </p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Descrição</TableHead>
                    <TableHead className="text-xs">Técnico</TableHead>
                    <TableHead className="text-xs">Categoria</TableHead>
                    <TableHead className="text-xs text-right">Custo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visitasFiltradas
                    .filter((v) => !v.ehMauUso)
                    .map((visita) => (
                      <TableRow key={visita.id}>
                        <TableCell className="text-xs tabular-nums whitespace-nowrap">
                          {formatDate(visita.data)}
                        </TableCell>
                        <TableCell className="text-xs max-w-[250px] truncate">
                          {visita.descricao}
                        </TableCell>
                        <TableCell className="text-xs">
                          {visita.tecnicoResponsavel || "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {visita.categoriaCustoVisita || "—"}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums text-right text-[var(--motriz-vermelho)] font-medium">
                          {formatCurrency(visita.valor)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-md border border-red-500/20 bg-red-500/5 p-3">
              <span className="text-xs font-medium text-[var(--motriz-vermelho)]">
                Total custeado pela empresa (sem reembolso):
              </span>
              <span className="text-lg font-bold tabular-nums text-[var(--motriz-vermelho)]">
                {formatCurrency(totalCustoEmpresa)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quadro Resumo: Peças Usadas no Período */}
      {resumoPecasMes.length > 0 && (
        <Card className="border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-blue-600">
              <Package className="size-4" />
              Resumo de Peças Usadas no Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Consolidado de todas as peças retiradas do estoque nas visitas técnicas deste período. Os valores refletem o custo unitário cadastrado × quantidade usada.
            </p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Peça</TableHead>
                    <TableHead className="text-xs text-right">Qtd. Total Usada</TableHead>
                    <TableHead className="text-xs text-right">Custo Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumoPecasMes.map((p) => (
                    <TableRow key={p.nome}>
                      <TableCell className="text-xs font-medium">{p.nome}</TableCell>
                      <TableCell className="text-xs tabular-nums text-right">{p.quantidade} un</TableCell>
                      <TableCell className="text-xs tabular-nums text-right text-blue-600 font-medium">
                        {formatCurrency(p.custoTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-md border border-blue-500/20 bg-blue-500/5 p-3">
              <span className="text-xs font-medium text-blue-600">
                Total gasto em peças do estoque:
              </span>
              <span className="text-lg font-bold tabular-nums text-blue-600">
                {formatCurrency(totalCustoPecas)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}