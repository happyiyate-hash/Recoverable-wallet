'use client';

import React from 'react';
import { useAppTheme } from '@/contexts/theme-provider';

/**
 * INSTITUTIONAL ATMOSPHERIC BACKGROUND
 * Version: 5.0.0 (Stability Patch)
 * 
 * Rules:
 * 1. TINTED NOIR: If OLED is OFF, a 3% theme radial gradient is applied.
 * 2. OLED MODE: If OLED is ON, a pure #000000 foundation is locked.
 * 
 * This component must be placed INSIDE the ThemeProvider.
 */
export const RegistryBackground = () => {
  // Use try/catch or safe destructuring to prevent crash if context is missing
  let themeData;
  try {
    themeData = useAppTheme();
  } catch (e) {
    // If used outside provider during SSR/Initial Load, return safe black
    return <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black" />;
  }

  const { activeTheme, isPureBlack } = themeData;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black">
      {/* 🌌 ATMOSPHERIC BLOOM LAYER */}
      {!isPureBlack && (
        <div 
          className="absolute inset-0 transition-all duration-1000 ease-in-out opacity-20"
          style={{ 
            background: `radial-gradient(circle at 50% 50%, ${activeTheme.hex}33 0%, #000000 85%)` 
          }}
        />
      )}

      {/* SOLID OLED FOUNDATION */}
      <div className="absolute inset-0 bg-black -z-10" />
    </div>
  );
};
