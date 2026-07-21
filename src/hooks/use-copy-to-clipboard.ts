'use client';

import { useState, useCallback, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";

type CopyFn = (text: any) => Promise<boolean>;

/**
 * INSTITUTIONAL COPY PROTOCOL
 * Version: 2.1.0 (Safety Standard)
 * Hardened to handle non-string inputs and restricted browser environments.
 */
export function useCopyToClipboard(): [boolean, CopyFn] {
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const { toast } = useToast();

  const copy: CopyFn = useCallback(async (text) => {
    if (typeof window === 'undefined' || !navigator?.clipboard) {
      console.warn('[REGISTRY_ADVISORY] Clipboard node restricted.');
      toast({
        title: "Access Denied",
        description: "Clipboard handshake is restricted in this environment.",
        variant: "destructive",
      });
      return false;
    }

    // Ensure the payload is a string node
    const cleanText = String(text || '');

    try {
      await navigator.clipboard.writeText(cleanText);
      setIsCopied(true);
      toast({
        title: "Node Cloned",
        description: "Data successfully saved to system registry.",
      });
      return true;
    } catch (error) {
      console.warn('[COPY_FAIL]', error);
      toast({
        title: "Handshake Failed",
        description: "Could not authorize data clone.",
        variant: "destructive",
      });
      setIsCopied(false);
      return false;
    }
  }, [toast]);
  
  useEffect(() => {
    let timeout: any;
    if (isCopied) {
      timeout = setTimeout(() => setIsCopied(false), 2000);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isCopied]);

  return [isCopied, copy];
}
