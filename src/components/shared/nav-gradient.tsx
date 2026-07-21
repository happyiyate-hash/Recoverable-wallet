'use client';

import React from 'react';
import { useAppTheme } from '@/contexts/theme-provider';

/**
 * INSTITUTIONAL DYNAMIC NAVIGATION GRADIENT
 * Version: 3.0.0 (Theme Context Integrated)
 * 
 * Defines the canonical #nav-icon-gradient used by all terminal navigation nodes.
 * Now dynamically synchronizes with the active theme's hex value.
 */
export const NavGradient = () => {
  const { activeTheme } = useAppTheme();

  return (
    <svg width="0" height="0" className="absolute pointer-events-none">
      <defs>
        <linearGradient id="nav-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={activeTheme.hex} />
          <stop offset="100%" stopColor={activeTheme.hex} stopOpacity={0.6} />
        </linearGradient>
      </defs>
    </svg>
  );
};
