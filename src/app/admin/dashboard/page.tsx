
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { adminService } from '@/lib/services/admin-service';
import { 
  ShieldAlert, 
  Activity, 
  UserX, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Search,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Bell,
  Users,
  DollarSign,
  TrendingUp,
  FileText,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * INSTITUTIONAL ADMIN SENTINEL DASHBOARD
 * Version: 2.0.0 (Stats Engine Integrated)
 * 
 * Features: Real-time fraud alerts, instant user blockade, and global stats polling.
 */
export default function AdminDashboardPage() {
  const { toast } = useToast();
  
  // REGISTRY STATES
  const [stats, setStats] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  
  // ACTION STATES
  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('Suspicious behavior detected.');

  const fetchStats = async () => {
    const data = await adminService.fetchAdminStats();
    if (data) setStats(data);
    setIsStatsLoading(false);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [alertsRes, logsRes] = await Promise.all([
        supabase!.from('fraud_alerts').select('*, profile:profiles(name, email)').order('created_at', { ascending: false }).limit(20),
        supabase!.from('user_activity_logs').select('*, profile:profiles(name)').order('created_at', { ascending: false }).limit(50)
      ]);

      setAlerts(alertsRes.data || []);
      setLogs(logsRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchData();

    // 🔄 AUTO-REFRESH HEARTBEAT: Polling every 10s
    const statsInterval = setInterval(fetchStats, 10000);

    // ⚡ REAL-TIME SENTINEL: New Fraud Alerts
    const channel = supabase!.channel('sentinel-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fraud_alerts' }, (payload) => {
        setAlerts(prev => [payload.new, ...prev]);
        toast({ title: "Sentinel Alert", description: "New suspicious behavior detected in registry.", variant: "destructive" });
      })
      .subscribe();

    return () => { 
      clearInterval(statsInterval);
      supabase!.removeChannel(channel); 
    };
  }, []);

  const handleBlock = async (userId: string) => {
    try {
      await adminService.blockUser(userId, blockReason);
      toast({ title: "Identity Blocked", description: "Node blockade enforced in real-time." });
      setBlockingUserId(null);
      fetchData();
      fetchStats();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Blockade Failed", description: e.message });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white">
      <header className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-2xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-lg shadow-red-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-[0.2em]">Sentinel Command</h1>
            <p className="text-[8px] font-black uppercase text-red-500 tracking-widest animate-pulse">Monitoring Registry Nodes</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {isStatsLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                <span className="text-[8px] font-black text-primary uppercase">Syncing Stats</span>
              </motion.div>
            )}
          </AnimatePresence>
          <Button variant="ghost" onClick={() => { fetchData(); fetchStats(); }} className="rounded-xl gap-2 text-white/40 hover:text-white">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Sync Registry
          </Button>
        </div>
      </header>

      <main className="flex-1 p-8 space-y-10 max-w-7xl mx-auto w-full">
        
        {/* TOP: GLOBAL METRICS GRID */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatsCard 
            label="Total Users" 
            value={stats?.total_users ?? '---'} 
            icon={Users} 
            color="text-blue-400" 
            bgColor="bg-blue-500/10" 
          />
          <StatsCard 
            label="Active Users" 
            value={stats?.active_users ?? '---'} 
            icon={Activity} 
            color="text-emerald-400" 
            bgColor="bg-emerald-500/10" 
            badge="7D"
          />
          <StatsCard 
            label="Blocked Nodes" 
            value={stats?.blocked_users ?? '---'} 
            icon={Lock} 
            color="text-red-400" 
            bgColor="bg-red-500/10" 
          />
          <StatsCard 
            label="Total Revenue" 
            value={stats ? formatFiat(stats.total_revenue) : '---'} 
            icon={DollarSign} 
            color="text-primary" 
            bgColor="bg-primary/10" 
          />
          <StatsCard 
            label="Daily Volume" 
            value={stats?.transactions_today ?? '---'} 
            icon={TrendingUp} 
            color="text-purple-400" 
            bgColor="bg-purple-500/10" 
          />
          <StatsCard 
            label="Pending Appeals" 
            value={stats?.pending_appeals ?? '---'} 
            icon={FileText} 
            color="text-amber-400" 
            bgColor="bg-amber-500/10" 
          />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: FRAUD ALERTS (CRITICAL NODES) */}
          <section className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-2 px-2">
              <Bell className="w-4 h-4 text-red-500" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500/60">Risk Registry</h2>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {alerts.length > 0 ? alerts.map((alert) => (
                  <motion.div 
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "p-5 rounded-[2rem] border transition-all shadow-xl relative overflow-hidden",
                      alert.severity === 'high' ? "bg-red-500/5 border-red-500/20" : "bg-white/[0.02] border-white/5"
                    )}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest",
                          alert.severity === 'high' ? "bg-red-500 text-white" : "bg-amber-500 text-black"
                        )}>
                          {alert.severity} Risk
                        </div>
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">
                          {new Date(alert.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <button onClick={() => setBlockingUserId(alert.user_id)} className="p-2 rounded-xl hover:bg-red-500/10 text-red-500 transition-colors">
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[11px] font-black text-white uppercase tracking-tight">@{alert.profile?.name || 'Anonymous Node'}</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{alert.message}</p>
                    </div>

                    {alert.severity === 'high' && (
                      <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 blur-2xl -mr-8 -mt-8" />
                    )}
                  </motion.div>
                )) : (
                  <div className="py-20 flex flex-col items-center justify-center text-center opacity-20 border border-dashed border-white/10 rounded-[2.5rem]">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest mt-4">Registry Clear</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* RIGHT: LIVE ACTIVITY FEED */}
          <section className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2 px-2">
              <Activity className="w-4 h-4 text-primary" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Global Activity Feed</h2>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-[8px] uppercase tracking-widest text-white/20 font-black">
                    <tr>
                      <th className="px-6 py-4">Identity</th>
                      <th className="px-6 py-4">Action Node</th>
                      <th className="px-6 py-4">Hardware Node</th>
                      <th className="px-6 py-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.01] transition-colors group">
                        <td className="px-6 py-4">
                          <span className="font-bold text-white text-[11px]">@{log.profile?.name || '---'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border",
                            log.action.includes('failed') ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-green-500/10 border-green-500/20 text-green-500"
                          )}>
                            {log.action.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[9px] font-mono text-white/40 truncate w-32 block">{log.device}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-[8px] font-black text-white/20 uppercase">{new Date(log.created_at).toLocaleTimeString()}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* BLOCKADE OVERLAY */}
      <AnimatePresence>
        {blockingUserId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm bg-[#0a0a0c] border border-red-500/30 rounded-[3rem] p-8 space-y-8 shadow-[0_0_100px_rgba(239,68,68,0.2)]">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-[1.5rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto shadow-2xl">
                  <UserX className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black uppercase tracking-tight text-white">Enforce Blockade</h3>
                  <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Administrative Shutdown</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[9px] font-black text-white/40 uppercase tracking-widest px-2">Block Reason (User will see this)</Label>
                <Input 
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="h-14 bg-white/5 border-white/10 rounded-2xl text-white font-bold"
                />
              </div>

              <div className="flex flex-col gap-3">
                <Button onClick={() => handleBlock(blockingUserId)} className="w-full h-14 rounded-2xl bg-red-500 hover:bg-red-600 font-black uppercase text-xs tracking-widest shadow-xl">
                  Authorize Blockade
                </Button>
                <Button variant="ghost" onClick={() => setBlockingUserId(null)} className="w-full h-12 rounded-2xl font-bold uppercase text-white/20">
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatsCard({ label, value, icon: Icon, color, bgColor, badge }: any) {
  return (
    <div className="bg-white/[0.02] border border-white/5 p-5 rounded-[2rem] space-y-4 relative overflow-hidden group hover:bg-white/[0.04] transition-all shadow-xl">
      <div className="flex items-center justify-between">
        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform", bgColor, color)}>
          <Icon className="w-5 h-5" />
        </div>
        {badge && (
          <span className="px-1.5 py-0.5 rounded text-[6px] font-black uppercase tracking-widest bg-white/5 text-white/40 border border-white/5">
            {badge}
          </span>
        )}
      </div>
      <div className="space-y-0.5">
        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">{label}</p>
        <p className="text-xl font-black text-white tracking-tight tabular-nums truncate">{value}</p>
      </div>
      <div className={cn("absolute -right-4 -bottom-4 w-16 h-16 blur-2xl opacity-0 group-hover:opacity-20 transition-opacity", bgColor)} />
    </div>
  );
}

function formatFiat(val: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(val);
}
