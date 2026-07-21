'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { WalletProvider, useWallet } from '@/contexts/wallet-provider';
import { UserProvider, useUser } from '@/contexts/user-provider';
import { SecurityProvider } from '@/contexts/security-context';
import { CurrencyProvider } from '@/contexts/currency-provider';
import { MarketProvider } from '@/contexts/market-provider';
import { ThemeProvider, useAppTheme } from '@/contexts/theme-provider';
import { Web3Provider } from '@/components/providers/web3-provider';
import { ConnectivityProvider } from '@/contexts/connectivity-provider';
import { TelemetryProvider } from '@/components/providers/telemetry-provider';
import PWARegister from '@/components/pwa-register';
import { SidebarProvider } from '@/components/ui/sidebar';
import { NavGradient } from '@/components/shared/nav-gradient';
import { SecurityGate } from '@/components/security/security-gate';
import MobileNav from '@/components/wallet/mobile-nav';
import GlobalLoadingBarrier from '@/components/global-loading-barrier';
import { ErrorBoundary } from '@/components/error-boundary';
import { GlobalErrorListener } from '@/components/global-error-listener';
import NotificationSheet from '@/components/notifications/notification-sheet';
import { RegistryBackground } from '@/components/shared/RegistryBackground';
import DeviceUnlockOverlayWrapper from '@/components/security/device-unlock-wrapper';
import { NetworkStatusBanner } from '@/components/shared/NetworkStatusBanner';
import { BackDoorSentinel } from '@/components/shared/back-door-sentinel';
import { RequestCreateMoment, RequestReviewMoment } from '@/components/wallet/request-moments';
import QuickSwapPanel from '@/components/wallet/quick-swap-panel';
import DesktopSidebar from '@/components/wallet/desktop-sidebar';
import NetworkSelector from '@/components/wallet/network-selector';
import { usePathname, useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Bell,
  Copy,
  CheckCircle2,
  ChevronRight,
  Activity,
  Fuel,
  BarChart3,
  Zap,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { cn } from '@/lib/utils';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { motion, AnimatePresence } from 'framer-motion';
import RealtimeToast from '@/components/shared/RealtimeToast';
import PrivacyBlur from '@/components/shared/PrivacyBlur';
import './globals.css';

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const pathname = usePathname();
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#050505" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body className="font-body antialiased min-h-screen bg-background flex flex-col relative overflow-x-hidden m-0 p-0">
        <ErrorBoundary>
          <TelemetryProvider>
            <ConnectivityProvider>
              <Web3Provider>
                <ThemeProvider>
                  <RegistryBackground />
                  <UserProvider>
                    <SecurityProvider>
                      <CurrencyProvider>
                        <MarketProvider>
                          <WalletProvider>
                            <SidebarProvider defaultOpen={true}>
                              <SecurityGate>
                                <LayoutContent>{children}</LayoutContent>
                              </SecurityGate>
                              
                              <Suspense fallback={null}>
                                <GlobalLoadingBarrier />
                                <GlobalErrorListener />
                                <NotificationSheet />
                                <DeviceUnlockOverlayWrapper />
                                <NetworkStatusBanner />
                                <BackDoorSentinel />
                                <RealtimeToast />
                                <PrivacyBlur />
                                <GlobalOverlays />
                              </Suspense>
                            </SidebarProvider>
                          </WalletProvider>
                        </MarketProvider>
                      </CurrencyProvider>
                    </SecurityProvider>
                  </UserProvider>
                </ThemeProvider>
              </Web3Provider>
            </ConnectivityProvider>
            <Toaster />
          </TelemetryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

function GlobalOverlays() {
  const { 
    isRequestOverlayOpen, 
    setIsRequestOverlayOpen, 
    activeFulfillmentId, 
    setActiveFulfillmentId,
    isQuickSwapOpen,
    setIsQuickSwapOpen
  } = useWallet();

  return (
    <>
      <RequestCreateMoment isOpen={isRequestOverlayOpen} onClose={() => setIsRequestOverlayOpen(false)} />
      {activeFulfillmentId && (
        <RequestReviewMoment requestId={activeFulfillmentId} onClose={() => setActiveFulfillmentId(null)} />
      )}
      <QuickSwapPanel isOpen={isQuickSwapOpen} onOpenChange={setIsQuickSwapOpen} />
    </>
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { activeTheme } = useAppTheme();
  const isMobile = useIsMobile();
  const { profile } = useUser();
  const { setIsNotificationsOpen, notifications, wallets, getAddressForChain, viewingNetwork } = useWallet();
  const [isCopied, copy] = useCopyToClipboard();
  
  // 🔘 PANEL TOGGLE STATES
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  const address = wallets ? getAddressForChain(viewingNetwork, wallets) : null;
  const unreadCount = notifications.unread_count || 0;

  useEffect(() => {
    if (typeof document !== 'undefined') {
       let meta = document.querySelector('meta[name="theme-color"]');
       if (meta) meta.setAttribute('content', activeTheme.hex);
    }
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Dark });
      StatusBar.setBackgroundColor({ color: activeTheme.hex });
    }
  }, [activeTheme]);

  if (isMobile === undefined) {
    return null;
  }

  return (
    <div className="flex flex-col flex-1 w-full min-h-screen bg-transparent relative z-10 transition-all duration-500">
      <NavGradient />
      <PWARegister />
      
      {!isMobile && profile ? (
        <div className="flex h-screen w-full overflow-hidden bg-[#050505] relative">
          <div className="fixed bottom-8 left-8 z-[500] flex items-center gap-3">
            <button 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={cn(
                    "w-9 h-9 rounded-xl bg-[#0A0A0C]/80 backdrop-blur-xl border flex items-center justify-center transition-all active:scale-90 shadow-2xl group",
                    sidebarCollapsed ? "border-primary/40 text-primary" : "border-white/10 text-white/20 hover:text-white/60"
                )}
                title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
                {sidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>

            <button 
                onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                className={cn(
                    "w-9 h-9 rounded-xl bg-[#0A0A0C]/80 backdrop-blur-xl border flex items-center justify-center transition-all active:scale-90 shadow-2xl group",
                    rightPanelCollapsed ? "border-primary/40 text-primary" : "border-white/10 text-white/20 hover:text-white/60"
                )}
                title={rightPanelCollapsed ? "Expand Insights" : "Collapse Insights"}
            >
                {rightPanelCollapsed ? <PanelRightOpen className="w-5 h-5" /> : <PanelRightClose className="w-5 h-5" />}
            </button>
          </div>

          {/* LEFT: COLLAPSIBLE NAVIGATION */}
          <motion.div 
            initial={false}
            animate={{ 
                width: sidebarCollapsed ? 0 : 256,
                opacity: sidebarCollapsed ? 0 : 1,
                x: sidebarCollapsed ? -256 : 0
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="shrink-0 h-full overflow-hidden border-r border-white/5 relative z-50"
          >
            <div className="w-64 h-full">
                <DesktopSidebar />
            </div>
          </motion.div>
          
          <div className="flex-1 flex flex-col min-w-0 bg-transparent">
            {/* TOP: FIXED HEADER CLUSTER */}
            <header className="h-16 shrink-0 flex items-center justify-between px-10 border-b border-white/5 bg-black/20 backdrop-blur-3xl relative z-[150]">
              <div className="text-[9px] font-black uppercase tracking-[0.4em] text-white/10">Authorized Terminal</div>
              
              {/* CENTERED AUTHORITY NODE */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <NetworkSelector />
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsNotificationsOpen(true)} className="relative p-2 rounded-xl text-white/40 hover:text-white transition-all group">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_#8b5cf6]" />}
                  </button>
                  <Avatar className="h-8 w-8 rounded-lg border border-white/10 ml-2">
                    <AvatarImage src={profile?.photo_url} />
                    <AvatarFallback className="bg-primary/20 text-primary font-black text-[10px]">{profile?.name?.[0] || 'N'}</AvatarFallback>
                  </Avatar>
                </div>

                <div className="bg-[#111113] border border-white/10 rounded-xl flex items-center p-0.5 shadow-xl">
                  <button onClick={() => address && copy(address)} className="flex items-center gap-3 px-4 py-1.5 active:scale-95 transition-all group">
                    <span className={cn("text-[9px] font-mono font-black uppercase transition-colors", isCopied ? "text-green-400" : "text-white/60")}
                    >{isCopied ? 'NODE CLONED' : address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'SCANNING...'}</span>
                    <Copy className="w-3 h-3 text-primary/40 group-hover:text-primary transition-colors" />
                  </button>
                </div>
              </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
              {/* CENTER: DYNAMIC PAGE CONTENT */}
              <main className="flex-1 overflow-y-auto thin-scrollbar p-8">
                <div className="max-w-[1000px] mx-auto pb-32">
                  {children}
                </div>
              </main>

              {/* RIGHT: COLLAPSIBLE ANALYTICS WIDGETS */}
              <motion.aside 
                initial={false}
                animate={{ 
                    width: rightPanelCollapsed ? 0 : 288,
                    opacity: rightPanelCollapsed ? 0 : 1,
                    x: rightPanelCollapsed ? 288 : 0
                }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="shrink-0 h-full overflow-hidden bg-[#08080A] border-l border-white/5 relative z-40"
              >
                <div className="w-72 p-6 space-y-4 h-full overflow-y-auto thin-scrollbar">
                  <div className="bg-[#0B0B0C] border border-white/5 rounded-2xl p-5 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/40">AI Sentinel</p>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[7px] font-black text-green-500 uppercase">Online</span>
                      </div>
                    </div>
                    <div className="h-16 bg-black/40 rounded-xl border border-white/5 flex items-center justify-center text-[8px] font-black text-white/10 uppercase tracking-[0.2em] text-center p-4">
                      Autonomous Handshake Mode Initializing...
                    </div>
                  </div>

                  <div className="bg-[#0B0B0C] border border-white/5 rounded-2xl p-5 space-y-4 shadow-xl">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Market Insights</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-white/20 uppercase">System Trend</span>
                        <span className="text-[9px] font-black text-green-500">BULLISH</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-white/20 uppercase">Global Cap</span>
                        <span className="text-[9px] font-black text-white">$2.54T</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#0B0B0C] border border-white/5 rounded-2xl p-5 space-y-4 shadow-xl">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Network Status</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-white/20 uppercase">Ethereum</span>
                        <span className="text-[7px] font-black bg-green-500/10 text-green-500 px-1.5 rounded">LOW</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-white/20 uppercase">Polygon</span>
                        <span className="text-[7px] font-black bg-green-500/10 text-green-500 px-1.5 rounded">LOW</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.aside>
            </div>
          </div>
        </div>
      ) : (
        // 📱 MOBILE SHELL
        <>
          <div className="flex-1 relative">
            {children}
          </div>
          <MobileNav />
        </>
      )}
      {/* FIX: Properly closed the main layout container div that was opened at line 170. 
          Previous bug: Line 323 had </> (Fragment close) instead of </div> (div close),
          causing "Unexpected token `div`" syntax error during build. */}
    </div>
  );
}
