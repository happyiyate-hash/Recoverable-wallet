
'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';

export default function AdminReportsPage() {
  return (
    <div className="flex flex-col h-full p-8 items-center justify-center opacity-20">
      <BarChart3 className="w-16 h-16 mb-4" />
      <h1 className="text-sm font-black uppercase tracking-widest">Analytics Registry Offline</h1>
    </div>
  );
}
