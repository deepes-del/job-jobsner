import React, { Component, ErrorInfo, ReactNode } from 'react';
import JobsnerLogo from './JobsnerLogo';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Jobsner Uncaught Error Boundary Catch]:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      localStorage.removeItem('delivery_hiring_token');
      localStorage.removeItem('recruiter_hiring_token');
    } catch {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 select-none">
          <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col items-center text-center space-y-4">
            <JobsnerLogo size="lg" className="mb-2" />
            
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 border border-red-100 flex items-center justify-center font-bold text-xl">
              !
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Something went wrong</h2>
              <p className="text-xs font-semibold text-slate-500">
                An unexpected display issue occurred. Please reload to restore your session.
              </p>
            </div>

            {this.state.error && (
              <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-left">
                <p className="text-[10px] font-mono text-slate-600 break-all line-clamp-3">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-2.5 bg-[#1D61F2] hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Reload Website
              </button>
              <button
                onClick={this.handleReset}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Home Screen
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
