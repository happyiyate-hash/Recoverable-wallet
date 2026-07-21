
                       'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ShieldAlert, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { faceIdService } from '@/lib/services/face-id-service';

interface FaceScannerCardProps {
  isVisible: boolean;
  onSuccess: () => void;
  onClose: () => void;
  savedEmbedding: any;
}

/**
 * INSTITUTIONAL LIVING-BIOMETRIC SENTINEL
 * Version: 7.0.0 (Slim Top-Down Shining Protocol)
 */

// 🤖 ALIVE ROBOT ICON COMPONENT
const RobotNode = ({ status }: { status: 'SCANNING' | 'SUCCESS' | 'FAILED' | 'IDLE' }) => {
  const isHappy = status === 'SUCCESS';
  const isSad = status === 'FAILED';
  const color = isSad ? '#EF4444' : '#22C55E';

  return (
    <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 6H6V10" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <path d="M30 6H34V10" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <path d="M10 34H6V30" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <path d="M30 34H34V30" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        
        <motion.circle 
          cx="14" cy="18" r="2" fill={color}
          animate={status === 'SCANNING' ? { scaleY: [1, 1, 0.1, 1, 1] } : {}}
          transition={{ duration: 3, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
        />
        <motion.circle 
          cx="26" cy="18" r="2" fill={color}
          animate={status === 'SCANNING' ? { scaleY: [1, 1, 0.1, 1, 1] } : {}}
          transition={{ duration: 3, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
        />

        {isHappy ? (
          <path d="M14 26C14 26 17 29 20 29C23 29 26 26 26 26" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        ) : isSad ? (
          <path d="M14 29C14 29 17 26 20 26C23 26 26 29 26 29" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        ) : (
          <motion.path 
            d="M14 27H26" stroke={color} strokeWidth="2" strokeLinecap="round"
            animate={status === 'SCANNING' ? { x: [-0.5, 0.5, -0.5] } : {}}
            transition={{ duration: 0.1, repeat: Infinity }}
          />
        )}
      </svg>
    </div>
  );
};

// 🌊 SIRI-STYLE SCAN WAVES
const SiriWaves = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60">
    {[1, 2, 3, 4].map((i) => (
      <motion.div
        key={i}
        className="absolute border border-[#22C55E]/40 rounded-full"
        initial={{ width: 10, height: 10, opacity: 0 }}
        animate={{ 
          width: [10, 40], 
          height: [10, 40], 
          opacity: [0, 0.5, 0],
          rotate: [0, 180 * i]
        }}
        transition={{ 
          duration: 1.5 + (i * 0.2), 
          repeat: Infinity, 
          ease: "linear",
          delay: i * 0.3
        }}
      />
    ))}
    <motion.div 
      className="absolute w-full h-[1px] bg-[#22C55E]/20"
      animate={{ y: [-15, 15, -15] }}
      transition={{ duration: 0.8, repeat: Infinity }}
    />
    <motion.div 
      className="absolute h-full w-[1px] bg-[#22C55E]/20"
      animate={{ x: [-15, 15, -15] }}
      transition={{ duration: 1.2, repeat: Infinity }}
    />
  </div>
);

export default function FaceScannerCard({ 
  isVisible, 
  onSuccess, 
  onClose,
  savedEmbedding 
}: FaceScannerCardProps) {
  const [status, setStatus] = useState<'IDLE' | 'SCANNING' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [phase, setPhase] = useState('LOOK FORWARD...');
  const [failedAttempts, setFailedAttempts] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const watchdogRef = useRef<NodeJS.Timeout | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
  }, []);

  const startScan = useCallback(async () => {
    if (status === 'SCANNING' || status === 'SUCCESS') return;
    
    setStatus('SCANNING');
    setPhase('LOOK FORWARD...');

    watchdogRef.current = setTimeout(() => {
      stopCamera();
      onClose(); 
    }, 15000);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      await new Promise(r => setTimeout(r, 3000));

      const result = await faceIdService.captureFace(false);
      
      if (savedEmbedding && faceIdService.verify(result.embedding, savedEmbedding)) {
        setStatus('SUCCESS');
        setPhase('IDENTITY VERIFIED');
        setTimeout(() => {
          stopCamera();
          onSuccess();
        }, 800);
      } else {
        throw new Error("MISMATCH");
      }
    } catch (e) {
      setFailedAttempts(prev => prev + 1);
      setStatus('FAILED');
      setPhase('NOT RECOGNIZED');
      
      if (failedAttempts >= 3) {
        setTimeout(() => { stopCamera(); onClose(); }, 1500);
      } else {
        setTimeout(() => setStatus('IDLE'), 2000);
      }
    }
  }, [status, savedEmbedding, onSuccess, stopCamera, onClose, failedAttempts]);

  useEffect(() => {
    if (isVisible && status === 'IDLE') {
      startScan();
    }
    return () => stopCamera();
  }, [isVisible, status, startScan, stopCamera]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -150, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -150, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 left-0 right-0 z-[600] flex justify-center pointer-events-none p-4"
        >
          <motion.div 
            animate={status === 'FAILED' ? { x: [-5, 5, -5, 5, 0] } : {}}
            className="w-full max-w-sm h-16 bg-[#0a0a0c]/95 backdrop-blur-3xl border border-white/10 rounded-2xl flex items-center justify-between px-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] pointer-events-auto relative overflow-hidden"
          >
            {/* SUCCESS GLOW HANDSHAKE */}
            <AnimatePresence>
              {status === 'SUCCESS' && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-[#22C55E]/10 pointer-events-none z-0"
                />
              )}
            </AnimatePresence>

            <div className="flex items-center gap-3 relative z-10">
              <RobotNode status={status} />
              
              <div className="flex flex-col gap-0.5">
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-[0.1em] transition-colors duration-300",
                  status === 'SUCCESS' ? "text-[#22C55E]" : status === 'FAILED' ? "text-red-500" : "text-white/90"
                )}>
                  {phase}
                </span>
                
                {/* 📏 NANO-SLIM SHINING SCAN LINE */}
                <div className="w-28 h-[1.5px] bg-white/5 rounded-full overflow-hidden relative">
                  <motion.div 
                    className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-[#22C55E] to-transparent shadow-[0_0_15px_#22C55E]"
                    animate={status === 'SCANNING' ? { x: ['-100%', '200%'] } : { opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 relative z-10">
              <div className={cn(
                "w-11 h-11 rounded-full border-2 overflow-hidden bg-black transition-all duration-500 shadow-xl relative",
                status === 'SUCCESS' ? "border-[#22C55E]" : status === 'FAILED' ? "border-red-500" : "border-[#22C55E]/20"
              )}>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  className="w-full h-full object-cover scale-150 transform scale-x-1" 
                />
                {status === 'SCANNING' && <SiriWaves />}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}