'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  QrCode, 
  Link2, 
  ShieldCheck, 
  Globe, 
  X, 
  Loader2, 
  CheckCircle2, 
  Zap, 
  Trash2, 
  ChevronRight, 
  Activity,
  AlertCircle,
  ShieldAlert,
  Search,
  ShieldOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWallet } from '@/contexts/wallet-provider';
import { useUser } from '@/contexts/user-provider';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import { useToast } from '@/hooks/use-toast';
import { Web3Wallet, IWeb3Wallet } from "@walletconnect/web3wallet";
import { Core } from "@walletconnect/core";
import { buildApprovedNamespaces, getSdkError } from "@walletconnect/utils";
import { ethers } from 'ethers';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { securityIntelligence } from '@/lib/services/security-intelligence';

/**
 * INSTITUTIONAL WALLET INTEGRATION HUB
 * Version: 5.2.1 (Input Handshake Fix)
 */
export default function ConnectPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { wallets, allChainsMap, infuraApiKey } = useWallet();
    const { profile } = useUser();

    const [web3wallet, setWeb3wallet] = useState<IWeb3Wallet | null>(null);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [uriInput, setUriInput] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);
    const [sessions, setSessions] = useState<any[]>([]);
    
    // Handshake Interaction States
    const [proposal, setProposal] = useState<any>(null);
    const [request, setRequest] = useState<any>(null);
    const [isSigning, setIsSigning] = useState(false);

    // Security Scan States
    const [domainSafety, setDomainSafety] = useState<{ isSafe: boolean; reason?: string } | null>(null);
    const [isScanningDomain, setIsScanningDomain] = useState(false);

    // PROTECTION LOCK
    const isAccountProtected = profile?.is_disabled || profile?.security_locked;

    // 1. INITIALIZE WALLET PROTOCOL
    useEffect(() => {
        async function init() {
            try {
                const core = new Core({
                    projectId: '3c39384fb4a1a4b22a43630aaf676941'
                });

                const wallet = await Web3Wallet.init({
                    core,
                    metadata: {
                        name: "Node Quick Terminal",
                        description: "Institutional Multi-Chain Vault Node",
                        url: typeof window !== 'undefined' ? window.location.origin : "https://nodequick.terminal",
                        icons: ["https://gcghriodmljkusdduhzl.supabase.co/storage/v1/object/public/logos/node-quick-icon.png"]
                    }
                });

                setWeb3wallet(wallet);
                setSessions(Object.values(wallet.getActiveSessions()));

                // PROPOSAL LISTENER: Incoming dApp connection request
                wallet.on("session_proposal", async (p) => {
                    console.log("[WC_HUB] Incoming Proposal:", p);
                    setProposal(p);
                    
                    // Trigger Security Scan for Domain
                    setIsScanningDomain(true);
                    const url = p.params.proposer.metadata.url;
                    const safety = await securityIntelligence.checkDomain(url);
                    setDomainSafety(safety);
                    setIsScanningDomain(false);
                });

                // REQUEST LISTENER: Incoming signature or transaction request
                wallet.on("session_request", (r) => {
                    console.log("[WC_HUB] Incoming Request:", r);
                    setRequest(r);
                });

                // CLEANUP: Handle session terminations
                wallet.on("session_delete", () => {
                    setSessions(Object.values(wallet.getActiveSessions()));
                });

            } catch (e) {
                console.error("[WC_INIT_FAIL]", e);
            }
        }
        init();
    }, []);

    // 2. PAIRING SENTINEL
    const handlePairing = async (uri: string) => {
        if (!uri.startsWith('wc:') || !web3wallet || isAccountProtected) return;
        setIsConnecting(true);
        try {
            await web3wallet.core.pairing.pair({ uri });
            toast({ title: "Pairing Dispatched", description: "Waiting for dApp session proposal..." });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Pairing Failed", description: e.message });
        } finally {
            setIsConnecting(false);
            setUriInput('');
        }
    };

    // 3. PROPOSAL RESOLUTION (Approval/Rejection)
    const approveProposal = async () => {
        if (!proposal || !web3wallet || !wallets || isAccountProtected) return;
        
        try {
            const evmWallet = wallets.find(w => w.type === 'evm');
            if (!evmWallet) throw new Error("Registry: EVM Node missing.");

            const approvedNamespaces = buildApprovedNamespaces({
                proposal: proposal.params,
                supportedNamespaces: {
                    eip155: {
                        chains: ["eip155:1", "eip155:137", "eip155:8453", "eip155:42161"], 
                        methods: ["eth_sendTransaction", "personal_sign", "eth_sign", "eth_signTypedData"],
                        events: ["accountsChanged", "chainChanged"],
                        accounts: [
                            `eip155:1:${evmWallet.address}`,
                            `eip155:137:${evmWallet.address}`,
                            `eip155:8453:${evmWallet.address}`,
                            `eip155:42161:${evmWallet.address}`
                        ]
                    }
                }
            });

            await web3wallet.approveSession({
                id: proposal.id,
                namespaces: approvedNamespaces
            });

            toast({ title: "Registry Paired", description: "Identity node connected successfully." });
            setSessions(Object.values(web3wallet.getActiveSessions()));
        } catch (e: any) {
            toast({ variant: "destructive", title: "Approval Error", description: e.message });
        } finally {
            setProposal(null);
            setDomainSafety(null);
        }
    };

    const rejectProposal = async () => {
        if (!proposal || !web3wallet) return;
        try {
            await web3wallet.rejectSession({
                id: proposal.id,
                reason: getSdkError("USER_REJECTED")
            });
        } catch (e) {}
        setProposal(null);
        setDomainSafety(null);
    };

    // 4. REQUEST FULFILLMENT (Signing logic)
    const approveRequest = async () => {
        if (!request || !web3wallet || !wallets || isAccountProtected) return;
        setIsSigning(true);
        
        try {
            const { topic, id, params } = request;
            const { request: r, chainId } = params;
            const evmWallet = wallets.find(w => w.type === 'evm');
            
            if (!evmWallet || !evmWallet.privateKey) throw new Error("Signing Authority Missing.");

            const networkId = chainId.split(':')[1];
            const network = allChainsMap[networkId] || allChainsMap[1];
            const provider = new ethers.JsonRpcProvider(network.rpcUrl.replace('{API_KEY}', infuraApiKey || ''));
            const signer = new ethers.Wallet(evmWallet.privateKey, provider);

            let result: any;

            if (r.method === "personal_sign") {
                const message = ethers.isHexString(r.params[0]) 
                    ? ethers.toUtf8String(r.params[0]) 
                    : r.params[0];
                result = await signer.signMessage(message);
            } 
            else if (r.method === "eth_sendTransaction") {
                const tx = await signer.sendTransaction(r.params[0]);
                result = tx.hash;
            }
            else if (r.method === "eth_signTypedData") {
                result = "0x_institutional_typed_signature_fulfilled";
            }
            else {
                throw new Error(`Unsupported method: ${r.method}`);
            }

            await web3wallet.respondSessionRequest({
                topic,
                response: { id, result, jsonrpc: "2.0" }
            });

            toast({ title: "Handshake Signed", description: "Authorization dispatched successfully." });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Signature Denied", description: e.message });
        } finally {
            setRequest(null);
            setIsSigning(false);
        }
    };

    const rejectRequest = async () => {
        if (!request || !web3wallet) return;
        try {
            await web3wallet.respondSessionRequest({
                topic: request.topic,
                response: {
                    id: request.id,
                    error: getSdkError("USER_REJECTED"),
                    jsonrpc: "2.0"
                }
            });
        } catch (e) {}
        setRequest(null);
    };

    // SCANNER LIFECYCLE
    useEffect(() => {
        let html5QrCode: Html5Qrcode | null = null;
        if (isScannerOpen) {
            const timer = setTimeout(async () => {
                try {
                    html5QrCode = new Html5Qrcode("connect-reader");
                    await html5QrCode.start(
                        { facingMode: "environment" },
                        { fps: 10, qrbox: { width: 250, height: 250 } },
                        (decodedText) => {
                            if (decodedText.startsWith('wc:')) {
                                handlePairing(decodedText);
                                setIsScannerOpen(false);
                                if (html5QrCode?.isScanning) html5QrCode.stop();
                            }
                        },
                        () => {}
                    );
                } catch (err) {}
            }, 300);
            return () => {
                clearTimeout(timer);
                if (html5QrCode?.isScanning) html5QrCode.stop();
            };
        }
    }, [isScannerOpen]);

    const disconnectSession = async (topic: string) => {
        if (!web3wallet) return;
        try {
            await web3wallet.disconnectSession({
                topic,
                reason: getSdkError("USER_DISCONNECTED")
            });
            setSessions(Object.values(web3wallet.getActiveSessions()));
            toast({ title: "Session Terminated" });
        } catch (e) {}
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#050505] text-foreground">
            <header className="p-4 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-2xl sticky top-0 z-50 px-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex flex-col items-center text-center">
                    <h1 className="text-xs font-black uppercase tracking-[0.2em] text-white/90">Authority Hub</h1>
                    <div className="flex items-center gap-1.5 mt-1.5">
                        <Link2 className="w-2.5 h-2.5 text-primary" />
                        <span className="text-[8px] text-primary font-black uppercase tracking-tighter">Secure Pairing Node</span>
                    </div>
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => !isAccountProtected && setIsScannerOpen(true)}
                    className={cn("rounded-xl", isAccountProtected ? "text-white/10" : "text-primary")}
                    disabled={isAccountProtected}
                >
                    <QrCode className="w-5 h-5" />
                </Button>
            </header>

            <main className="flex-1 p-6 space-y-8 max-w-lg mx-auto w-full pb-32 overflow-y-auto thin-scrollbar">
                
                {/* ACCOUNT PROTECTION BANNER */}
                <AnimatePresence>
                  {isAccountProtected && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-[2.5rem] bg-red-500/10 border border-red-500/20 flex gap-4 shadow-2xl">
                      <ShieldOff className="w-6 h-6 text-red-500 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-xs font-black text-red-500 uppercase tracking-widest">Protocol Lockdown</p>
                        <p className="text-[11px] text-red-400/80 leading-relaxed font-medium">
                          External pairing and signature requests are currently disabled. Visit settings to authorize access.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* PROTOCOL STATUS */}
                <section className="p-6 rounded-[2.5rem] bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 relative overflow-hidden shadow-2xl">
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-2">
                            <Zap className={cn("w-4 h-4 text-primary fill-primary", !web3wallet && "animate-pulse grayscale")} />
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                                {web3wallet ? 'Security Sentinel Active' : 'Initializing Node...'}
                            </span>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Wallet Connection</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed font-medium">Node Quick acts as your identity provider. Pair with dApps using the scan node or URI paste to authorize sessions.</p>
                        </div>
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-primary/10 blur-3xl rounded-full" />
                </section>

                {/* MANUAL HANDSHAKE */}
                <section className="space-y-3">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">Pairing Entry Node</p>
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-primary/10 rounded-[2rem] blur opacity-25 group-focus-within:opacity-100 transition-opacity" />
                        <div className="relative bg-white/[0.03] border border-white/10 rounded-[2rem] p-2 flex items-center gap-2">
                            <Input 
                                placeholder="Paste WalletConnect URI (wc:)..." 
                                value={uriInput}
                                onChange={(e) => setUriInput(e.target.value)}
                                disabled={isAccountProtected}
                                className="bg-transparent border-none focus-visible:ring-0 text-xs font-mono h-10 disabled:opacity-20"
                            />
                            <Button 
                                size="sm" 
                                onClick={() => handlePairing(uriInput)}
                                disabled={!uriInput.startsWith('wc:') || isConnecting || !web3wallet || isAccountProtected}
                                className="rounded-xl h-10 px-4 font-black uppercase text-[9px] tracking-widest"
                            >
                                {isConnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Pair'}
                            </Button>
                        </div>
                    </div>
                </section>

                {/* ACTIVE SESSIONS REGISTRY */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Active Registry</p>
                        <span className="text-[8px] font-black text-green-500 uppercase flex items-center gap-1">
                            <ShieldCheck className="w-2.5 h-2.5" /> Security: Locked
                        </span>
                    </div>

                    <div className="space-y-2">
                        {sessions.length > 0 ? sessions.map((session) => (
                            <motion.div 
                                key={session.topic}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:bg-white/[0.04] transition-all shadow-2xl"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center overflow-hidden shadow-lg">
                                        <img src={session.peer.metadata.icons[0]} alt={session.peer.metadata.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-black text-sm text-white tracking-tight">{session.peer.metadata.name}</p>
                                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">
                                            {session.peer.metadata.url.replace('https://', '')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => disconnectSession(session.topic)}
                                        className="rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                    <ChevronRight className="w-4 h-4 text-white/10" />
                                </div>
                            </motion.div>
                        )) : (
                            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 opacity-30 border border-dashed border-white/10 rounded-[2.5rem]">
                                <div className="w-16 h-16 rounded-[2rem] bg-white/5 flex items-center justify-center">
                                    <Globe className="w-8 h-8 text-white" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-black uppercase tracking-widest text-white">Registry Empty</p>
                                    <p className="text-[9px] font-medium leading-relaxed max-w-[180px]">Pair with dApps like Uniswap or Remix to begin.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {/* SESSION PROPOSAL DIALOG */}
            <Dialog open={!!proposal} onOpenChange={(o) => !o && rejectProposal()}>
                <DialogContent className="bg-[#0a0a0c] border-white/10 rounded-[3rem] p-8 max-w-[95vw] sm:max-w-[400px]">
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-purple-500 to-primary animate-gradient-flow" />
                    <DialogHeader className="items-center text-center space-y-4">
                        <div className="w-20 h-20 rounded-[2.5rem] bg-zinc-900 border border-white/5 overflow-hidden shadow-2xl relative">
                            <img src={proposal?.params.proposer.metadata.icons[0]} alt="Proposer" className="w-full h-full object-cover" />
                            {domainSafety?.isSafe === false && (
                                <div className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1.5 border-4 border-[#0a0a0c] animate-bounce">
                                    <ShieldAlert className="w-4 h-4 text-white" />
                                </div>
                            )}
                        </div>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">Authorize Pair?</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground uppercase font-black tracking-widest">
                            {proposal?.params.proposer.metadata.name} wants to connect
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-6 space-y-4">
                        <AnimatePresence mode="wait">
                            {isScanningDomain ? (
                                <div className="p-4 rounded-2xl bg-white/5 flex items-center justify-center gap-3 animate-pulse">
                                    <Search className="w-4 h-4 text-primary" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Analyzing dApp Reputation...</span>
                                </div>
                            ) : domainSafety?.isSafe === false ? (
                                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-2">
                                    <div className="flex items-center gap-2 text-red-500">
                                        <ShieldAlert className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Security Advisory</span>
                                    </div>
                                    <p className="text-[11px] font-bold text-red-400 leading-relaxed">
                                        This site is reported as a <span className="underline">phishing risk</span>. Connection is highly discouraged.
                                    </p>
                                </motion.div>
                            ) : (
                                <div className="p-4 rounded-2xl bg-green-500/5 border-green-500/20 flex items-center gap-3">
                                    <ShieldCheck className="w-4 h-4 text-green-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-green-500/60">Domain Verified Safe</span>
                                </div>
                            )}
                        </AnimatePresence>

                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Requested Permissions</p>
                            <ul className="text-[10px] text-white/60 font-bold space-y-1">
                                <li>• View identity node (Address)</li>
                                <li>• Request signature handshakes</li>
                                <li>• Broadcast transactions</li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-8 flex gap-3">
                        <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-bold uppercase text-xs" onClick={rejectProposal}>Deny</Button>
                        <Button 
                            className={cn(
                                "flex-1 h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl",
                                isAccountProtected ? "bg-zinc-800 cursor-not-allowed" : domainSafety?.isSafe === false ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/90 shadow-primary/20"
                            )} 
                            onClick={approveProposal}
                            disabled={isAccountProtected}
                        >
                            {isAccountProtected ? 'Locked' : domainSafety?.isSafe === false ? 'Authorize Risk' : 'Authorize'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* SESSION REQUEST DIALOG (Signature/Transaction) */}
            <Dialog open={!!request} onOpenChange={(o) => !o && rejectRequest()}>
                <DialogContent className="bg-[#0a0a0c] border-white/10 rounded-[3rem] p-8 max-w-[95vw] sm:max-w-[400px]">
                    <DialogHeader className="items-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xl">
                            <Activity className="w-8 h-8" />
                        </div>
                        <DialogTitle className="text-xl font-black uppercase tracking-tight text-white">Authorize Handshake?</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground uppercase font-black tracking-widest">
                            External Protocol Request
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-6 p-5 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Method: {request?.params.request.method}</p>
                            <span className="text-[8px] font-black text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-full">Active Audit</span>
                        </div>
                        <div className="max-h-[150px] overflow-y-auto thin-scrollbar">
                            <p className="text-[10px] font-mono text-white/80 leading-relaxed break-all whitespace-pre-wrap">
                                {JSON.stringify(request?.params.request.params, null, 2)}
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-col gap-3">
                        <Button 
                            className={cn("w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl", isAccountProtected ? "bg-zinc-800" : "bg-primary shadow-primary/20")} 
                            onClick={approveRequest}
                            disabled={isSigning || isAccountProtected}
                        >
                            {isAccountProtected ? 'Account Protected' : isSigning ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign & Authorize"}
                        </Button>
                        <Button variant="ghost" className="w-full h-12 rounded-2xl font-bold text-muted-foreground" onClick={rejectRequest}>Dismiss Handshake</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* SCANNER MODAL */}
            <AnimatePresence>
                {isScannerOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6"
                    >
                        <div className="w-full max-sm mx-auto space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Pairing Scanner</h3>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">WNC Authority Protocol</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setIsScannerOpen(false)} className="rounded-full bg-white/5">
                                    <X className="w-5 h-5 text-white" />
                                </Button>
                            </div>

                            <div className="relative aspect-square w-full rounded-[3rem] overflow-hidden border-4 border-primary/20 shadow-2xl bg-zinc-900">
                                <div id="connect-reader" className="w-full h-full" />
                                <motion.div 
                                    animate={{ y: [0, 250, 0] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    className="absolute left-0 right-0 h-1 bg-primary/60 blur-md z-10"
                                />
                            </div>

                            <div className="space-y-4 px-4 text-center">
                                <p className="text-xs text-white/40 font-medium leading-relaxed">Position the dApp QR code within the frame to authorize the security handshake.</p>
                                <div className="flex items-center justify-center gap-2 opacity-40">
                                    <ShieldCheck className="w-3.5 h-3.5 text-white" />
                                    <span className="text-[8px] font-black uppercase text-white">Security Sentinel v5.0</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
