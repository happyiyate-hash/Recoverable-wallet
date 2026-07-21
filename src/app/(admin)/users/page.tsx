
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users as UsersIcon, 
  User as UserIcon, 
  Loader2, 
  Search, 
  ChevronRight, 
  ShieldCheck, 
  Globe, 
  Activity,
  Filter,
  MoreVertical,
  UserX
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface UserNode {
    id: string;
    name: string;
    email: string;
    photo_url: string | null;
    created_at: string;
    wnc_earnings: number;
    kyc_status: string;
    is_blocked: boolean;
}

/**
 * INSTITUTIONAL USER REGISTRY
 * Version: 2.0.0 (Identity Matrix Standard)
 * 
 * Provides a high-fidelity dashboard for managing all registered identity nodes.
 */
export default function AdminUsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<UserNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = useCallback(async () => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      // Fetch users with essential identity nodes
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, photo_url, created_at, wnc_earnings, kyc_status, is_blocked')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data as UserNode[]);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Registry Sync Failed',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();

    // ⚡ REAL-TIME SENTINEL: Monitor profile changes
    const channel = supabase!
      .channel('admin-user-registry')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase!.removeChannel(channel);
    };
  }, [fetchUsers]);

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full p-8 space-y-8 overflow-y-auto thin-scrollbar">
      <header className="flex items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                <UsersIcon className="w-8 h-8 text-primary" />
                Identity Matrix
            </h1>
            <p className="text-xs font-black uppercase text-primary tracking-widest mt-1">Ecosystem Node Management</p>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="relative group w-72">
                <div className="absolute -inset-0.5 bg-primary/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <div className="relative bg-[#0a0a0c] border border-white/10 rounded-xl flex items-center px-3">
                    <Search className="h-4 w-4 text-white/20" />
                    <Input 
                        placeholder="Search Identity..." 
                        className="bg-transparent border-none focus-visible:ring-0 text-xs h-11 text-white placeholder:text-white/20"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <Button variant="outline" className="rounded-xl border-white/10 hover:bg-white/5 h-11 w-11 p-0">
                <Filter className="w-4 h-4 text-white/40" />
            </Button>
        </div>
      </header>

      <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="hover:bg-transparent border-white/5">
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4">Node Profile</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4 text-center">Verification</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4 text-center">WNC Earnings</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4">Status</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-white/5">
            {isLoading ? (
                <TableRow className="hover:bg-transparent border-none">
                    <TableCell colSpan={5} className="text-center py-24">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary opacity-40" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mt-4">Synchronizing Matrix...</p>
                    </TableCell>
                </TableRow>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <TableRow key={user.id} className="border-white/5 hover:bg-white/[0.01] transition-colors group">
                  <TableCell className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-11 w-11 rounded-xl border border-white/10 shadow-lg">
                            <AvatarImage src={user.photo_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary font-black uppercase text-xs">
                                {user.name?.[0] || 'U'}
                            </AvatarFallback>
                        </Avatar>
                        {user.is_blocked && (
                            <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 border-2 border-[#050505] shadow-lg">
                                <UserX className="w-2.5 h-2.5 text-white" />
                            </div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-sm text-white uppercase tracking-tight leading-none mb-1">@{user.name || 'Anonymous'}</span>
                        <span className="text-[10px] text-white/30 font-medium">{user.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-5 text-center">
                    <Badge variant="outline" className={cn(
                        "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                        user.kyc_status === 'verified' ? "bg-green-500/10 border-green-500/20 text-green-400" :
                        user.kyc_status === 'pending' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                        "bg-white/5 border-white/10 text-white/20"
                    )}>
                        {user.kyc_status || 'NOT STARTED'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-5 text-center">
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-[11px] font-black text-white tabular-nums">{user.wnc_earnings?.toLocaleString()}</span>
                        <span className="text-[8px] font-black text-primary">WNC</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-5">
                    <div className="flex items-center gap-2">
                        <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", user.is_blocked ? "bg-red-500" : "bg-green-500")} />
                        <span className={cn(
                            "text-[10px] font-bold uppercase tracking-widest",
                            user.is_blocked ? "text-red-400" : "text-white/40"
                        )}>
                            {user.is_blocked ? 'Blocked' : 'Active'}
                        </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/5 text-white/20 hover:text-white transition-all">
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
                 <TableRow className="hover:bg-transparent border-none">
                    <TableCell colSpan={5} className="text-center py-32 opacity-20">
                        <Activity className="mx-auto h-12 w-12 mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Registry Empty</p>
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <footer className="pt-10 flex flex-col items-center gap-3 opacity-20 pb-10">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
            <ShieldCheck className="w-3 h-3 text-primary" />
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Authority Control v4.0 SECURE</span>
        </div>
      </footer>
    </div>
  );
}
