'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/user-provider';
import { 
  ShieldAlert, 
  Mail, 
  ArrowRight, 
  LogOut,
  ShieldX,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

/**
 * ADMINISTRATIVE BLOCKADE TERMINAL
 * Version: 1.0.0
 * 
 * Displayed when profile.is_blocked is true.
 * Provides context and a path to the Appeal Protocol.
 */
export default function BlockedPage() {
  const { profile, signOut } = useUser();
  const router = useRouter();

  const handleAppeal = () => {
    router.push('/support?type=appeal');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] p-8 text-center relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-1 bg-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-sm w-full space-y-8 relative z-10"
      >
        <div className="w-24 h-24 rounded-[2.5rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500 shadow-2xl relative">
          <ShieldX className="w-12 h-12" />
          <div className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1.5 border-4 border-[#050505]">
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-black uppercase tracking-tight text-white">Access Denied</h1>
          <p className="text-xs text-red-400 font-bold uppercase tracking-widest bg-red-500/10 py-1 px-3 rounded-full w-fit mx-auto border border-red-500/20">
            Administrative Blockade Active
          </p>
        </div>

        <div className="p-6 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-4 shadow-inner">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Blockade Context</p>
          <p className="text-sm text-zinc-400 leading-relaxed font-medium italic">
            "{profile?.block_reason || "Your account has been restricted due to a violation of the institutional trust protocol."}"
          </p>
        </div>

        <div className="space-y-3 pt-4">
          <Button 
            onClick={handleAppeal}
            className="w-full h-16 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 font-black uppercase text-xs tracking-widest text-white gap-3 transition-all active:scale-95"
          >
            <MessageSquare className="w-4 h-4 text-primary" />
            Enter Appeal Protocol
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={signOut}
            className="w-full h-12 text-red-500/60 hover:text-red-500 font-bold uppercase text-[10px]"
          >
            <LogOut className="w-3.5 h-3.5 mr-2" /> Terminate Session
          </Button>
        </div>

        <div className="pt-10 flex flex-col items-center gap-3 opacity-20">
          <div className="h-px w-8 bg-white/40" />
          <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white">Registry Sentinel v1.0</span>
        </div>
      </motion.div>

      {/* Background Ambient Aura */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.05)_0%,transparent_70%)] pointer-events-none" />
    </div>
  );
}
