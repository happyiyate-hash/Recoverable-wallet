import React from 'react';

/**
 * INSTITUTIONAL FALLBACK IDENTITY NODE
 * Version: 2.0.0 (User Signature Standard)
 * 
 * This SVG is used as the universal fallback for all cryptocurrency and network nodes.
 * Features a high-contrast orange-gold gradient on a neutral matte foundation.
 */
const GenericCoinIcon = ({ size = 32, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 320 320"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="mainGrad" x1="0" y1="0" x2="320" y2="320">
        <stop offset="0%" stopColor="#F97316"/>
        <stop offset="50%" stopColor="#F59E0B"/>
        <stop offset="100%" stopColor="#EAB308"/>
      </linearGradient>

      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#000000" floodOpacity="0.18"/>
      </filter>
    </defs>

    {/* Matte Foundation */}
    <rect width="320" height="320" rx="46" fill="#F4F4F5"/>

    {/* Institutional Signature Shape */}
    <g filter="url(#shadow)" fill="url(#mainGrad)">
      {/* Top Bar */}
      <rect x="78" y="28" width="164" height="52" rx="14"/>

      {/* Center Pillar */}
      <rect x="136" y="70" width="48" height="180" rx="14"/>

      {/* Side Blocks */}
      <rect x="26" y="132" width="64" height="54" rx="14"/>
      <rect x="230" y="132" width="64" height="54" rx="14"/>

      {/* Middle Connectors */}
      <rect x="78" y="184" width="164" height="54" rx="14"/>

      {/* Bottom Wings */}
      <rect x="26" y="236" width="118" height="56" rx="14"/>
      <rect x="176" y="236" width="118" height="56" rx="14"/>
    </g>

    {/* High-Luminance Highlight */}
    <rect x="95" y="42" width="130" height="8" rx="4" fill="white" opacity="0.22"/>
  </svg>
);

export default GenericCoinIcon;
