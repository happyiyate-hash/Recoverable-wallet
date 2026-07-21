'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/contexts/user-provider';
import { supabase } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, ShieldCheck, KeyRound, Smartphone, Mail, AlertTriangle, Fingerprint, QrCode
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import QRCode from "react-qr-code";
import { toast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

export default function DesktopSecurityPage() {
  const { user, profile, refreshProfile } = useUser();
  
  const [pinEnabled, setPinEnabled] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  
  // MFA Setup State
  const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = useState(false);
  const [is2FAProcessing, setIs2FAProcessing] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState<'intro' | 'qr' | 'verify' | 'backup'>('intro');
  const [qrUri, setQrUri] = useState('');
  const [qrCodeSvg, setQrCodeSvg] = useState('');
  const [tempMfaSecret, setTempMfaSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // PIN Setup State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinStep, setPinStep] = useState<'create' | 'confirm'>('create');
  const [tempPin, setTempPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  useEffect(() => {
     if (profile) {
         setPinEnabled(profile.pin_enabled || false);
         setMfaEnabled(profile.mfa_enabled || false);
         setBiometricsEnabled(profile.biometrics_enabled || false);
     }
  }, [profile]);

  if (!profile) return <div className="h-full w-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#633BBC]" /></div>;

  // MFA Handlers
  const handleMfaEnable = async () => {
      setIs2FAProcessing(true);
      try {
          const { data: factors } = await supabase.auth.mfa.listFactors();
          const existingFactor = factors?.totp?.find(f => f.status === 'verified');
          
          if (existingFactor) {
              await supabase.from('profiles').update({ mfa_active: true, mfa_enabled: true }).eq('id', profile.id);
              setMfaEnabled(true);
              toast({ title: "MFA Reactivated", description: "Authenticator node is active." });
          } else {
              setIsTwoFactorModalOpen(true);
              setTwoFactorStep('intro');
              startMfaSetup();
          }
      } catch (e: any) {
          toast({ variant: "destructive", title: "MFA Check Failed", description: e.message });
      } finally { setIs2FAProcessing(false); }
  };

  const startMfaSetup = async () => {
      setIs2FAProcessing(true);
      try {
          const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'WNC Wallet' });
          if (error) throw error;
          if (data) {
              setFactorId(data.id);
              setTempMfaSecret(data.totp.secret);
              setQrCodeSvg(data.totp.qr_code);
              setTwoFactorStep('qr');
          }
      } catch (e: any) {
          toast({ variant: "destructive", title: "MFA Setup Failed", description: e.message });
          setTwoFactorStep('intro');
      } finally { setIs2FAProcessing(false); }
  };

  const handleMfaVerify = async () => {
      if (otpCode.length !== 6) return;
      setIs2FAProcessing(true);
      try {
          const challenge = await supabase.auth.mfa.challenge({ factorId });
          if (challenge.error) throw challenge.error;
          const verify = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code: otpCode });
          if (verify.error) throw verify.error;
          
          setTwoFactorStep('backup');
      } catch (e: any) {
          toast({ variant: "destructive", title: "Verification Failed", description: "Invalid code." });
      } finally { setIs2FAProcessing(false); }
  };

  const finalizeMFA = async () => {
      setIs2FAProcessing(true);
      try {
          const { error } = await supabase.from('profiles').update({
              mfa_enabled: true, mfa_active: true, mfa_secret: tempMfaSecret, mfa_last_verified: new Date().toISOString()
          }).eq('id', profile.id);
          if (error) throw error;
          await refreshProfile();
          toast({ title: "MFA Authorized" });
          setIsTwoFactorModalOpen(false);
      } catch (e: any) { toast({ variant: "destructive", title: "Sync Failed" }); }
      finally { setIs2FAProcessing(false); }
  };

  // PIN Handlers
  const handlePinSubmit = async () => {
      if (pinStep === 'create') {
          if (tempPin.length === 4) setPinStep('confirm');
      } else {
          if (tempPin === confirmPin) {
              const pinHash = btoa(tempPin); // Simple base64 encoding for client-side matching requirement
              await supabase.from('profiles').update({ pin_enabled: true, pin_hash: pinHash }).eq('id', profile.id);
              setPinEnabled(true);
              setIsPinModalOpen(false);
              toast({ title: "PIN Authorized" });
          } else {
              toast({ variant: "destructive", title: "Mismatch", description: "PINs do not match." });
              setConfirmPin('');
          }
      }
  };

  return (
    <div className="flex flex-col w-full h-full p-8 relative gap-8 overflow-y-auto thin-scrollbar">
       <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-[#633BBC]/10 blur-[150px] rounded-full pointer-events-none" />
       
       <header className="w-full shrink-0 flex items-center justify-between z-10">
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
               <ShieldCheck className="w-8 h-8 text-[#633BBC]" /> Security Parameter Hub
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#633BBC] mt-1 ml-11">
               System Defense & Authentication
            </p>
          </div>
          <div className="flex gap-4">
             <div className="px-5 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)] backdrop-blur-xl flex items-center gap-3">
                 <ShieldCheck className="w-5 h-5 text-emerald-500" />
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Defense Status</p>
                    <p className="text-sm font-black text-white">{pinEnabled && mfaEnabled ? 'Maximum Guard' : pinEnabled || mfaEnabled ? 'Standard Guard' : 'Vulnerable'}</p>
                 </div>
             </div>
          </div>
       </header>

       {/* DENSE GRID SETTINGS */}
       <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 z-10">
          
          {/* MFA CARD */}
          <div className="col-span-1 lg:col-span-2 bg-black/40 border border-[#633BBC]/30 rounded-[3rem] p-8 shadow-[0_4px_30px_rgba(99,59,188,0.1)] backdrop-blur-xl relative overflow-hidden flex flex-col justify-between group">
             <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#633BBC] to-transparent" />
             <div className="flex items-start justify-between">
                <div className="flex gap-4">
                   <div className="w-14 h-14 rounded-2xl bg-[#633BBC]/10 border border-[#633BBC]/20 flex items-center justify-center text-[#633BBC] shadow-inner group-hover:scale-110 transition-transform">
                      <Smartphone className="w-7 h-7" />
                   </div>
                   <div>
                      <h2 className="text-xl font-black text-white uppercase tracking-tight">Authenticator Node</h2>
                      <p className="text-[11px] font-bold text-white/40 tracking-widest mt-1">Multi-Factor Protocol (Recommended)</p>
                   </div>
                </div>
                <Switch 
                   checked={mfaEnabled} 
                   onCheckedChange={async (c) => { 
                       if (c) handleMfaEnable(); 
                       else { setMfaEnabled(false); await supabase.from('profiles').update({ mfa_active: false, mfa_enabled: false }).eq('id', profile.id); } 
                   }} 
                   className="data-[state=checked]:bg-[#633BBC]" 
                />
             </div>
             <div className="mt-8 p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-4">
                <ShieldCheck className="w-5 h-5 text-[#633BBC] shrink-0" />
                <p className="text-[10px] font-bold text-white/60 leading-relaxed uppercase tracking-widest">
                   Enabling an authenticator app adds an impenetrable cryptographic layer. All outbound transfers and destructive actions will require a live handshake.
                </p>
             </div>
          </div>

          {/* PIN CARD */}
          <div className="bg-black/40 border border-white/5 rounded-[3rem] p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden flex flex-col justify-between group hover:border-white/20 transition-colors">
             <div className="flex items-start justify-between">
                <div className="flex gap-4">
                   <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white shadow-inner group-hover:scale-110 transition-transform">
                      <KeyRound className="w-6 h-6" />
                   </div>
                   <div>
                      <h2 className="text-base font-black text-white uppercase tracking-tight">Access PIN</h2>
                      <p className="text-[9px] font-bold text-white/40 tracking-widest mt-1">Local Session Lock</p>
                   </div>
                </div>
                <Switch 
                   checked={pinEnabled} 
                   onCheckedChange={async (c) => { 
                       if (c) { setTempPin(''); setConfirmPin(''); setPinStep('create'); setIsPinModalOpen(true); } 
                       else { setPinEnabled(false); await supabase.from('profiles').update({ pin_enabled: false }).eq('id', profile.id); } 
                   }} 
                   className="data-[state=checked]:bg-white" 
                />
             </div>
             <div className="mt-6 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest p-3 rounded-xl bg-white/5">
                   <span className="text-white/40">Status</span>
                   <span className={pinEnabled ? "text-emerald-500" : "text-amber-500"}>{pinEnabled ? 'LOCKED' : 'UNSECURED'}</span>
                </div>
                <button className="w-full text-center py-3 text-[9px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors" disabled={!pinEnabled} onClick={() => {setTempPin(''); setConfirmPin(''); setPinStep('create'); setIsPinModalOpen(true);}}>
                   {pinEnabled ? 'Change PIN' : 'Initialize PIN'}
                </button>
             </div>
          </div>

          {/* BIOMETRICS CARD */}
          <div className="bg-black/40 border border-white/5 rounded-[3rem] p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden flex flex-col justify-between group opacity-50 grayscale">
             <div className="flex items-start justify-between">
                <div className="flex gap-4">
                   <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white shadow-inner">
                      <Fingerprint className="w-6 h-6" />
                   </div>
                   <div>
                      <h2 className="text-base font-black text-white uppercase tracking-tight">Biometrics</h2>
                      <p className="text-[9px] font-bold text-white/40 tracking-widest mt-1">Hardware Identity</p>
                   </div>
                </div>
             </div>
             <div className="mt-6 flex flex-col gap-2">
                <div className="w-full py-3 text-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-black uppercase tracking-widest">
                   Not Supported on Desktop
                </div>
             </div>
          </div>

          {/* ACCOUNT SECURITY CARD */}
          <div className="col-span-1 lg:col-span-2 bg-black/40 border border-red-500/20 rounded-[3rem] p-8 shadow-[0_4px_30px_rgba(239,68,68,0.05)] backdrop-blur-xl relative overflow-hidden flex flex-col group">
             <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-inner group-hover:scale-110 transition-transform">
                   <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                   <h2 className="text-base font-black text-white uppercase tracking-tight">Destructive Actions</h2>
                   <p className="text-[9px] font-bold text-red-400 tracking-widest mt-1">Advanced Node Controls</p>
                </div>
             </div>
             <div className="p-5 rounded-2xl bg-black border border-white/5 flex items-center justify-between">
                <div>
                   <p className="text-sm font-black uppercase text-white">Wipe Profile Data</p>
                   <p className="text-[10px] font-bold text-white/40 tracking-widest mt-1 max-w-[300px]">Permanently execute a total wipe of your WNC Wallet profile and connected records.</p>
                </div>
                <Button variant="destructive" className="h-10 rounded-xl px-6 font-black uppercase tracking-widest text-[#050505] text-[10px]">Execute Wipe</Button>
             </div>
          </div>
       </div>

       {/* MFA MODAL (Re-used sleek logic) */}
       <Dialog open={isTwoFactorModalOpen} onOpenChange={setIsTwoFactorModalOpen}>
            <DialogContent className="bg-[#050505] border-[#633BBC]/30 rounded-[3rem] p-8 max-w-[95vw] sm:max-w-[400px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#633BBC] to-transparent" />
                <DialogHeader className="items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-[#633BBC]/10 border border-[#633BBC]/20 flex items-center justify-center text-[#633BBC]">
                       <QrCode className="w-8 h-8" />
                    </div>
                    <DialogTitle className="text-xl font-black uppercase text-white">MFA Protocol</DialogTitle>
                </DialogHeader>
                <div className="mt-6 space-y-8">
                    <AnimatePresence mode="wait">
                       {twoFactorStep === 'intro' ? (
                          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 text-center">
                             <p className="text-xs text-white/60 font-bold tracking-widest leading-relaxed">Establish a secondary cryptographic handshake.</p>
                             <Button onClick={startMfaSetup} className="w-full h-14 rounded-2xl bg-[#633BBC] hover:bg-[#633BBC]/80 font-black uppercase tracking-widest text-xs text-[#050505]" disabled={is2FAProcessing}>
                                {is2FAProcessing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Start Handshake"}
                             </Button>
                          </motion.div>
                       ) : twoFactorStep === 'qr' ? (
                          <motion.div key="qr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 flex flex-col items-center">
                             <div className="bg-white p-4 rounded-3xl flex items-center justify-center w-fit mx-auto shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                                {qrCodeSvg ? 
                                  <div dangerouslySetInnerHTML={{ __html: qrCodeSvg }} style={{ maxWidth: '100%', height: 'auto', padding: '0.5rem' }} className="[&>svg]:max-w-full [&>svg]:h-auto flex items-center justify-center" /> : 
                                  <QRCode value={qrUri || ''} style={{ maxWidth: '100%', height: 'auto', padding: '0.5rem' }} size={160} />
                                }
                             </div>
                             <div className="text-center space-y-2">
                                <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Manual Entry Key</p>
                                <p className="text-sm font-mono font-bold text-[#633BBC] tracking-widest select-all">{tempMfaSecret.match(/.{1,4}/g)?.join(' ')}</p>
                             </div>
                             <Button onClick={() => setTwoFactorStep('verify')} className="w-full h-14 rounded-2xl bg-[#633BBC] hover:bg-[#633BBC]/80 font-black uppercase tracking-widest text-xs text-[#050505]">Link Established</Button>
                          </motion.div>
                       ) : twoFactorStep === 'verify' ? (
                          <motion.div key="verify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                             <div className="space-y-2">
                                <Label className="text-[9px] font-black text-[#633BBC] uppercase tracking-[0.2em] px-2 shadow-[0_0_10px_rgba(99,59,188,0.5)]">Passcode</Label>
                                <input type="text" maxLength={6} placeholder="000000" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} className="h-16 w-full bg-white/5 border border-white/10 rounded-2xl text-center text-4xl font-mono tracking-[0.5em] text-white focus:ring-2 focus:ring-[#633BBC] outline-none transition-all" />
                             </div>
                             <Button className="w-full h-14 rounded-2xl bg-[#633BBC] hover:bg-[#633BBC]/80 font-black uppercase tracking-widest text-xs text-[#050505]" onClick={handleMfaVerify} disabled={otpCode.length !== 6 || is2FAProcessing}>
                                {is2FAProcessing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Verify Origin"}
                             </Button>
                          </motion.div>
                       ) : (
                          <motion.div key="backup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                             <div className="grid grid-cols-2 gap-2 bg-black border border-[#633BBC]/30 rounded-[2rem] p-6 shadow-inner">
                                {(backupCodes.length > 0 ? backupCodes : (profile?.two_factor_backup_codes || [])).map((code, idx) => (
                                   <div key={idx} className="flex items-center justify-center p-2 rounded-lg bg-white/5 border border-white/10">
                                      <span className="text-xs font-mono font-bold text-white tracking-[0.2em]">{code}</span>
                                   </div>
                                ))}
                             </div>
                             <Button className="w-full h-14 rounded-2xl bg-[#633BBC] hover:bg-[#633BBC]/80 font-black uppercase tracking-widest text-xs text-[#050505]" onClick={finalizeMFA} disabled={is2FAProcessing}>
                                {is2FAProcessing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Codes Secured"}
                             </Button>
                          </motion.div>
                       )}
                    </AnimatePresence>
                </div>
            </DialogContent>
       </Dialog>

       {/* PIN MODAL (Sleek Centered) */}
       <Dialog open={isPinModalOpen} onOpenChange={setIsPinModalOpen}>
          <DialogContent className="bg-[#050505] border-[#633BBC]/30 rounded-[3rem] p-8 max-w-[95vw] sm:max-w-[400px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#633BBC] to-transparent" />
              <DialogHeader className="items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-[#633BBC]/10 border border-[#633BBC]/20 flex items-center justify-center text-[#633BBC]"><KeyRound className="w-8 h-8 xl:w-8" /></div>
                  <DialogTitle className="text-xl font-black uppercase text-white tracking-tight">{pinStep === 'create' ? 'Create Node PIN' : 'Confirm Node PIN'}</DialogTitle>
              </DialogHeader>
              <div className="mt-6 space-y-6">
                  <div className="space-y-2">
                      <input type="tel" maxLength={4} placeholder="0000" value={pinStep === 'create' ? tempPin : confirmPin} onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '');
                          if (pinStep === 'create') setTempPin(v); else setConfirmPin(v);
                      }} className="h-16 w-full bg-white/5 border border-white/10 rounded-2xl text-center text-5xl font-mono tracking-[0.5em] text-white focus:outline-none focus:border-[#633BBC]/50 transition-colors" />
                  </div>
                  <Button className="w-full h-14 rounded-2xl bg-[#633BBC] hover:bg-[#633BBC]/80 font-black uppercase text-xs tracking-widest text-[#050505]" onClick={handlePinSubmit} disabled={(pinStep === 'create' ? tempPin.length !== 4 : confirmPin.length !== 4)}>
                      Proceed
                  </Button>
              </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}
