import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  hasError: boolean;
  message: string | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('[error-boundary]', err, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">Something went wrong.</p>
          {this.state.message && <p className="mt-1 opacity-80">{this.state.message}</p>}
        </div>
      );
    }
    return this.props.children;
  }
}
