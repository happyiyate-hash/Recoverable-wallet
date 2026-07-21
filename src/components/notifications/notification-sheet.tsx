'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Bell, ShoppingCart, ArrowUpRight, ArrowDownLeft, Zap, HandCoins, ShieldCheck, Activity, ShieldAlert, Laptop } from 'lucide-react';
import Link from 'next/link';
import { useWallet } from '@/contexts/wallet-provider';
import type { Notification } from '@/lib/types';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
}

const getIcon = (type: string, txType?: string) => {
  if (type === 'FEE') return <Zap className="h-4 w-4 text-primary" />;

  switch (type) {
    case 'TRANSFER_IN':
      return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
    case 'TRANSFER_OUT':
      return <ArrowUpRight className="h-4 w-4 text-red-400" />;
    case 'REQUEST':
      return <HandCoins className="h-4 w-4 text-amber-500" />;
    case 'REWARD':
      return <Zap className="h-4 w-4 text-primary" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
};

export function NotificationPanel({ isOpen, onClose, notifications }: NotificationPanelProps) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 top-0 z-[400] w-full transform transition-transform duration-300 ease-in-out",
        "bg-[#050505]/95 backdrop-blur-3xl border-b-2 border-white/10 shadow-2xl",
        "h-[85vh] flex flex-col",
        isOpen ? "translate-y-0" : "-translate-y-full"
      )}
    >
      <header className="flex h-16 items-center justify-between px-6 flex-shrink-0 border-b border-white/5">
        <h2 className="text-xl font-black uppercase tracking-widest text-white">Event Center</h2>
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-white/5" onClick={onClose}>
          <X className="w-5 h-5 text-muted-foreground" />
        </Button>
      </header>

      <div className="flex-grow flex flex-col px-4 pt-4 pb-10">
        <Tabs defaultValue="activity" className="w-full flex flex-col h-full">
          <TabsList className="bg-[#111113] border border-white/10 rounded-2xl w-full grid grid-cols-3 h-12 p-1 gap-1 shadow-2xl shrink-0">
            <TabsTrigger value="activity" className="rounded-xl text-[11px] font-black uppercase tracking-widest text-white/40 data-[state=active]:text-primary data-[state=active]:bg-white/5 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" /> Activity
            </TabsTrigger>
            <TabsTrigger value="security" className="rounded-xl text-[11px] font-black uppercase tracking-widest text-white/40 data-[state=active]:text-red-400 data-[state=active]:bg-red-500/10 flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5" /> Security
            </TabsTrigger>
            <TabsTrigger value="system" className="rounded-xl text-[11px] font-black uppercase tracking-widest text-white/40 data-[state=active]:text-blue-400 data-[state=active]:bg-blue-500/10 flex items-center gap-2">
              <Laptop className="w-3.5 h-3.5" /> System
            </TabsTrigger>
          </TabsList>

          <div className="flex-grow overflow-y-auto mt-4 thin-scrollbar pb-10">
            <TabsContent value="activity" className="m-0 h-full">
               <NotificationList 
                  items={notifications.filter(n => ['TRANSFER_IN', 'TRANSFER_OUT', 'SWAP', 'REQUEST', 'REWARD', 'TX_CONFIRMED', 'TX_FAILED'].includes(n.type))} 
                  emptyText="No recent activity" 
                  emptyIcon={<Activity className="w-12 h-12 mb-4" />}
               />
            </TabsContent>
            
            <TabsContent value="security" className="m-0 h-full">
               <NotificationList 
                  items={notifications.filter(n => ['SECURITY_ALERT', 'HIGH_RISK_APPROVAL', 'DRAINER_RISK'].includes(n.type))} 
                  emptyText="No security threats detected" 
                  emptyIcon={<ShieldCheck className="w-12 h-12 mb-4 text-green-500/50" />}
               />
            </TabsContent>
            
            <TabsContent value="system" className="m-0 h-full">
               <NotificationList 
                  items={notifications.filter(n => !['TRANSFER_IN', 'TRANSFER_OUT', 'SWAP', 'REQUEST', 'REWARD', 'TX_CONFIRMED', 'TX_FAILED', 'SECURITY_ALERT', 'HIGH_RISK_APPROVAL', 'DRAINER_RISK'].includes(n.type))} 
                  emptyText="System operations nominal" 
                  emptyIcon={<Laptop className="w-12 h-12 mb-4" />}
               />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

function NotificationList({ items, emptyText, emptyIcon }: { items: Notification[], emptyText: string, emptyIcon: React.ReactNode }) {
  if (items.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground h-full flex flex-col items-center justify-center py-24 opacity-30">
        {emptyIcon}
        <p className="font-black uppercase tracking-widest text-[10px]">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {items.map(item => {
        // INSTITUTIONAL FEE MASKING
        const isFee = item.type === 'FEE' || item.title?.includes('Fee') || item.message?.includes('fee');
        const displayTitle = isFee ? 'Network Maintenance' : item.title;
        const displayMessage = isFee ? 'Fixed 50 WNC node maintenance fee applied.' : item.message;

        // Visual severity overrides
        const isCritical = ['SECURITY_ALERT', 'HIGH_RISK_APPROVAL', 'DRAINER_RISK'].includes(item.type);

        return (
          <div 
            key={item.id} 
            className={cn(
              "block p-3 rounded-xl transition-all border border-transparent",
              !item.is_read ? (isCritical ? "bg-red-500/10 border-red-500/20" : "bg-primary/10 border-primary/20") : "bg-white/[0.02] hover:bg-white/5"
            )} 
          >
             <div className="flex items-start gap-3">
                <div className={cn(
                  "w-9 h-9 rounded-lg bg-black/40 flex items-center justify-center shrink-0 border border-white/5",
                  isCritical ? "text-red-500" : ""
                )}>
                    {isCritical ? <ShieldAlert className="h-4 w-4" /> : isFee ? <Zap className="h-4 w-4 text-primary" /> : getIcon(item.type, item.transaction_type)}
                </div>
                <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          "font-black text-[13px] uppercase tracking-tight truncate",
                          isCritical ? "text-red-400" : "text-white"
                        )}>
                          {displayTitle}
                        </p>
                        {!item.is_read && <div className={cn(
                          "h-1.5 w-1.5 rounded-full shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.8)]",
                          isCritical ? "bg-red-500" : "bg-primary"
                        )}></div>}
                    </div>
                    <p className="text-[11px] text-white/50 leading-snug font-medium line-clamp-2 mt-0.5">{displayMessage}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-[8px] text-white/20 font-bold uppercase tracking-widest">
                          {new Date(item.created_at).toLocaleString()}
                      </p>
                      {isFee && <span className="text-[7px] font-black text-primary uppercase bg-primary/10 px-1.5 rounded">System Node</span>}
                    </div>
                </div>
             </div>
          </div>
        );
      })}
    </div>
  );
}

export default function NotificationSheet() {
  const { 
    isNotificationsOpen, 
    setIsNotificationsOpen, 
    notifications, 
    markNotificationsAsRead, 
  } = useWallet();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isNotificationsOpen && mounted) {
      // Mark as read immediately to stop flickering in the UI
      markNotificationsAsRead();
    }
  }, [isNotificationsOpen, mounted, markNotificationsAsRead]);

  if (!mounted) return null;

  return (
    <NotificationPanel 
      isOpen={isNotificationsOpen} 
      onClose={() => setIsNotificationsOpen(false)} 
      notifications={notifications.items} 
    />
  );
}