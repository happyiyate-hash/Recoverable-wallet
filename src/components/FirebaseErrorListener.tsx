'use client';

import { useEffect, useState } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { AlertCircle, ShieldAlert, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function FirebaseErrorListener() {
  const [error, setError] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    const handlePermissionError = (err: FirestorePermissionError) => {
      setError(err);
    };

    errorEmitter.on('permission-error', handlePermissionError);
    return () => errorEmitter.off('permission-error', handlePermissionError);
  }, []);

  if (!error) return null;

  return (
    <Dialog open={!!error} onOpenChange={(open) => !open && setError(null)}>
      <DialogContent className="bg-zinc-950 border-white/10 rounded-[2.5rem] p-8 max-w-[95vw] sm:max-w-[500px]">
        <DialogHeader className="space-y-4">
          <div className="w-16 h-16 bg-destructive/10 rounded-[1.5rem] flex items-center justify-center text-destructive mx-auto mb-2">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center">Security Rules Denied</DialogTitle>
          <DialogDescription className="text-zinc-400 text-sm leading-relaxed text-center">
            The database rejected this operation. This is likely due to a 
            <span className="text-primary font-bold"> Firebase Security Rules</span> violation.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          <div className="p-4 rounded-2xl bg-secondary/20 border border-white/5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
              <Code className="w-3 h-3" /> Operation Details
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <p className="text-zinc-500 mb-1">Method</p>
                <p className="text-foreground uppercase">{error.context.operation}</p>
              </div>
              <div>
                <p className="text-zinc-500 mb-1">Path</p>
                <p className="text-foreground break-all">{error.context.path}</p>
              </div>
            </div>
          </div>

          {error.context.requestResourceData && (
            <div className="p-4 rounded-2xl bg-secondary/10 border border-white/5 space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Payload</p>
              <pre className="text-[10px] font-mono text-zinc-400 overflow-auto max-h-[100px] p-2 bg-black/50 rounded-lg">
                {JSON.stringify(error.context.requestResourceData, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="mt-8">
          <Button 
            onClick={() => setError(null)} 
            className="w-full h-14 rounded-2xl font-bold text-base"
          >
            Acknowledge
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
