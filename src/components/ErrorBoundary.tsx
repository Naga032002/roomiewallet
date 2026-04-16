import { Component, ReactNode } from 'react';
import { Wallet, RefreshCw } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

/**
 * Top-level error boundary.
 * Catches any unhandled runtime error in the React tree and shows a
 * friendly recovery screen instead of a blank/white crash.
 *
 * On reload it also wipes persisted Zustand state so corrupt storage
 * can never permanently brick the app.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[RoomieWallet] Uncaught error:', error, info.componentStack);
  }

  handleReload = () => {
    // If Zustand persisted data is corrupt, clearing it lets the app restart cleanly
    try { localStorage.removeItem('roomiewallet-group-store'); } catch (_) {}
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl rw-gradient flex items-center justify-center mb-5 shadow-xl shadow-indigo-200 rotate-3">
          <Wallet className="w-7 h-7 text-white -rotate-3" />
        </div>

        <h1 className="text-xl font-extrabold text-slate-800 mb-2">Something went wrong</h1>
        <p className="text-slate-400 text-sm max-w-xs mb-6 leading-relaxed">
          RoomieWallet hit an unexpected error. Your data is safe — tap below to reload.
        </p>

        {/* Error details — dev mode only */}
        {import.meta.env.DEV && this.state.error && (
          <pre className="text-left text-xs text-red-500 bg-red-50 border border-red-100 rounded-2xl p-4 mb-5 max-w-sm w-full overflow-auto max-h-32">
            {this.state.error.message}
          </pre>
        )}

        <button onClick={this.handleReload} className="rw-btn rw-btn-primary px-8">
          <RefreshCw className="w-4 h-4" />
          Reload App
        </button>
      </div>
    );
  }
}
