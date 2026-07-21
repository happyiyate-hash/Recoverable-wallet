'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, CheckCircle2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * INSTITUTIONAL AIRTIME TERMINAL
 * Version: 1.1.0 (Fixed cn import)
 */
export default function AirtimePurchasePage() {
    const router = useRouter();
    const [amount, setAmount] = useState('');
    const [network, setNetwork] = useState('MTN');

    const networks = [
        { name: 'MTN', color: 'bg-amber-400' },
        { name: 'Airtel', color: 'bg-red-500' },
        { name: 'Glo', color: 'bg-green-500' },
        { name: '9mobile', color: 'bg-emerald-600' }
    ];

    return (
        <div className="flex flex-col min-h-screen bg-[#050505] text-white">
            <header className="p-4 flex items-center gap-4 px-6 border-b border-white/5">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-lg font-black uppercase tracking-widest">Buy Airtime</h1>
            </header>

            <main className="flex-1 p-6 space-y-10 pb-40">
                <section className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 px-1">Choose Network</Label>
                    <div className="grid grid-cols-4 gap-3">
                        {networks.map((net) => (
                            <button 
                                key={net.name}
                                onClick={() => setNetwork(net.name)}
                                className={cn(
                                    "flex flex-col items-center gap-2 p-2 rounded-2xl border transition-all",
                                    network === net.name ? "bg-white/10 border-primary" : "bg-white/5 border-transparent"
                                )}
                            >
                                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-black font-black text-xs", net.color)}>
                                    {net.name[0]}
                                </div>
                                <span className="text-[8px] font-black uppercase">{net.name}</span>
                            </button>
                        ))}
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 px-1">Phone Number</Label>
                        <Input placeholder="080 0000 0000" className="h-16 bg-white/5 border-white/10 rounded-[1.5rem] text-xl font-bold px-6" />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 px-1">Amount (₦)</Label>
                        <Input 
                            type="number" 
                            placeholder="0.00" 
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="h-16 bg-white/5 border-white/10 rounded-[1.5rem] text-3xl font-black px-6 tracking-tighter" 
                        />
                    </div>
                </section>

                <div className="p-6 rounded-[2.5rem] bg-primary/5 border border-primary/20 flex items-start gap-4">
                    <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-relaxed font-bold uppercase tracking-tight">
                        Node Settlement: Airtime will be dispatched instantly to the target phone number upon registry authorization.
                    </p>
                </div>
            </main>

            <div className="fixed bottom-8 left-0 right-0 px-6">
                <Button className="w-full h-18 rounded-full bg-primary hover:bg-primary/90 text-black font-black uppercase text-sm tracking-[0.2em] shadow-2xl">
                    Authorize Payout
                </Button>
            </div>
        </div>
    );
}
