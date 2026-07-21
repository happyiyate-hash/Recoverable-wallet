'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * INSTITUTIONAL THEME NODE
 * Version: 4.1.0 (Mint Default Standard)
 */
export interface ThemeNode {
  id: string;
  name: string;
  hsl: string; // HSL format for shadcn compatibility: "H S% L%"
  hex: string; // For node previews
  isFree: boolean;
}

export const THEME_REGISTRY: ThemeNode[] = [
  { id: 'mint', name: 'Mint Condition', hsl: '160 84% 39%', hex: '#059669', isFree: true },
  { id: 'node-quick', name: 'Node Quick', hsl: '261 52% 46%', hex: '#633BBC', isFree: false },
  { id: 'sentinel', name: 'Sentinel Gold', hsl: '38 92% 50%', hex: '#f59e0b', isFree: false },
  { id: 'cyber', name: 'Cyber Registry', hsl: '188 100% 50%', hex: '#00ccff', isFree: false },
  { id: 'forest', name: 'Forest Bull', hsl: '142 70% 45%', hex: '#10b981', isFree: false },
  { id: 'nebula', name: 'Nebula Pulse', hsl: '270 91% 65%', hex: '#a855f7', isFree: false },
  { id: 'rose', name: 'Rose Quartz', hsl: '330 81% 60%', hex: '#f43f5e', isFree: false },
  { id: 'inferno', name: 'Inferno Node', hsl: '0 84% 60%', hex: '#ef4444', isFree: false },
  { id: 'ocean', name: 'Ocean Depth', hsl: '221 83% 53%', hex: '#3b82f6', isFree: false },
  { id: 'midnight', name: 'Midnight HQ', hsl: '226 100% 40%', hex: '#1e40af', isFree: false },
  { id: 'ghost', name: 'Ghost Protocol', hsl: '215 16% 47%', hex: '#64748b', isFree: false },
  { id: 'gold', name: 'Gold Standard', hsl: '47 95% 55%', hex: '#eab308', isFree: false },
  { id: 'lavender', name: 'Lavender Mist', hsl: '252 59% 67%', hex: '#818cf8', isFree: false },
  { id: 'crimson', name: 'Crimson Vault', hsl: '348 83% 47%', hex: '#be123c', isFree: false },
  { id: 'sunset', name: 'Sunset Gradient', hsl: '24 95% 53%', hex: '#f97316', isFree: false },
  { id: 'lime', name: 'Lime Flux', hsl: '84 81% 44%', hex: '#65a30d', isFree: false },
  { id: 'royal', name: 'Royal Indigo', hsl: '243 75% 59%', hex: '#6366f1', isFree: false },
  { id: 'carbon', name: 'Carbon Fiber', hsl: '215 25% 27%', hex: '#334155', isFree: false },
  { id: 'neon', name: 'Neon Kinetic', hsl: '65 92% 50%', hex: '#d9f99d', isFree: false },
  { id: 'berry', name: 'Berry Settle', hsl: '330 100% 40%', hex: '#9d174d', isFree: false },
  { id: 'frost', name: 'Frost Bite', hsl: '199 89% 48%', hex: '#0ea5e9', isFree: false }
];

interface ThemeContextType {
  activeTheme: ThemeNode;
  setTheme: (id: string) => void;
  isPureBlack: boolean;
  setPureBlack: (val: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [activeTheme, setActiveTheme] = useState<ThemeNode>(THEME_REGISTRY[0]);
  const [isPureBlack, setIsPureBlackState] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('ss-active-theme');
    const savedOled = localStorage.getItem('ss-pure-black') === 'true';

    if (savedTheme) {
      const found = THEME_REGISTRY.find(t => t.id === savedTheme);
      if (found) {
        setActiveTheme(found);
        applyTheme(found.hsl);
      }
    } else {
      applyTheme(activeTheme.hsl);
    }
    
    setIsPureBlackState(savedOled);
  }, []);

  const applyTheme = (hsl: string) => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--primary', hsl);
      document.documentElement.style.setProperty('--ring', hsl);
    }
  };

  const setTheme = (id: string) => {
    const found = THEME_REGISTRY.find(t => t.id === id);
    if (found) {
      setActiveTheme(found);
      applyTheme(found.hsl);
      localStorage.setItem('ss-active-theme', id);
    }
  };

  const setPureBlack = (val: boolean) => {
    setIsPureBlackState(val);
    localStorage.setItem('ss-pure-black', val ? 'true' : 'false');
  };

  return (
    <ThemeContext.Provider value={{ activeTheme, setTheme, isPureBlack, setPureBlack }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) throw new Error('useAppTheme must be used within ThemeProvider');
  return context;
};
