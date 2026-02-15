import React, { type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "2rem",
            backgroundColor: "#ffebee",
            borderRadius: "8px",
            border: "2px solid #f44336",
            margin: "2rem",
          }}
        >
          <h2 style={{ color: "#c62828", margin: "0 0 1rem 0" }}>
            Something went wrong
          </h2>
          <p style={{ color: "#b71c1c", margin: "0.5rem 0" }}>
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <details style={{ marginTop: "1rem", color: "#666" }}>
            <summary>Error details (click to expand)</summary>
            <pre
              style={{
                backgroundColor: "#f5f5f5",
                padding: "1rem",
                borderRadius: "4px",
                overflow: "auto",
                fontSize: "0.85rem",
              }}
            >
              {this.state.error?.stack}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "1rem",
              padding: "0.75rem 1.5rem",
              backgroundColor: "#667eea",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "600",
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
