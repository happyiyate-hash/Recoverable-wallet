
'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, Box, LayoutGrid, Move, Layers } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

/**
 * CENTERING PROTOCOL DEMO
 * Visual documentation for institutional layout standards.
 */
export default function CenteringDemoPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white p-6 space-y-12 overflow-y-auto thin-scrollbar">
      <header className="flex items-center gap-4 max-w-4xl mx-auto w-full">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl hover:bg-white/5">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight">Centering Protocol</h1>
          <p className="text-[10px] font-black uppercase text-primary tracking-widest">Tailwind Layout Standards</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full space-y-12 pb-32">
        
        {/* SECTION 1: FLEXBOX (THE STANDARD) */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Move className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-black uppercase tracking-widest">Flexbox Centering</h2>
          </div>
          
          <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-6 space-y-6 shadow-2xl">
            <div className="h-64 w-full bg-black/40 rounded-[2rem] border border-dashed border-white/10 flex items-center justify-center">
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="p-8 rounded-3xl bg-primary/20 border border-primary/30 shadow-[0_0_40px_rgba(139,92,246,0.2)]"
              >
                <Box className="w-8 h-8 text-primary" />
              </motion.div>
            </div>
            
            <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">The most versatile method for single or multiple items.</p>
                <pre className="p-4 rounded-xl bg-black font-mono text-[11px] text-primary/80 overflow-x-auto border border-white/5">
                  {`<div className="flex items-center justify-center">
  <div />
</div>`}
                </pre>
            </div>
          </div>
        </section>

        {/* SECTION 2: GRID (THE CONCISE) */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <LayoutGrid className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="text-sm font-black uppercase tracking-widest">Grid Centering</h2>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-6 space-y-6 shadow-2xl">
            <div className="h-64 w-full bg-black/40 rounded-[2rem] border border-dashed border-white/10 grid place-items-center">
              <div className="p-8 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                <Box className="w-8 h-8 text-emerald-400" />
              </div>
            </div>

            <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Perfect for centering a single child node with minimum code.</p>
                <pre className="p-4 rounded-xl bg-black font-mono text-[11px] text-emerald-400/80 overflow-x-auto border border-white/5">
                  {`<div className="grid place-items-center">
  <div />
</div>`}
                </pre>
            </div>
          </div>
        </section>

        {/* SECTION 3: ABSOLUTE (THE SENTINEL) */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Layers className="w-4 h-4 text-orange-400" />
            </div>
            <h2 className="text-sm font-black uppercase tracking-widest">Absolute Sentinel</h2>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-6 space-y-6 shadow-2xl">
            <div className="h-64 w-full bg-black/40 rounded-[2rem] border border-dashed border-white/10 relative">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-8 rounded-3xl bg-orange-500/20 border border-orange-500/30 shadow-[0_0_40px_rgba(249,115,22,0.2)]">
                <Box className="w-8 h-8 text-orange-400" />
              </div>
              <div className="absolute top-4 left-4 text-[8px] font-black uppercase tracking-[0.2em] text-white/20">Parent: relative</div>
            </div>

            <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Used for overlays where the item must be independent of other content.</p>
                <pre className="p-4 rounded-xl bg-black font-mono text-[11px] text-orange-400/80 overflow-x-auto border border-white/5">
                  {`<div className="relative">
  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
    Centered Node
  </div>
</div>`}
                </pre>
            </div>
          </div>
        </section>

      </main>

      <footer className="fixed bottom-8 left-0 right-0 flex justify-center pointer-events-none">
        <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 flex items-center gap-3 shadow-2xl pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/60">Layout Integrity Verified</span>
        </div>
      </footer>
    </div>
  );
}
