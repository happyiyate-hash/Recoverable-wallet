'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';

const data = [
  { name: 'Mon', revenue: 4000 },
  { name: 'Tue', revenue: 3000 },
  { name: 'Wed', revenue: 2000 },
  { name: 'Thu', revenue: 2780 },
  { name: 'Fri', revenue: 1890 },
  { name: 'Sat', revenue: 2390 },
  { name: 'Sun', revenue: 3490 },
];

/**
 * REVENUE TREND VISUALIZER
 * Version: 1.0.0
 */
export function SalesChart() {
  return (
    <Card className="p-6 rounded-[2.5rem] bg-white/[0.02] border-white/10 shadow-2xl h-full">
      <CardHeader className="p-0 mb-6">
        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Revenue Node Trend</CardTitle>
      </CardHeader>
      <CardContent className="p-0 h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 900 }} 
            />
            <YAxis 
              hide 
              domain={['auto', 'auto']}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#0a0a0c', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '1rem',
                fontSize: '10px',
                fontWeight: 'black',
                color: '#fff'
              }}
              itemStyle={{ color: 'hsl(var(--primary))' }}
            />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
