import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
                    <div className="bg-white p-8 rounded-xl shadow-xl max-w-lg w-full border border-red-100">
                        <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong.</h1>
                        <p className="text-slate-600 mb-4">The application encountered an unexpected error.</p>
                        <details className="bg-slate-50 p-4 rounded-lg text-xs font-mono text-slate-700 overflow-auto max-h-64">
                            <summary className="cursor-pointer font-semibold mb-2">Error Details</summary>
                            {this.state.error && this.state.error.toString()}
                            <br />
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </details>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-6 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
