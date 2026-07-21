'use client';

import { useActivities } from "@/hooks/useActivities";
import { cn } from "@/lib/utils";
import { useEffect, useState, useMemo } from "react";
import { systemEmitter } from "@/lib/events/systemEmitter";
import { Loader2, ArrowUpRight, ArrowDownLeft, Repeat, ShieldAlert, Zap, ExternalLink, ArrowRight } from "lucide-react";
import { ActivityEvent, ActivityStatus } from "@/lib/types/activity";
import { useWallet } from "@/contexts/wallet-provider";

/**
 * INSTITUTIONAL ACTIVITY TERMINAL
 * Version: 2.0.0 (Unified Event Standard)
 * 
 * This component manages the canonical timeline by merging:
 * 1. Historical Hydration (from Database)
 * 2. Live State Mutations (from WebSocket)
 * 
 * Rules:
 * - Single item mutation: Lifecycle updates (PENDING -> CONFIRMED) evolve the same row.
 * - WS Authority: Real-time WebSocket events override database state.
 * - Intelligent Dedup: Matching by txHash > eventId.
 */

export default function ActivityPanel() {
  const { wallets, viewingNetwork } = useWallet();
  const address = useMemo(() => wallets?.find(w => w.type === 'evm')?.address, [wallets]);
  
  const { activities: initialActivities, isLoading } = useActivities(address);
  const [activitiesMap, setActivitiesMap] = useState<Record<string, ActivityEvent>>({});

  // 1. HYDRATE FROM DB
  useEffect(() => {
    if (!initialActivities.length) return;
    
    setActivitiesMap(prev => {
      const next = { ...prev };
      initialActivities.forEach(item => {
        const key = item.txHash || item.eventId;
        // Only add if not already in map (live state wins)
        if (!next[key]) {
          next[key] = item;
        }
      });
      return next;
    });
  }, [initialActivities]);

  // 2. LISTEN FOR LIVE WEB-SOCKET MUTATIONS
  useEffect(() => {
    const handleEvent = (event: ActivityEvent) => {
      const key = event.txHash || event.eventId;
      setActivitiesMap(prev => ({
        ...prev,
        [key]: {
          ...(prev[key] || {}),
          ...event,
          updatedAt: Date.now()
        }
      }));
    };

    // Standard Transaction Lifecycle
    systemEmitter.on('TX_PENDING', handleEvent);
    systemEmitter.on('TX_CONFIRMING', handleEvent);
    systemEmitter.on('TX_CONFIRMED', handleEvent);
    systemEmitter.on('TX_FAILED', handleEvent);
    systemEmitter.on('TX_REPLACED', handleEvent);
    
    // Domain Events
    systemEmitter.on('SWAP_UPDATE', handleEvent);
    systemEmitter.on('APPROVE', handleEvent);
    systemEmitter.on('BRIDGE', handleEvent);
    systemEmitter.on('SECURITY_ALERT', handleEvent);

    return () => {
      systemEmitter.off('TX_PENDING', handleEvent);
      systemEmitter.off('TX_CONFIRMING', handleEvent);
      systemEmitter.off('TX_CONFIRMED', handleEvent);
      systemEmitter.off('TX_FAILED', handleEvent);
      systemEmitter.off('TX_REPLACED', handleEvent);
      systemEmitter.off('SWAP_UPDATE', handleEvent);
      systemEmitter.off('APPROVE', handleEvent);
      systemEmitter.off('BRIDGE', handleEvent);
      systemEmitter.off('SECURITY_ALERT', handleEvent);
    };
  }, []);

  const displayList = useMemo(() => {
    return Object.values(activitiesMap).sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA;
    });
  }, [activitiesMap]);

  if (isLoading && displayList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-white/20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Hydrating Terminal...</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-px">
      {displayList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/10">
             <Zap className="w-5 h-5" />
          </div>
          <p className="text-[#71717A] text-[10px] font-black uppercase tracking-widest">No activity in registry</p>
        </div>
      ) : (
        <div className="space-y-1">
          {displayList.map((item) => (
            <ActivityRow key={item.eventId || item.txHash} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityEvent }) {
  const isPending = item.status === 'pending' || item.status === 'confirming';
  
  const getIcon = () => {
    if (isPending) return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
    
    switch (item.eventType) {
      case 'SEND': return <ArrowUpRight className="w-4 h-4 text-white/40" />;
      case 'RECEIVE': return <ArrowDownLeft className="w-4 h-4 text-green-500" />;
      case 'SWAP':
      case 'SWAP_UPDATE': return <Repeat className="w-4 h-4 text-amber-500" />;
      case 'BRIDGE': return <Zap className="w-4 h-4 text-blue-500" />;
      case 'SECURITY_ALERT':
      case 'HIGH_RISK_APPROVAL':
      case 'DRAINER_RISK': return <ShieldAlert className="w-4 h-4 text-red-500" />;
      case 'APPROVE': return <Zap className="w-4 h-4 text-amber-400" />;
      default: return <ArrowUpRight className="w-4 h-4 text-white/40" />;
    }
  };

  const getStatusColor = () => {
    if (item.status === 'failed') return 'text-red-500';
    if (item.status === 'confirmed' || item.status === 'completed') return 'text-green-500';
    if (item.status === 'replaced') return 'text-blue-400';
    if (isPending) return 'text-primary';
    return 'text-white/60';
  };

  const openExplorer = () => {
    if (!item.txHash) return;
    // Simple explorer link based on chainId (standardization needed later)
    const baseUrl = item.chainId === 1 ? 'https://etherscan.io' : 
                    item.chainId === 137 ? 'https://polygonscan.com' : 'https://blockscan.com';
    window.open(`${baseUrl}/tx/${item.txHash}`, '_blank');
  };

  return (
    <div 
      onClick={openExplorer}
      className={cn(
        "group flex items-center justify-between p-4 rounded-2xl border border-transparent hover:border-white/5 hover:bg-white/[0.02] transition-all cursor-pointer",
        item.priority === 'critical' && "bg-red-500/5 border-red-500/10"
      )}
    >
      <div className="flex items-center gap-4">
        {/* ICON NODE */}
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center border transition-all",
          isPending ? "bg-primary/5 border-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]" : "bg-[#111113] border-white/5 group-hover:border-white/10"
        )}>
          {getIcon()}
        </div>

        {/* CONTENT NODE */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-white tracking-tight leading-none">
              {item.title}
            </span>
            {item.priority === 'critical' && (
              <span className="text-[7px] font-black bg-red-500 text-white px-1 py-0.5 rounded uppercase">Critical</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40 font-medium truncate max-w-[180px]">
              {item.subtitle || item.eventType}
            </span>
            <span className="w-1 h-1 rounded-full bg-white/10" />
            <span className={cn("text-[9px] font-black uppercase tracking-widest", getStatusColor())}>
              {item.status}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-white/20 group-hover:text-white/40 transition-colors">
            {item.txHash ? `${item.txHash.slice(0, 4)}...${item.txHash.slice(-4)}` : ''}
          </span>
          {item.txHash && <ExternalLink className="w-2.5 h-2.5 text-white/10 group-hover:text-primary transition-colors" />}
        </div>
        
        <span className="text-[9px] font-black text-white/10 uppercase tracking-tighter">
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
