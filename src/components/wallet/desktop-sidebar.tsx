'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  Wallet, 
  CreditCard, 
  Globe, 
  BarChart3, 
  Zap, 
  User, 
  Settings,
  ShieldCheck,
  Repeat,
  Crown,
  Activity
} from 'lucide-react';
import { useAppTheme } from '@/contexts/theme-provider';
import { motion } from 'framer-motion';

/**
 * INSTITUTIONAL DESKTOP SIDEBAR
 * Version: 9.1.0 (Logs Node Added)
 */
const navItems = [
  { label: 'Wallet', icon: Wallet, href: '/' },
  { label: 'Buy', icon: CreditCard, href: '/buy' },
  { label: 'Markets', icon: Globe, href: '/browse' },
  { label: 'Portfolio', icon: BarChart3, href: '/defi' },
  { label: 'Activity Logs', icon: Activity, href: '/logs' }, // 📊 LOGS NODE
  { label: 'AI Sentinel', icon: Zap, href: '/ai-copilot' },
  { label: 'Profile', icon: User, href: '/profile' },
  { label: 'Settings', icon: Settings, href: '/settings' },
];

export default function DesktopSidebar() {
  const pathname = usePathname();
  const { activeTheme } = useAppTheme();

  return (
    <aside className="w-64 h-full shrink-0 flex flex-col bg-[#0A0A0C] border-r border-white/5 z-50">
      {/* LOGO NODE */}
      <div className="p-6 pb-10">
        <Link href="/" className="flex items-center gap-3 group">
          <div style={{ backgroundColor: activeTheme.hex }} className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
            <Zap className="w-5 h-5 text-black" fill="currentColor" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-[12px] font-black uppercase tracking-[0.2em] text-white">Node Quick</span>
            <span style={{ color: activeTheme.hex }} className="text-[8px] font-black uppercase tracking-widest opacity-60">Sentinel active</span>
          </div>
        </Link>
      </div>

      {/* NAVIGATION REGISTRY */}
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-4 h-12 px-4 rounded-xl transition-all group relative",
                isActive 
                  ? "bg-primary/10 text-white" 
                  : "text-white/70 hover:bg-white/[0.04] hover:text-white"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="sidebar-active-bar"
                  className="absolute left-0 w-1 h-5 bg-primary rounded-r-full"
                />
              )}
              {/* HIGH-LUMINANCE ICONS: 2.5 STROKE */}
              <Icon 
                className="w-5 h-5 transition-all duration-300" 
                strokeWidth={2.5}
                style={{ color: activeTheme.hex, opacity: isActive ? 1 : 0.75 }} 
              />
              <span className={cn(
                "text-[10px] font-black uppercase tracking-[0.15em]",
                isActive ? "text-white" : "opacity-80"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* FOOTER NODES */}
      <div className="p-5 mt-auto space-y-4 pb-10">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3 shadow-xl">
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]" />
              <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Mainnet Node</span>
           </div>
           <p className="text-[10px] font-black text-white uppercase truncate">Connected & Optimal</p>
        </div>

        <button className="w-full p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent border border-primary/20 text-left group transition-all active:scale-[0.98] shadow-2xl relative overflow-hidden">
          <div className="flex items-center gap-3 mb-1">
              <Crown className="w-4 h-4 text-primary" strokeWidth={2.5} />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Elite Access</span>
          </div>
          <p className="text-[8px] text-white/30 font-bold uppercase tracking-tight">Unlock Zero-Fee Terminal</p>
        </button>
      </div>
    </aside>
  );
}
