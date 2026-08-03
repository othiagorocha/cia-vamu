"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
  fallbackTitle?: string;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-24 text-center text-muted-foreground">
          <AlertTriangleIcon className="size-10 text-destructive" />
          <p>{this.props.fallbackTitle ?? "Algo deu errado ao carregar."}</p>
          <Button variant="outline" size="sm" onClick={this.reset}>
            Tentar novamente
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
