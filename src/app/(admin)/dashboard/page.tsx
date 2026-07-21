'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowDownRight, ArrowUpRight, DollarSign, Package, Search, ShoppingCart, Users, AlertTriangle, CheckCircle, Hourglass, Loader2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { SalesChart } from '@/components/admin/dashboard/sales-chart';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { StorageOverview } from '@/components/admin/dashboard/storage-overview';
import { useUser } from '@/contexts/user-provider';

/**
 * INSTITUTIONAL ADMIN DASHBOARD
 * Version: 4.0.0 (High-Fidelity UI Implementation)
 */

const StatCard = ({ icon: Icon, title, value, change, changeType, cardClassName, iconClassName, isLoading }: { 
    icon: React.ElementType, 
    title: string, 
    value: string, 
    change?: string, 
    changeType?: 'increase' | 'decrease',
    cardClassName?: string,
    iconClassName?: string,
    isLoading: boolean,
}) => {
    if (isLoading) {
        return <Skeleton className="h-[128px] rounded-2xl" />;
    }
    return (
        <Card className={cn("p-4 rounded-2xl bg-white/[0.02] border-white/10", cardClassName)}>
            <div className="flex items-center gap-3 mb-2">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-black/40", iconClassName)}>
                    <Icon className="h-6 w-6" />
                </div>
                <p className="text-2xl font-black text-white tracking-tight">{value}</p>
            </div>
            <p className="text-[10px] font-black uppercase text-white/40 tracking-widest px-1">{title}</p>
            {change && changeType && (
                <div className="flex items-center text-[10px] mt-3 font-bold uppercase tracking-widest px-1">
                    <span className={cn("flex items-center", changeType === 'increase' ? 'text-green-400' : 'text-red-400')}>
                        {changeType === 'increase' ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                        {change}
                    </span>
                    <span className="text-white/20 ml-2">Today</span>
                </div>
            )}
        </Card>
    );
};

const TopBar = () => {
    const { profile } = useUser();
    return (
        <div className="flex justify-between items-center p-6 border-b border-white/5">
            <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                <Input placeholder="Search Registry..." className="pl-10 bg-white/5 border-none rounded-xl h-11 text-xs" />
            </div>
            <div className="flex items-center gap-4">
                <div className="text-right">
                    <p className="text-xs font-black uppercase text-white">{profile?.name || 'Admin Node'}</p>
                    <p className="text-[8px] font-black uppercase text-primary/60 tracking-widest">System Authority</p>
                </div>
                <Avatar className="h-10 w-10 border border-white/10 rounded-xl">
                    <AvatarImage src={profile?.photo_url || "https://picsum.photos/seed/admin/40/40"} />
                    <AvatarFallback className="bg-primary/20 text-primary font-black uppercase">
                        {profile?.name?.[0] || 'A'}
                    </AvatarFallback>
                </Avatar>
            </div>
        </div>
    );
};

const LatestOrders = () => (
    <Card className="p-6 col-span-2 rounded-[2.5rem] bg-white/[0.02] border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5"><Package className="w-20 h-20 text-primary" /></div>
        <h3 className="font-black text-xs uppercase tracking-[0.2em] text-white/40 mb-6">Latest Orders</h3>
        <div className='mb-8'>
            <p className='text-4xl font-black text-white tracking-tighter'>₦1,500,000</p>
            <p className='text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1'>Total value of latest orders</p>
        </div>
        <div className='space-y-4 text-[11px] mb-8 font-black uppercase tracking-widest'>
            <p className='flex items-center gap-3'><CheckCircle className="h-4 w-4 text-green-400" /> 28 Escrow Payments</p>
            <p className='flex items-center gap-3'><Hourglass className="h-4 w-4 text-amber-400" /> 3 Pending Release</p>
        </div>
        <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-black font-black uppercase text-[10px] tracking-widest rounded-xl shadow-xl shadow-primary/20">
            View Wallets
        </Button>
    </Card>
);

const TransactionsList = ({ transactions, isLoading }: { transactions: any[], isLoading: boolean }) => {
    return (
        <Card className="p-6 mt-6 rounded-[2.5rem] bg-white/[0.02] border-white/10 overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-xs uppercase tracking-[0.2em] text-white/40 px-2">Registry Transactions</h3>
                <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest hover:bg-white/5">View All</Button>
            </div>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-white/5">
                        <TableRow className="hover:bg-transparent border-white/5">
                            <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40">User Node</TableHead>
                            <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40">Product</TableHead>
                            <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40">Amount</TableHead>
                            <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40">Status</TableHead>
                            <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40">Released</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i} className="border-white/5">
                                <TableCell><Skeleton className="h-8 w-24 rounded-lg" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-32 rounded-lg" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-20 rounded-lg" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                            </TableRow>
                        )) : transactions.map(tx => (
                            <TableRow key={tx.id || (tx.user + tx.product)} className="border-white/5 hover:bg-white/[0.01] transition-colors group">
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8 rounded-lg border border-white/10">
                                            <AvatarImage src={tx.avatar} />
                                            <AvatarFallback className="bg-white/5 text-[10px] font-black">{tx.user.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-[11px] font-black text-white uppercase truncate max-w-[120px]">@{tx.user}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-[11px] font-bold text-white/60">{tx.product}</TableCell>
                                <TableCell className="text-[11px] font-black text-white tabular-nums">{tx.amount}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md", {
                                        'bg-green-500/10 border-green-500/20 text-green-400': tx.status === 'Paid',
                                        'bg-amber-500/10 border-amber-500/20 text-amber-400': tx.status === 'Processing',
                                        'bg-blue-500/10 border-blue-500/20 text-blue-400': tx.status === 'Completed',
                                    })}>{tx.status}</Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md", {
                                        'bg-green-500/10 border-green-500/20 text-green-400': tx.released,
                                        'bg-amber-500/10 border-amber-500/20 text-amber-400': !tx.released
                                    })}>
                                        {tx.released ? 'Released' : 'Pending'}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );
};

const BottomWidgets = ({ recentActivity, pendingDisputes, isLoading }: { recentActivity: any[], pendingDisputes: any[], isLoading: boolean }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card className="p-6 rounded-[2.5rem] bg-white/[0.02] border-white/10 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-xs uppercase tracking-[0.2em] text-white/40 px-2">Activity Stream</h3>
                    <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest hover:bg-white/5">View All</Button>
                </div>
                <div className="space-y-4">
                    {isLoading ? Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex justify-between items-center px-2">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-xl" />
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-20 rounded" />
                                    <Skeleton className="h-3 w-24 rounded" />
                                </div>
                            </div>
                            <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                    )) : recentActivity.map((tx, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 rounded-2xl bg-white/[0.01] hover:bg-white/[0.03] transition-all group">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-10 w-10 rounded-xl border border-white/10">
                                    <AvatarImage src={tx.avatar} />
                                    <AvatarFallback className="bg-white/5 text-xs font-black">{tx.user.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-[11px] font-black text-white uppercase">@{tx.user}</p>
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{tx.type}</p>
                                </div>
                            </div>
                            <Badge variant="secondary" className={cn("text-[9px] font-black tabular-nums rounded-lg border", {
                                'bg-green-500/10 border-green-500/20 text-green-400': tx.color === 'green',
                                'bg-blue-500/10 border-blue-500/20 text-blue-400': tx.color === 'blue',
                            })}>{tx.amount}</Badge>
                        </div>
                    ))}
                </div>
            </Card>
            
            <Card className="p-6 rounded-[2.5rem] bg-white/[0.02] border-white/10 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-xs uppercase tracking-[0.2em] text-white/40 px-2">Pending Disputes</h3>
                    <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest hover:bg-white/5">Tribunal</Button>
                </div>
                 <div className="space-y-4">
                    {isLoading ? Array.from({ length: 2 }).map((_, i) => (
                         <div key={i} className="flex justify-between items-center px-2">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-xl" />
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-32 rounded" />
                                    <Skeleton className="h-3 w-24 rounded" />
                                </div>
                            </div>
                        </div>
                    )) : pendingDisputes.map((d, idx) => (
                        <div key={idx} className="flex justify-between items-center p-4 rounded-[2rem] bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-all cursor-pointer">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-10 w-10 rounded-xl border border-white/10 bg-black">
                                    <AvatarImage src={d.avatar} />
                                    <AvatarFallback className="bg-red-500/20 text-red-400 font-black text-xs">{d.user.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-[11px] font-black text-white uppercase">{d.issue}</p>
                                    <p className="text-[9px] font-bold text-red-400/60 uppercase tracking-widest mt-0.5">{d.date}</p>
                                </div>
                            </div>
                            <Button size="icon" variant="ghost" className="rounded-xl text-red-500 hover:bg-red-500/10">
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
};

export default function AdminDashboard() {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/admin/dashboard-stats');
                if (!response.ok) {
                    throw new Error('Registry node handshake failed.');
                }
                const result = await response.json();
                setData(result);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="min-h-screen bg-transparent text-white overflow-y-auto thin-scrollbar">
            <TopBar />
            <main className="p-8 space-y-10">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black uppercase tracking-tight text-white">Registry Overview</h2>
                    <p className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">Command Terminal v4.0</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard 
                        icon={Users} 
                        title="Total Users" 
                        value={data?.userCount?.toLocaleString() || '---'} 
                        change="+12" 
                        changeType="increase" 
                        cardClassName="bg-blue-500/5 border-blue-500/20"
                        iconClassName="text-blue-400"
                        isLoading={isLoading}
                    />
                    <StatCard 
                        icon={DollarSign} 
                        title="Total Revenue" 
                        value={data?.totalRevenue ? `₦${data.totalRevenue.toLocaleString()}`: '---'}
                        change="+₦120,000" 
                        changeType="increase"
                        cardClassName="bg-green-500/5 border-green-500/20"
                        iconClassName="text-green-400"
                        isLoading={isLoading}
                    />
                    <StatCard 
                        icon={ShoppingCart} 
                        title="New Orders" 
                        value={data?.newOrdersCount?.toLocaleString() || '---'}
                        change="+27" 
                        changeType="increase" 
                        cardClassName="bg-amber-500/5 border-amber-500/20"
                        iconClassName="text-amber-400"
                        isLoading={isLoading}
                    />
                    <StatCard 
                        icon={AlertTriangle} 
                        title="Open Disputes" 
                        value={data?.openDisputesCount?.toLocaleString() || '---'} 
                        change="+1" 
                        changeType="increase" 
                        cardClassName="bg-red-500/5 border-red-500/20"
                        iconClassName="text-red-400"
                        isLoading={isLoading}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                     {isLoading ? (
                        <Skeleton className="h-48 rounded-[2.5rem] lg:col-span-2 bg-white/5" />
                     ) : (
                        <div className="lg:col-span-2">
                            <StorageOverview 
                                fileUsage={{ used: data.storage.totalSize, total: 1 * 1024 * 1024 * 1024 /* 1GB */ }}
                                dbUsage={{ used: data.storage.databaseSize, total: data.storage.databaseTotal }}
                            />
                        </div>
                     )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6 pb-20">
                    <div className="lg:col-span-3">
                        <SalesChart />
                    </div>
                    <div className="lg:col-span-2">
                         <LatestOrders />
                    </div>
                </div>

                <TransactionsList transactions={data?.latestTransactions || []} isLoading={isLoading} />

                <BottomWidgets recentActivity={data?.recentActivity || []} pendingDisputes={data?.pendingDisputes || []} isLoading={isLoading} />
            </main>
        </div>
    );
}

function ChevronRight({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m9 18 6-6-6-6"/></svg>
    );
}
