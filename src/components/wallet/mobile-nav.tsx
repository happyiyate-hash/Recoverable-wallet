'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Wallet, Repeat, User, CreditCard, Settings } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

/**
 * PREMIUM MOBILE NAVIGATION (PILL STYLE)
 * Version: 4.3.0 (Luminance Overhaul)
 */
export default function MobileNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isAuthRoute = pathname.startsWith('/auth');
  const isOnboardingRoute = ['/complete-profile', '/wallet-session'].includes(pathname);

  // 🛡️ NAVIGATION SENTINEL: Disable global nav for focused interaction pages
  const isActionPage =
    pathname.startsWith('/send') ||
    pathname.startsWith('/receive') ||
    pathname.startsWith('/buy') ||
    pathname.startsWith('/request') ||
    pathname.startsWith('/escrow') ||
    pathname.startsWith('/ai-copilot') ||
    pathname.startsWith('/naira-wallet') ||
    pathname.startsWith('/premium') ||
    pathname.startsWith('/token-details') ||
    pathname.startsWith('/swap');

  if (isAuthRoute || isOnboardingRoute || isActionPage) return null;

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href;
    const Icon = item.icon;

    return (
      <Link
        href={item.href}
        prefetch={true}
        className="flex flex-col items-center justify-center flex-1 group"
      >
        <Icon className={cn(
          'h-5 w-5 transition-all duration-300',
          isActive ? 'text-primary' : 'text-white/40 group-hover:text-white/60'
        )} fill={isActive ? "currentColor" : "none"} />
        <span className={cn(
          "text-[8px] font-black uppercase tracking-widest mt-1",
          isActive ? "text-primary" : "text-white/40 group-hover:text-white/60"
        )}>
          {item.label}
        </span>
      </Link>
    );
  };

  return (
    <div className="fixed z-[100] left-6 right-6 bottom-10 md:hidden">
      <nav className="flex h-[64px] w-full items-center justify-around rounded-[26px] bg-[#0a0a0c]/95 backdrop-blur-3xl border border-white/20 px-4 shadow-[0_20px_50px_rgba(0,0,0,0.9)]">
        <NavLink item={{ href: '/', label: 'Wallet', icon: Wallet }} />
        <NavLink item={{ href: '/buy', label: 'Buy', icon: CreditCard }} />

        <div className="relative -top-4">
          <Link href="/swap" prefetch={true}>
            <motion.div
              whileTap={{ scale: 0.9 }}
              className="w-14 h-14 rounded-full bg-primary flex items-center justify-center group border-4 border-[#000000] shadow-[0_0_25px_rgba(var(--primary),0.3)]"
            >
              <Repeat className="w-6 h-6 text-black z-10" />
            </motion.div>
          </Link>
        </div>

        <NavLink item={{ href: '/profile', label: 'Profile', icon: User }} />
        <NavLink item={{ href: '/settings', label: 'Settings', icon: Settings }} />
      </nav>
    </div>
  );
}