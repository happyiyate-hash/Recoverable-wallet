'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { 
  Users, 
  RefreshCw, 
  Link as LinkIcon, 
  Activity, 
  XCircle, 
  CheckCircle2, 
  Search, 
  Loader2 
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, referrals: 0, activeEscrows: 0 });
  const [kycRequests, setKycRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Referral Fixer State
  const [orphanEmail, setOrphanEmail] = useState('');
  const [referrerCode, setReferrerCode] = useState('');
  const [fixerLoading, setFixerLoading] = useState(false);
  const [fixerMsg, setFixerMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch users
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      
      // Fetch referrals
      const { data: refData } = await supabase.from('profiles').select('total_referrals');
      const totalRefs = refData?.reduce((acc, curr) => acc + (curr.total_referrals || 0), 0) || 0;

      // Fetch active escrows
      const { count: escrowCount } = await supabase
        .from('escrow_trades')
        .select('*', { count: 'exact', head: true })
        .in('status', ['PENDING', 'FUNDED', 'DELIVERING', 'DISPUTED']);

      setStats({
        users: userCount || 0,
        referrals: totalRefs,
        activeEscrows: escrowCount || 0
      });

      // Fetch pending KYC
      const { data: kycData } = await supabase
        .from('profiles')
        .select('id, email, kyc_status, id_url, selfie_url, full_name, updated_at')
        .in('kyc_status', ['pending', 'unverified']);
      
      setKycRequests(kycData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleKycStatus = async (id: string, newStatus: 'verified' | 'rejected') => {
    try {
      await supabase.from('profiles').update({ kyc_status: newStatus }).eq('id', id);
      loadData();
    } catch (e) {
      console.error('Failed to update KYC', e);
    }
  };

  const syncReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    setFixerLoading(true);
    setFixerMsg('');
    try {
      // 1. Find user by email
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', orphanEmail)
        .single();

      if (!userProfile) throw new Error('User email not found');

      // 2. Find referrer by code
      const { data: referrerProfile } = await supabase
        .from('profiles')
        .select('id, total_referrals')
        .eq('my_referral_code', referrerCode)
        .single();

      if (!referrerProfile) throw new Error('Referral code invalid');

      // 3. Update referrer count
      await supabase
        .from('profiles')
        .update({ total_referrals: (referrerProfile.total_referrals || 0) + 1 })
        .eq('id', referrerProfile.id);

      setFixerMsg('Referral successfully linked!');
      setOrphanEmail('');
      setReferrerCode('');
      loadData();
    } catch (e: any) {
      setFixerMsg(e.message || 'Fixer error');
    } finally {
      setFixerLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      
      {/* HEADER */}
      <header className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-widest text-white shadow-sm flex items-center gap-3">
            <span className="w-4 h-8 bg-[#633BBC] rounded-r-full" /> WNC Command
          </h1>
          <p className="text-sm font-bold text-white/40 uppercase tracking-[0.2em] mt-2 ml-7">
            Institutional Admin Terminal
          </p>
        </div>
        <button 
          onClick={loadData}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-[#633BBC]/10 hover:text-[#633BBC] hover:border-[#633BBC]/30 transition-all font-black uppercase text-xs tracking-widest"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Sync Registry
        </button>
      </header>

      {/* COUNTER ENGINE */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={<Users className="w-6 h-6 text-[#633BBC]" />} title="Total Nodes (Users)" value={stats.users} />
        <StatCard icon={<LinkIcon className="w-6 h-6 text-[#633BBC]" />} title="Global Referrals" value={stats.referrals} />
        <StatCard icon={<Activity className="w-6 h-6 text-[#633BBC]" />} title="Active Escrows" value={stats.activeEscrows} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6">
        
        {/* IDENTITY TRACKER */}
        <section className="lg:col-span-2 space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 border-b border-white/5 pb-2">
            Identity Tracker (KYC Queue)
          </h2>
          <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-[9px] uppercase tracking-widest text-white/40 font-black">
                  <tr>
                    <th className="px-6 py-4">Node Profile</th>
                    <th className="px-6 py-4">Documents</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Registry Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {kycRequests.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-white/20 text-xs font-black uppercase tracking-widest">
                        Queue Empty
                      </td>
                    </tr>
                  ) : (
                    kycRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-white">{req.full_name || 'Anonymous'}</p>
                          <p className="text-[10px] text-white/40">{req.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-3">
                            {req.id_url ? <a href={req.id_url} target="_blank" className="text-[10px] text-[#633BBC] hover:underline font-bold uppercase tracking-wider">ID Doc</a> : <span className="text-[10px] text-white/20">NO ID</span>}
                            {req.selfie_url ? <a href={req.selfie_url} target="_blank" className="text-[10px] text-[#633BBC] hover:underline font-bold uppercase tracking-wider">Selfie</a> : <span className="text-[10px] text-white/20">NO SELFIE</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-widest rounded-md border border-amber-500/20">
                            {req.kyc_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => handleKycStatus(req.id, 'verified')} className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-xl transition-colors" title="Approve Node">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleKycStatus(req.id, 'rejected')} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors" title="Reject Node">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* REFERRAL FIXER */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 border-b border-white/5 pb-2">
            Referral Fixer
          </h2>
          <div className="bg-[#633BBC]/5 border border-[#633BBC]/20 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#633BBC]/20 rounded-full blur-[50px] -mr-10 -mt-10" />
            
            <form onSubmit={syncReferral} className="space-y-6 relative z-10">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-[#633BBC]">Orphaned Node Email</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input 
                    type="email" 
                    required
                    value={orphanEmail}
                    onChange={(e) => setOrphanEmail(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl h-12 pl-10 pr-4 text-sm focus:border-[#633BBC]/30 focus:ring-1 focus:ring-[#633BBC] outline-none transition-all placeholder:text-white/20 text-white"
                    placeholder="user@example.com"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-[#633BBC]">Intended Referrer Code</label>
                <input 
                  type="text" 
                  required
                  value={referrerCode}
                  onChange={(e) => setReferrerCode(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl h-12 px-4 text-sm focus:border-[#633BBC]/30 focus:ring-1 focus:ring-[#633BBC] outline-none transition-all placeholder:text-white/20 text-white"
                  placeholder="e.g. WNCREF123"
                />
              </div>

              <button 
                type="submit" 
                disabled={fixerLoading}
                className="w-full h-12 bg-[#633BBC] hover:bg-[#633BBC]/90 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-[0_0_20px_rgba(99,59,188,0.3)] transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                {fixerLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Force Registry Link"}
              </button>

              {fixerMsg && (
                <p className={`text-center text-[10px] font-black uppercase tracking-widest ${fixerMsg.includes('error') || fixerMsg.includes('invalid') || fixerMsg.includes('not found') ? 'text-red-500' : 'text-green-500'}`}>
                  {fixerMsg}
                </p>
              )}
            </form>
          </div>
        </section>

      </div>
    </div>
  );
}

function StatCard({ icon, title, value }: { icon: React.ReactNode, title: string, value: number }) {
  return (
    <div className="bg-white/[0.02] border border-white/10 p-6 rounded-[2rem] flex items-center gap-5 shadow-2xl relative overflow-hidden group hover:border-[#633BBC]/30 transition-all">
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#633BBC]/5 rounded-full blur-[40px] group-hover:bg-[#633BBC]/20 transition-all" />
      <div className="w-14 h-14 rounded-2xl bg-[#633BBC]/10 border border-[#633BBC]/20 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">{title}</p>
        <p className="text-3xl font-black text-white tracking-tighter">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}
