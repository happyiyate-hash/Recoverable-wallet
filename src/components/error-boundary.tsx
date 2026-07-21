
'use client';

import React from 'react';
import { handleError } from '@/lib/errors/error-handler';
import { AlertCircle, RefreshCw, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
  isCopied: boolean;
}

/**
 * INSTITUTIONAL CRASH RECOVERY SENTINEL
 * Version: 2.0.0 (Forensic Audit Node)
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '', isCopied: false };
  }

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: unknown) {
    const message = handleError(error, 'Registry Crash');
    this.setState({ message });
  }

  handleCopy = () => {
    navigator.clipboard.writeText(this.state.message);
    this.setState({ isCopied: true });
    setTimeout(() => this.setState({ isCopied: false }), 2000);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-[#050505]">
          <div className="w-full max-w-sm bg-[#0a0a0c] border border-red-500/20 rounded-[3rem] p-8 space-y-8 shadow-[0_0_100px_rgba(239,68,68,0.1)] relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse" />
            
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-[2rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500 shadow-2xl">
                <AlertCircle className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-black uppercase tracking-tight text-white">App Crash Detected</h2>
                <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Institutional Node Failure</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[9px] font-black text-white/20 uppercase tracking-widest px-2">Forensic Log</p>
              <div className="relative group">
                <div className="p-5 rounded-2xl bg-black/60 border border-white/5 text-[11px] font-mono text-red-400/80 leading-relaxed break-words max-h-[120px] overflow-y-auto thin-scrollbar">
                  {this.state.message || 'Unknown technical exception encountered.'}
                </div>
                <button 
                  onClick={this.handleCopy}
                  className="absolute bottom-3 right-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all active:scale-90"
                >
                  {this.state.isCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => window.location.reload()}
                className="w-full h-16 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 font-black uppercase text-xs tracking-widest text-white shadow-xl"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Restart Node
              </Button>
              <button 
                onClick={() => window.location.href = '/'}
                className="text-[10px] font-black uppercase text-white/20 hover:text-primary transition-all tracking-[0.2em]"
              >
                Reset to Main Vault
              </button>
            </div>

            <div className="pt-4 flex items-center justify-center gap-2 opacity-20">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-[8px] font-black uppercase tracking-widest text-white">Registry Watchdog v4.0 Active</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
