"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/sync";
import { loadSeedData } from "@/data/seed";
import { Database, CheckCircle2, AlertTriangle } from "lucide-react";

/**
 * Componente que inicializa a sincronização com o Supabase ao montar.
 * Mostra um indicador discreto no canto inferior direito durante o sync.
 */
export function SupabaseInit() {
  const syncFromSupabase = useStore((s) => s.syncFromSupabase);
  const [status, setStatus] = useState<"idle" | "syncing" | "done" | "error" | "local">("idle");

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setStatus("local");
      // Se o store estiver vazio (primeiro acesso ou localStorage limpo), carrega seed data
      const state = useStore.getState();
      if (state.motos.length === 0 && state.clientes.length === 0) {
        loadSeedData();
      }
      // Migração automática no modo local (seed data + localStorage)
      // Roda após um pequeno delay para garantir que o seed foi carregado
      setTimeout(() => {
        useStore.getState().migrarLancamentosFuncionariosParaFixo();
      }, 500);
      setTimeout(() => setStatus("idle"), 3000);
      return;
    }
    setStatus("syncing");
    syncFromSupabase().then((ok) => {
      setStatus(ok ? "done" : "local");
      // Migração automática também após sync ou fallback local
      useStore.getState().migrarLancamentosFuncionariosParaFixo();
      // Esconder o indicador após 3 segundos
      setTimeout(() => setStatus("idle"), 3000);
    });
  }, [syncFromSupabase]);

  if (status === "idle") return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-border bg-background/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2">
      {status === "syncing" && (
        <>
          <Database className="size-3.5 animate-pulse text-[var(--motriz-verde-esmeralda)]" />
          <span className="text-muted-foreground">Sincronizando com Supabase...</span>
        </>
      )}
      {status === "done" && (
        <>
          <CheckCircle2 className="size-3.5 text-[var(--motriz-verde-esmeralda)]" />
          <span className="text-[var(--motriz-verde-esmeralda)] font-medium">Dados sincronizados</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertTriangle className="size-3.5 text-[var(--motriz-vermelho)]" />
          <span className="text-[var(--motriz-vermelho)]">Erro ao sincronizar</span>
        </>
      )}
      {status === "local" && (
        <>
          <Database className="size-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Modo local (Supabase não configurado)</span>
        </>
      )}
    </div>
  );
}