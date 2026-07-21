'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useWallet } from '@/contexts/wallet-provider';
import { useConnectivity } from '@/contexts/connectivity-provider';
import { 
  Terminal, 
  ArrowLeft,
  Trash2,
  Pause,
  Play,
  Download,
  Filter,
  Activity,
  Server,
  Wifi,
  Database,
  Cpu,
  AlertTriangle,
  Zap,
  Settings,
  Bell,
  Search,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { systemEmitter } from '@/lib/events/systemEmitter';
import { TelemetryEventType } from '@/lib/telemetry/event-types';

/**
 * HIGH-DENSITY FORENSIC MONITOR V2.5
 * Version: 2.5.0 (Telemetry & Queue Trace Standard)
 */
export default function LogsPage() {
  const router = useRouter();
  
  // Real telemetry hookups
  const { syncDiagnostic, realtimeStatus, txRegistry } = useWallet();
  const { internetStatus, backendStatus } = useConnectivity();

  // Basic logs state
  const [logs, setLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'CONSOLE' | 'RPC' | 'RENDER' | 'ORCHESTRATOR' | 'NETWORK'>('CONSOLE');
  const [searchFilter, setSearchFilter] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Cumulative metrics
  const [rpcMetrics, setRpcMetrics] = useState({
    total: 0,
    duplicates: 0,
    errors: 0,
    warnings: 0
  });

  const [rpcMethods, setRpcMethods] = useState<Record<string, number>>({});
  const [componentRenders, setComponentRenders] = useState<Record<string, number>>({});

  // Rolling events-per-second tracker
  const [eps, setEps] = useState(0);
  const [epsHistory, setEpsHistory] = useState<number[]>(Array(10).fill(0));

  const eventCounter = useRef(0);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Active queue state visualization
  const [queues, setQueues] = useState<Record<string, { active: number; depth: number; status: string }>>({
    high: { active: 0, depth: 0, status: 'IDLE' },
    medium: { active: 0, depth: 0, status: 'IDLE' },
    low: { active: 0, depth: 0, status: 'IDLE' }
  });

  // Handle incoming telemetry streams
  useEffect(() => {
    const interval = setInterval(() => {
      const currentCount = eventCounter.current;
      eventCounter.current = 0;
      setEps(currentCount);
      setEpsHistory(prev => [...prev.slice(1), currentCount]);
    }, 1000);

    const appendLog = (log: any) => {
      eventCounter.current += 1;
      if (!isPaused) {
        setLogs(prev => [...prev, log].slice(-500));
      }

      if (log.level === 'WARN') setRpcMetrics(prev => ({ ...prev, warnings: prev.warnings + 1 }));
      if (log.level === 'ERROR') setRpcMetrics(prev => ({ ...prev, errors: prev.errors + 1 }));
    };

    const handleRpcTelemetry = (payload: any) => {
      const isDuplicate = payload.isDuplicate || payload.warnings?.includes('Redundant Fetch');
      const isError = payload.status === 'ERROR';

      setRpcMethods(prev => ({ ...prev, [payload.method]: (prev[payload.method] || 0) + 1 }));
      setRpcMetrics(prev => ({ ...prev, total: prev.total + 1, duplicates: isDuplicate ? prev.duplicates + 1 : prev.duplicates }));

      appendLog({
        id: payload.id || `rpc-${Date.now()}`,
        type: 'RPC',
        timestamp: payload.timestamp || Date.now(),
        level: isError ? 'ERROR' : isDuplicate ? 'WARN' : 'INFO',
        msg: `RPC [${isError ? 'ERROR' : isDuplicate ? 'DUPLICATE' : 'RESPONSE'}] ${payload.method} -> ${payload.duration}ms`,
        chainId: payload.chainId,
        details: payload
      });
    };

    const handleRenderMetrics = (payload: any) => {
      setComponentRenders(prev => ({ ...prev, [payload.componentName]: (prev[payload.componentName] || 0) + 1 }));
      appendLog({
        id: `render-${Date.now()}`,
        type: 'RENDER',
        timestamp: payload.timestamp || Date.now(),
        level: payload.warnings?.length > 0 ? 'WARN' : 'INFO',
        msg: `RENDER [${payload.componentName}] (count: ${payload.renderCount}) | diff: ${payload.changedDependencies?.join(', ') || 'none'}`,
        details: payload
      });
    };

    const handleOrchestratorQueue = (payload: any) => {
      if (payload) setQueues(prev => ({
        high: { ...prev.high, ...payload.high },
        medium: { ...prev.medium, ...payload.medium },
        low: { ...prev.low, ...payload.low }
      }));
    };

    // 📡 HANDSHAKE LISTENERS
    systemEmitter.on('RPC_TELEMETRY', handleRpcTelemetry);
    systemEmitter.on('RENDER_METRICS', handleRenderMetrics);
    systemEmitter.on('ORCHESTRATOR_QUEUE', handleOrchestratorQueue);

    return () => {
      clearInterval(interval);
      systemEmitter.off('RPC_TELEMETRY', handleRpcTelemetry);
      systemEmitter.off('RENDER_METRICS', handleRenderMetrics);
      systemEmitter.off('ORCHESTRATOR_QUEUE', handleOrchestratorQueue);
    };
  }, [isPaused]);

  useEffect(() => {
    if (autoScroll && consoleEndRef.current) consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [logs, autoScroll]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (activeTab !== 'CONSOLE' && log.type !== activeTab) return false;
      if (searchFilter) {
        const query = searchFilter.toLowerCase();
        return log.msg?.toLowerCase().includes(query) || log.level?.toLowerCase().includes(query);
      }
      return true;
    });
  }, [logs, activeTab, searchFilter]);

  const sparklinePath = useMemo(() => {
    const maxVal = Math.max(...epsHistory, 10);
    return epsHistory.map((val, i) => `${i === 0 ? 'M' : 'L'} ${i * 10} ${18 - (val / maxVal) * 14}`).join(' ');
  }, [epsHistory]);

  const sortedRpcMethods = useMemo(() => {
    const total = Object.values(rpcMethods).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(rpcMethods).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [rpcMethods]);

  return (
    <div className="min-h-screen bg-black text-[#8a8a9a] flex flex-col font-mono text-[9px] leading-tight select-none">
      
      {/* 1. TOP HEADER */}
      <header className="flex items-center justify-between px-3 py-2 bg-[#050505] border-b border-white/[0.05] sticky top-0 z-[100]">
        <div className="flex items-center gap-3">
          <Button onClick={() => router.back()} variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-white/5 text-white p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-white font-black uppercase tracking-wider text-[10px]">Forensic System Hub</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse shadow-[0_0_8px_#22c55e]" />
            </div>
            <span className="text-[7.5px] text-primary/60 uppercase tracking-widest font-bold">Auditing registry nodes...</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 border-r border-white/[0.05] pr-3 mr-1">
            <StatusNode label="BACKEND" value={backendStatus} color={backendStatus === 'ONLINE' ? 'text-[#22c55e]' : 'text-red-500'} />
            <StatusNode label="WS" value={realtimeStatus} color="text-cyan-400" />
          </div>
          <button onClick={() => setIsPaused(!isPaused)} className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/5">
            {isPaused ? <Play className="w-3.5 h-3.5 text-[#22c55e]" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setLogs([])} className="p-1.5 rounded-md text-white/40 hover:text-red-400 hover:bg-white/5"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </header>

      {/* 2. OPERATIONAL TABS */}
      <div className="flex bg-[#050505] px-2 gap-0.5 border-b border-white/[0.05]">
        {(['CONSOLE', 'RPC', 'RENDER', 'ORCHESTRATOR', 'NETWORK'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "py-2 px-3 text-[8.5px] font-black uppercase tracking-wider transition-all border-b-2",
              activeTab === tab ? "text-white border-primary bg-white/5" : "text-[#505060] border-transparent hover:text-white"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <main className="flex-1 flex flex-col p-1.5 space-y-1.5 overflow-hidden">
        
        {/* 3. COMPACT METRICS STRIP */}
        <section className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 shrink-0">
          <MetricCard label="Events/s" value={eps} sparkline={sparklinePath} color="text-[#22c55e]" />
          <MetricCard label="RPC Total" value={rpcMetrics.total} color="text-cyan-400" />
          <MetricCard label="Errors" value={rpcMetrics.errors} color="text-red-500" />
          <MetricCard label="Warnings" value={rpcMetrics.warnings} color="text-yellow-500" />
          <MetricCard label="Duplicates" value={rpcMetrics.duplicates} color="text-purple-400" />
        </section>

        {/* 4. MAIN TERMINAL CONSOLE (SHARP & NO PADDING) */}
        <section className="bg-[#020202] border border-white/[0.05] rounded-xl flex flex-col flex-1 overflow-hidden shadow-2xl">
          <div className="bg-[#08080a] border-b border-white/[0.05] p-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-[#22c55e]" />
              <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Telemetry Stream</span>
            </div>
            <div className="flex items-center gap-2">
               <Search className="w-3 h-3 text-white/10" />
               <input 
                type="text" 
                placeholder="FILTER NODES..." 
                value={searchFilter} 
                onChange={(e) => setSearchFilter(e.target.value)}
                className="bg-transparent border-none text-[8px] uppercase font-black text-white focus:ring-0 w-32 placeholder:text-white/5"
               />
            </div>
          </div>

          <div className="flex-grow p-0 overflow-y-auto thin-scrollbar select-text">
            {filteredLogs.length > 0 ? filteredLogs.map((log) => (
              <div key={log.id} className="group flex items-baseline gap-2 hover:bg-white/[0.03] py-0.5 px-3 border-b border-white/[0.01]">
                <span className="text-[#404050] shrink-0 w-[60px]">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}</span>
                <span className={cn("shrink-0 font-bold w-10 uppercase text-center text-[7.5px]", 
                  log.level === 'ERROR' ? 'text-red-500' : log.level === 'WARN' ? 'text-yellow-500' : 'text-[#22c55e]'
                )}>[{log.level}]</span>
                <span className="text-[#a0a0b0] break-all flex-1">{log.msg}</span>
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center py-20 gap-4 opacity-10">
                <Activity className="w-10 h-10 animate-pulse" />
                <p className="font-black uppercase tracking-[0.4em]">Listening for telemetry...</p>
              </div>
            )}
            <div ref={consoleEndRef} />
          </div>
        </section>

        {/* 5. SIDE ANALYTICS & STORM PANELS */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-1.5 shrink-0">
          <AnalyticBox title="RPC Distribution">
            {sortedRpcMethods.map(([name, count]) => (
              <div key={name} className="flex justify-between py-0.5">
                <span className="text-white/40 uppercase">{name}</span>
                <span className="text-white font-black">{count}</span>
              </div>
            ))}
          </AnalyticBox>
          <AnalyticBox title="Active Orchestrator">
            <div className="space-y-1.5">
              <QueueRow label="HIGH" active={queues.high.active} depth={queues.high.depth} color="bg-red-500" />
              <QueueRow label="MED" active={queues.medium.active} depth={queues.medium.depth} color="bg-orange-500" />
              <QueueRow label="LOW" active={queues.low.active} depth={queues.low.depth} color="bg-cyan-500" />
            </div>
          </AnalyticBox>
          <AnalyticBox title="Sentinel Risk Audit">
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between p-2 bg-white/[0.02] border border-white/5 rounded-lg">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-[8px] font-black uppercase text-white/60">Approvals Node</span>
                    </div>
                    <span className="text-[8px] font-black text-green-500">CLEAN</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/[0.02] border border-white/5 rounded-lg">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                        <span className="text-[8px] font-black uppercase text-white/60">Slippage Node</span>
                    </div>
                    <span className="text-[8px] font-black text-yellow-500">OPTIMAL</span>
                </div>
            </div>
          </AnalyticBox>
        </section>
      </main>
    </div>
  );
}

function StatusNode({ label, value, color }: any) {
  return (
    <div className="flex items-center gap-1 text-[7.5px] font-black uppercase tracking-tighter">
      <span className="opacity-40">{label}:</span>
      <span className={color}>{value || 'INIT'}</span>
    </div>
  );
}

function MetricCard({ label, value, sparkline, color }: any) {
  return (
    <div className="bg-[#050505] border border-white/[0.05] p-2 rounded-xl flex flex-col justify-between h-14 relative overflow-hidden">
      <span className="text-[7.5px] uppercase tracking-wider text-white/20 font-black">{label}</span>
      <span className={cn("text-lg font-black tracking-tighter", color)}>{value}</span>
      {sparkline && (
        <svg className="absolute bottom-0 left-0 w-full h-4 opacity-40" viewBox="0 0 100 18" preserveAspectRatio="none">
          <path d={sparkline} fill="none" stroke="currentColor" strokeWidth="1.5" className={color} />
        </svg>
      )}
    </div>
  );
}

function AnalyticBox({ title, children }: any) {
  return (
    <div className="bg-[#050505] border border-white/[0.05] p-3 rounded-xl space-y-2">
      <span className="text-[7.5px] font-black uppercase tracking-widest text-white/20 block border-b border-white/[0.05] pb-1">{title}</span>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function QueueRow({ label, active, depth, color }: any) {
  return (
    <div className="flex items-center justify-between text-[8px] font-black">
      <span className="text-white/30 uppercase w-8">{label}</span>
      <div className="flex-1 px-4 flex gap-0.5">
        {Array(10).fill(0).map((_, i) => (
          <div key={i} className={cn("w-2 h-2 rounded-sm", i < depth ? color : "bg-white/5")} />
        ))}
      </div>
      <span className="text-white w-4 text-right">{active}</span>
    </div>
  );
}
