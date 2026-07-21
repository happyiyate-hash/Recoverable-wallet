
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle, 
  XCircle, 
  ChevronLeft, 
  User, 
  FileText, 
  Calendar, 
  Phone, 
  Fingerprint, 
  ExternalLink,
  Globe,
  Loader2
} from 'lucide-react';
import { KycActionModal } from '@/components/admin/kyc-action-modal';
import type { KYCProfile } from '@/lib/types';
import { cn } from '@/lib/utils';

const statusVariantMap: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  pending: 'outline',
  verified: 'default',
  rejected: 'destructive',
};

/**
 * INSTITUTIONAL KYC REVIEW DETAIL TERMINAL
 * Version: 1.0.0
 * Provides administrators with deep audit nodes for identity verification.
 */
export default function KycReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { toast } = useToast();

  const [submission, setSubmission] = useState<KYCProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [modalState, setModalState] = useState<{ open: boolean; action: 'reject' | null }>({ open: false, action: null });

  const fetchSubmission = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/kyc/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load KYC submission node.');
      }
      const data = await response.json();
      setSubmission(data as KYCProfile);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Registry Error', description: error.message });
      router.push('/admin/kyc');
    } finally {
      setIsLoading(false);
    }
  }, [id, toast, router]);

  useEffect(() => {
    fetchSubmission();
  }, [fetchSubmission]);

  const handleAction = async (action: 'approve' | 'reject', reason?: string) => {
    setIsActionLoading(true);
    try {
      const response = await fetch(`/api/admin/kyc/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${action} node.`);
      }
      toast({ title: 'Registry Updated', description: `Submission node has been ${action === 'approve' ? 'verified' : 'rejected'}.` });
      router.push('/admin/kyc');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Handshake Failed', description: error.message });
    } finally {
      setIsActionLoading(false);
      setModalState({ open: false, action: null });
    }
  };

  const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => (
    <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-primary/60" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1.5">{label}</p>
            <p className="font-bold text-sm text-white truncate uppercase tracking-tight">{value || 'N/A'}</p>
        </div>
    </div>
  );

  const ImageViewer = ({ title, url }: { title: string, url: string | null | undefined }) => (
     <Card className="bg-white/[0.02] border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl group">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{title}</h3>
            {url && (
                <a href={url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl hover:bg-primary/10 text-primary transition-all">
                    <ExternalLink className="w-4 h-4" />
                </a>
            )}
        </div>
        <div className="p-6 bg-black/40">
            {url ? (
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10">
                    <Image src={url} alt={title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                </div>
            ) : (
                <div className="w-full aspect-video bg-white/5 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 opacity-40">
                    <FileText className="w-8 h-8 mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Node Not Provided</p>
                </div>
            )}
        </div>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <Skeleton className="h-10 w-64 rounded-xl bg-white/5" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
                <Skeleton className="h-[300px] w-full rounded-[2.5rem] bg-white/5" />
                <Skeleton className="h-[300px] w-full rounded-[2.5rem] bg-white/5" />
            </div>
            <div className="space-y-6">
                <Skeleton className="h-[200px] w-full rounded-[2.5rem] bg-white/5" />
                <Skeleton className="h-[300px] w-full rounded-[2.5rem] bg-white/5" />
            </div>
        </div>
      </div>
    );
  }

  if (!submission) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl bg-white/5 hover:bg-white/10">
                <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
                <h1 className="text-xl font-black uppercase tracking-tight text-white">Review Handshake</h1>
                <p className="text-[8px] font-black uppercase text-primary tracking-[0.3em]">Identity Audit Terminal</p>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <Badge variant={statusVariantMap[submission.status] || 'secondary'} className="rounded-md text-[8px] font-black uppercase tracking-widest px-2 py-1">
                {submission.status}
            </Badge>
        </div>
      </header>

      <main className="flex-1 p-8 overflow-y-auto thin-scrollbar">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: VISUAL AUDIT NODES */}
          <div className="lg:col-span-2 space-y-6">
             <ImageViewer title="Registry ID Document" url={submission.id_document_url} />
             <ImageViewer title="Registry Selfie" url={submission.selfie_url} />
          </div>

          {/* RIGHT: DATA NODES & ACTIONS */}
          <div className="space-y-6">
            <Card className="bg-[#0a0a0c] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Audit Authority</h3>
                </div>
                <CardContent className="p-6 space-y-6">
                  {submission.status === 'pending' ? (
                    <div className="flex flex-col gap-3">
                      <Button 
                        onClick={() => handleAction('approve')} 
                        disabled={isActionLoading} 
                        className="w-full h-14 rounded-2xl bg-green-500 hover:bg-green-600 text-black font-black uppercase text-xs tracking-widest shadow-xl shadow-green-500/20 gap-3"
                      >
                        {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                        Authorize Verification
                      </Button>
                      <Button 
                        onClick={() => setModalState({ open: true, action: 'reject' })} 
                        disabled={isActionLoading} 
                        variant="ghost" 
                        className="w-full h-12 rounded-2xl border border-red-500/20 text-red-500 hover:bg-red-500/10 font-black uppercase text-[10px] tracking-widest gap-3"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject Node
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-white/20" />
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Node state finalized</p>
                    </div>
                  )}
                </CardContent>
            </Card>

            <Card className="bg-[#0a0a0c] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Identity Context</h3>
                </div>
                 <CardContent className="p-6 space-y-6">
                    <DetailItem icon={User} label="Legal Name" value={submission.full_name} />
                    <Separator className="bg-white/5" />
                    <DetailItem icon={Calendar} label="Birth Registry" value={new Date(submission.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
                    <Separator className="bg-white/5" />
                    <DetailItem icon={Globe} label="Regional Node" value={submission.country_code} />
                    <Separator className="bg-white/5" />
                    <DetailItem icon={FileText} label="Email Node" value={submission.email} />
                    <Separator className="bg-white/5" />
                    <DetailItem icon={Phone} label="Contact Node" value={submission.phone_number} />
                </CardContent>
            </Card>

             <Card className="bg-[#0a0a0c] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Technical Specs</h3>
                </div>
                 <CardContent className="p-6 space-y-6">
                    <DetailItem icon={Fingerprint} label="Document Type" value={submission.id_type} />
                    <Separator className="bg-white/5" />
                    <DetailItem icon={FileText} label="Document Serial" value={submission.id_number} />
                </CardContent>
            </Card>

            {submission.notes && (
                <Card className="border-amber-500/20 bg-amber-500/5 rounded-[2.5rem] overflow-hidden">
                    <div className="p-4 border-b border-amber-500/10 bg-amber-500/10">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Compliance Advisory</h3>
                    </div>
                    <CardContent className="p-6">
                        <p className="text-sm text-amber-200/80 font-medium leading-relaxed italic">"{submission.notes}"</p>
                    </CardContent>
                </Card>
            )}
          </div>
        </div>
      </main>

      <KycActionModal
        isOpen={modalState.open}
        onOpenChange={(open) => !isActionLoading && setModalState({ open, action: open ? modalState.action : null })}
        action={modalState.action}
        onConfirm={(reason) => handleAction('reject', reason)}
        isLoading={isActionLoading}
      />
    </div>
  );
}
