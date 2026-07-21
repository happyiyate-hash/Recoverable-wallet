
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, UserPlus, Zap, ShieldCheck, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

/**
 * SIGNUP INTERACTION NODE
 * Version: 19.0.0 (OAuth Handshake Optimized)
 */
function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Verification State
  const [showVerifyPanel, setShowVerifyPanel] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    // REGISTRY CAPTURE: Save to state AND localStorage immediately
    const ref = searchParams.get('ref');
    if (ref) {
      const cleanRef = ref.toUpperCase();
      setReferralCode(cleanRef);
      localStorage.setItem('pending_referral', cleanRef);
    } else {
      const savedRef = localStorage.getItem('pending_referral');
      if (savedRef) setReferralCode(savedRef);
    }
    
    const verifyRequested = searchParams.get('verify');
    const existingEmail = searchParams.get('email');
    if (verifyRequested === 'true' && existingEmail) {
      setEmail(existingEmail);
      setShowVerifyPanel(true);
    }
  }, [searchParams]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[AUTH_HANDSHAKE] Initializing Provisioning...");

    if (!supabase) {
      toast({
        variant: "destructive",
        title: "Auth Node Offline",
        description: "The authentication service is not configured correctly."
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            // INSTITUTIONAL METADATA: Pass referral code to trigger logic
            referral_code: referralCode.trim() || null,
          }
        }
      });
      if (error) throw error;
      
      toast({ title: "Node Provisioned", description: "Verification code sent to your inbox." });
      setShowVerifyPanel(true);
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Provisioning Error", 
        description: error.message 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || verificationCode.length !== 6 || !supabase) return;

    setIsVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: 'signup'
      });

      if (error) throw error;

      toast({ title: "Identity Verified!", description: "Initializing profile node..." });
      setShowVerifyPanel(false);
      
      router.refresh();
      router.replace('/wallet-session');
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Verification Failed", 
        description: error.message 
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email || !supabase) return;
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw error;
      toast({ title: "Code Resent", description: "Check your inbox again." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsResending(false);
    }
  };

  /**
   * OAUTH SIGNUP: GOOGLE AUTHORITY (REFINED)
   * Version: 2.0.0 (Premium Prompt Standard)
   */
  const handleGoogleLogin = async () => {
    if (!supabase) {
      toast({ variant: "destructive", title: "Auth Node Offline" });
      return;
    }

    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // ENSURE ABSOLUTE REDIRECT
          redirectTo: `${window.location.origin}/auth/callback`,
          // FORCE PREMIUM ACCOUNT SELECTION PROMPT
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
            referral_code: referralCode
          }
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({ variant: "destructive", title: "OAuth Error", description: error.message });
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-transparent p-6 text-foreground relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[120px] -mr-64 -mt-64 rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-sm space-y-10 relative z-10"
      >
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-primary/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 border border-primary/20 text-primary shadow-2xl">
            <UserPlus className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">Provision Node</h1>
          <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest opacity-60">Join the institutional registry</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Email Address</Label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                <Input 
                  type="email" 
                  placeholder="name@institution.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 bg-black/40 backdrop-blur-xl border-white/10 pl-12 rounded-2xl focus-visible:ring-primary text-white shadow-2xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Secure Password</Label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 bg-black/40 backdrop-blur-xl border-white/10 pl-12 rounded-2xl focus-visible:ring-primary text-white shadow-2xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Referral Code (Optional)</Label>
              <div className="relative group">
                <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                <Input 
                  type="text" 
                  placeholder="ABC12345" 
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="h-14 bg-black/40 backdrop-blur-xl border-white/10 pl-12 rounded-2xl focus-visible:ring-primary text-white shadow-2xl font-mono uppercase tracking-widest"
                />
              </div>
            </div>
          </div>

          <Button 
            type="submit"
            className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20"
            disabled={isLoading || showVerifyPanel}
          >
            {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "Authorize Registry Entry"}
          </Button>
        </form>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
            <span className="bg-transparent px-4 text-zinc-600">OR CONTINUE WITH</span>
          </div>
        </div>

        <Button 
          variant="outline" 
          className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest bg-black/40 border-white/10 hover:bg-black/60 shadow-2xl"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading || showVerifyPanel}
        >
          {isGoogleLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google Authority
            </div>
          )}
        </Button>

        <div className="text-center">
          <p className="text-xs text-muted-foreground font-medium">
            Already have a node?{' '}
            <Link href="/auth/login" className="text-primary font-black uppercase hover:underline">Terminal Login</Link>
          </p>
        </div>
      </motion.div>

      {/* VERIFICATION PANEL (Slide-Up) */}
      <AnimatePresence>
        {showVerifyPanel && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowVerifyPanel(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 inset-x-0 bg-[#0a0a0c] border-t border-white/10 rounded-t-[3rem] z-[101] p-8 pb-12 shadow-2xl"
            >
              <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-8" />
              
              <div className="max-w-sm mx-auto space-y-8">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-primary/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 border border-primary/20 text-primary shadow-2xl">
                    <Mail className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">Verify Your Email</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We sent a 6-digit cryptographic handshake to <br/>
                    <span className="text-white font-bold">{email}</span>
                  </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-6">
                  <div className="space-y-4">
                    <input 
                      type="text" 
                      placeholder="000000"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                      className="h-16 w-full bg-white/5 border border-white/10 rounded-2xl text-center text-3xl font-mono tracking-[0.5em] focus-visible:ring-primary text-white shadow-2xl outline-none"
                      required
                    />
                    <div className="flex justify-center">
                      <Button 
                        type="button" 
                        variant="link" 
                        onClick={handleResend}
                        disabled={isResending}
                        className="text-primary font-bold text-xs uppercase tracking-widest"
                      >
                        {isResending ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                        Resend Code
                      </Button>
                    </div>
                  </div>

                  <Button 
                    type="submit"
                    className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20"
                    disabled={isVerifying || verificationCode.length !== 6}
                  >
                    {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Authority"}
                  </Button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-transparent">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}
