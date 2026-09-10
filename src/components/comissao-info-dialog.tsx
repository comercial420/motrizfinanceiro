"use client";

import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ComissaoInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ComissaoInfoDialog({ open, onOpenChange }: ComissaoInfoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="size-4 text-[#14B8A6]" />
            Como Funciona o Cálculo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
            <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Cascata de Cálculo</p>
            <div className="space-y-1.5 font-mono text-xs">
              <p className="text-[var(--motriz-verde-esmeralda)]">① Faturamento Bruto = Σ contratos ativos</p>
              <p className="text-[var(--motriz-vermelho)]">② (−) Imposto = Bruto × 10%</p>
              <p className="text-[#14B8A6]">③ Base Pós-Imposto = ① − ②</p>
              <p className="text-[var(--motriz-vermelho)]">④ (−) Despesas = Fixas + Variáveis do mês</p>
              <p className="text-[#14B8A6]">⑤ Base Operacional = max(0, ③ − ④)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-3">
              <p className="text-xs font-semibold text-blue-600 mb-1">Comissão Comercial</p>
              <p className="text-[10px] text-muted-foreground mb-2">Base: Pós-Imposto (não deduz despesas)</p>
              <p className="font-mono text-xs">③ × 8%</p>
            </div>
            <div className="rounded-md border border-orange-500/20 bg-orange-500/5 p-3">
              <p className="text-xs font-semibold text-orange-600 mb-1">Comissão Operacional</p>
              <p className="text-[10px] text-muted-foreground mb-2">Base: Pós-Imposto − Despesas</p>
              <p className="font-mono text-xs">⑤ × 5%</p>
            </div>
          </div>

          <div className="rounded-md border border-dashed border-border p-3 space-y-2">
            <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Exemplo Numérico</p>
            <div className="space-y-1 text-xs font-mono">
              <p>Faturamento Bruto: R$ 50.000,00</p>
              <p>(−) Imposto 10%: R$ 5.000,00</p>
              <p className="text-[#14B8A6] font-semibold">= Base Pós-Imposto: R$ 45.000,00</p>
              <p>(−) Despesas: R$ 20.000,00</p>
              <p className="text-[#14B8A6] font-semibold">= Base Operacional: R$ 25.000,00</p>
              <p className="mt-2 text-blue-600">Com. Comercial: R$ 45.000 × 8% = R$ 3.600,00</p>
              <p className="text-orange-600">Com. Operacional: R$ 25.000 × 5% = R$ 1.250,00</p>
              <p className="mt-1 font-bold">Resultado Final: R$ 25.000 − 3.600 − 1.250 = R$ 20.150,00</p>
            </div>
          </div>

          <div className="rounded-md border border-dashed border-[#14B8A6]/30 bg-[#14B8A6]/5 p-3">
            <p className="text-[10px] text-muted-foreground">
              💡 As porcentagens de imposto, comissão comercial e operacional podem ser alteradas no botão &quot;⚙️ Configurar %&quot;. Os lançamentos já gerados não são alterados retroativamente.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}