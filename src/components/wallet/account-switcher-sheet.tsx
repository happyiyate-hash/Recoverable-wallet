'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useUser } from "@/contexts/user-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Check, 
  UserPlus, 
  Trash2, 
  ShieldCheck, 
  ChevronRight, 
  LogOut, 
  Loader2,
  ShieldAlert,
  Repeat
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AccountSwitcherSheetProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

/**
 * INSTITUTIONAL ACCOUNT SWITCHER
 * Version: 4.3.0 (Recessive Slide Handshake)
 */
export default function AccountSwitcherSheet({ isOpen, onOpenChange }: AccountSwitcherSheetProps) {
  const { sessions, activeSessionId, switchSession, removeSession, signOut, loading: authLoading } = useUser();
  
  // Handshake States
  const [isSwitching, setIsSwitching] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingSwitchId, setPendingSwitchId] = useState<string | null>(null);

  const targetSwitchProfile = sessions.find(s => s.id === pendingSwitchId)?.profile;

  /**
   * RECESSIVE SWITCH HANDSHAKE
   * Slid the bottom sheet down immediately so the confirmation dialog is visible.
   */
  const handleSwitchInitiate = (sessionId: string) => {
    if (sessionId === activeSessionId || isSwitching || authLoading) return;
    
    // 1. DISMISS REGISTRY SHEET (Slide Down)
    onOpenChange(false);
    
    // 2. TRIGGER CONFIRMATION GATE (After slide duration)
    setTimeout(() => {
      setPendingSwitchId(sessionId);
    }, 300);
  };

  const confirmSwitch = async () => {
    if (!pendingSwitchId) return;
    const id = pendingSwitchId;
    setPendingSwitchId(null);
    setIsSwitching(id);
    try {
      // 🔄 AUTHORITATIVE HANDSHAKE: Attempt atomic session switch
      await switchSession(id);
    } catch (e) {
      console.error("[SWITCH_FAIL]", e);
      setIsSwitching(null);
    }
  };

  /**
   * AUTHORITATIVE DELETION HANDSHAKE
   */
  const handleDeleteInitiate = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    onOpenChange(false);
    setTimeout(() => {
      setPendingDeleteId(sessionId);
    }, 300);
  };

  const confirmDelete = () => {
    if (pendingDeleteId) {
      removeSession(pendingDeleteId);
      setPendingDeleteId(null);
    }
  };

  const handleAddAccount = async () => {
    await signOut();
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="bg-[#0a0a0c] border-t border-primary/20 rounded-t-[3.5rem] p-0 h-[65vh] overflow-hidden flex flex-col shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-black/80 -z-10" />
          
          <div className="flex flex-col h-full relative z-10">
              <div className="w-12 h-1 bg-white/10 rounded-full mx-auto my-4 shrink-0" />
              
              <SheetHeader className="px-8 mb-6">
                <SheetTitle className="text-2xl font-black uppercase tracking-tight text-white">Identity Registry</SheetTitle>
                <SheetDescription className="text-[10px] text-muted-foreground uppercase font-black tracking-widest font-bold opacity-60">
                  Switch between active institutional nodes
                </SheetDescription>
              </SheetHeader>

              <ScrollArea className="flex-1 px-6">
                <div className="space-y-3 pb-32">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {sessions.length > 0 ? sessions.map((session) => {
                      const isActive = activeSessionId === session.id;
                      const switching = isSwitching === session.id || (isActive && authLoading);

                      return (
                        <motion.div 
                          key={session.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={cn(
                              "flex items-center justify-between p-5 rounded-[2rem] border transition-all group relative overflow-hidden shadow-xl",
                              isActive 
                                  ? "bg-primary/10 border-primary/40 shadow-[0_0_30px_rgba(var(--primary),0.1)]" 
                                  : "bg-white/[0.03] border-white/5 hover:bg-white/[0.06] cursor-pointer",
                              switching && "opacity-80 grayscale-[0.5] pointer-events-none"
                          )}
                          onClick={() => handleSwitchInitiate(session.id)}
                        >
                          <div className="flex items-center gap-4">
                              <div className="relative">
                                  <Avatar className="w-12 h-12 rounded-2xl border border-white/10 bg-black">
                                      <AvatarImage src={session.profile.photo_url} className="object-cover" />
                                      <AvatarFallback className="bg-primary/20 text-primary font-black uppercase">
                                          {session.profile.name?.[0] || 'N'}
                                      </AvatarFallback>
                                  </Avatar>
                                  {(isActive || switching) && (
                                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full border-2 border-[#0a0a0c] flex items-center justify-center shadow-lg">
                                          {switching ? <Loader2 className="w-3 h-3 text-black animate-spin" /> : <Check className="w-3 h-3 text-black" />}
                                      </div>
                                  )}
                              </div>
                              <div className="text-left">
                                  <div className="flex items-center gap-2">
                                      <p className="font-black text-sm text-white tracking-tight uppercase">@{session.profile.name}</p>
                                      {isActive && !switching && <ShieldCheck className="w-3.5 h-3.5 text-primary opacity-60" />}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-40 mt-0.5">
                                      ID: {session.profile.account_number || '---'}
                                  </p>
                              </div>
                          </div>

                          <div className="flex items-center gap-3">
                              {switching ? (
                                  <span className="text-[8px] font-black text-primary uppercase tracking-widest animate-pulse">Syncing...</span>
                              ) : !isActive ? (
                                  <button 
                                      onClick={(e) => handleDeleteInitiate(e, session.id)}
                                      className="p-3.5 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg border border-red-500/20 active:scale-90"
                                  >
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              ) : (
                                  <ChevronRight className="w-5 h-5 text-primary" />
                              )}
                          </div>
                        </motion.div>
                      );
                    }) : (
                      <div className="py-12 flex flex-col items-center justify-center text-center opacity-20">
                          <ShieldCheck className="w-12 h-12 mb-4" />
                          <p className="text-xs font-black uppercase tracking-widest">Registry Empty</p>
                      </div>
                    )}
                  </AnimatePresence>

                  <button 
                      onClick={handleAddAccount}
                      className="w-full flex items-center gap-4 p-6 rounded-[2.5rem] bg-white/[0.02] border border-dashed border-white/10 hover:bg-white/[0.04] transition-all group active:scale-[0.98]"
                  >
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <UserPlus className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                          <p className="font-black text-sm text-white uppercase tracking-tight">Provision New Node</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-40 mt-0.5">Link another institutional identity</p>
                      </div>
                  </button>
                </div>
              </ScrollArea>

              <div className="p-8 pt-2 shrink-0 bg-black/40 border-t border-white/5 backdrop-blur-xl">
                  <Button 
                      variant="ghost" 
                      onClick={signOut}
                      className="w-full h-14 rounded-2xl text-red-500/60 hover:text-red-500 hover:bg-red-500/10 font-black uppercase text-[10px] tracking-[0.2em]"
                  >
                      <LogOut className="w-4 h-4 mr-2" /> Terminate Current Session
                  </Button>
              </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!pendingSwitchId} onOpenChange={(o) => !o && setPendingSwitchId(null)}>
        <AlertDialogContent className="bg-[#0a0a0c] border-white/10 rounded-[3rem] p-8 max-w-[95vw] sm:max-w-[400px] shadow-[0_0_100px_rgba(0,0,0,0.8)]">
          <AlertDialogHeader className="items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xl">
              <Repeat className="w-8 h-8" />
            </div>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-white">Authorize Switch?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed uppercase tracking-widest font-bold">
              Attempting to restore session for <span className="text-white font-black">@{targetSwitchProfile?.name}</span>. The terminal will reload to synchronize the new node.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 flex flex-col gap-3 sm:flex-col">
            <AlertDialogAction 
              onClick={confirmSwitch}
              className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-black font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20"
            >
              Confirm Authority
            </AlertDialogAction>
            <AlertDialogCancel className="w-full h-12 rounded-2xl bg-white/5 border-white/10 text-muted-foreground font-bold uppercase text-[10px] m-0">
              Dismiss
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingDeleteId} onOpenChange={(o) => !o && setPendingDeleteId(null)}>
        <AlertDialogContent className="bg-[#0a0a0c] border-white/10 rounded-[3rem] p-8 max-w-[95vw] sm:max-w-[400px] shadow-[0_0_100px_rgba(0,0,0,0.8)]">
          <AlertDialogHeader className="items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-[1.5rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-xl">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-white">Purge Node?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-red-400/80 leading-relaxed uppercase tracking-widest font-bold">
              This will remove this identity from your local device registry. You must log in manually to restore access. Global cloud data remains intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 flex flex-col gap-3 sm:flex-col">
            <AlertDialogAction 
              onClick={confirmDelete}
              className="w-full h-14 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-red-500/20"
            >
              Purge Registry Node
            </AlertDialogAction>
            <AlertDialogCancel className="w-full h-12 rounded-2xl bg-white/5 border-white/10 text-muted-foreground font-bold uppercase text-[10px] m-0">
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
