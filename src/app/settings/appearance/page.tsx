
'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAppTheme, THEME_REGISTRY, type ThemeNode } from "@/contexts/theme-provider";
import { useUser } from "@/contexts/user-provider";
import { 
  ArrowLeft, 
  Palette, 
  Zap, 
  ShieldCheck,
  Lock,
  Crown,
  ChevronRight,
  Sparkles,
  Smartphone,
  Eye,
  Monitor,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

/**
 * INSTITUTIONAL APPEARANCE TERMINAL (ATMOSPHERIC EDITION)
 * Version: 3.0.1 (Icon Sync Patch)
 */
export default function AppearancePage() {
    const router = useRouter();
    const { activeTheme, setTheme, isPureBlack, setPureBlack } = useAppTheme();
    const { profile } = useUser();
    
    const [isUpsellOpen, setIsUpsellOpen] = useState(false);
    const [pendingTheme, setPendingTheme] = useState<ThemeNode | null>(null);

    const isElite = profile?.plan_type === 'Elite';

    const handleThemeClick = (theme: ThemeNode) => {
        // Rule: Only Node Quick is free. Everything else requires Elite Status.
        if (theme.isFree || isElite) {
            setTheme(theme.id);
        } else {
            setPendingTheme(theme);
            setIsUpsellOpen(true);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-transparent text-foreground relative overflow-hidden">
            <header className="p-4 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-2xl sticky top-0 z-50 px-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl"><ArrowLeft className="w-5 h-5" /></Button>
                <div className="flex flex-col items-center">
                    <h1 className="text-xs font-black uppercase tracking-[0.2em] leading-none text-white/90">The Color Vault</h1>
                    <div className="flex items-center gap-1.5 mt-1.5"><Palette className="w-2.5 h-2.5 text-primary" /><span className="text-[8px] text-primary font-black uppercase tracking-tighter">Registry Themes</span></div>
                </div>
                <div className="w-10" />
            </header>

            <main className="flex-1 p-6 space-y-10 max-w-2xl mx-auto w-full pb-32 overflow-y-auto thin-scrollbar relative z-10">
                
                {/* 🌌 BACKGROUND REGISTRY NODE */}
                <section className="space-y-4">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] px-2">Background Registry</p>
                    <div className="p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/10 shadow-2xl space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                                    isPureBlack ? "bg-zinc-800 text-white" : "bg-primary/10 text-primary"
                                )}>
                                    {isPureBlack ? <Smartphone className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-sm text-white uppercase tracking-tight">Pure Black (OLED)</p>
                                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">Absolute Noir Node</p>
                                </div>
                            </div>
                            <Switch checked={isPureBlack} onCheckedChange={setPureBlack} className="data-[state=checked]:bg-primary" />
                        </div>

                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-3">
                            <Info className="w-4 h-4 text-white/20 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                                {isPureBlack 
                                    ? "OLED Protection: Physically deactivates pixels to conserve energy and provide absolute contrast."
                                    : "Atmospheric Mode: Applies a subtle 3% radial tint matching your selected node for a deeper UI depth."
                                }
                            </p>
                        </div>
                    </div>
                </section>

                {/* 🎨 THEME REGISTRY NODE */}
                <section className="space-y-6">
                    <div className="text-center space-y-2">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Active Node: {activeTheme.name}</h2>
                        <p className="text-xs text-muted-foreground font-medium max-w-[280px] mx-auto leading-relaxed">
                            Every node choice updates the terminal across all ecosystem handshakes.
                        </p>
                    </div>

                    <div className="p-8 rounded-[3rem] bg-white/[0.02] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-6">
                            {THEME_REGISTRY.map((theme) => {
                                const isLocked = !theme.isFree && !isElite;
                                const isActive = activeTheme.id === theme.id;

                                return (
                                    <button
                                        key={theme.id}
                                        onClick={() => handleThemeClick(theme)}
                                        className="relative group flex flex-col items-center gap-2"
                                        title={theme.name}
                                    >
                                        <div 
                                            style={{ 
                                                backgroundColor: theme.hex, 
                                                boxShadow: isActive ? `0 0 20px ${theme.hex}` : 'none' 
                                            }}
                                            className={cn(
                                                "w-12 h-12 rounded-full transition-all duration-500 border-2 active:scale-90 relative flex items-center justify-center",
                                                isActive ? "border-white scale-110" : "border-transparent opacity-40 hover:opacity-100",
                                                isLocked && "grayscale-[0.5]"
                                            )}
                                        >
                                            {isLocked && (
                                                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                                                    <Lock className="w-4 h-4 text-white/80" />
                                                </div>
                                            )}
                                        </div>
                                        <span className={cn(
                                            "text-[7px] font-black uppercase tracking-widest text-center transition-colors",
                                            isActive ? "text-white" : "text-white/20"
                                        )}>
                                            {theme.name.split(' ')[0]}
                                        </span>
                                        {isActive && (
                                            <motion.div 
                                                layoutId="theme-active-dot"
                                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white border-2 border-black flex items-center justify-center"
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-black" />
                                            </motion.div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        
                        {!isElite && (
                            <div className="mt-10 p-5 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 flex items-center gap-4">
                                <Crown className="w-5 h-5 text-amber-500 shrink-0" />
                                <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                                    <span className="text-amber-500 font-black uppercase">Elite Spectrum:</span> Upgrade to <span className="text-white font-black">Premium Elite</span> to unlock the full institutional color spectrum.
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                <div className="pt-4 flex flex-col items-center gap-3 opacity-20">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
                        <ShieldCheck className="w-3 h-3 text-primary" />
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Protocol Audit: 100% SECURE</span>
                    </div>
                </div>
            </main>

            {/* PREMIUIM UPSELL DIALOG */}
            <Dialog open={isUpsellOpen} onOpenChange={setIsUpsellOpen}>
                <DialogContent className="bg-[#0a0a0c] border-white/10 rounded-[3rem] p-8 max-w-[95vw] sm:max-w-[400px] overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 animate-gradient-flow" />
                    
                    <DialogHeader className="space-y-4 items-center text-center">
                        <div className="w-16 h-16 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/20">
                            <Crown className="w-8 h-8" />
                        </div>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">Elite Spectrum Required</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground uppercase tracking-widest font-black opacity-60">
                            Institutional Personalization
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-8 space-y-6">
                        <div className="p-6 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-4">
                            <div className="flex items-center gap-3">
                                <div 
                                    className="w-8 h-8 rounded-full border border-white/20 shadow-lg"
                                    style={{ backgroundColor: pendingTheme?.hex }}
                                />
                                <p className="text-sm font-black text-white uppercase">{pendingTheme?.name} Theme</p>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                Personalized registry nodes are reserved for our <span className="text-amber-500 font-bold">Premium Elite</span> members. Upgrade now to unlock all 20+ themes and unlimited institutional features.
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-col gap-3">
                        <Button 
                            className="w-full h-16 rounded-[2rem] font-black text-sm uppercase tracking-widest bg-amber-500 hover:bg-amber-600 shadow-xl shadow-amber-500/20 text-black"
                            onClick={() => {
                                setIsUpsellOpen(false);
                                router.push('/premium');
                            }}
                        >
                            Upgrade to Elite
                        </Button>
                        <Button variant="ghost" className="w-full h-12 rounded-2xl font-bold text-muted-foreground uppercase text-[10px]" onClick={() => setIsUpsellOpen(false)}>
                            Keep Sentinel Theme
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
