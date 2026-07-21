'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldAlert, 
  Gavel, 
  User, 
  MessageSquare, 
  Send, 
  Paperclip, 
  Clock, 
  Loader2, 
  Info, 
  CheckCircle, 
  XCircle,
  FileText,
  Lock,
  Save,
  Search,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import type { Dispute } from '@/lib/types';
import { cn } from '@/lib/utils';

const statusConfig = {
  DISPUTED: { color: 'bg-rose-500', text: 'Disputed' },
  COMPLETED: { color: 'bg-green-500', text: 'Completed' },
  REFUNDED: { color: 'bg-blue-500', text: 'Refunded' },
  CANCELLED: { color: 'bg-gray-500', text: 'Cancelled' },
  default: { color: 'bg-yellow-500', text: 'In Progress' }
};

const DisputeListItem = ({ dispute, onSelect, isActive }: { dispute: Dispute, onSelect: () => void, isActive: boolean }) => {
  const config = statusConfig[dispute.status as keyof typeof statusConfig] || statusConfig.default;
  return (
    <button onClick={onSelect} className={cn('w-full text-left p-4 rounded-2xl transition-all border border-transparent', isActive ? 'bg-white/5 border-white/10 shadow-xl' : 'hover:bg-white/[0.02]')}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className={cn("w-2 h-2 rounded-full", config.color, "shadow-[0_0_8px_currentColor]")} />
          <div>
            <p className="font-black text-xs text-white uppercase tracking-tight truncate max-w-[150px]">{dispute.trade.type} • {dispute.trade.amount} {dispute.trade.currency}</p>
            <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest mt-0.5">vs @{dispute.seller.name}</p>
          </div>
        </div>
        <span className="text-[8px] font-black text-white/20 uppercase">{new Date(dispute.createdAt).toLocaleDateString()}</span>
      </div>
    </button>
  );
};

const DisputeDetailView = ({ dispute, onUpdate }: { dispute: Dispute, onUpdate: () => void }) => {
    const [adminMessage, setAdminMessage] = useState('');
    const [adminNotes, setAdminNotes] = useState(dispute.admin_notes || '');
    const [isResolved, setIsResolved] = useState(dispute.resolved_by_admin || false);
    
    const [isSending, setIsSending] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
      setAdminNotes(dispute.admin_notes || '');
      setIsResolved(dispute.resolved_by_admin || false);
    }, [dispute]);

    const handleAdminSend = async () => {
        if (!adminMessage.trim()) return;
        setIsSending(true);
        const { error } = await supabase.rpc('admin_add_dispute_message', {
          p_trade_id: dispute.id,
          p_message: adminMessage
        });
        if (error) toast({ variant: 'destructive', title: 'Dispatch Failed', description: error.message });
        else { setAdminMessage(''); onUpdate(); }
        setIsSending(false);
    };

    const handleUpdateAudit = async () => {
      setIsActionLoading(true);
      const { error } = await supabase
        .from('escrow_trades')
        .update({ 
          admin_notes: adminNotes,
          resolved_by_admin: isResolved,
          updated_at: new Date().toISOString()
        })
        .eq('id', dispute.id);

      if (error) toast({ variant: 'destructive', title: 'Registry Sync Fail', description: error.message });
      else { toast({ title: 'Node Updated', description: 'Administrative registry synchronized.' }); onUpdate(); }
      setIsActionLoading(false);
    };

    const handleAction = async (action: 'release' | 'refund' | 'cancel') => {
      setIsActionLoading(true);
      const rpcName = action === 'release' ? 'admin_release_funds' : action === 'refund' ? 'admin_refund_buyer' : 'admin_freeze_transaction';
      const { error } = await supabase.rpc(rpcName, { p_trade_id: dispute.id });
      if (error) toast({ variant: 'destructive', title: 'Action Denied', description: error.message });
      else { toast({ title: 'Handshake Finalized', description: `Trade status updated to ${action}.` }); onUpdate(); }
      setIsActionLoading(false);
    }

    const DetailItem = ({ label, value, children }: { label: string, value?: string | number, children?: React.ReactNode }) => (
        <div className="space-y-1">
            <p className="text-[8px] text-white/30 uppercase font-black tracking-[0.2em]">{label}</p>
            {value && <p className="text-sm text-white font-bold uppercase tracking-tight">{value}</p>}
            {children}
        </div>
    );

    return (
        <div className="h-full flex flex-col">
            <header className="p-6 border-b border-white/5 bg-black/40">
                 <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                    <Info className="h-6 w-6 text-primary"/>
                    Registry Audit Console
                </h2>
                <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest mt-1">Transaction Node: {dispute.id}</p>
            </header>

            <ScrollArea className="flex-grow">
                <div className="p-6 space-y-6">
                    {/* ADMISTRATIVE AUDIT CONSOLE */}
                    <Card className="bg-primary/5 border-primary/20 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Gavel className="w-16 h-16 text-primary" /></div>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center justify-between">
                                Audit Authority
                                <Badge variant={dispute.status === 'DISPUTED' ? 'destructive' : 'secondary'} className="rounded-md px-2 py-0.5 text-[8px] uppercase tracking-widest">{dispute.status}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 relative z-10">
                            <div className="grid grid-cols-3 gap-2">
                                <Button onClick={() => handleAction('release')} disabled={isActionLoading} className="h-12 rounded-xl bg-green-500 hover:bg-green-600 text-black font-black uppercase text-[9px] tracking-widest shadow-lg shadow-green-500/20"><CheckCircle className="h-4 w-4 mr-2" />Release Funds</Button>
                                <Button onClick={() => handleAction('refund')} disabled={isActionLoading} className="h-12 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-black uppercase text-[9px] tracking-widest shadow-lg shadow-blue-500/20"><XCircle className="h-4 w-4 mr-2" />Refund Buyer</Button>
                                <Button onClick={() => handleAction('cancel')} disabled={isActionLoading} variant="destructive" className="h-12 rounded-xl font-black uppercase text-[9px] tracking-widest"><ShieldAlert className="h-4 w-4 mr-2" />Blockade Node</Button>
                            </div>

                            <div className="h-px bg-primary/10 w-full" />

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black uppercase tracking-widest text-primary/60 px-1">Forensic Notes</Label>
                                    <Textarea 
                                        placeholder="Log forensic observations or dispute context..."
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        className="min-h-[100px] bg-black/40 border-primary/20 rounded-2xl p-4 text-xs leading-relaxed focus-visible:ring-primary shadow-inner"
                                    />
                                </div>
                                <div className="flex items-center justify-between px-1">
                                    <div className="flex items-center gap-3">
                                        <Switch checked={isResolved} onCheckedChange={setIsResolved} className="data-[state=checked]:bg-primary" />
                                        <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Mark as Resolved</span>
                                    </div>
                                    <Button onClick={handleUpdateAudit} disabled={isActionLoading} size="sm" className="bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl px-4 gap-2 font-black uppercase text-[9px] tracking-widest">
                                        {isActionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                        Sync Registry
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-2 gap-6">
                        <Card className="bg-white/[0.02] border-white/5 rounded-[2.5rem]">
                            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-white/40">Trade Topology</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                                <DetailItem label="Asset Type" value={dispute.trade.type} />
                                <DetailItem label="Total Amount" value={`${dispute.trade.amount} ${dispute.trade.currency}`} />
                                <DetailItem label="Asking Price" value={`${dispute.trade.price} ${dispute.trade.price_currency}`} />
                                <DetailItem label="Registry Node" value={new Date(dispute.createdAt).toLocaleDateString()} />
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 gap-3">
                            <Card className="bg-white/[0.02] border-white/5 rounded-[2rem] p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border border-white/10"><AvatarImage src={dispute.buyer.photoUrl} /><AvatarFallback>B</AvatarFallback></Avatar>
                                    <div><p className="text-[10px] font-black text-white uppercase truncate">@{dispute.buyer.name}</p><p className="text-[8px] text-white/20 font-bold uppercase tracking-widest">Buyer Node</p></div>
                                </div>
                                <Badge variant={dispute.payment_status === 'PAID' ? 'default': 'outline'} className="text-[7px] uppercase tracking-widest bg-green-500/10 text-green-500 border-green-500/20">{dispute.payment_status || 'PENDING'}</Badge>
                            </Card>
                            <Card className="bg-white/[0.02] border-white/5 rounded-[2rem] p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border border-white/10"><AvatarImage src={dispute.seller.photoUrl} /><AvatarFallback>S</AvatarFallback></Avatar>
                                    <div><p className="text-[10px] font-black text-white uppercase truncate">@{dispute.seller.name}</p><p className="text-[8px] text-white/20 font-bold uppercase tracking-widest">Seller Node</p></div>
                                </div>
                                <Badge variant={dispute.code_submission_status === 'SENT' ? 'default': 'outline'} className="text-[7px] uppercase tracking-widest bg-blue-500/10 text-blue-500 border-blue-500/20">{dispute.code_submission_status || 'PENDING'}</Badge>
                            </Card>
                        </div>
                    </div>

                    {/* REGISTRY PROOFS NODE */}
                    <section className="space-y-3">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">Registry Evidence</p>
                        <div className="flex gap-3">
                            {dispute.payment_proof_url && (
                                <Button variant="ghost" asChild className="flex-1 h-14 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 font-black uppercase text-[9px] tracking-widest group">
                                    <a href={dispute.payment_proof_url} target="_blank">
                                        <Paperclip className="w-4 h-4 mr-2 text-primary group-hover:scale-110 transition-transform" />
                                        Payment Proof
                                    </a>
                                </Button>
                            )}
                            {dispute.code_proof_url && (
                                <Button variant="ghost" asChild className="flex-1 h-14 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 font-black uppercase text-[9px] tracking-widest group">
                                    <a href={dispute.code_proof_url} target="_blank">
                                        <FileText className="w-4 h-4 mr-2 text-primary group-hover:scale-110 transition-transform" />
                                        Delivery Proof
                                    </a>
                                </Button>
                            )}
                            {dispute.trade.code && (
                                <div className="flex-1 p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Lock className="w-3.5 h-3.5 text-primary" />
                                        <span className="text-[9px] font-black uppercase text-primary">Secret Node</span>
                                    </div>
                                    <p className="text-[10px] font-mono font-bold text-white tracking-widest">{dispute.trade.code}</p>
                                </div>
                            )}
                        </div>
                    </section>

                    <Card className="bg-white/[0.02] border-white/5 rounded-[2.5rem]">
                        <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5" /> Handshake Audit Log</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-4 max-h-60 overflow-y-auto pr-2 thin-scrollbar">
                                {dispute.chatHistory.map((chat, i) => (
                                    <div key={i} className={cn("flex items-start gap-3", chat.sender === 'admin' && 'justify-end')}>
                                        {chat.sender !== 'admin' && <Avatar className="h-8 w-8 rounded-lg border border-white/5"><AvatarImage src={chat.sender === 'buyer' ? dispute.buyer.photoUrl : dispute.seller.photoUrl} /><AvatarFallback>{chat.sender[0].toUpperCase()}</AvatarFallback></Avatar>}
                                        <div className={cn("rounded-2xl p-3.5 text-[11px] leading-relaxed max-w-xs shadow-xl border", 
                                            chat.sender === 'buyer' ? 'bg-blue-500/5 border-blue-500/10 text-blue-200' :
                                            chat.sender === 'seller' ? 'bg-white/[0.02] border-white/5 text-white/80' :
                                            'bg-primary/10 border-primary/20 text-primary font-bold'
                                        )}>
                                            <p>{chat.message}</p>
                                            <p className="text-[7px] font-black uppercase opacity-40 mt-2">{new Date(chat.timestamp).toLocaleTimeString()}</p>
                                        </div>
                                         {chat.sender === 'admin' && <Avatar className="h-8 w-8 rounded-lg border border-primary/20 bg-primary/10 flex items-center justify-center"><Gavel className="w-4 h-4 text-primary"/></Avatar>}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </ScrollArea>

             <footer className="p-6 border-t border-white/5 bg-black/40">
                <div className="relative max-w-2xl mx-auto flex gap-3">
                    <Textarea 
                        placeholder="Dispatch administrative message to trade channel..." 
                        className="bg-black/60 border-white/10 pr-14 rounded-2xl min-h-[80px] text-xs focus-visible:ring-primary"
                        value={adminMessage}
                        onChange={e => setAdminMessage(e.target.value)}
                    />
                    <Button size="icon" className="h-14 w-14 shrink-0 bg-primary hover:bg-primary/90 rounded-2xl shadow-xl shadow-primary/20" onClick={handleAdminSend} disabled={isSending || !adminMessage.trim()}>
                       {isSending ? <Loader2 className="animate-spin w-5 h-5"/> : <Send className="w-5 h-5 text-black" />}
                    </Button>
                </div>
            </footer>
        </div>
    );
};

export default function AdminDisputesPage() {
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

    const fetchDisputes = useCallback(async () => {
      const { data, error } = await supabase.rpc('admin_view_disputes');
      if (error) { toast({ variant: 'destructive', title: 'Registry Link Fail', description: error.message }); }
      else {
        const list = (data as Dispute[]) || [];
        setDisputes(list);
        if (selectedDispute) setSelectedDispute(list.find(d => d.id === selectedDispute.id) || null);
        else if (list.length > 0) setSelectedDispute(list[0]);
      }
      setIsLoading(false);
    }, [toast, selectedDispute]);

    useEffect(() => {
      fetchDisputes();
      const channel = supabase.channel('admin-tribunal-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'escrow_trades' }, () => fetchDisputes())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'escrow_messages' }, () => fetchDisputes())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, () => fetchDisputes())
        .subscribe();
      return () => { supabase.removeChannel(channel); }
    }, [fetchDisputes]);

    const filtered = disputes.filter(d => 
        d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.buyer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.seller.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex h-full p-8 gap-8 overflow-hidden">
            <div className="w-[350px] flex flex-col gap-6 h-full shrink-0">
                <header className="space-y-4">
                    <h1 className="text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                        <ShieldAlert className="w-8 h-8 text-rose-500" />
                        Tribunal
                    </h1>
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                        <Input 
                            placeholder="Search Cases..." 
                            className="bg-white/5 border-white/10 rounded-xl pl-10 h-11 text-xs focus-visible:ring-rose-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </header>

                <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Case Matrix</span>
                        <Badge variant="outline" className="bg-rose-500/10 border-rose-500/20 text-rose-500 text-[8px] font-black px-2">{filtered.length}</Badge>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-3 space-y-1">
                            {isLoading ? (
                                <div className="text-center py-20"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary opacity-40" /></div>
                            ) : filtered.length > 0 ? (
                                filtered.map(dispute => (
                                    <DisputeListItem key={dispute.id} dispute={dispute} onSelect={() => setSelectedDispute(dispute)} isActive={selectedDispute?.id === dispute.id} />
                                ))
                            ) : (
                                <div className="text-center py-24 opacity-10">
                                    <CheckCircle className="mx-auto h-12 w-12 mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Tribunal Clear</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>

            <div className="flex-1 bg-[#0a0a0c] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl relative">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
                {selectedDispute ? (
                    <DisputeDetailView dispute={selectedDispute} onUpdate={fetchDisputes} />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-20">
                        <Gavel className="h-24 w-24 mb-6" />
                        <p className="text-sm font-black uppercase tracking-widest text-white">Select Audit Node</p>
                        <p className="text-[10px] font-medium max-w-[200px] mt-2">Initialize a forensic audit by choosing a disputed node from the registry.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

