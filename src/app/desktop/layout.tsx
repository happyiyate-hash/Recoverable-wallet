'use client';

import React, { ReactNode } from 'react';

/**
 * DEPRECATED DESKTOP LAYOUT (PASS-THROUGH ONLY)
 * Version: 2.0.0
 * The Desktop shell has been unified into the root layout (src/app/layout.tsx)
 * to prevent duplicate sidebar/navigation panels. This node now only passes
 * children to maintain route compatibility.
 */
export default function DesktopLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}