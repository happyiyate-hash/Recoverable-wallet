'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  Zap,
  ShieldCheck,
  Plus,
  Activity,
  BarChart3,
  Mic,
  MicOff,
  Shield,
  Search,
  ArrowRight,
  CheckCircle2,
  Settings,
  Palette,
  Plane
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAgent } from '@/hooks/use-agent';
import { useUser } from '@/contexts/user-provider';
import { useSecurity } from '@/contexts/security-context';
import { useWallet } from '@/contexts/wallet-provider';
import { useAppTheme } from '@/contexts/theme-provider';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import TransactionConfirmationSheet from '@/components/wallet/transaction-confirmation-sheet';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  mode?: 'chat' | 'action' | 'handshake';
  intent?: string;
  plan?: {
    steps: Array<{ id: string, description: string, status: string }>;
  };
  action?: any;
  ui_metadata?: any;
}

/**
 * STREAMING TEXT NODE
 */
function StreamingText({ text, onComplete }: { text: string, onComplete?: () => void }) {
  const [displayedText, setDisplayText] = useState('');
  
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayText((prev) => prev + text.charAt(index));
        index++;
      } else {
        clearInterval(interval);
        onComplete?.();
      }
    }, 8);
    return () => clearInterval(interval);
  }, [text]);

  return <span className="whitespace-pre-wrap">{displayedText}</span>;
}

/**
 * INSTITUTIONAL OPERATOR HUB (V8.2 SENTINEL - THEME SYNCHRONIZED)
 * Version: 44.0.0 (Reactive Color Handshake)
 */
export default function AiCopilotPage() {
  const router = useRouter();
  const { user, profile } = useUser();
  const { setTheme, activeTheme } = useAppTheme();
  const { isTerminalLocked } = useSecurity();
  const { allAssets, prices, setIsQuickSwapOpen } = useWallet();
  const { runAgent, isThinking } = useAgent();
  const { toast } = useToast();
  
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Message[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  
  // VOICE STATE
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize Speech Recognition Handshake
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(prev => prev + (prev ? ' ' : '') + transcript);
          setIsListening(false);
          toast({ title: "Voice Captured", description: "Identity node transcribed successfully." });
        };

        recognitionRef.current.onerror = () => setIsListening(false);
        recognitionRef.current.onend = () => setIsListening(false);
      }
    }
  }, [toast]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 80)}px`;
    }
  }, [input]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isThinking]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !user || isThinking) return;

    if (isTerminalLocked) {
      setHistory(prev => [...prev, 
        { role: 'user', content: input },
        { role: 'assistant', content: "🔐 Registry Locked. Authorize via PIN to dispatch commands.", mode: 'chat' }
      ]);
      setInput('');
      return;
    }

    const userMsg = input;
    setInput('');
    setHistory(prev => [...prev, { role: 'user', content: userMsg } as Message]);
    
    const response = await runAgent(userMsg, history);
    
    if (response) {
      const newMsg: Message = { 
        role: 'assistant', 
        content: response.message,
        thinking: response.thinking,
        mode: response.mode,
        intent: response.intent,
        plan: response.plan,
        action: response.action,
        ui_metadata: response.ui_metadata
      };
      
      setHistory(prev => [...prev, newMsg]);

      if (response.mode === 'action' && response.action) {
          if (response.action.type === 'navigate' && response.action.target) {
              toast({ title: "Navigation Proposed", description: `Opening ${response.action.target} node...` });
              setTimeout(() => router.push(`/${response.action.target === 'settings' ? 'settings' : response.action.target}`), 2000);
          }
          if (response.action.type === 'theme' && response.action.value) {
              setTheme(response.action.value);
              toast({ title: "Theme Calibrated", description: "Terminal visuals synchronized." });
          }
      }

      if (response.mode === 'handshake' && response.action) {
          const type = response.action.type;
          
          if (type === 'send') {
              const tokenNode = allAssets.find(a => a.symbol === response.action.token?.toUpperCase());
              setActiveAction({
                  type: 'SEND',
                  token: tokenNode || allAssets[0],
                  amount: response.action.amount?.toString() || '0',
                  recipient: response.action.recipient || '',
                  recipientName: response.action.recipientName || 'Target Node'
              });
          }

          if (type === 'swap') {
              const fromToken = allAssets.find(a => a.symbol === response.action.token?.toUpperCase());
              const toToken = allAssets.find(a => a.symbol === response.action.toToken?.toUpperCase());
              setActiveAction({
                  type: 'SWAP',
                  token: fromToken || allAssets[0],
                  recipientToken: toToken || allAssets[1],
                  amount: response.action.amount?.toString() || '0',
                  recipientName: toToken?.symbol || 'Target Asset'
              });
          }

          if (type === 'bridge') {
              const tokenNode = allAssets.find(a => a.symbol === response.action.token?.toUpperCase());
              setActiveAction({
                  type: 'BRIDGE',
                  token: tokenNode || allAssets[0],
                  amount: response.action.amount?.toString() || '0',
                  fromChain: response.action.fromChain,
                  toChain: response.action.toChain,
                  recipientName: `${response.action.toChain} Network`
              });
          }
      }
    }
  };

  const handleExecuteAction = async () => {
    if (!activeAction || isExecuting) return;
    setIsExecuting(true);
    try {
      const response = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeAction.type,
          params: { 
              recipient: activeAction.recipient || '', 
              amount: activeAction.amount, 
              token: activeAction.token.symbol,
              toToken: activeAction.recipientToken?.symbol,
              fromChain: activeAction.fromChain,
              toChain: activeAction.toChain
          }
        })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      
      toast({ title: "Dispatch Successful", description: "Ledger synchronized via Sentinel authority." });
      setIsConfirmOpen(false);
      
      setHistory(prev => [...prev, { 
        role: 'assistant', 
        content: `✅ ${activeAction.type} request confirmed. Hash: ${result.txHash?.slice(0, 10) || 'Registry settlement initialized'}...`, 
        mode: 'chat' 
      }]);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Action Failed", description: e.message });
    } finally {
      setIsExecuting(false);
    }
  };

  const quickCommands = [
    { label: "Audit Balance", icon: Shield, prompt: "What is my current portfolio balance?" },
    { label: "Market Trends", icon: BarChart3, prompt: "Show BTC price and 24h trend" },
    { label: "Gas Status", icon: Zap, prompt: "Tell me if gas is cheap right now" },
    { label: "Open Settings", icon: Settings, prompt: "Open the terminal settings page" }
  ];

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-foreground overflow-hidden">
      {/* 🏛️ OPERATOR HEADER */}
      <header className="p-4 flex items-center justify-between bg-black/20 backdrop-blur-2xl sticky top-0 z-50 px-6 border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
          <ArrowLeft className="w-5 h-5 text-white/60" />
        </Button>
        <div className="flex flex-col items-center">
          <h1 className="text-[12px] font-black uppercase tracking-[0.2em] text-white">V8.2 SENTINEL</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Activity className="w-2.5 h-2.5 text-primary" />
            <span className="text-[8px] text-primary font-black uppercase tracking-tighter">ACTION LAYER ACTIVE</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setHistory([])} className="rounded-xl text-white/20 hover:text-white">
          <Plus className="w-5 h-5" />
        </Button>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col relative">
        <ScrollArea className="flex-1">
          <div className="w-full p-6 space-y-8 pb-40">
            
            {/* 💎 TACTICAL EMPTY STATE */}
            {history.length === 0 && !isThinking && (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-12">
                <div className="px-4 py-2 rounded-2xl bg-[#0a0a0c] border border-white/5 flex flex-col items-center gap-1 shadow-2xl">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white">SENTINEL ONLINE</span>
                    </div>
                </div>

                <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-[300px] h-[300px] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
                    </div>
                    <div className="relative z-10 w-40 h-40 rounded-full border border-white/5 flex flex-col items-center justify-center shadow-2xl">
                        <div className="absolute inset-0 rounded-full border border-primary/10 border-dashed animate-[spin_20s_linear_infinite]" />
                        <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 4, repeat: Infinity }} className="text-primary drop-shadow-[0_0_15px_rgba(var(--primary),0.6)]">
                            <svg width="48" height="48" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="8" y="8" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="4"/>
                                <rect x="34" y="34" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="4"/>
                                <path d="M26 17H43V34" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                                <circle cx="26" cy="17" r="2" fill="currentColor"/>
                                <circle cx="43" cy="34" r="2" fill="currentColor"/>
                            </svg>
                        </motion.div>
                    </div>
                </div>
                
                <div className="space-y-3">
                  <h2 className="text-lg font-black uppercase tracking-[0.3em] text-white">OPERATOR HUB</h2>
                  <p className="text-[9px] max-w-[240px] leading-relaxed mx-auto text-white/30 uppercase font-black tracking-widest">
                      AUDIT NODES, PREPARE MULTI-CHAIN DISPATCHES, OR CALIBRATE TERMINAL THEMES.
                  </p>
                </div>
              </div>
            )}

            {history.map((msg, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex flex-col gap-2 w-full pb-6",
                  msg.role === 'user' ? "items-end" : "items-start"
                )}
              >
                <div className="flex items-center gap-2 opacity-40">
                  <span className="text-[7px] font-black uppercase tracking-widest text-white/60">
                    {msg.role === 'user' ? 'OPERATOR' : 'SENTINEL V8.2'}
                  </span>
                </div>

                <div className={cn(
                    "w-full text-[13px] font-bold leading-relaxed",
                    msg.role === 'user' ? "text-primary text-right" : "text-white/80"
                )}>
                  {msg.thinking && (
                    <details className="mb-2 group">
                      <summary className="list-none flex items-center gap-2 cursor-pointer opacity-30 hover:opacity-100 transition-opacity">
                        <Search className="w-2.5 h-2.5 text-primary" />
                        <span className="text-[7px] font-black uppercase tracking-widest">Logic Trace</span>
                      </summary>
                      <div className="mt-1 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[8px] font-mono text-white/40 leading-relaxed uppercase">
                        {msg.thinking}
                      </div>
                    </details>
                  )}
                  
                  {i === history.length - 1 && msg.role === 'assistant' ? (
                    <StreamingText text={msg.content} />
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}

                  {msg.ui_metadata?.priceInfo && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-5 rounded-[2rem] bg-[#0a0a0c] border border-white/5 space-y-4 shadow-2xl overflow-hidden max-w-xs">
                      <div className="flex items-center justify-between">
                         <div className="space-y-0.5">
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Market Node</p>
                            <p className="text-xl font-black text-white tabular-nums">${msg.ui_metadata.priceInfo.current.toLocaleString()}</p>
                         </div>
                         <div className={cn("px-2 py-1 rounded-lg text-[8px] font-black uppercase", msg.ui_metadata.priceInfo.trend === 'bullish' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                            {msg.ui_metadata.priceInfo.change24h.toFixed(2)}%
                         </div>
                      </div>
                    </motion.div>
                  )}

                  {msg.role === 'assistant' && (msg.mode === 'handshake') && msg.action && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      className="mt-4 p-5 rounded-[2.5rem] bg-primary/5 border border-primary/40 space-y-4 shadow-2xl relative overflow-hidden max-w-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black text-primary uppercase tracking-widest">ACTION REQUIRED</span>
                        <Zap className="w-3 h-3 text-primary fill-primary" />
                      </div>
                      
                      <div className="space-y-2">
                        {msg.action.type === 'send' && (
                            <div className="space-y-1">
                                <p className="text-2xl font-black text-white tracking-tighter">{msg.action.amount} {msg.action.token}</p>
                                <p className="text-[8px] text-white/40 uppercase font-bold truncate">To: {msg.action.recipientName || 'Identity Node'}</p>
                            </div>
                        )}
                        {msg.action.type === 'swap' && (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-xl font-black text-white">{msg.action.amount} {msg.action.token}</p>
                                    <ArrowRight className="w-3 h-3 text-primary" />
                                    <p className="text-xl font-black text-white">{msg.action.toToken}</p>
                                </div>
                                <p className="text-[8px] text-white/40 uppercase font-bold">Liquidity Swap Handshake</p>
                            </div>
                        )}
                        {msg.action.type === 'bridge' && (
                            <div className="space-y-1">
                                <p className="text-xl font-black text-white">{msg.action.amount} {msg.action.token}</p>
                                <div className="flex items-center gap-2 text-[8px] font-bold text-primary uppercase">
                                    <span>{msg.action.fromChain}</span>
                                    <Plane className="w-2.5 h-2.5" />
                                    <span>{msg.action.toChain}</span>
                                </div>
                            </div>
                        )}
                      </div>

                      <Button 
                        className="w-full h-10 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20"
                        onClick={() => setIsConfirmOpen(true)}
                      >
                        Authorize Node
                      </Button>
                    </motion.div>
                  )}

                  {msg.role === 'assistant' && msg.mode === 'action' && msg.action?.type === 'theme' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-4 max-w-xs shadow-xl">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Palette className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-white uppercase">Theme Synchronized</p>
                            <p className="text-[8px] text-muted-foreground uppercase font-bold">Node Identity: {msg.action.value}</p>
                        </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}

            {isThinking && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2 w-full">
                <div className="flex items-center gap-2 opacity-20">
                  <Loader2 className="w-2.5 h-2.5 animate-spin text-primary" />
                  <span className="text-[7px] font-black uppercase tracking-widest italic">SYNCHRONIZING ACTION NODES...</span>
                </div>
                <div className="h-3 w-20 bg-white/5 rounded-full animate-pulse" />
              </motion.div>
            )}

            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* 🚀 OPERATOR HUD INTERFACE (ANCHORED BOTTOM) */}
        <div className="p-1.5 bg-transparent pb-8 flex flex-col gap-2.5">
          
          {/* QUICK COMMAND NODES (EXPANDED TO EDGES) */}
          <div className="mx-0.5 p-1.5 bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/5 rounded-xl shadow-2xl flex items-center justify-center gap-1.5 h-12">
              {quickCommands.map((cmd, idx) => (
                  <button 
                      key={idx}
                      onClick={() => { setInput(cmd.prompt); }}
                      className="flex-1 py-2 px-2 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-all flex items-center justify-center gap-1.5 active:scale-95 group"
                  >
                      <cmd.icon className="w-3.5 h-3.5 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
                      <span className="text-[8px] font-black uppercase tracking-tighter text-white/50 group-hover:text-white transition-colors">
                          {cmd.label}
                      </span>
                  </button>
              ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="w-full">
            <div className="mx-0.5 relative flex flex-col bg-[#0a0a0c] border border-primary/30 rounded-xl p-1.5 transition-all focus-within:border-primary shadow-2xl">
                
                <div className="flex items-start gap-3 mb-1.5 min-h-[32px]">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                        <Activity className="w-3.5 h-3.5 text-primary animate-pulse" />
                    </div>
                    <textarea 
                        ref={textareaRef}
                        rows={1}
                        placeholder={isThinking ? "Auditing intent..." : "Command Sentinel..."} 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        disabled={isThinking}
                        className="flex-1 bg-transparent border-none p-0 text-[13px] font-bold text-white placeholder:text-zinc-800 focus:ring-0 outline-none resize-none min-h-[24px] max-h-[100px] thin-scrollbar pt-1"
                    />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                        <button 
                            type="button" 
                            onClick={toggleListening}
                            className={cn(
                                "w-8 h-8 rounded-lg transition-all flex items-center justify-center",
                                isListening ? "bg-primary/20 text-primary animate-pulse shadow-[0_0_15px_rgba(var(--primary),0.3)]" : "bg-white/[0.02] border border-white/5 text-white/20 hover:text-white/60"
                            )}
                        >
                            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </button>
                    </div>

                    <Button 
                        type="submit" 
                        size="icon" 
                        disabled={!input.trim() || isThinking} 
                        className="w-11 h-9 rounded-lg bg-primary text-black shadow-[0_0_15px_rgba(var(--primary),0.2)] transition-all active:scale-95 shrink-0"
                    >
                        {isThinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                </div>
            </div>
          </form>
          
          <div className="flex items-center justify-center gap-1.5 opacity-20">
            <ShieldCheck className="w-2.5 h-2.5 text-white" />
            <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white">HARDWARE CONTROL PLANE SECURED</span>
          </div>
        </div>
      </main>

      {/* INSTITUTIONAL CONFIRMATION OVERLAY */}
      {activeAction && (
        <TransactionConfirmationSheet 
          isOpen={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          onConfirm={handleExecuteAction}
          isSubmitting={isExecuting}
          amountToken={activeAction.amount}
          amountUsd={(parseFloat(activeAction.amount)) * (prices[activeAction.token.symbol.toLowerCase()]?.price || 0)}
          token={activeAction.token}
          recipientToken={activeAction.recipientToken}
          recipientName={activeAction.recipientName}
          recipientAddress={activeAction.recipient || ''}
          totalFeeUsd={0.05}
        />
      )}
    </div>
  );
}
