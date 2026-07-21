'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  ShieldCheck, 
  ShoppingBag, 
  Package, 
  Wallet, 
  History, 
  Gavel, 
  Database, 
  BarChart3, 
  Settings,
  Zap,
  ArrowRight,
  Briefcase
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ADMIN_MENU = [
  { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Users", path: "/admin/users", icon: Users },
  { name: "KYC", path: "/admin/kyc", icon: ShieldCheck },
  { name: "Product Listings", path: "/admin/products", icon: ShoppingBag },
  { name: "Orders", path: "/admin/orders", icon: Package },
  { name: "Wallets", path: "/admin/wallets", icon: Wallet },
  { name: "Transactions", path: "/admin/transactions", icon: History },
  { name: "Disputes", path: "/admin/disputes", icon: Gavel },
  { name: "Storage", path: "/admin/storage", icon: Database },
  { name: "Reports", path: "/admin/reports", icon: BarChart3 },
  { name: "Workplace", path: "/admin/workplace", icon: Briefcase },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-64 h-full bg-[#0a0a0c] border-r border-white/5 flex flex-col p-6 gap-8 z-50">
      <div className="flex items-center gap-3 px-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
          <Zap className="w-5 h-5 fill-primary" />
        </div>
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-white">Registry HQ</h2>
          <p className="text-[8px] font-black uppercase text-primary/60 tracking-tighter leading-none">Admin Command</p>
        </div>
      </div>

      <div className="flex-1 space-y-1">
        {ADMIN_MENU.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-xl transition-all group",
                isActive 
                  ? "bg-primary/10 border border-primary/20 text-primary shadow-lg shadow-primary/5" 
                  : "text-white/40 hover:bg-white/5 hover:text-white"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-zinc-600 group-hover:text-zinc-400")} />
                <span className="text-[10px] font-black uppercase tracking-widest">{item.name}</span>
              </div>
              {isActive && <ArrowRight className="w-3 h-3" />}
            </Link>
          );
        })}
      </div>

      <div className="pt-6 border-t border-white/5 opacity-20 text-center">
        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white">Terminal v4.0.0</span>
      </div>
    </nav>
  );
}
