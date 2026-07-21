
'use client';

import React from 'react';
import { Settings, ShieldCheck, Zap, Lock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

/**
 * INSTITUTIONAL ADMIN SETTINGS
 * Version: 1.0.0
 * Authority: Admin Command Node
 */
export default function AdminSettingsPage() {
  return (
    <div className="flex flex-col h-full p-8 space-y-8">
      <header>
        <h1 className="text-3xl font-black uppercase tracking-tight text-white">Command Settings</h1>
        <p className="text-xs font-black uppercase text-primary tracking-widest mt-1">Terminal Configuration</p>
      </header>

      <div className="max-w-2xl space-y-4">
        <section className="p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="font-black text-sm text-white uppercase">Maintenance Mode</p>
                <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest">Global Terminal Lock</p>
              </div>
            </div>
            <Switch />
          </div>
        </section>
      </div>
    </div>
  );
}
