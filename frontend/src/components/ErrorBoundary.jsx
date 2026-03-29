import { Component } from "react";
import { AlertTriangle } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--bg))] p-8">
          <div className="max-w-lg space-y-6 rounded-[28px] border border-[hsl(var(--border-strong))] bg-[hsl(var(--surface-2)/0.9)] p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[hsl(var(--red)/0.4)] bg-[hsl(var(--red)/0.12)]">
              <AlertTriangle className="h-7 w-7 text-[hsl(var(--red))]" />
            </div>

            <h2 className="text-xl font-bold text-[hsl(var(--fg))]">
              Something went wrong
            </h2>

            <p className="text-sm leading-7 text-[hsl(var(--fg-muted))]">
              {this.state.error?.message || "An unexpected error occurred in the UI."}
            </p>

            <button
              onClick={this.handleReset}
              className="rounded-full border border-[hsl(var(--accent)/0.5)] bg-[hsl(var(--accent)/0.14)] px-6 py-3 text-sm font-semibold text-[hsl(var(--fg))] transition hover:bg-[hsl(var(--accent)/0.22)]"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
