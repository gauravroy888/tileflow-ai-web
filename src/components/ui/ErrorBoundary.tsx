import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] w-full flex flex-col items-center justify-center p-6 bg-surface rounded-2xl border border-border text-center my-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-500 mb-4">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-xl font-bold text-textPrimary mb-2">Something went wrong</h2>
          <p className="text-sm text-textSecondary max-w-md mb-6">
            An unexpected error occurred in this component.
          </p>
          {this.state.error && (
            <div className="bg-sand/50 border border-border rounded-xl p-3 text-left font-mono text-xs text-textSecondary max-w-lg overflow-x-auto mb-6 w-full">
              {this.state.error.toString()}
            </div>
          )}
          <Button onClick={this.handleReset} className="flex items-center gap-2">
            <RefreshCw size={16} />
            Reload Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
