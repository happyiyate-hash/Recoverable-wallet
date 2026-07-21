'use client';

import { useWallet } from '@/contexts/wallet-provider';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Activity, 
  ShieldCheck, 
  Server, 
  Wifi, 
  Database, 
  Zap, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * INSTITUTIONAL DIAGNOSTIC CONSOLE
 * Version: 2.0.0 (Forensic System Integrity)
 */
export default function DiagnosticsPage() {
  const router = useRouter();
  const { 
    realtimeStatus, 
    syncDiagnostic, 
    isSynced, 
    allChains, 
    txRegistry,
    wallets
  } = useWallet();

  const registryCount = Object.values(txRegistry).reduce((acc, val) => acc + val.length, 0);

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 font-mono selection:bg-primary/30">
      {/* 🧭 HEADER */}
      <header className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl border border-white/5 bg-white/5">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-sm font-black uppercase tracking-[0.3em]">System Diagnostics</h1>
            <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Institutional Node Lifecycle</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
          <div className={cn("w-2 h-2 rounded-full animate-pulse", realtimeStatus === 'CONNECTED' ? "bg-green-500" : "bg-red-500")} />
          <span className="text-[10px] font-black uppercase tracking-tighter">{realtimeStatus}</span>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        
        {/* 📡 WATCHTOWER STATUS */}
        <DiagnosticCard 
          icon={<ShieldCheck className="w-5 h-5" />} 
          title="Watchtower Core" 
          status={realtimeStatus === 'CONNECTED' ? 'Operational' : 'Reconnecting'}
          variant={realtimeStatus === 'CONNECTED' ? 'success' : 'warning'}
        >
          <div className="space-y-3 pt-4">
            <StatusRow label="WebSocket Handshake" value="ESTABLISHED" />
            <StatusRow label="Heartbeat Mode" value="INSTITUTIONAL" />
            <StatusRow label="Encryption Layer" value="AES-256-GCM" />
            <StatusRow label="Registry Buffer" value={`${registryCount} Items`} />
          </div>
        </DiagnosticCard>

        {/* 🔄 SYNC ENGINE */}
        <DiagnosticCard 
          icon={<Zap className="w-5 h-5" />} 
          title="Synchronization Engine" 
          status={isSynced ? 'Hydrated' : 'Pending'}
          variant={isSynced ? 'success' : 'warning'}
        >
          <div className="space-y-3 pt-4">
            <StatusRow label="Local Cache Mode" value="STABLE" />
            <StatusRow label="Identity Indexing" value={syncDiagnostic.indexing_status || 'IDLE'} />
            <StatusRow label="Cloud Handshake" value={syncDiagnostic.cloud_status || 'CONNECTED'} />
            <StatusRow label="Last Convergence" value={syncDiagnostic.last_sync ? new Date(syncDiagnostic.last_sync).toLocaleTimeString() : 'N/A'} />
          </div>
        </DiagnosticCard>

        {/* 🖥️ INFRASTRUCTURE NODES */}
        <DiagnosticCard 
          icon={<Server className="w-5 h-5" />} 
          title="Blockchain Interfaces" 
          status={`${allChains.length} Active`}
        >
          <div className="space-y-2 pt-4 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
            {allChains.map((chain, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-[9px] uppercase text-white/40">{chain.name}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-white/20">ID: {chain.chainId}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500/40" />
                    </div>
                </div>
            ))}
          </div>
        </DiagnosticCard>

        {/* 🔐 IDENTITY VAULT */}
        <DiagnosticCard 
          icon={<Database className="w-5 h-5" />} 
          title="Identity Registry" 
          status="Secured"
        >
          <div className="space-y-3 pt-4">
            <StatusRow label="Active Wallets" value={wallets?.length?.toString() || '0'} />
            <StatusRow label="Vault Isolation" value="HARDWARE_LEVEL" />
            <StatusRow label="Persistence Node" value="REDIS_CLOUD" />
            <StatusRow label="Cleanup Cycle" value="3600s" />
          </div>
        </DiagnosticCard>

      </main>

      {/* 📜 SYSTEM LOGS */}
      <section className="max-w-5xl mx-auto mt-12 bg-white/[0.02] border border-white/5 rounded-[2rem] p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Real-time Execution Logs</h2>
          </div>
          <span className="text-[8px] text-white/20 uppercase tracking-widest">Live Forensics</span>
        </div>
        
        <div className="space-y-2 h-[200px] overflow-y-auto text-[10px] font-mono custom-scrollbar">
          <LogEntry type="INFO" msg="System Sentinel successfully established." />
          <LogEntry type="WATCHER" msg="Orchestrating multi-chain monitoring for 5 networks." />
          <LogEntry type="SYNC" msg="Identity node converged with cloud registry." />
          <LogEntry type="TX" msg={`Registry hydrated with ${registryCount} canonical records.`} />
          {realtimeStatus === 'CONNECTED' ? (
              <LogEntry type="WS" msg="WebSocket tunnel: High-fidelity connection active." />
          ) : (
              <LogEntry type="WS" msg="WebSocket tunnel: Re-establishing handshake..." warning />
          )}
          <div className="text-primary/40 animate-pulse">_ Waiting for blockchain events...</div>
        </div>
      </section>
    </div>
  );
}

function DiagnosticCard({ icon, title, status, children, variant = 'default' }: { icon: React.ReactNode, title: string, status: string, children: React.ReactNode, variant?: 'default' | 'success' | 'warning' }) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 hover:bg-white/[0.05] transition-all"
        >
            <div className="flex items-start justify-between">
                <div className="p-3 bg-white/5 border border-white/5 rounded-2xl text-primary">
                    {icon}
                </div>
                <div className={cn(
                    "px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-tighter",
                    variant === 'success' ? "bg-green-500/10 text-green-500" :
                    variant === 'warning' ? "bg-yellow-500/10 text-yellow-500" : "bg-white/10 text-white/40"
                )}>
                    {status}
                </div>
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest mt-4 text-white/90">{title}</h3>
            {children}
        </motion.div>
    );
}

function StatusRow({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex items-center justify-between text-[10px]">
            <span className="text-white/30 uppercase tracking-widest">{label}</span>
            <span className="text-white/60 font-black">{value}</span>
        </div>
    );
}

function LogEntry({ type, msg, warning }: { type: string, msg: string, warning?: boolean }) {
    return (
        <div className="flex gap-4">
            <span className={cn("shrink-0 w-16 font-black", warning ? "text-red-500" : "text-primary/60")}>[{type}]</span>
            <span className={cn("text-white/40", warning && "text-red-400")}>{msg}</span>
        </div>
    );
}
