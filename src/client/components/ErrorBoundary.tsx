import React, { Component, type ReactNode } from "react";
import { navigate } from "../lib/router";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    navigate("");
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="content-container">
          <div className="card" style={{ maxWidth: 560, margin: "40px auto", padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "var(--ink)" }}>
              Something went wrong loading this view
            </h2>
            <p className="text-muted" style={{ fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
              An unexpected error occurred while rendering. You can try refreshing or returning to the task list.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 16 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => window.location.reload()}
              >
                ↻ Refresh Page
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={this.handleReset}
              >
                ← Return to Tasks
              </button>
            </div>
            {this.state.error && (
              <details style={{ textAlign: "left", marginTop: 16, background: "var(--surface-raised)", borderRadius: "var(--radius)", padding: "10px 14px", border: "1px solid var(--border-subtle)" }}>
                <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
                  Error Details
                </summary>
                <pre style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--danger)", marginTop: 8, overflowX: "auto", whiteSpace: "pre-wrap" }}>
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
