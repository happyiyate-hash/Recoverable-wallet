'use client';

import React from 'react';
import { Settings, ShieldCheck, Zap, Lock, RefreshCw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

/**
 * INSTITUTIONAL ADMIN WORKPLACE
 * Version: 2.0.0
 * Authority: Admin Command Node
 * 
 * This page replaces the conflicting /settings route for administrators.
 */
export default function AdminWorkplacePage() {
  return (
    <div className="flex flex-col h-full p-8 space-y-8 overflow-y-auto thin-scrollbar">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-white">Command Workplace</h1>
          <p className="text-xs font-black uppercase text-primary tracking-widest mt-1">Terminal Configuration</p>
        </div>
        <Button variant="ghost" className="rounded-xl gap-2 text-white/40 hover:text-white">
          <RefreshCw className="w-4 h-4" />
          Sync Registry
        </Button>
      </header>

      <div className="max-w-2xl space-y-6">
        <section className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 space-y-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5"><Settings className="w-24 h-24 text-primary" /></div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-lg">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <p className="font-black text-sm text-white uppercase tracking-tight">Maintenance Mode</p>
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Global Terminal Lock</p>
              </div>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-lg">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="font-black text-sm text-white uppercase tracking-tight">Audit Logging</p>
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Detailed Forensic Trails</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
        </section>

        <div className="p-6 rounded-[2rem] bg-red-500/5 border border-red-500/10 flex gap-4">
          <Lock className="w-6 h-6 text-red-500 shrink-0" />
          <p className="text-[10px] text-red-400 font-bold uppercase leading-relaxed tracking-widest">
            Critical Authority Node: Any changes made here will propagate across the entire institutional registry instantly.
          </p>
        </div>
      </div>
    </div>
  );
}
