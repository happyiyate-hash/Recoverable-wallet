'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, User as UserIcon, Loader2, Fingerprint, Search, Globe, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import type { KYCProfile } from '@/lib/types';
import { cn } from '@/lib/utils';

const statusVariantMap: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  pending: 'outline',
  verified: 'default',
  rejected: 'destructive',
};

type StatusFilter = KYCProfile['status'] | 'all';

/**
 * INSTITUTIONAL KYC AUDIT TERMINAL
 * Version: 2.1.0 (Registry Schema Sync)
 */
export default function AdminKycPage() {
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchSubmissions = useCallback(async (statusFilter: StatusFilter) => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      let query = supabase
        .from('kyc_profiles')
        .select(`
          *,
          profile:profiles(name, email, phone_number, photo_url)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setSubmissions(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Registry Sync Error',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSubmissions(filter);

    // ⚡ REAL-TIME SENTINEL: Monitor identity submissions
    const channel = supabase!
      .channel('kyc-registry-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kyc_profiles' }, () => {
        fetchSubmissions(filter);
      })
      .subscribe();

    return () => {
      supabase!.removeChannel(channel);
    };
  }, [filter, fetchSubmissions]);

  return (
    <div className="flex flex-col h-full p-8 space-y-8 overflow-y-auto thin-scrollbar">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
            <Fingerprint className="w-8 h-8 text-primary" />
            Identity Matrix
          </h1>
          <p className="text-xs font-black uppercase text-primary tracking-widest mt-1">Registry Compliance Handshake</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[8px] font-black uppercase text-white/40 tracking-widest">Registry Status: Synchronized</span>
        </div>
      </header>

      <div className="space-y-6">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as StatusFilter)} className="w-full">
          <TabsList className="bg-white/5 border border-white/10 rounded-2xl p-1">
            <TabsTrigger value="all" className="rounded-xl text-[10px] font-black uppercase tracking-widest px-6">All Nodes</TabsTrigger>
            <TabsTrigger value="pending" className="rounded-xl text-[10px] font-black uppercase tracking-widest px-6">Pending</TabsTrigger>
            <TabsTrigger value="verified" className="rounded-xl text-[10px] font-black uppercase tracking-widest px-6">Verified</TabsTrigger>
            <TabsTrigger value="rejected" className="rounded-xl text-[10px] font-black uppercase tracking-widest px-6">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="hover:bg-transparent border-white/5">
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4">Node Profile</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4">Contact Node</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4">Submitted</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4">Status</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-white/5">
              {isLoading ? (
                <TableRow className="hover:bg-transparent border-none">
                  <TableCell colSpan={5} className="text-center py-24">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary opacity-40" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mt-4">Auditing Registry...</p>
                  </TableCell>
                </TableRow>
              ) : submissions.length > 0 ? (
                submissions.map((submission) => (
                  <TableRow key={submission.id} className="border-white/5 hover:bg-white/[0.01] transition-colors group">
                    <TableCell className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 rounded-xl border border-white/10 shadow-lg">
                          <AvatarImage src={submission.profile?.photo_url} />
                          <AvatarFallback className="bg-primary/10 text-primary font-black uppercase text-xs">
                            {submission.full_name?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-black text-sm text-white uppercase tracking-tight">{submission.full_name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <Globe className="w-2.5 h-2.5 text-white/20" />
                                <span className="text-[8px] font-black uppercase text-white/20 tracking-widest">{submission.country_code || '---'} Node</span>
                            </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                        <div className="space-y-1">
                            <p className="text-[11px] font-bold text-white/60">{submission.profile?.email || 'N/A'}</p>
                            <p className="text-[9px] font-mono text-white/30">{submission.profile?.phone_number || 'No Phone Node'}</p>
                        </div>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-3 h-3 text-white/20" />
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">
                                {new Date(submission.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <Badge variant={statusVariantMap[submission.status] || 'secondary'} className="rounded-md text-[8px] font-black uppercase tracking-widest px-2 py-0.5">
                        {submission.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-5 text-right">
                      <Button asChild variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
                        <Link href={`/admin/kyc/${submission.user_id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="hover:bg-transparent border-none">
                  <TableCell colSpan={5} className="text-center py-24">
                    <div className="w-16 h-16 rounded-[2rem] bg-white/5 border border-dashed border-white/10 flex items-center justify-center mx-auto mb-4 opacity-20">
                        <Fingerprint className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/10">Registry Empty for this node</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <footer className="pt-10 flex flex-col items-center gap-3 opacity-20 pb-10">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
            <ShieldCheck className="w-3 h-3 text-primary" />
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Compliance Protocol v4.0 SECURE</span>
        </div>
      </footer>
    </div>
  );
}
