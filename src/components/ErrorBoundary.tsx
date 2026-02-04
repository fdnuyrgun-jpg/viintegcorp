import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (import.meta.env.PROD) {
      console.error("ErrorBoundary:", error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
          <h1 className="text-2xl font-bold text-destructive mb-2">
            Произошла ошибка
          </h1>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            Приложение временно недоступно. Попробуйте обновить страницу или
            войти позже.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Обновить страницу
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
