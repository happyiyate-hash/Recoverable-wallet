'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  ShieldAlert, 
  ShieldCheck, 
  Lock, 
  UserX, 
  KeyRound, 
  AlertTriangle,
  Info,
  ChevronRight,
  Zap,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * TRON PERMISSION SCAM EDUCATION HUB
 * Version: 1.1.0 (Syntax Fix)
 * Authority: Registry Sentinel v5.0
 */
export default function TronPermissionsPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-foreground overflow-hidden">
      <header className="p-4 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-50 px-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex flex-col items-center text-center">
          <h1 className="text-xs font-black uppercase tracking-[0.2em] text-white">Registry Intelligence</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <ShieldAlert className="w-2.5 h-2.5 text-red-500" />
            <span className="text-[8px] text-red-500 font-black uppercase tracking-tighter">Chain Permission Audit</span>
          </div>
        </div>
        <div className="w-10" />
      </header>

      <main className="flex-1 p-6 space-y-10 max-w-2xl mx-auto w-full pb-32 overflow-y-auto thin-scrollbar relative z-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 blur-[100px] rounded-full pointer-events-none" />

        <section className="text-center space-y-6">
          <div className="w-24 h-24 rounded-[3rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500 shadow-2xl relative">
            <Lock className="w-12 h-12" />
            <div className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1.5 border-4 border-[#050505]">
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black uppercase tracking-tight text-white leading-none">Permission Trap Detected</h2>
            <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest bg-red-500/10 py-1 px-4 rounded-full w-fit mx-auto border border-red-500/20">
              Institutional Security Advisory
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="p-8 rounded-[2.5rem] bg-[#0a0a0c] border border-white/5 space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5"><KeyRound className="w-24 h-24 text-red-500" /></div>
            <div className="relative z-10 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-white border-b border-white/5 pb-3">What is a Permission Trap?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                TRON accounts support a feature called <span className="text-white font-bold">Multi-Signature (Multisig)</span>. In a legitimate setup, this is for team security. However, attackers use it as a "Trap."
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                They provide a seed phrase to a wallet with funds, but they have <span className="text-red-400 font-bold">modified the account permissions</span> so that any outgoing transaction requires <span className="text-white font-bold">THEIR signature</span> too. 
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] px-2">How the Scam Works</p>
          <div className="grid grid-cols-1 gap-3">
             <TriageNode 
                icon={Globe} 
                title='The "Free Money" Bait' 
                desc="You are given a seed phrase to a wallet that already has USDT/TRX. It looks like free money."
                color="text-amber-500"
             />
             <TriageNode 
                icon={Zap} 
                title="The Gas Trap" 
                desc="You try to withdraw but fail due to 'Insufficient TRX'. You send your own TRX to the wallet for gas."
                color="text-primary"
             />
             <TriageNode 
                icon={UserX} 
                title="The Lockdown" 
                desc="Even with gas, the transaction fails because an invisible 'Owner' signer is required. Your gas is now stuck."
                color="text-red-500"
             />
          </div>
        </section>

        <section className="space-y-4">
          <div className="p-8 rounded-[2.5rem] bg-primary/5 border border-primary/20 shadow-2xl relative overflow-hidden">
            <div className="flex items-start gap-4 relative z-10">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-tight text-white">Registry Sentinel Verdict</h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  This wallet is highly suspicious. <span className="text-white font-bold">DO NOT send any TRX or funds</span> to this account. Your hardware terminal has identified that the primary signing node is controlled by an external authority.
                </p>
              </div>
            </div>
            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-primary/10 blur-3xl rounded-full" />
          </div>
        </section>

        <div className="flex flex-col gap-3">
            <Button 
                onClick={() => router.push('/settings')}
                className="w-full h-16 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 font-black uppercase text-xs tracking-widest text-white"
            >
                Return to Vault
            </Button>
            <p className="text-center text-[8px] font-black text-white/20 uppercase tracking-widest">Handshake Verified by SmarterSeller Security Nodes</p>
        </div>

        <div className="pt-10 flex flex-col items-center gap-3 opacity-20 pb-10">
          <div className="h-px w-10 bg-white/40" />
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
            <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white">Registry Sentinel v5.0</span>
          </div>
        </div>
      </main>
    </div>
  );
}

function TriageNode({ icon: Icon, title, desc, color }: any) {
    return (
        <div className="p-5 rounded-[2rem] bg-white/[0.02] border border-white/5 flex gap-5 items-start">
            <div className={cn("w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0", color)}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="space-y-1">
                <p className="text-sm font-black text-white uppercase tracking-tight">{title}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">{desc}</p>
            </div>
        </div>
    );
}