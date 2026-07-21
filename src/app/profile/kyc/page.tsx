'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ShieldCheck, 
  User, 
  Calendar, 
  FileText, 
  Camera, 
  Upload, 
  Loader2, 
  CheckCircle2,
  Zap,
  Info,
  ChevronRight,
  Fingerprint,
  Globe,
  ScanFace
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser } from '@/contexts/user-provider';
import { kycService } from '@/lib/services/kyc-service';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

/**
 * INSTITUTIONAL KYC VERIFICATION TERMINAL
 * Version: 2.0.0 (Regional Handshake Expansion)
 */
export default function KYCVerificationPage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useUser();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [idType, setIdType] = useState('Passport');
  const [idNumber, setIdNumber] = useState('');
  
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

  const idInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  // REGISTRY GUARD: Ensure country is set before proceeding
  useEffect(() => {
    if (profile && !profile.country_code) {
        toast({ 
            variant: "destructive", 
            title: "Registry Mismatch", 
            description: "Please set your primary country in Security Settings before starting KYC." 
        });
        router.replace('/profile/security');
    }
  }, [profile, router, toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'id' | 'selfie') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'id') {
        setIdFile(file);
        setIdPreview(reader.result as string);
      } else {
        setSelfieFile(file);
        setSelfiePreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!user || !idFile || !selfieFile || !profile?.country_code) return;

    setIsSubmitting(true);
    try {
      // Complete integrated pipeline execution
      await kycService.handleKycSubmit(selfieFile, idFile, user.id);

      const isAutomated = profile.country_code === 'NG';

      toast({ 
        title: isAutomated ? "Auto-Verification Initialized" : "Submission Successful", 
        description: isAutomated 
            ? "Your Nigerian node is being verified via automated handshake." 
            : "Your identity details successfully uploaded and vaulted." 
      });

      await refreshProfile();
      router.replace('/profile/security');

    } catch (err: any) {
      console.error(err);
      toast({ 
        variant: "destructive", 
        title: "Upload failed", 
        description: err.message || "Could not successfully submit KYC data." 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAfricanNode = profile?.country_code === 'NG' || profile?.country_code === 'GH' || profile?.country_code === 'KE';

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white">
      <header className="p-4 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-50 px-6">
        <Button variant="ghost" size="icon" onClick={() => step > 1 ? setStep((s) => s - 1 as any) : router.back()} className="rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex flex-col items-center text-center">
          <h1 className="text-xs font-black uppercase tracking-[0.2em] leading-none">Identity Protocol</h1>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Globe className="w-2.5 h-2.5 text-primary" />
            <span className="text-[8px] text-primary font-black uppercase tracking-tighter">Region: {profile?.country_code || '---'}</span>
          </div>
        </div>
        <div className="w-10" />
      </header>

      <main className="flex-1 p-6 space-y-10 max-w-lg mx-auto w-full pb-32 overflow-y-auto thin-scrollbar relative">
        
        {/* PROGRESS INDICATOR */}
        <div className="flex items-center justify-between px-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all duration-500",
                step === i ? "bg-primary text-black shadow-lg shadow-primary/20 scale-110" : 
                step > i ? "bg-green-500 text-white" : "bg-white/5 text-white/20"
              )}>
                {step > i ? <CheckCircle2 className="w-4 h-4" /> : i}
              </div>
              {i < 3 && <div className={cn("w-12 h-0.5 rounded-full transition-colors duration-1000", step > i ? "bg-green-500" : "bg-white/5")} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <section className="space-y-2 text-center">
                <h2 className="text-2xl font-black uppercase tracking-tight">Personal Node</h2>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest opacity-60">Provision basic identity nodes</p>
              </section>

              {isAfricanNode && (
                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center gap-3 shadow-xl">
                    <Zap className="w-5 h-5 text-primary fill-current" />
                    <div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Auto-Approval Active</p>
                        <p className="text-[9px] text-white/60 mt-1 font-medium">Your region supports automated identity verification nodes.</p>
                    </div>
                </div>
              )}

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Legal Full Name</Label>
                  <div className="relative group">
                    <Input placeholder="As shown on your ID" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-2xl pl-12 font-bold" />
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Date of Birth</Label>
                  <div className="relative group">
                    <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-2xl pl-12 font-bold" />
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">ID Document Type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Passport', 'Driver License', 'National ID', 'Other'].map((type) => (
                      <button key={type} onClick={() => setIdType(type)} className={cn("h-12 rounded-xl border font-black uppercase text-[10px] tracking-widest transition-all", idType === type ? "bg-primary/10 border-primary/40 text-primary" : "bg-white/5 border-white/5 text-white/40")}>
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Document Number</Label>
                  <div className="relative group">
                    <Input placeholder="e.g. A1234567" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-2xl pl-12 font-bold uppercase" />
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  </div>
                </div>
              </div>

              <Button onClick={() => setStep(2)} disabled={!fullName || !dob || !idNumber} className="w-full h-16 rounded-[2rem] bg-primary font-black uppercase text-sm tracking-widest shadow-xl shadow-primary/20">
                Continue Handshake <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <section className="space-y-2 text-center">
                <h2 className="text-2xl font-black uppercase tracking-tight">ID Verification</h2>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest opacity-60">Upload clear document visual</p>
              </section>

              <div className="space-y-6">
                <div 
                  onClick={() => idInputRef.current?.click()}
                  className={cn(
                    "relative aspect-video w-full rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-all cursor-pointer overflow-hidden group",
                    idPreview ? "border-primary/40 bg-black" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                  )}
                >
                  {idPreview ? (
                    <>
                      <img src={idPreview} alt="ID Preview" className="w-full h-full object-cover opacity-60" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                        <span className="text-[10px] font-black uppercase text-white">ID Captured</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 flex items-center justify-center text-white/20 group-hover:text-primary transition-colors">
                        <Upload className="w-8 h-8" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-black uppercase text-white">Capture ID Front</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Ensure text is legible</p>
                      </div>
                    </>
                  )}
                  <input type="file" ref={idInputRef} onChange={(e) => handleFileSelect(e, 'id')} accept="image/*" className="hidden" />
                </div>

                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex gap-3">
                  <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed uppercase font-black">
                    Your document is encrypted at rest and only accessible by the compliance node.
                  </p>
                </div>
              </div>

              <Button onClick={() => setStep(3)} disabled={!idFile} className="w-full h-16 rounded-[2rem] bg-primary font-black uppercase text-sm tracking-widest">
                Continue Handshake
              </Button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <section className="space-y-2 text-center">
                <h2 className="text-2xl font-black uppercase tracking-tight">Biometric Audit</h2>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest opacity-60">Take a live selfie node</p>
              </section>

              <div className="space-y-6">
                <div 
                  onClick={() => selfieInputRef.current?.click()}
                  className={cn(
                    "relative aspect-square w-64 mx-auto rounded-full border-4 border-dashed flex flex-col items-center justify-center gap-4 transition-all cursor-pointer overflow-hidden group shadow-2xl",
                    selfiePreview ? "border-primary/40 bg-black" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                  )}
                >
                  {selfiePreview ? (
                    <>
                      <img src={selfiePreview} alt="Selfie Preview" className="w-full h-full object-cover opacity-60" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40">
                        <ScanFace className="w-10 h-10 text-primary" />
                        <span className="text-[10px] font-black uppercase text-white">Selfie Node Captured</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover:text-primary transition-colors">
                        <Camera className="w-8 h-8" />
                      </div>
                      <div className="text-center px-6">
                        <p className="text-sm font-black uppercase text-white">Capture Selfie</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1 leading-tight">Center your face in the node</p>
                      </div>
                    </>
                  )}
                  <input type="file" ref={selfieInputRef} onChange={(e) => handleFileSelect(e, 'selfie')} accept="image/*" capture="user" className="hidden" />
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handleSubmit} 
                  disabled={!selfieFile || isSubmitting} 
                  className="w-full h-20 rounded-[2.5rem] bg-primary hover:bg-primary/90 font-black uppercase text-base tracking-widest shadow-[0_0_50px_rgba(245,158,11,0.2)]"
                >
                  {isSubmitting ? <Loader2 className="w-8 h-8 animate-spin" /> : "Authorize Registry Submission"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pt-10 flex items-center justify-center gap-2 opacity-20 pb-10">
          <ShieldCheck className="w-4 h-4 text-white" />
          <span className="text-[8px] font-black uppercase tracking-widest text-white">Compliance Node v2.0 • Secured by TLS 1.3</span>
        </div>
      </main>
    </div>
  );
}
