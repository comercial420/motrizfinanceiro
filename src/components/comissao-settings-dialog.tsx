"use client";

import { useState } from "react";
import { Settings, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useStore } from "@/lib/store";

interface ComissaoSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ComissaoSettingsDialog({ open, onOpenChange }: ComissaoSettingsDialogProps) {
  const pctImposto = useStore((s) => s.percentualImposto);
  const pctComercial = useStore((s) => s.percentualComissaoComercial);
  const pctOperacional = useStore((s) => s.percentualComissaoOperacional);
  const setPctImposto = useStore((s) => s.setPercentualImposto);
  const setPctComercial = useStore((s) => s.setPercentualComissaoComercial);
  const setPctOperacional = useStore((s) => s.setPercentualComissaoOperacional);

  // Estado temporário para confirmação de imposto
  const [pendingPctImposto, setPendingPctImposto] = useState<number | null>(null);
  const [confirmImpostoOpen, setConfirmImpostoOpen] = useState(false);

  function handleImpostoSliderChange(value: number) {
    setPendingPctImposto(value);
    setConfirmImpostoOpen(true);
  }

  function confirmarMudancaImposto() {
    if (pendingPctImposto !== null) {
      setPctImposto(pendingPctImposto);
      toast.success(`Taxa de imposto alterada para ${pendingPctImposto}% — todos os cálculos foram atualizados`);
    }
    setConfirmImpostoOpen(false);
    setPendingPctImposto(null);
  }

  function cancelarMudancaImposto() {
    setConfirmImpostoOpen(false);
    setPendingPctImposto(null);
  }

  function handleSave() {
    toast.success("Porcentagens de comissão atualizadas");
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="size-4 text-[#14B8A6]" />
              Configurar Porcentagens
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Imposto */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Imposto sobre Faturamento</Label>
                <span className="text-sm font-bold tabular-nums text-[var(--motriz-vermelho)]">{pctImposto}%</span>
              </div>
              <Slider
                min={0}
                max={30}
                step={0.5}
                value={[pctImposto]}
                onValueChange={([v]) => handleImpostoSliderChange(v)}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                <span>0%</span>
                <span>15%</span>
                <span>30%</span>
              </div>
            </div>

            {/* Comercial */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Comissão Comercial (sobre pós-imposto)</Label>
                <span className="text-sm font-bold tabular-nums text-blue-600">{pctComercial}%</span>
              </div>
              <Slider
                min={0}
                max={20}
                step={0.5}
                value={[pctComercial]}
                onValueChange={([v]) => setPctComercial(v)}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                <span>0%</span>
                <span>10%</span>
                <span>20%</span>
              </div>
            </div>

            {/* Operacional */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Comissão Operacional (sobre líquido)</Label>
                <span className="text-sm font-bold tabular-nums text-orange-600">{pctOperacional}%</span>
              </div>
              <Slider
                min={0}
                max={20}
                step={0.5}
                value={[pctOperacional]}
                onValueChange={([v]) => setPctOperacional(v)}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                <span>0%</span>
                <span>10%</span>
                <span>20%</span>
              </div>
            </div>

            <div className="rounded-md border border-dashed border-muted-foreground/20 bg-muted/30 p-2.5">
              <p className="text-[10px] text-muted-foreground">
                ⚠️ Alterar as porcentagens recalcula os valores exibidos imediatamente. Lançamentos já gerados para meses anteriores não são alterados.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-[#14B8A6] hover:bg-[#0D9488]">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação: Mudança de % Imposto */}
      <AlertDialog open={confirmImpostoOpen} onOpenChange={(isOpen) => { if (!isOpen) cancelarMudancaImposto(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-[var(--motriz-ambar)]" />
              Confirmar alteração da taxa de imposto
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  Você está alterando a taxa de imposto de <strong className="text-foreground">{pctImposto}%</strong> para <strong className="text-foreground">{pendingPctImposto ?? pctImposto}%</strong>.
                </p>
                <div className="rounded-md border border-[var(--motriz-ambar)]/30 bg-[var(--motriz-ambar)]/5 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-[var(--motriz-ambar)]">⚠️ Esta mudança impacta TODOS os cálculos:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                    <li><strong>Imposto do mês</strong> — valor deduzido do faturamento bruto</li>
                    <li><strong>Base pós-imposto</strong> — base de cálculo das comissões</li>
                    <li><strong>Comissões dos funcionários</strong> — recalculadas sobre a nova base</li>
                    <li><strong>Resultado Final do Mês</strong> — lucro líquido após todas as deduções</li>
                    <li><strong>Divisão Societária</strong> — participação dos sócios no resultado</li>
                    <li><strong>Dashboard</strong> — todos os cards e gráficos da página inicial</li>
                    <li><strong>Projeções</strong> — cenário base, otimista e pessimista</li>
                  </ul>
                </div>
                <p className="text-xs text-muted-foreground">
                  A alteração é aplicada imediatamente em todos os meses e persistida. Deseja confirmar?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelarMudancaImposto}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarMudancaImposto}
              className="bg-[var(--motriz-ambar)] text-white hover:bg-[var(--motriz-ambar)]/90"
            >
              Confirmar alteração para {pendingPctImposto ?? pctImposto}%
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}