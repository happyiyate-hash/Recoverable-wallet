'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, ChevronRight, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

/**
 * INSTITUTIONAL UPGRADE PROMPT
 * Version: 1.0.0 (Non-Blocking UI)
 */
export function RPCUpgradeCard({ 
  onConnect, 
  onDismiss 
}: { 
  onConnect: () => void;
  onDismiss: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Artificial delay to ensure it doesn't pop up instantly on first slow request
    const timer = setTimeout(() => setIsVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-24 left-4 right-4 z-[500] max-w-lg mx-auto"
        >
          <div className="bg-[#0D0D0F] border border-primary/20 rounded-[2rem] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative">
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-[80px] rounded-full" />
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Zap className="w-6 h-6 text-primary animate-pulse" />
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-white/90">Performance Optimization</h3>
                  <button onClick={onDismiss} className="text-white/20 hover:text-white/40 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] text-white/50 leading-relaxed">
                  Network traffic is currently high. Connect your own RPC provider for faster updates and improved reliability.
                </p>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <Button 
                onClick={onConnect}
                className="flex-1 h-10 rounded-xl bg-primary hover:bg-primary/90 text-black font-bold text-[10px] uppercase tracking-wider"
              >
                Connect RPC <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
              <Button 
                variant="ghost"
                onClick={onDismiss}
                className="flex-1 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/60 font-bold text-[10px] uppercase tracking-wider"
              >
                Continue Free
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
