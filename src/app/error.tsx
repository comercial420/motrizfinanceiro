"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[AppError]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Algo deu errado</h2>
            <p className="text-sm text-muted-foreground">
              Ocorreu um erro inesperado. Tente novamente ou recarregue a página.
            </p>
          </div>
          <div className="w-full max-h-40 overflow-auto rounded-md bg-muted/50 p-3 text-left">
            <p className="text-xs font-mono text-destructive break-all">{error.message}</p>
            {error.stack && (
              <pre className="mt-2 text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-all">{error.stack}</pre>
            )}
          </div>
          {error.digest && (
            <p className="text-xs font-mono text-muted-foreground">
              Código: {error.digest}
            </p>
          )}
          <Button variant="outline" onClick={retry}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}