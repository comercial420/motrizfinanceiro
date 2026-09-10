"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ChartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ChartErrorBoundary] Chart render failed:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <Card className="min-h-[200px]">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <AlertTriangle className="size-8 text-[var(--motriz-ambar)]" />
            <p className="text-sm font-medium text-muted-foreground">
              Não foi possível carregar este gráfico.
            </p>
            <Button variant="outline" size="sm" onClick={this.handleRetry}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}