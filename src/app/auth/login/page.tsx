
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { monitoringService } from '@/lib/services/monitoring-service';
import { 
  Loader2, 
  ShieldCheck, 
  Mail, 
  Lock, 
  LogIn, 
  AlertCircle, 
  ArrowRight,
  QrCode,
  Smartphone,
  ShieldAlert,
  Zap,
  Info,
  KeyRound,
  CheckCircle2,
  Lock as LockIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { notificationService } from '@/lib/services/notification-service';
import { Suspense } from 'react';

/**
 * TERMINAL LOGIN NODE
 * Version: 19.0.0 (OAuth Handshake Optimized)
 */
function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  // Auth Phases: account, mfa, email_backup, forgot_password, verify_reset, new_password
  const [loginStep, setLoginStep] = useState<'account' | 'mfa' | 'email_backup' | 'forgot_password' | 'verify_reset' | 'new_password'>('account');

  // Step 1: Account Node
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Step 2: MFA Node
  const [mfaCode, setMfaCode] = useState('');
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);

  // Verification Overlay (For Unverified Email)
  const [showVerifyPanel, setShowVerifyPanel] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Recovery State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Handle URL Params (e.g. from redirect)
  useEffect(() => {
    const verifyRequested = searchParams.get('verify');
    const emailParam = searchParams.get('email');
    if (emailParam) setEmail(emailParam);
    if (verifyRequested === 'true') setShowVerifyPanel(true);
  }, [searchParams]);

  // Cooldown Timer Logic
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  /**
   * TIER 1: ACCOUNT HANDSHAKE
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      // VERIFICATION FALLBACK: Detect unconfirmed email
      if (error?.message.includes('Email not confirmed')) {
        console.log("[AUTH_SENTINEL] Unverified email node detected. Triggering resend...");
        await supabase.auth.resend({ type: 'signup', email });
        setShowVerifyPanel(true);
        toast({ 
          title: "Verification Required", 
          description: "A fresh code has been sent to your inbox. Please verify to continue." 
        });
        setIsLoading(false);
        return;
      }

      if (error) {
        // Log failed attempt node
        const { data: userLookup } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
        if (userLookup) await monitoringService.logActivity(userLookup.id, 'login_failed', { error: error.message });
        throw error;
      }
      
      // 1. Fetch Identity Nodes
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      
      // 2. Sequential Check: MFA Registry Node
      if (profile?.mfa_enabled) {
        setLoginStep('mfa');
        setIsLoading(false);
        return;
      }

      // 3. Monitoring Node: Log Success
      await monitoringService.logActivity(data.user.id, 'login');

      // 4. Device Intelligence Check (Sentinel Node)
      await auditLoginDevice(data.user.id, profile, email);

      finalizeLogin();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Authentication Error", description: error.message });
      setIsLoading(false);
    }
  };

  /**
   * OAUTH HANDSHAKE: GOOGLE AUTHORITY (REFINED)
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
          // ENSURE ABSOLUTE REDIRECT TO APP REGISTRY
          redirectTo: `${window.location.origin}/auth/callback`,
          // FORCE PREMIUM ACCOUNT SELECTION PROMPT
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          }
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({ variant: "destructive", title: "OAuth Error", description: error.message });
      setIsGoogleLoading(false);
    }
  };

  /**
   * FORGOT PASSWORD: REQUEST RESET CODE
   */
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !supabase) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;

      toast({ title: "Reset Dispatched", description: "Password reset code sent to your email registry." });
      setLoginStep('verify_reset');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Protocol Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * FORGOT PASSWORD: VERIFY RESET CODE
   */
  const handleVerifyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || verificationCode.length !== 6 || !supabase) return;

    setIsVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: 'recovery'
      });
      if (error) throw error;

      // Type recovery signs the user in temporarily to update password
      setLoginStep('new_password');
      setVerificationCode('');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Verification Failed", description: error.message });
    } finally {
      setIsVerifying(false);
    }
  };

  /**
   * FORGOT PASSWORD: SET NEW PASSWORD
   */
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Mismatch", description: "Passwords do not match." });
      return;
    }
    if (newPassword.length < 8) {
      toast({ variant: "destructive", title: "Insecure", description: "Password must be at least 8 characters." });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({ title: "Password Secured", description: "Your identity node has been updated. Please log in." });
      setLoginStep('account');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * VERIFY EMAIL OTP (For Unverified Login Fallback)
   */
  const handleVerifyEmail = async (e: React.FormEvent) => {
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

      setShowVerifyPanel(false);
      setVerificationCode('');
      
      // Attempt to finalize login now that verified
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        await auditLoginDevice(user.id, profile, user.email!);
        finalizeLogin();
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Verification Failed", description: error.message });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email || !supabase || resendCooldown > 0) return;
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: loginStep === 'verify_reset' ? 'recovery' : 'signup',
        email,
      });
      if (error) throw error;
      toast({ title: "Code Resent", description: "Check your inbox again." });
      setResendCooldown(60);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsResending(false);
    }
  };

  /**
   * DEVICE INTELLIGENCE HANDSHAKE
   */
  const auditLoginDevice = async (userId: string, profile: any, userEmail: string) => {
    const ua = navigator.userAgent;
    const platform = navigator.platform;
    let browser = "Other Browser";
    let os = "Unknown OS";

    if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Safari")) browser = "Safari";
    else if (ua.includes("Edge")) browser = "Edge";

    if (ua.includes("Win")) os = "Windows";
    else if (ua.includes("Mac")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("like Mac")) os = "iOS";

    const currentDeviceSignature = `${os} - ${browser} (${platform})`;
    const knownDevice = localStorage.getItem(`ss_known_device_${userId}`);

    const isNewDevice = !knownDevice || knownDevice !== currentDeviceSignature;
    const isRegistryMismatch = profile?.last_login_device && profile.last_login_device !== currentDeviceSignature;

    if (isNewDevice || isRegistryMismatch) {
      localStorage.setItem(`ss_known_device_${userId}`, currentDeviceSignature);
      
      // Update registry metadata without triggering a forced passcode reset (security_locked)
      await supabase!.from('profiles').update({ 
        last_login_device: currentDeviceSignature,
        updated_at: new Date().toISOString()
      }).eq('id', userId);

      await notificationService.loginAlert(userId, currentDeviceSignature);

      if (profile?.device_lock_enabled) {
        toast({ 
          variant: "destructive", 
          title: "Hardware Sentinel", 
          description: "New device detected. Authorizing hardware node requires your security PIN." 
        });
      }
    }
  };

  /**
   * TIER 2: MFA VERIFICATION (Supabase Native)
   */
  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.length !== 6) return;

    setIsVerifyingMfa(true);
    try {
      const { data: factorData, error: factorError } = await supabase!.auth.mfa.listFactors();
      if (factorError) throw factorError;

      const totpFactor = factorData.totp.find(f => f.status === 'verified');
      if (!totpFactor) throw new Error("No verified MFA method found.");
      
      const { data: challengeData, error: challengeError } = await supabase!.auth.mfa.challenge({ factorId: totpFactor.id });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase!.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code: mfaCode,
      });

      if (verifyError) {
        const { data: { user } } = await supabase!.auth.getUser();
        if (user) await monitoringService.logActivity(user.id, 'mfa_failed', { code: mfaCode });
        throw verifyError;
      }

      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) throw new Error("Session node timed out.");
      
      await monitoringService.logActivity(user.id, 'mfa_verify');

      const { data: profile } = await supabase!.from('profiles').select('*').eq('id', user.id).single();
      await auditLoginDevice(user.id, profile, user.email!);
      finalizeLogin();
    } catch (e: any) {
      toast({ variant: "destructive", title: "MFA Failed", description: e.message });
    } finally {
      setIsVerifyingMfa(false);
    }
  };

  /**
   * FINAL DISPATCH: Dashboard or Retrieval Protocol
   */
  const finalizeLogin = () => {
    toast({ title: "Welcome back!", description: "Identity node verified." });
    router.refresh();
    router.replace('/');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-transparent p-6 text-foreground relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[120px] -mr-64 -mt-64 rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-sm space-y-8 relative z-10"
      >
        <AnimatePresence mode="wait">
          
          {/* PHASE: ACCOUNT LOGIN */}
          {loginStep === 'account' && (
            <motion.div key="account" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-8">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-primary/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 border border-primary/20 text-primary shadow-2xl">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h1 className="text-3xl font-black text-white tracking-tight uppercase">Terminal Login</h1>
                <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest opacity-60">Authorize your institutional node</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Email Address</Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                      <Input type="email" placeholder="name@institution.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-14 bg-black/40 backdrop-blur-xl border-white/10 rounded-2xl focus-visible:ring-primary text-white font-bold shadow-2xl" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-2">
                      <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Node Password</Label>
                      <button type="button" onClick={() => setLoginStep('forgot_password')} className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline">Forgot?</button>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                      <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-14 bg-black/40 backdrop-blur-xl border-white/10 pl-12 rounded-2xl focus-visible:ring-primary text-white font-bold shadow-2xl" required />
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <><LogIn className="w-4 h-4 mr-2" /> Open Vault</>}
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
                disabled={isGoogleLoading || isLoading}
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

              <div className="text-center pt-4">
                <p className="text-xs text-muted-foreground font-medium">New node required? <Link href="/auth/signup" className="text-primary font-black uppercase hover:underline">Provision Identity</Link></p>
              </div>
            </motion.div>
          )}

          {/* PHASE: MFA NODE */}
          {loginStep === 'mfa' && (
            <motion.div key="mfa" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-blue-500/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-2 border border-blue-500/20 text-blue-400 shadow-xl relative overflow-hidden">
                  <Smartphone className="w-8 h-8 relative z-10" />
                  <div className="absolute inset-0 bg-blue-500/5 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black uppercase tracking-tight text-white">MFA Protocol</h2>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Enter 6-digit Authenticator Code</p>
                </div>
              </div>

              <form onSubmit={handleVerifyMfa} className="space-y-6">
                <div className="space-y-4">
                  <Input 
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    className="h-16 w-full bg-white/5 border border-white/10 rounded-2xl text-center text-4xl font-mono tracking-[0.5em] text-white focus:border-primary outline-none shadow-2xl"
                    required
                    autoFocus
                  />
                  <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex gap-3 items-center">
                    <Info className="w-4 h-4 text-blue-400 shrink-0" />
                    <p className="text-[9px] text-blue-400 font-bold uppercase leading-relaxed">
                      Verification required to upgrade session to aal2 (High Security).
                    </p>
                  </div>
                </div>
                <Button className="w-full h-14 rounded-2xl bg-primary font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20" disabled={mfaCode.length !== 6 || isVerifyingMfa}>
                  {isVerifyingMfa ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Authorize"}
                </Button>
                <Button variant="ghost" type="button" onClick={() => setLoginStep('account')} className="w-full h-12 text-white/20 font-bold uppercase text-[9px]">Back to Password</Button>
              </form>
            </motion.div>
          )}

          {/* FORGOT PASSWORD SECTIONS */}
          {loginStep === 'forgot_password' && (
            <motion.div key="forgot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-2 border border-primary/20 text-primary">
                  <KeyRound className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black uppercase tracking-tight text-white">Reset Password</h2>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Enter account email</p>
                </div>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Email Address</Label>
                  <Input type="email" placeholder="name@institution.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-14 bg-black/40 border-white/10 rounded-2xl text-white font-bold" required />
                </div>
                <Button className="w-full h-14 rounded-2xl bg-primary font-black uppercase text-xs" disabled={isLoading || !email}>
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Code"}
                </Button>
                <Button variant="ghost" type="button" onClick={() => setLoginStep('account')} className="w-full h-12 text-white/20 font-bold uppercase text-[9px]">Back to Login</Button>
              </form>
            </motion.div>
          )}

          {loginStep === 'verify_reset' && (
            <motion.div key="verify_reset" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-blue-500/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-2 border border-blue-500/20 text-blue-400">
                  <Mail className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black uppercase tracking-tight text-white">Enter Reset Code</h2>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Check your email registry</p>
                </div>
              </div>

              <form onSubmit={handleVerifyReset} className="space-y-6">
                <Input 
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="h-16 w-full bg-white/5 border border-white/10 rounded-2xl text-center text-3xl font-mono tracking-[0.5em] text-white"
                  required
                />
                <Button className="w-full h-14 rounded-2xl bg-primary font-black uppercase text-xs" disabled={isVerifying || verificationCode.length !== 6}>
                  {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authorize Recovery"}
                </Button>
                <button type="button" onClick={handleResend} disabled={resendCooldown > 0} className="w-full text-[9px] font-black uppercase text-white/40 hover:text-white transition-colors">
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                </button>
              </form>
            </motion.div>
          )}

          {loginStep === 'new_password' && (
            <motion.div key="new_password" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-500/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-2 border border-green-500/20 text-green-400">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-white">New Password</h2>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">New Node Password</Label>
                    <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-2xl text-white font-bold" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Confirm Password</Label>
                    <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-2xl text-white font-bold" required />
                  </div>
                </div>
                <Button className="w-full h-14 rounded-2xl bg-primary font-black uppercase text-xs shadow-xl" disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authorize Password Update"}
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* VERIFICATION PANEL */}
      <AnimatePresence>
        {showVerifyPanel && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowVerifyPanel(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed bottom-0 inset-x-0 bg-[#0a0a0c] border-t border-white/10 rounded-t-[3rem] z-[101] p-8 pb-12 shadow-2xl">
              <div className="max-w-sm mx-auto space-y-8">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-primary/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 border border-primary/20 text-primary">
                    <Mail className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">Verify Identity</h2>
                  <p className="text-xs text-muted-foreground leading-relaxed px-4">
                    Your account email has not been verified. We sent a 6-digit cryptographic handshake to <span className="text-white font-bold">{email}</span>
                  </p>
                </div>

                <form onSubmit={handleVerifyEmail} className="space-y-6">
                  <div className="space-y-4">
                    <input 
                      type="text" 
                      placeholder="000000" 
                      maxLength={6} 
                      value={verificationCode} 
                      onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))} 
                      className="h-16 w-full bg-white/5 border border-white/10 rounded-2xl text-center text-3xl font-mono tracking-[0.5em] text-white shadow-2xl outline-none" 
                      required 
                    />
                    <div className="flex justify-center">
                      <Button 
                        type="button" 
                        variant="link" 
                        onClick={handleResend}
                        disabled={isResending || resendCooldown > 0}
                        className="text-primary font-bold text-xs uppercase tracking-widest"
                      >
                        {isResending ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-14 rounded-2xl font-black text-sm uppercase bg-primary shadow-xl shadow-primary/20" disabled={isVerifying || verificationCode.length !== 6}>
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-transparent"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <LoginPageContent />
    </Suspense>
  );
}
