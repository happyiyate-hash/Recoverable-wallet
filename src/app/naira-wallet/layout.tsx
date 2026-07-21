import React from 'react';

/**
 * NAIRA WALLET LAYOUT
 * Version: 2.0.0 (Minimalist Protocol)
 * 
 * Ensures a clean, isolated environment for banking handshakes.
 */
export default function NairaWalletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-[#050505]">
      {children}
    </div>
  );
}
