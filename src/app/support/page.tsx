
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  MessageSquare, 
  ShieldCheck,
  CheckCircle2,
  Info,
  LifeBuoy,
  ShieldAlert,
  HelpCircle,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useUser } from '@/contexts/user-provider';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

/**
 * INSTITUTIONAL SUPPORT TERMINAL
 * Version: 2.0.0 (Categorized Triage)
 * 
 * Allows users to submit reports, appeals, and categorized bug reports.
 */
function SupportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useUser();
  const { toast } = useToast();

  const [type, setType] = useState('general');
  const [subType, setSubType] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success'>('idle');

  const urlType = searchParams.get('type') || 'support';
  const isAppeal = urlType === 'appeal';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user || !supabase) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('support_tickets').insert({
        user_id: user.id,
        type: isAppeal ? 'appeal' : type,
        sub_type: subType || null,
        message: message.trim(),
        status: 'open'
      });

      if (error) throw error;

      setStatus('success');
      toast({ title: "Report Dispatched", description: "Your message has been logged in the administrative registry." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Dispatch Failed", description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-foreground">
      <header className="p-4 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-50 px-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="rounded-xl"
          disabled={profile?.is_blocked && !isAppeal} 
        >
          <ArrowLeft className="w-5 h-5 text-white/60" />
        </Button>
        
        <div className="flex flex-col items-center">
          <h1 className="text-xs font-black uppercase tracking-[0.2em] text-white">
            {isAppeal ? 'Appeal Protocol' : 'Support Hub'}
          </h1>
          <div className="flex items-center gap-1.5 mt-1">
            <LifeBuoy className="w-2.5 h-2.5 text-primary" />
            <span className="text-[8px] text-primary font-black uppercase tracking-tighter">Registry Liaison</span>
          </div>
        </div>
        <div className="w-10" />
      </header>

      <main className="flex-1 p-6 space-y-10 max-w-lg mx-auto w-full pb-32 overflow-y-auto thin-scrollbar relative">
        
        <AnimatePresence mode="wait">
          {status === 'success' ? (
            <motion.div 
              key="success"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center text-center py-20 space-y-6"
            >
              <div className="w-20 h-20 rounded-[2.5rem] bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 shadow-2xl">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black uppercase tracking-tight text-white">Message Logged</h2>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                  Your request is now queued in the administrative ledger. Our compliance nodes will review the data node and respond via your registered identity.
                </p>
              </div>
              <Button 
                onClick={() => router.replace('/')} 
                className="h-14 px-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 font-black uppercase text-[10px] tracking-widest"
              >
                Return to Dashboard
              </Button>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <section className="p-6 rounded-[2.5rem] bg-primary/5 border border-primary/20 relative overflow-hidden shadow-2xl">
                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-lg">
                    {isAppeal ? <ShieldAlert className="w-6 h-6" /> : <HelpCircle className="w-6 h-6" />}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">
                      {isAppeal ? 'Administrative Appeal' : 'How can we help?'}
                    </h3>
                    <p className="text-[10px] text-muted-foreground leading-relaxed font-medium uppercase">
                      {isAppeal 
                        ? 'Submit a formal request to unblock your account registry node. Provide specific context.' 
                        : 'Submit a report, bug discovery, or general inquiry to the compliance registry.'}
                    </p>
                  </div>
                </div>
                <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-primary/10 blur-3xl rounded-full" />
              </section>

              <form onSubmit={handleSubmit} className="space-y-6">
                {!isAppeal && (
                  <div className="space-y-4">
                    <div className="space-y-2 px-1">
                      <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Inquiry Type</Label>
                      <Select value={type} onValueChange={(v) => { setType(v); setSubType(''); }}>
                        <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl text-white font-bold">
                          <SelectValue placeholder="Select inquiry nature" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0a0a0c] border-white/10 text-white rounded-2xl">
                          <SelectItem value="bug">Report a Bug</SelectItem>
                          <SelectItem value="technical">Technical Issue</SelectItem>
                          <SelectItem value="general">General Inquiry</SelectItem>
                          <SelectItem value="feedback">Feedback</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {type === 'bug' && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 px-1">
                        <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Target Node</Label>
                        <Select value={subType} onValueChange={setSubType}>
                          <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl text-white font-bold">
                            <SelectValue placeholder="Which system node?" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#0a0a0c] border-white/10 text-white rounded-2xl">
                            <SelectItem value="ui">UI / Visual Bug</SelectItem>
                            <SelectItem value="transaction">Transaction Node</SelectItem>
                            <SelectItem value="kyc">KYC Handshake</SelectItem>
                            <SelectItem value="security">Security / Login</SelectItem>
                          </SelectContent>
                        </Select>
                      </motion.div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Message Payload</p>
                  <Textarea 
                    placeholder={isAppeal ? "Explain why your account should be reinstated..." : "Describe your issue in detail..."}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[200px] bg-white/[0.03] border-white/10 rounded-[2rem] p-6 text-sm leading-relaxed focus-visible:ring-primary shadow-inner"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={!message.trim() || isSubmitting || (!isAppeal && type === 'bug' && !subType)}
                  className="w-full h-16 rounded-[2rem] bg-primary hover:bg-primary/90 font-black uppercase text-sm tracking-widest shadow-xl shadow-primary/20 gap-3"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Dispatch Request</>}
                </Button>
              </form>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-3 items-center opacity-60">
                <Info className="w-4 h-4 text-white/40 shrink-0" />
                <p className="text-[9px] text-white/40 leading-relaxed font-bold uppercase tracking-tight">
                  Responses are typically processed within 24-48 business hours by the administrative node.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pt-10 flex items-center justify-center gap-2 opacity-20">
          <ShieldCheck className="w-4 h-4 text-white" />
          <span className="text-[8px] font-black uppercase tracking-widest text-white">Liaison Protocol v2.0 • Registry Link Active</span>
        </div>
      </main>
    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#050505]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <SupportContent />
    </Suspense>
  );
}
