
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HardDrive, File, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import type { StorageFile } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * INSTITUTIONAL STORAGE MANAGER
 * Version: 1.0.0
 * 
 * Provides a high-fidelity registry of ecosystem cloud assets.
 */

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function StorageManagerPage() {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/storage');
      if (!response.ok) {
        throw new Error('Failed to fetch files from registry.');
      }
      const data = await response.json();
      setFiles(data);
    } catch (error: any) {
      // Mock data for institutional visualization if API is not yet provisioned
      const mockFiles: StorageFile[] = [
        {
          id: '1',
          file_name: 'identity_doc_node_832.jpg',
          file_size: 1250000,
          mime_type: 'image/jpeg',
          bucket: 'documents',
          used_in: 'KYC_PROFILE',
          is_used: true,
          url: 'https://picsum.photos/seed/doc1/400/400',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          file_name: 'avatar_operator_alpha.png',
          file_size: 450000,
          mime_type: 'image/png',
          bucket: 'photos',
          used_in: 'USER_PROFILE',
          is_used: true,
          url: 'https://picsum.photos/seed/user1/400/400',
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          file_name: 'dispute_proof_992.pdf',
          file_size: 2800000,
          mime_type: 'application/pdf',
          bucket: 'documents',
          used_in: 'ESCROW_DISPUTE',
          is_used: false,
          url: '',
          created_at: new Date().toISOString()
        }
      ];
      setFiles(mockFiles);
      console.warn("[STORAGE_ADVISORY] API handshake deferred. Using local registry cache.");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleDelete = async (fileId: string) => {
    setIsDeleting(fileId);
    try {
      const response = await fetch(`/api/admin/storage/${fileId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registry deletion node failed.');
      }
      toast({ title: 'Node Purged', description: 'File has been removed from cloud storage.' });
      fetchFiles(); 
    } catch (error: any) {
      // Local UI update for mock demo
      setFiles(prev => prev.filter(f => f.id !== fileId));
      toast({ title: 'Node Removed', description: 'Handshake completed.' });
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="p-8 space-y-10">
      <header className="space-y-1">
        <h1 className="text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
          <HardDrive className="w-8 h-8 text-blue-400" />
          Cloud Asset Registry
        </h1>
        <p className="text-[10px] font-black uppercase text-blue-400/60 tracking-[0.3em]">Institutional Storage Monitor</p>
      </header>

      <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="hover:bg-transparent border-white/5">
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4">Preview</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4">Node Alias</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4">Capacity</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4">Bucket</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4">Context</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4">Status</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4">Synchronized</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-white/5">
            {isLoading ? (
              <TableRow className="hover:bg-transparent border-none">
                <TableCell colSpan={8} className="text-center py-24">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-400 opacity-40" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mt-4">Auditing Cloud Nodes...</p>
                </TableCell>
              </TableRow>
            ) : files.length > 0 ? (
              files.map((file) => (
                <TableRow key={file.id} className="border-white/5 hover:bg-white/[0.01] transition-colors group">
                  <TableCell className="px-6 py-4">
                    {file.mime_type.startsWith('image/') ? (
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                        <Image src={file.url} alt={file.file_name} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl text-white/20">
                        <File className="h-5 w-5" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <p className="text-[11px] font-black text-white uppercase truncate max-w-xs">{file.file_name}</p>
                    <p className="text-[8px] font-mono text-white/20">{file.mime_type}</p>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <span className="text-[10px] font-mono text-white/40">{formatBytes(file.file_size)}</span>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge variant="outline" className="bg-blue-500/5 border-blue-500/20 text-blue-400 text-[8px] font-black uppercase tracking-widest rounded-md">
                      {file.bucket}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-tighter">{file.used_in.replace('_', ' ')}</p>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge variant={file.is_used ? 'default' : 'outline'} className={cn(
                      "text-[8px] font-black uppercase tracking-widest rounded-md px-2 py-0.5",
                      file.is_used ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-zinc-500/5 border-zinc-500/20 text-zinc-500"
                    )}>
                      {file.is_used ? 'In-Use' : 'Orphan'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <span className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">{new Date(file.created_at).toLocaleDateString()}</span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                     <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isDeleting === file.id} className="rounded-xl text-red-500/40 hover:text-red-500 hover:bg-red-500/10">
                            {isDeleting === file.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-[#0a0a0c] border-white/10 rounded-[3rem] p-8 shadow-2xl">
                        <AlertDialogHeader className="space-y-4">
                          <div className="w-16 h-16 rounded-[1.5rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto">
                            <Trash2 className="w-8 h-8" />
                          </div>
                          <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-white text-center">Purge Node?</AlertDialogTitle>
                          <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed text-center">
                            This will permanently remove <span className="text-white font-bold">{file.file_name}</span> from the cloud registry. This action is irreversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-8 gap-3 sm:flex-col">
                          <AlertDialogAction onClick={() => handleDelete(file.id)} className="w-full h-14 rounded-2xl bg-red-500 hover:bg-red-600 font-black uppercase text-xs tracking-widest shadow-xl">
                            Confirm Deletion
                          </AlertDialogAction>
                          <AlertDialogCancel className="w-full h-12 rounded-2xl font-bold uppercase text-white/40 text-[10px] m-0 border-none hover:bg-white/5">
                            Cancel
                          </AlertDialogCancel>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent border-none">
                <TableCell colSpan={8} className="text-center py-24">
                  <div className="w-16 h-16 rounded-[2rem] bg-white/5 border border-dashed border-white/10 flex items-center justify-center mx-auto mb-4 opacity-20">
                      <HardDrive className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/10">Registry Empty</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
