'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ShieldCheck, 
  ScanFace, 
  Zap, 
  Loader2, 
  Camera, 
  CheckCircle2,
  X,
  AlertCircle,
  Lightbulb,
  LightbulbOff,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/user-provider';
import { faceIdService } from '@/lib/services/face-id-service';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

/**
 * INSTITUTIONAL FACE ID ESTABLISHMENT TERMINAL
 * Version: 1.1.3 (JSX Syntax Standard)
 */
export default function FaceIDSetupPage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useUser();
  const { toast } = useToast();

  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [phase, setPhase] = useState('');
  const [lightOn, setLightOn] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
    } catch (e) {
      toast({ 
        variant: "destructive", 
        title: "Camera Access Denied", 
        description: "Please enable camera permissions to establish your biometric node." 
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleAddFace = async () => {
    if (!user || !supabase) return;
    
    if (!hasPermission) {
      await startCamera();
      return;
    }

    setStatus('scanning');
    setPhase('Establishing Landmarks...');

    try {
      const result = await faceIdService.captureFace(lightOn);
      
      setPhase('Synchronizing Node...');

      const { error } = await supabase
        .from('profiles')
        .update({
          face_id_embedding: JSON.stringify(result.embedding),
          face_id_enabled: true,
          biometric_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setStatus('success');
      await refreshProfile();
      
      setTimeout(() => {
        router.back();
      }, 2500);

    } catch (e: any) {
      setStatus('error');
      setPhase(e.message || "Establishment Failed");
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white overflow-hidden">
      <header className="p-4 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-2xl sticky top-0 z-50 px-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex flex-col items-center">
          <h1 className="text-xs font-black uppercase tracking-[0.2em] text-white">Face ID Setup</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <ScanFace className="w-2.5 h-2.5 text-primary" />
            <span className="text-[8px] text-primary font-black uppercase tracking-tighter">Biometric Establishment</span>
          </div>
        </div>
        <div className="w-10" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8 space-y-10 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.05)_0%,transparent_70%)] pointer-events-none" />

        <div className="w-full max-w-sm p-5 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 flex gap-4 shadow-2xl relative z-10">
            <Info className="w-6 h-6 text-amber-500 shrink-0" />
            <div className="space-y-1">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none">Institutional Advisory</p>
                <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                    Face Verification is under active development. For optimal results, ensure a <span className="text-white font-bold">well-lit environment</span>.
                </p>
            </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-1 bg-primary/20 rounded-[4rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
          
          <div className="relative w-72 h-72 rounded-[4rem] border-4 border-white/5 bg-black overflow-hidden shadow-2xl">
            {hasPermission ? (
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                className={cn(
                  "w-full h-full object-cover transition-all duration-700",
                  status === 'scanning' ? "grayscale brightness-75 scale-110" : "grayscale opacity-40"
                )} 
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-zinc-900/50">
                <Camera className="w-12 h-12 text-white/10" />
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Awaiting Signal</p>
              </div>
            )}

            <AnimatePresence>
              {status === 'scanning' && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 border-[40px] border-black/40 pointer-events-none"
                  />
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <svg width="200" height="240" viewBox="0 0 200 240" className="text-primary">
                      <path d="M100 20 C60 20 20 60 20 120 C20 180 60 220 100 220 C140 220 180 180 180 120 C180 60 140 20 100 20" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
                      <path d="M50 100 Q100 80 150 100" fill="none" stroke="currentColor" strokeWidth="1" />
                      <path d="M70 160 Q100 180 130 160" fill="none" stroke="currentColor" strokeWidth="1" />
                    </svg>
                  </motion.div>
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-4 rounded-[3.5rem] border-2 border-primary/40 shadow-[0_0_30px_rgba(139,92,246,0.2)]"
                  />
                  <motion.div 
                    animate={{ y: [0, 280, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-1 bg-primary/60 blur-md z-10"
                  />
                </>
              )}

              {status === 'success' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 bg-green-500 flex flex-col items-center justify-center gap-4 z-20"
                >
                  <CheckCircle2 className="w-20 h-20 text-white" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Node Established</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="text-center space-y-4 max-w-xs relative z-10">
          <div className="space-y-1">
            <h3 className="text-xl font-black uppercase tracking-tight text-white">
              {status === 'idle' ? 'Add Face ID' : status === 'scanning' ? 'Scanning...' : 'Success'}
            </h3>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              {status === 'idle' ? 'Center your head in the frame to extract your unique biometric identity node.' : phase}
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 pt-4">
            <button 
              onClick={() => setLightOn(!lightOn)}
              className={cn(
                "w-12 h-12 rounded-2xl border transition-all flex items-center justify-center",
                lightOn ? "bg-primary border-primary text-black" : "bg-white/5 border-white/10 text-white/40"
              )}
            >
              {lightOn ? <Lightbulb className="w-5 h-5 fill-current" /> : <LightbulbOff className="w-5 h-5" />}
            </button>
            <Button 
              onClick={handleAddFace}
              disabled={status === 'scanning' || status === 'success'}
              className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20"
            >
              {hasPermission ? 'Authorize Scan' : 'Initialize Camera'}
            </Button>
          </div>
        </div>

        <div className="pt-8 flex items-center justify-center gap-2 opacity-20">
          <ShieldCheck className="w-4 h-4 text-white" />
          <span className="text-[8px] font-black uppercase tracking-widest text-white">Biometric Registry v1.1</span>
        </div>
      </main>
    </div>
  );
}
