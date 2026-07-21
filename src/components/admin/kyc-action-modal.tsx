
'use client';

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface KycActionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'reject' | null;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
}

/**
 * INSTITUTIONAL KYC ACTION MODAL
 * Version: 1.0.0
 * Handles rejection reason input for identity nodes.
 */
export function KycActionModal({ 
  isOpen, 
  onOpenChange, 
  action, 
  onConfirm, 
  isLoading 
}: KycActionModalProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm(reason);
    setReason('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0a0c] border-white/10 rounded-[2.5rem] p-8 max-w-[95vw] sm:max-w-[440px]">
        <DialogHeader className="items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-[1.5rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-xl">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">
            Reject Identity Node?
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
            Administrative Compliance Action
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] px-1">
            Rejection Reason (Sent to User)
          </p>
          <Textarea 
            placeholder="e.g. Document blurry, mismatched name, or expired ID..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[120px] bg-white/[0.03] border-white/10 rounded-2xl p-4 text-sm leading-relaxed"
          />
        </div>

        <DialogFooter className="mt-8 flex flex-col gap-3 sm:flex-col">
          <Button 
            onClick={handleConfirm}
            disabled={!reason.trim() || isLoading}
            className="w-full h-14 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-red-500/20"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Rejection"}
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="w-full h-12 rounded-2xl font-bold text-white/40 uppercase text-[10px]"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
