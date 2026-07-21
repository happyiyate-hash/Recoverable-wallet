'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/user-provider";
import { supabase } from "@/lib/supabase/client";
import { 
  ArrowLeft, 
  Camera, 
  Loader2, 
  ShieldCheck, 
  User, 
  Phone, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ChevronRight,
  ShieldEllipsis,
  ShieldCheck as ShieldVerified,
  LifeBuoy,
  Mail,
  Fingerprint,
  Lock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * INSTITUTIONAL PROFILE SETTINGS PAGE
 * Version: 4.2.0 (Audit Integrated)
 */
export default function ProfileSettingsPage() {
    const router = useRouter();
    const { user, profile, refreshProfile } = useUser();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // FORM STATE
    const [username, setUsername] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [bio, setBio] = useState('');
    
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

    useEffect(() => {
        if (profile) {
            setUsername(profile.name || '');
            setPhotoUrl(profile.photo_url || '');
            setPhoneNumber(profile.phone_number || '');
            setBio(profile.bio || '');
            setIsAvailable(true);
        }
    }, [profile]);

    const checkUsername = async (val: string) => {
        if (!val || val.length < 3) {
            setIsAvailable(null);
            return;
        }

        if (val === profile?.name) {
            setIsAvailable(true);
            return;
        }

        setIsValidating(true);
        try {
            const { data, error } = await supabase!
                .from('profiles')
                .select('name')
                .eq('name', val)
                .maybeSingle();

            if (error) throw error;
            setIsAvailable(!data);
        } catch (e) {
            console.error("USERNAME_CHECK_ERROR:", e);
        } finally {
            setIsValidating(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !supabase) return;

        setIsUploading(true);
        try {
            const timestamp = Date.now();
            const fileName = `profiles/${user.id}/${timestamp}-${file.name.replace(/\s+/g, '_')}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('photos')
                .upload(fileName, file, { cacheControl: '3600', upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('photos')
                .getPublicUrl(uploadData.path);

            setPhotoUrl(publicUrl);
            toast({ title: "Avatar Uplinked", description: "Identity node ready for authorization." });
        } catch (error: any) {
            toast({ 
                variant: "destructive", 
                title: "Upload Failed", 
                description: error.message || "Registry rejected the asset." 
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        if (!user || isAvailable === false || !supabase) return;
        setIsSaving(true);
        try {
            const { error: dbError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    name: username,
                    photo_url: photoUrl || undefined,
                    phone_number: phoneNumber,
                    bio: bio,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });

            if (dbError) throw dbError;
            await refreshProfile();
            toast({ title: "Identity Secured", description: "Identity node synchronized." });
            router.back();
        } catch (error: any) {
            console.error("[SAVE_PROFILE_FAIL]", error);
            toast({ 
                variant: "destructive", 
                title: "Sync Failed", 
                description: error.message || "Institutional handshake interrupted." 
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-transparent text-foreground relative overflow-hidden">
            <header className="p-4 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-2xl sticky top-0 z-50 px-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl"><ArrowLeft className="w-5 h-5" /></Button>
                <div className="flex flex-col items-center">
                    <h1 className="text-xs font-black uppercase tracking-[0.2em] text-white/90">Identity Node</h1>
                    <div className="flex items-center gap-1.5 mt-1.5">
                        <ShieldCheck className="w-2.5 h-2.5 text-primary" />
                        <span className="text-[8px] text-primary font-black uppercase tracking-tighter">Registry Management</span>
                    </div>
                </div>
                <div className="w-10" />
            </header>

            <main className="flex-1 p-6 space-y-10 max-w-2xl mx-auto w-full pb-32 overflow-y-auto thin-scrollbar relative z-10">
                <div className="flex flex-col items-center">
                    <div className="relative group">
                        <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl opacity-50" />
                        <Avatar className="w-32 h-32 rounded-[2.5rem] border-2 border-primary/30 shadow-2xl relative z-10 overflow-hidden">
                            {isUploading && (
                                <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            )}
                            <AvatarImage src={photoUrl} className="object-cover" />
                            <AvatarFallback className="bg-zinc-900 text-primary font-black text-4xl">
                                <User className="w-16 h-16" />
                            </AvatarFallback>
                        </Avatar>
                        <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute -bottom-2 -right-2 z-20 bg-primary p-3 rounded-2xl border-4 border-[#050505] shadow-xl hover:scale-110 active:scale-95 transition-transform"
                        >
                            <Camera className="w-5 h-5 text-white" />
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                    </div>
                    <p className="mt-4 text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Visual Handshake</p>
                </div>

                {/* 🛡️ SECURITY AUDIT STATUS */}
                <section className="px-2">
                    <div className="p-6 rounded-[2rem] bg-black/40 backdrop-blur-3xl border border-white/5 shadow-2xl space-y-4">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] px-1">Security Audit</p>
                        <div className="grid grid-cols-2 gap-3">
                            <SecurityStatusNode label="Email Node" active={true} icon={Mail} />
                            <SecurityStatusNode label="Phone Node" active={!!profile?.phone_verified} icon={Phone} />
                            <SecurityStatusNode label="Payment PIN" active={!!profile?.pin_enabled} icon={Fingerprint} />
                            <SecurityStatusNode label="MFA Protocol" active={!!profile?.mfa_enabled} icon={Lock} />
                        </div>
                    </div>
                </section>

                <div className="space-y-10">
                    {/* SECTION 1: CORE PROFILE */}
                    <div className="space-y-6">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">Profile Metadata</p>
                        
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-2">
                                    <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Registry Node ID</Label>
                                    {isAvailable === true && username.length >= 3 && <span className="text-[8px] font-black text-green-500 uppercase flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Available</span>}
                                    {isAvailable === false && <span className="text-[8px] font-black text-red-500 uppercase flex items-center gap-1"><XCircle className="w-2.5 h-2.5" /> Taken</span>}
                                </div>
                                <div className="relative group">
                                    <Input 
                                        placeholder="Institutional Node ID"
                                        value={username}
                                        onChange={(e) => {
                                            const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                                            setUsername(val);
                                            checkUsername(val);
                                        }}
                                        className={cn(
                                            "h-16 bg-white/[0.03] border-white/10 rounded-[2rem] pl-12 pr-10 text-white font-bold focus-visible:ring-primary transition-all shadow-inner",
                                            isAvailable === false && "border-red-500/50 bg-red-500/5"
                                        )}
                                    />
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        {isValidating && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                                        {!isValidating && isAvailable === true && username.length >= 3 && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                        {!isValidating && isAvailable === false && <AlertCircle className="w-4 h-4 text-red-500" />}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Identity Registry Bio</Label>
                                <div className="relative group">
                                    <Textarea 
                                        placeholder="Describe your role in the ecosystem..."
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        className="min-h-[120px] bg-white/[0.03] border-white/10 rounded-[2rem] p-6 text-sm leading-relaxed text-white focus-visible:ring-primary shadow-inner"
                                    />
                                    <FileText className="absolute right-6 bottom-6 w-4 h-4 text-white/10 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: SECURITY & IDENTITY (NAV) */}
                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">Authority Layers</p>
                        <button 
                            onClick={() => router.push('/profile/security')}
                            className="w-full flex items-center justify-between p-6 rounded-[2.5rem] bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-all group active:scale-[0.98] shadow-2xl"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <ShieldEllipsis className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-sm text-white uppercase tracking-tight">Security & Identity</p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">Country, KYC, PIN Lock</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {profile?.kyc_status === 'verified' && <ShieldVerified className="w-4 h-4 text-green-500" />}
                                <ChevronRight className="w-5 h-5 text-primary opacity-40 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </button>
                    </div>

                    {/* SECTION 3: LIAISON HUB (SUPPORT) */}
                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">Liaison Hub</p>
                        <button 
                            onClick={() => router.push('/support')}
                            className="w-full flex items-center justify-between p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition-all group active:scale-[0.98] shadow-2xl"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 group-hover:scale-110 transition-transform">
                                    <LifeBuoy className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-sm text-white uppercase tracking-tight">Help & Support</p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">Submit Appeal or Report</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-white/20 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    <Button 
                        className="w-full h-20 rounded-[2.5rem] font-black text-sm uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-95"
                        disabled={isSaving || isUploading || isAvailable === false || username.length < 3}
                        onClick={handleSave}
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authorize Identity Sync"}
                    </Button>
                </div>

                <div className="flex flex-col items-center gap-3 opacity-20">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
                        <ShieldCheck className="w-3 h-3 text-primary" />
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Protocol Audit: 100% SECURE</span>
                    </div>
                </div>
            </main>
        </div>
    );
}

function SecurityStatusNode({ label, active, icon: Icon }: any) {
    return (
        <div className={cn(
            "p-3 rounded-2xl border transition-all flex items-center gap-2.5",
            active ? "bg-green-500/5 border-green-500/20" : "bg-white/[0.02] border-white/5"
        )}>
            <div className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center",
                active ? "bg-green-500/10 text-green-500" : "bg-white/5 text-white/20"
            )}>
                <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[8px] font-black uppercase text-white/40 leading-none mb-1">{label}</p>
                <div className="flex items-center gap-1">
                    <div className={cn("w-1 h-1 rounded-full", active ? "bg-green-500" : "bg-zinc-600")} />
                    <span className={cn("text-[7px] font-black uppercase", active ? "text-green-500" : "text-zinc-600")}>
                        {active ? 'Verified' : 'Inactive'}
                    </span>
                </div>
            </div>
        </div>
    );
}
