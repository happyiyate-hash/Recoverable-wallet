
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Send, 
  CreditCard, 
  LayoutGrid, 
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * INSTITUTIONAL NAIRA BOTTOM NAVIGATION
 * Version: 1.0.0
 * Specialized for the Naira Wallet sub-registry.
 */
export default function NairaBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Home', icon: Home, href: '/naira-wallet' },
    { label: 'Send', icon: Send, href: '/naira-wallet/send' },
    { label: 'Pay', icon: Wallet, href: '/naira-wallet/pay' },
    { label: 'Cards', icon: CreditCard, href: '/naira-wallet/cards' },
    { label: 'More', icon: LayoutGrid, href: '/naira-wallet/more' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#050505]/95 backdrop-blur-3xl border-t border-white/10 pt-4 pb-8 px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1.5 transition-all group",
                isActive ? "text-white" : "text-white/20"
              )}
            >
              <item.icon className={cn(
                "w-6 h-6 transition-all group-active:scale-90",
                isActive && "text-white"
              )} />
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest",
                isActive ? "text-white" : "text-white/40"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
