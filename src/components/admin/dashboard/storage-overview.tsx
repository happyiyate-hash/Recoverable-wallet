'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Database, Cloud, ShieldCheck } from 'lucide-react';

interface UsageProps {
  used: number;
  total: number;
}

interface StorageOverviewProps {
  fileUsage: UsageProps;
  dbUsage: UsageProps;
}

function formatBytes(bytes: number, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * SYSTEM CAPACITY SENTINEL
 * Version: 1.0.0
 */
export function StorageOverview({ fileUsage, dbUsage }: StorageOverviewProps) {
  const filePercentage = (fileUsage.used / fileUsage.total) * 100;
  const dbPercentage = (dbUsage.used / dbUsage.total) * 100;

  return (
    <Card className="p-8 rounded-[2.5rem] bg-white/[0.02] border-white/10 shadow-2xl flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Cloud className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Capacity Nodes</h3>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
          <ShieldCheck className="w-3 h-3 text-green-500" />
          <span className="text-[8px] font-black text-green-500 uppercase">Operational</span>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div className="flex items-center gap-2">
              <Cloud className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Asset Storage</span>
            </div>
            <span className="text-[10px] font-mono text-white/40">{formatBytes(fileUsage.used)} / {formatBytes(fileUsage.total)}</span>
          </div>
          <Progress value={filePercentage} className="h-1.5 bg-white/5" />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Registry Database</span>
            </div>
            <span className="text-[10px] font-mono text-white/40">{formatBytes(dbUsage.used)} / {formatBytes(dbUsage.total)}</span>
          </div>
          <Progress value={dbPercentage} className="h-1.5 bg-white/5" />
        </div>
      </div>
    </Card>
  );
}
