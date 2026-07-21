'use client';

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/user-provider";
import { useWallet } from "@/contexts/wallet-provider";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, ShieldCheck, Globe, Phone, Lock, ShieldAlert, Loader2, CheckCircle2, X,
  Search, Check, ChevronDown, Fingerprint, Mail, AlertCircle, Delete, ShieldPlus,
  QrCode, Smartphone, ScanFace, Download, Copy, ShieldOff, ChevronRight, Clock,
  KeyRound, ShieldEllipsis, UserCheck, Zap, BookOpen, Info, Monitor, Trash2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from 'framer-motion';
import { securityLockdownService } from "@/lib/services/security-lockdown-service";
import { deviceSecurityService } from "@/lib/services/device-security-service";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";

const COUNTRIES = [
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', currency: 'GHS' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', currency: 'ZAR' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', currency: 'UGX' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', currency: 'TZS' },
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD' }
];

/**
 * INSTITUTIONAL SECURITY & IDENTITY TERMINAL
 * Version: 19.1.0 (State Integrity Patch)
 */
export default function SecurityIdentityPage() {
    const router = useRouter();
    const { profile, user, refreshProfile } = useUser();
    const { toast } = useToast();

    const [isSaving, setIsSaving] = useState(false);
    const [isCountryOpen, setIsCountryOpen] = useState(false);
    const [searchCountry, setSearchCountry] = useState('');

    const [country, setCountry] = useState('');
    const [phone, setPhone] = useState('');
    const [phoneVerified, setPhoneVerified] = useState(false);
    const [pinEnabled, setPinEnabled] = useState(false);
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [isDisabled, setIsDisabled] = useState(false);

    // Missing OTP State Handshake
    const [isOtpSending, setIsOtpSending] = useState(false);
    const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);

    // Smart Device Lock State
    const [isDeviceLockEnabled, setIsDeviceLockEnabled] = useState(false);
    const [trustedDevices, setTrustedDevices] = useState<any[]>([]);
    const [isDevicePinModalOpen, setIsDevicePinModalOpen] = useState(false);
    const [devicePinStep, setDevicePinStep] = useState<'create' | 'confirm'>('create');
    const [tempDevicePin, setTempDevicePin] = useState('');
    const [confirmDevicePin, setConfirmDevicePin] = useState('');
    const [isDevicePinProcessing, setIsDevicePinProcessing] = useState(false);
    const [currentFingerprint, setCurrentFingerprint] = useState('');

    // PIN Setup State (4-digit)
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [pinStep, setPinStep] = useState<'create' | 'confirm'>('create');
    const [tempPin, setTempPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [isPinProcessing, setIsPinProcessing] = useState(false);

    // Passkey State
    const [isPasskeyModalOpen, setIsPasskeyModalOpen] = useState(false);
    const [passkeyInput, setPasskeyInput] = useState('');
    const [isPasskeySaving, setIsPasskeySaving] = useState(false);
    const [passkeyCheckboxes, setPasskeyCheckboxes] = useState({
        noReset: false,
        writtenDown: false,
        permanentLoss: false
    });

    const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
    const [challengeMode, setChallengeMode] = useState<'pin' | 'password'>('password');
    const [challengeValue, setChallengeValue] = useState('');
    const [challengeAction, setChallengeAction] = useState<() => void>(() => {});
    const [isChallengeProcessing, setIsChallengeProcessing] = useState(false);

    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);

    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [isEmailUpdating, setIsEmailUpdating] = useState(false);

    const [isProtectionModalOpen, setIsProtectionModalOpen] = useState(false);
    const [protectionPin, setProtectionPin] = useState('');
    const [isProtectionProcessing, setIsProtectionProcessing] = useState(false);

    // MFA State
    const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = useState(false);
    const [isMfaDisableConfirmOpen, setIsMfaDisableConfirmOpen] = useState(false);
    const [twoFactorStep, setTwoFactorStep] = useState<'intro' | 'qr' | 'verify' | 'backup'>('intro');
    const [otpCode, setOtpCode] = useState('');
    const [is2FAProcessing, setIs2FAProcessing] = useState(false);
    const [factorId, setFactorId] = useState('');
    const [tempMfaSecret, setTempMfaSecret] = useState('');
    const [qrCodeSvg, setQrCodeSvg] = useState('');
    const [isSecretCopied, setIsSecretCopied] = useState(false);

    const { deleteWalletPermanently } = useWallet();

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const handlePermanentDelete = async () => {
        if (deleteConfirm !== 'DELETE') return;
        setIsDeleting(true);
        try {
            await deleteWalletPermanently();
            setIsDeleteModalOpen(false);
        } catch (e) {
            // Toast handled by provider
        } finally {
            setIsDeleting(false);
        }
    };

    const fetchTrustedDevices = useCallback(async () => {
        if (!user || !supabase) return;
        const { data } = await supabase.from('trusted_devices').select('*').order('last_used', { ascending: false });
        setTrustedDevices(data || []);
    }, [user]);

    useEffect(() => {
        if (profile) {
            setCountry(profile.country_code || '');
            setPhone(profile.phone_number || '');
            setPinEnabled(profile.pin_enabled || false);
            setPhoneVerified(profile.phone_verified || false);
            setMfaEnabled(profile.mfa_enabled || false);
            setBiometricEnabled(profile.biometric_enabled || false);
            setIsDisabled(profile.is_disabled || false);
            setIsDeviceLockEnabled((profile as any).device_lock_enabled || false);
            
            fetchTrustedDevices();
            deviceSecurityService.generateFingerprint().then(setCurrentFingerprint);
        }
    }, [profile, fetchTrustedDevices]);

    const filteredCountries = useMemo(() => {
        return COUNTRIES.filter(c => 
            c.name.toLowerCase().includes(searchCountry.toLowerCase()) ||
            c.code.toLowerCase().includes(searchCountry.toLowerCase())
        );
    }, [searchCountry]);

    const activeCountry = useMemo(() => COUNTRIES.find(c => c.code === country), [country]);

    const runChallenge = (onSuccess: () => void) => {
        setChallengeValue('');
        setChallengeAction(() => onSuccess);
        setChallengeMode(profile?.pin_enabled ? 'pin' : 'password');
        setIsChallengeModalOpen(true);
    };

    const handleChallengeVerify = async () => {
        if (!challengeValue || !user?.email) return;
        setIsChallengeProcessing(true);
        try {
            if (challengeMode === 'pin') {
                const inputHash = btoa(challengeValue);
                if (inputHash !== profile?.pin_hash) throw new Error("Invalid PIN node.");
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: challengeValue });
                if (error) throw error;
            }
            setIsChallengeModalOpen(false);
            challengeAction();
        } catch (e: any) {
            toast({ variant: "destructive", title: "Challenge Failed", description: e.message });
            setChallengeValue('');
        } finally { setIsChallengeProcessing(false); }
    };

    const handlePasskeySave = async () => {
        if (!passkeyInput || !user || isPasskeySaving) return;
        
        setIsPasskeySaving(true);
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(passkeyInput);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            const { error } = await supabase
                .from('profiles')
                .update({ 
                    passkey_hash: hashHex,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;

            toast({ title: "Passkey Registry Updated", description: "Identity node secured." });
            setIsPasskeyModalOpen(false);
            setPasskeyInput('');
            await refreshProfile();
        } catch (e: any) {
            toast({ variant: "destructive", title: "Registry Sync Failed", description: e.message });
        } finally {
            setIsPasskeySaving(false);
        }
    };

    const handlePasswordUpdate = async () => {
        if (newPassword !== confirmNewPassword) {
            toast({ variant: "destructive", title: "Mismatch", description: "Passwords do not match." });
            return;
        }
        setIsPasswordUpdating(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;

            if (user) {
                await securityLockdownService.createSecurityToken(user.id, 'password_alert');
                await supabase.from('security_logs').insert({ 
                    user_id: user.id, 
                    action: 'PASSWORD_CHANGED',
                    risk_level: 'HIGH' 
                });
            }

            toast({ title: "Password Secured", description: "Identity node password updated successfully." });
            setIsPasswordModalOpen(false);
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (e: any) { toast({ variant: "destructive", title: "Update Failed", description: e.message }); }
        finally { setIsPasswordUpdating(false); }
    };

    const handleEmailUpdate = async () => {
        if (!newEmail || !newEmail.includes('@')) return;
        setIsEmailUpdating(true);
        try {
            const { error } = await supabase.auth.updateUser({ email: newEmail });
            if (error) throw error;

            if (user) {
                await securityLockdownService.createSecurityToken(user.id, 'email_alert');
                await supabase.from('security_logs').insert({ 
                    user_id: user.id, 
                    action: 'EMAIL_CHANGED',
                    risk_level: 'HIGH' 
                });
            }

            toast({ title: "Handshake Initialized", description: "Verification code sent to your new email node." });
            setIsEmailModalOpen(false);
            setNewEmail('');
        } catch (e: any) { toast({ variant: "destructive", title: "Update Failed", description: e.message }); }
        finally { setIsEmailUpdating(false); }
    };

    const handleSave = async () => {
        if (!profile) return;
        setIsSaving(true);
        try {
            const { error } = await supabase.from('profiles').update({
                country_code: country,
                country: activeCountry?.name || '',
                phone_number: phone,
                phone_verified: phoneVerified,
                pin_enabled: pinEnabled,
                mfa_enabled: mfaEnabled,
                biometric_enabled: biometricEnabled,
                device_lock_enabled: isDeviceLockEnabled,
                updated_at: new Date().toISOString()
            }).eq('id', profile.id);
            if (error) throw error;
            await refreshProfile();
            toast({ title: "Authority Nodes Updated" });
            router.back();
        } catch (e: any) { toast({ variant: "destructive", title: "Sync Failed", description: e.message }); }
        finally { setIsSaving(false); }
    };

    const handleToggleProtection = () => {
        setIsProtectionModalOpen(true);
        setProtectionPin('');
    };

    const handleProtectionPinInput = (digit: string) => {
        if (protectionPin.length < 4) {
            const newVal = protectionPin + digit;
            setProtectionPin(newVal);
            if (newVal.length === 4) finalizeProtection(newVal);
        }
    };

    const finalizeProtection = async (pin: string) => {
        if (!profile) return;
        setIsProtectionProcessing(true);
        try {
            const hashedPin = btoa(pin); 
            if (isDisabled && profile.protection_pin_hash !== hashedPin) {
                toast({ variant: "destructive", title: "Invalid PIN" });
                setProtectionPin('');
                return;
            }
            const newState = !isDisabled;
            
            const { error } = await supabase.from('profiles').update({
                is_disabled: newState,
                security_locked: newState ? (profile as any).security_locked : false, 
                protection_pin_hash: newState ? hashedPin : (profile as any).protection_pin_hash,
                updated_at: new Date().toISOString()
            }).eq('id', profile.id);

            if (error) throw error;
            
            await refreshProfile();
            setIsDisabled(newState);
            setIsProtectionModalOpen(false);
            toast({ title: newState ? "Account Protected" : "Account Restored" });
        } catch (e: any) { toast({ variant: "destructive", title: "Action Failed", description: e.message }); }
        finally { setIsProtectionProcessing(false); }
    };

    const handleSendOtp = async () => {
        if (!phone) return;
        setIsOtpSending(true);
        setTimeout(() => { setIsOtpSending(false); setIsOtpModalOpen(true); }, 1500);
    };

    const handlePinInput = (digit: string) => {
        if (pinStep === 'create') {
            if (tempPin.length < 4) setTempPin(v => v + digit);
        } else {
            if (confirmPin.length < 4) setConfirmPin(v => v + digit);
        }
    };

    useEffect(() => {
        if (pinStep === 'create' && tempPin.length === 4) {
            setTimeout(() => setPinStep('confirm'), 200);
        } else if (pinStep === 'confirm' && confirmPin.length === 4) {
            if (confirmPin === tempPin) finalizePin();
            else { 
                toast({ variant: "destructive", title: "Mismatch" }); 
                setConfirmPin(''); setTempPin(''); setPinStep('create'); 
            }
        }
    }, [tempPin, confirmPin]);

    const finalizePin = async () => {
        if (!profile) return;
        setIsPinProcessing(true);
        try {
            const pinHash = btoa(confirmPin); 
            const { error } = await supabase.from('profiles').update({
                pin_hash: pinHash,
                pin_enabled: true,
                updated_at: new Date().toISOString()
            }).eq('id', profile.id);
            if (error) throw error;
            await refreshProfile();
            toast({ title: "PIN Protocol Active" });
            setIsPinModalOpen(false);
            setPinStep('create'); setTempPin(''); setConfirmPin('');
        } catch (e: any) { toast({ variant: "destructive", title: "Handshake Failed", description: e.message }); }
        finally { setIsPinProcessing(false); }
    };

    // --- Smart Device Lock Handlers ---
    const handleDeviceLockToggle = async (enabled: boolean) => {
        if (enabled) {
            if (!(profile as any).device_pin_hash) {
                setTempDevicePin('');
                setConfirmDevicePin('');
                setDevicePinStep('create');
                setIsDevicePinModalOpen(true);
            } else {
                await supabase.from('profiles').update({ device_lock_enabled: true }).eq('id', profile!.id);
                setIsDeviceLockEnabled(true);
                await refreshProfile();
                toast({ title: "Smart Lock Enabled" });
            }
        } else {
            runChallenge(async () => {
                await supabase.from('profiles').update({ device_lock_enabled: false }).eq('id', profile!.id);
                setIsDeviceLockEnabled(false);
                await refreshProfile();
                toast({ title: "Smart Lock Disabled" });
            });
        }
    };

    const handleDevicePinInput = (digit: string) => {
        if (devicePinStep === 'create') {
            if (tempDevicePin.length < 8) setTempDevicePin(v => v + digit);
        } else {
            if (confirmDevicePin.length < 8) setConfirmDevicePin(v => v + digit);
        }
    };

    useEffect(() => {
        if (devicePinStep === 'create' && tempDevicePin.length === 8) {
            setTimeout(() => setDevicePinStep('confirm'), 200);
        } else if (devicePinStep === 'confirm' && confirmDevicePin.length === 8) {
            if (confirmDevicePin === tempDevicePin) finalizeDevicePIN();
            else {
                toast({ variant: "destructive", title: "PIN Mismatch" });
                setConfirmDevicePin(''); setTempDevicePin(''); setDevicePinStep('create');
            }
        }
    }, [tempDevicePin, confirmDevicePin, devicePinStep]);

    const finalizeDevicePIN = async () => {
        if (!user) return;
        setIsDevicePinProcessing(true);
        try {
            const hashed = btoa(confirmDevicePin);
            const { error } = await supabase.from('profiles').update({
                device_pin_hash: hashed,
                device_lock_enabled: true,
                updated_at: new Date().toISOString()
            }).eq('id', user.id);

            if (error) throw error;

            await deviceSecurityService.trustCurrentDevice(user.id);
            await refreshProfile();
            setIsDevicePinModalOpen(false);
            toast({ title: "Device PIN Registry Synchronized" });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Protocol Error", description: e.message });
        } finally {
            setIsDevicePinProcessing(false);
        }
    };

    const handleDeleteDevice = async (deviceId: string) => {
        try {
            const { error } = await supabase.from('trusted_devices').delete().eq('id', deviceId);
            if (error) throw error;
            fetchTrustedDevices();
            toast({ title: "Node Purged", description: "Hardware node removed from registry." });
        } catch (e: any) {
            toast({ variant: "destructive", title: "De-authorization Failed" });
        }
    };
    
    // --- NATIVE MFA FLOW ---

    const resetMfaState = () => {
        setTwoFactorStep('intro');
        setOtpCode('');
        setFactorId('');
        setQrCodeSvg('');
        setTempMfaSecret('');
        setIsSecretCopied(false);
    };

    const handleMfaToggle = async (enabled: boolean) => {
        if (enabled) {
            setIs2FAProcessing(true);
            try {
                const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
                if (listError) throw listError;

                const existingFactor = factors?.totp?.find(f => f.status === 'verified');
                const unverifiedFactor = factors?.totp?.find(f => f.status === 'unverified');

                if (existingFactor) {
                    await supabase.from('profiles').update({ mfa_enabled: true, mfa_active: true }).eq('id', profile!.id);
                    setMfaEnabled(true);
                    await refreshProfile();
                    toast({ title: "MFA Reactivated", description: "Authenticator link restored." });
                } else {
                    if (unverifiedFactor) {
                        await supabase.auth.mfa.unenroll({ factorId: unverifiedFactor.id });
                    }
                    resetMfaState();
                    setIsTwoFactorModalOpen(true);
                }
            } catch (e: any) {
                toast({ variant: "destructive", title: "MFA Audit Failed", description: e.message });
            } finally {
                setIs2FAProcessing(false);
            }
        } else {
            setIsMfaDisableConfirmOpen(true);
        }
    };

    const confirmMfaDisable = async () => {
        setIsMfaDisableConfirmOpen(false);
        setIs2FAProcessing(true);
        try {
            const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
            if (listError) throw listError;
            
            if (factors && factors.totp) {
                for (const factor of factors.totp) {
                    await supabase.auth.mfa.unenroll({ factorId: factor.id });
                }
            }
            
            await supabase.from('profiles').update({ 
                mfa_enabled: false, 
                mfa_active: false,
                updated_at: new Date().toISOString()
            }).eq('id', profile!.id);
            
            setMfaEnabled(false);
            await refreshProfile();
            toast({ title: "MFA Deactivated" });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Deactivation Failed", description: e.message });
        } finally {
            setIs2FAProcessing(false);
        }
    };

    const startMfaSetup = async () => {
        setIs2FAProcessing(true);
        try {
            const { data, error } = await supabase.auth.mfa.enroll({ 
                factorType: 'totp', 
                issuer: 'WNC Wallet',
                friendlyName: `WNC:${user?.email}`
            });
            if (error) throw error;
            
            setFactorId(data.id);
            setQrCodeSvg(data.totp.qr_code); 
            setTempMfaSecret(data.totp.secret);
            setTwoFactorStep('qr');
            
        } catch (e: any) {
            toast({ variant: "destructive", title: "Enrollment Failed", description: e.message });
            setTwoFactorStep('intro');
        } finally {
            setIs2FAProcessing(false);
        }
    };

    const handleMfaVerify = async () => {
        if (otpCode.length !== 6 || !factorId) return;
        setIs2FAProcessing(true);
        try {
            const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
            if (challengeError) throw challengeError;

            const { error } = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challenge.id,
                code: otpCode
            });

            if (error) throw new Error(error.message || "Invalid cryptographic code.");

            await finalizeMFA();
        } catch (e: any) {
            toast({ variant: "destructive", title: "Handshake Failed", description: e.message });
        } finally {
            setIs2FAProcessing(false);
        }
    };

    const finalizeMFA = async () => {
        try {
            await supabase.from('profiles').update({
                mfa_enabled: true,
                mfa_active: true,
                updated_at: new Date().toISOString()
            }).eq('id', profile!.id);

            await refreshProfile();
            toast({ title: "MFA Authorized", description: "Identity node linked." });
            setIsTwoFactorModalOpen(false);
            resetMfaState();
        } catch (e: any) { 
            toast({ variant: "destructive", title: "Sync Failed" }); 
        }
    };

    const handleBiometricToggle = async (enabled: boolean) => {
        if (enabled) {
            // 🛡️ ENFORCE PIN FIRST
            if (!pinEnabled) {
                toast({ 
                    variant: "destructive", 
                    title: "PIN Required", 
                    description: "For maximum security, you must establish a PIN fallback before enabling Face ID." 
                });
                setIsPinModalOpen(true);
                return;
            }
            
            setBiometricEnabled(true);
            toast({ title: "Biometrics Initialized" });
            await supabase!.from('profiles').update({ biometric_enabled: true }).eq('id', profile!.id);
            await refreshProfile();
        } else {
            setBiometricEnabled(false);
            await supabase!.from('profiles').update({ biometric_enabled: false }).eq('id', profile!.id);
            await refreshProfile();
        }
    };

    const copyMfaSecret = () => {
        if (!tempMfaSecret) return;
        navigator.clipboard.writeText(tempMfaSecret);
        setIsSecretCopied(true);
        toast({ title: "Secret Copied", description: "Node identity secret cloned to clipboard." });
        setTimeout(() => setIsSecretCopied(false), 2000);
    };

    return (
        <div className="flex flex-col min-h-screen bg-transparent text-foreground relative overflow-hidden">
            <header className="p-4 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-2xl sticky top-0 z-50 px-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl"><ArrowLeft className="w-5 h-5" /></Button>
                <div className="flex flex-col items-center">
                    <h1 className="text-xs font-black uppercase tracking-[0.2em] text-white/90">Security Hub</h1>
                    <div className="flex items-center gap-1.5 mt-1.5"><Lock className="w-2.5 h-2.5 text-primary" /><span className="text-[8px] text-primary font-black uppercase tracking-tighter">Authority Layers</span></div>
                </div>
                <div className="w-10" />
            </header>

            <main className="flex-1 p-6 space-y-10 max-w-2xl mx-auto w-full pb-32 overflow-y-auto thin-scrollbar relative z-10">
                
                <section className="px-2">
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="security-guide" className="bg-primary/5 border border-primary/20 rounded-[2rem] px-6 overflow-hidden">
                            <AccordionTrigger className="hover:no-underline py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                        <BookOpen className="w-4 h-4" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-black uppercase tracking-tight text-white">Registry Intelligence</p>
                                        <p className="text-[8px] font-black uppercase text-primary tracking-widest">How to protect your node</p>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-6">
                                <div className="space-y-4 pt-2">
                                    <div className="flex gap-3">
                                        <Zap className="w-4 h-4 text-primary shrink-0" />
                                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                                            <span className="text-white font-bold">Dual-Vault Defense:</span> Combine a long master passkey with Google Authenticator. This ensures that even if your database hash is leaked, the plain-text remains unrecoverable.
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                                            <span className="text-white font-bold">Unrecoverable Passkey:</span> Your passkey is never stored in plain text. Losing it means permanent loss of funds. Always maintain a physical backup.
                                        </p>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </section>

                <section className="space-y-4">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">Primary Authority</p>
                    <div className="p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/10 space-y-6 shadow-xl relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><KeyRound className="w-6 h-6" /></div>
                                <div><p className="font-black text-sm text-white uppercase tracking-tight">Master Passkey</p><p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">{profile?.passkey_hash ? 'Registry Active' : 'Not Established'}</p></div>
                            </div>
                            {profile?.passkey_hash && <ShieldCheck className="w-5 h-5 text-green-500" />}
                        </div>
                        <Button 
                            onClick={() => setIsPasskeyModalOpen(true)}
                            className="w-full h-14 rounded-2xl bg-primary text-black hover:bg-primary/90 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20"
                        >
                            {profile?.passkey_hash ? 'Update Master Passkey' : 'Establish Passkey Node'}
                        </Button>
                    </div>
                </section>

                <section className="space-y-4">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">Global Sentinel</p>
                    <div className={cn("p-6 rounded-[2.5rem] bg-white/[0.03] border transition-all duration-500 shadow-xl relative overflow-hidden", isDisabled ? "border-red-500/50 bg-red-500/5" : "border-white/10")}>
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", isDisabled ? "bg-red-500/20 text-red-500" : "bg-primary/10 text-primary")}><ShieldOff className="w-6 h-6" /></div>
                                <div className="space-y-0.5"><p className="font-black text-sm text-white uppercase tracking-tight">Protect My App</p><p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">Disable all account actions</p></div>
                            </div>
                            <Switch checked={isDisabled} onCheckedChange={handleToggleProtection} className="data-[state=checked]:bg-red-50" />
                        </div>
                    </div>
                </section>

                {/* 🛡️ Smart Device Lock Sentinel */}
                <section className="space-y-4">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">Hardware Sentinel</p>
                    <div className="p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/10 space-y-6 shadow-xl relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                    <Monitor className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="font-black text-sm text-white uppercase tracking-tight">Smart Device Lock</p>
                                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">
                                        {isDeviceLockEnabled ? 'Registry: Protected' : 'Locking Disabled'}
                                    </p>
                                </div>
                            </div>
                            <Switch 
                                checked={isDeviceLockEnabled} 
                                onCheckedChange={handleDeviceLockToggle} 
                                className="data-[state=checked]:bg-primary"
                            />
                        </div>

                        <div className="space-y-4 pt-2">
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] px-1">Trusted Node Registry</p>
                            <div className="space-y-2">
                                {trustedDevices.length > 0 ? trustedDevices.map((dev) => (
                                    <div key={dev.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center border border-white/5">
                                                <Smartphone className="w-4 h-4 text-white/40" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-white uppercase">{dev.device_name}</p>
                                                <p className="text-[8px] font-mono text-white/20 truncate w-32">{dev.device_hash}</p>
                                            </div>
                                        </div>
                                        {dev.device_hash === currentFingerprint ? (
                                            <span className="text-[7px] font-black text-primary uppercase bg-primary/10 px-2 py-0.5 rounded">Active</span>
                                        ) : (
                                            <button 
                                                onClick={() => handleDeleteDevice(dev.id)}
                                                className="p-2 rounded-xl hover:bg-red-500/10 text-red-500/40 hover:text-red-500 transition-all"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                )) : (
                                    <div className="text-center py-4 opacity-20">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-white">Registry Empty</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">Account Authority</p>
                    <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-2 space-y-1 shadow-xl">
                        <button onClick={() => runChallenge(() => setIsPasswordModalOpen(true))} className="w-full flex items-center justify-between p-5 rounded-3xl hover:bg-white/5 transition-all group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform"><KeyRound className="w-5 h-5" /></div>
                                <div className="text-left"><p className="text-sm font-black text-white uppercase tracking-tight">Change Password</p><p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest opacity-40">Update node access key</p></div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-primary transition-all" />
                        </button>
                        <button onClick={() => runChallenge(() => setIsEmailModalOpen(true))} className="w-full flex items-center justify-between p-5 rounded-3xl hover:bg-white/5 transition-all group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform"><Mail className="w-5 h-5" /></div>
                                <div className="text-left"><p className="text-sm font-black text-white uppercase tracking-tight">Update Email</p><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">Change primary identity node</p></div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-primary transition-all" />
                        </button>
                    </div>
                </section>

                <section className="space-y-4">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">Regional Node</p>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Primary Country</Label>
                            <button onClick={() => setIsCountryOpen(true)} className="w-full flex items-center justify-between p-5 rounded-[2rem] bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition-all group">
                                <div className="flex items-center gap-4">{activeCountry ? (<><span className="text-2xl leading-none">{activeCountry.flag}</span><span className="font-black text-sm text-white uppercase">{activeCountry.name}</span></>) : (<div className="flex items-center gap-3"><Globe className="w-5 h-5 text-white/20" /><span className="text-sm font-bold text-white/40">Select Country</span></div>)}</div>
                                <ChevronDown className="w-4 h-4 text-primary opacity-40" />
                            </button>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-2">
                                <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Contact Phone</Label>
                                {phoneVerified ? (<span className="text-[8px] font-black text-green-500 uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Verified</span>) : (<button onClick={handleSendOtp} disabled={!phone || isOtpSending} className="text-[8px] font-black text-primary uppercase hover:underline">{isOtpSending ? 'Sending...' : 'Verify Now'}</button>)}
                            </div>
                            <div className="relative group">
                                <Input placeholder="+234 000 000 0000" value={phone} onChange={(e) => { setPhone(e.target.value); if (phoneVerified) setPhoneVerified(false); }} className="h-16 bg-white/[0.03] border-white/10 rounded-[2rem] pl-12 text-white font-bold" />
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="flex justify-between items-center px-2"><p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Identity Verification</p><div className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border", profile?.kyc_status === 'verified' ? "bg-green-500/10 border-green-500/20 text-green-500" : profile?.kyc_status === 'pending' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-primary/10 border-primary/20 text-primary")}>{profile?.kyc_status?.replace('_', ' ') || 'not started'}</div></div>
                    <div className="p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/10 space-y-6 relative overflow-hidden">
                        <div className="flex items-start gap-4">
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl", profile?.kyc_status === 'verified' ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary")}><ShieldCheck className="w-6 h-6" /></div>
                            <div className="flex-1 space-y-1"><h3 className="text-sm font-black text-white uppercase tracking-tight">Institutional Verification</h3><p className="text-[10px] text-muted-foreground leading-relaxed">{profile?.kyc_status === 'verified' ? "Registry node verified. All institutional features are unlocked." : "Complete identity verification to unlock Escrow, WNC transfers, and the regional payment ramp."}</p></div>
                        </div>
                        {profile?.kyc_status !== 'verified' && profile?.kyc_status !== 'pending' && (<Button onClick={() => router.push('/profile/kyc')} className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">Start Identity Verification</Button>)}
                    </div>
                </section>

                <section className="space-y-4">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">Authenticator Protocol</p>
                    <div className="p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/10 space-y-6 shadow-xl relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center"><Smartphone className="w-6 h-6" /></div>
                                <div><p className="font-black text-sm text-white uppercase tracking-tight">Google Authenticator</p><div className="flex items-center gap-1.5"><div className={cn("w-1.5 h-1.5 rounded-full", mfaEnabled ? "bg-green-500" : "bg-zinc-600")} /><p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">{mfaEnabled ? 'MFA Node Active' : 'Not Linked'}</p></div></div>
                            </div>
                            <Switch checked={mfaEnabled} onCheckedChange={handleMfaToggle} className="data-[state=checked]:bg-primary" />
                        </div>
                        {!mfaEnabled && (<Button onClick={() => handleMfaToggle(true)} className="w-full h-14 rounded-2xl bg-primary text-black hover:bg-primary/90 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">Setup Authenticator Node</Button>)}
                    </div>
                </section>

                <section className="space-y-4">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">Biometric Registry</p>
                    <div className="p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/10 space-y-6 shadow-xl relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center"><ScanFace className="w-6 h-6" /></div>
                                <div><p className="font-black text-sm text-white uppercase tracking-tight">Face ID Protocol</p><div className="flex items-center gap-1.5"><div className={cn("w-1.5 h-1.5 rounded-full", profile?.face_id_enabled ? "bg-green-500" : "bg-zinc-600")} /><p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">{profile?.face_id_enabled ? 'Identity Active' : 'Not Established'}</p></div></div>
                            </div>
                            <Switch checked={biometricEnabled} onCheckedChange={handleBiometricToggle} className="data-[state=checked]:bg-primary" />
                        </div>
                        
                        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex gap-3">
                            <div className="shrink-0 mt-0.5"><Info className="w-4 h-4 text-amber-500" /></div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Developmental Node</p>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                    Face Verification is under development. For best results, use a <span className="text-white">well-lit environment</span>. You can always use your PIN if recognition fails.
                                </p>
                            </div>
                        </div>

                        <Button onClick={() => router.push('/profile/face-id')} className="w-full h-14 rounded-2xl bg-primary text-black hover:bg-primary/90 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 flex items-center justify-between px-6 group"><span className="font-black uppercase">{profile?.face_id_enabled ? 'Update Face Registry' : 'Establish Face ID'}</span><ChevronRight className="w-4 h-4 text-black group-hover:translate-x-1 transition-all" /></Button>
                    </div>
                </section>

                <section className="space-y-4">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">Payment Security</p>
                    <div className="p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/10 space-y-6 shadow-xl relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center"><Fingerprint className="w-6 h-6" /></div>
                                <div><p className="font-black text-sm text-white uppercase tracking-tight">Payment PIN</p><div className="flex items-center gap-1.5"><div className={cn("w-1.5 h-1.5 rounded-full", profile?.pin_enabled ? "bg-green-500" : "bg-zinc-600")} /><p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">{profile?.pin_enabled ? 'Active Node' : 'Not Established'}</p></div></div>
                            </div>
                            <Switch checked={pinEnabled} onCheckedChange={(checked) => { if (checked) { setIsPinModalOpen(true); } else { runChallenge(async () => { const { error } = await supabase.from('profiles').update({ pin_enabled: false, pin_hash: null }).eq('id', profile!.id); if (error) { toast({ variant: "destructive", title: "Error Disabling PIN", description: error.message }); } else { await refreshProfile(); toast({ title: "PIN Disabled", description: "Payment PIN has been turned off." }); } }); } }} className="data-[state=checked]:bg-primary" />
                        </div>
                        {!profile?.pin_enabled && (<Button onClick={() => setIsPinModalOpen(true)} className="w-full h-14 rounded-2xl bg-primary text-black hover:bg-primary/90 font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl shadow-primary/20"><ShieldPlus className="w-4 h-4 text-black" />Set Payment PIN</Button>)}
                    </div>
                </section>

                <Button className="w-full h-20 rounded-[2.5rem] font-black text-sm uppercase tracking-widest bg-primary hover:bg-primary/90 text-black shadow-xl shadow-primary/20 transition-all active:scale-95" disabled={isSaving} onClick={handleSave}>{isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authorize Authority Sync"}</Button>

                <section className="pt-10 pb-20 border-t border-red-500/10">
                    <div className="flex items-center gap-3 mb-6">
                        <ShieldAlert className="w-5 h-5 text-red-500" />
                        <div>
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">Danger Zone</p>
                            <p className="text-[8px] text-muted-foreground uppercase font-black tracking-widest opacity-40">Irreversible Actions</p>
                        </div>
                    </div>
                    
                    <div className="p-6 rounded-[2.5rem] bg-red-500/[0.03] border border-red-500/10 space-y-4">
                        <div className="space-y-1">
                            <h3 className="text-sm font-black text-red-500 uppercase tracking-tight">Decommission Vault</h3>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                This will permanently purge your recovery phrase from <span className="text-white">both local storage and the cloud vault</span>. Access to all derived wallets will be lost forever unless you have a physical backup.
                            </p>
                        </div>
                        <Button 
                            variant="destructive"
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="w-full h-12 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-500/20"
                        >
                            Purge & Destroy Vault
                        </Button>
                    </div>
                </section>
            </main>

            <Dialog open={isChallengeModalOpen} onOpenChange={setIsChallengeModalOpen}>
                <DialogContent className="bg-[#0a0a0c] border-white/10 rounded-[3rem] p-8 max-w-[95vw] sm:max-w-[400px]"><DialogHeader className="items-center text-center space-y-4"><div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xl"><ShieldEllipsis className="w-8 h-8" /></div><DialogTitle className="text-xl font-black uppercase text-white">Identity Challenge</DialogTitle></DialogHeader><div className="mt-6 space-y-6"><div className="space-y-2"><Label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">{challengeMode === 'pin' ? 'Security PIN' : 'Account Password'}</Label><Input type={challengeMode === 'pin' ? 'tel' : 'password'} maxLength={challengeMode === 'pin' ? 4 : undefined} placeholder={challengeMode === 'pin' ? '0000' : '••••••••'} value={challengeValue} onChange={(e) => setChallengeValue(e.target.value)} className={cn("h-14 bg-white/5 border-white/10 rounded-2xl text-center font-black tracking-[0.2em]", challengeMode === 'pin' && "text-2xl")} /></div><Button className="w-full h-14 rounded-2xl bg-primary text-black font-black uppercase text-xs" onClick={handleChallengeVerify} disabled={isChallengeProcessing || !challengeValue}>{isChallengeProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Authority"}</Button></div></DialogContent>
            </Dialog>

            <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
                <DialogContent className="bg-[#0a0a0c] border-white/10 rounded-[3rem] p-8 max-w-[95vw] sm:max-w-[400px]"><DialogHeader className="items-center text-center space-y-4"><div className="w-16 h-16 rounded-[1.5rem] bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400"><KeyRound className="w-8 h-8" /></div><DialogTitle className="text-xl font-black uppercase text-white">Change Password</DialogTitle></DialogHeader><div className="mt-6 space-y-4"><div className="space-y-2"><Label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">New Password</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-2xl" /></div><div className="space-y-2"><Label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Confirm New Password</Label><Input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-2xl" /></div><Button className="w-full h-14 rounded-2xl bg-primary text-black font-black uppercase text-xs mt-4" onClick={handlePasswordUpdate} disabled={isPasswordUpdating || newPassword.length < 8}>{isPasswordUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Registry Key"}</Button></div></DialogContent>
            </Dialog>

            <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
                <DialogContent className="bg-[#0a0a0c] border-white/10 rounded-[3rem] p-8 max-w-[95vw] sm:max-w-[400px]"><DialogHeader className="items-center text-center space-y-4"><div className="w-16 h-16 rounded-[1.5rem] bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400"><Mail className="w-8 h-8" /></div><DialogTitle className="text-xl font-black uppercase text-white">Update Email</DialogTitle></DialogHeader><div className="mt-6 space-y-4"><div className="space-y-2"><Label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">New Email Address</Label><Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-2xl" /></div><Button className="w-full h-14 rounded-2xl bg-primary text-black font-black uppercase text-xs mt-4" onClick={handleEmailUpdate} disabled={isEmailUpdating || !newEmail}>{isEmailUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Initiate Email Sync"}</Button></div></DialogContent>
            </Dialog>

            {/* MFA ENROLLMENT DIALOG */}
            <Dialog open={isTwoFactorModalOpen} onOpenChange={(open) => { setIsTwoFactorModalOpen(open); if(!open) resetMfaState(); }}>
                <DialogContent className="bg-[#0a0a0c] border-white/10 rounded-[3rem] p-8 max-w-[95vw] sm:max-w-[400px] overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-500 via-primary to-blue-500 animate-gradient-flow" />
                    <DialogHeader className="items-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                            <QrCode className="w-8 h-8" />
                        </div>
                        <DialogTitle className="text-xl font-black uppercase text-white">MFA Protocol</DialogTitle>
                    </DialogHeader>
                    <div className="mt-6 space-y-8">
                        <AnimatePresence mode="wait">
                            {twoFactorStep === 'intro' ? (
                                <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 text-center">
                                    <p className="text-xs text-muted-foreground leading-relaxed font-bold uppercase tracking-widest">Establish a secondary cryptographic handshake to secure your vault identity.</p>
                                    <Button onClick={startMfaSetup} className="w-full h-14 rounded-2xl bg-primary text-black font-black uppercase text-xs tracking-widest" disabled={is2FAProcessing}>
                                        {is2FAProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Start Handshake"}
                                    </Button>
                                </motion.div>
                            ) : twoFactorStep === 'qr' ? (
                                <motion.div key="qr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 flex flex-col items-center">
                                    <div className="bg-white p-4 rounded-3xl shadow-[0_0_40px_rgba(255,255,255,0.1)]" dangerouslySetInnerHTML={{ __html: qrCodeSvg }} />
                                    
                                    <div className="w-full space-y-2">
                                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest text-center px-4">Manual Secret Node</p>
                                        <div className="flex items-center gap-3 bg-black/40 border border-white/10 p-3 rounded-xl">
                                            <p className="text-[10px] font-mono text-primary font-bold truncate flex-1">{tempMfaSecret}</p>
                                            <button onClick={copyMfaSecret} className="text-primary hover:text-white transition-colors">
                                                {isSecretCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <Button onClick={() => setTwoFactorStep('verify')} className="w-full h-14 rounded-2xl bg-primary text-black font-black uppercase text-xs tracking-widest shadow-xl">Handshake established</Button>
                                </motion.div>
                            ) : twoFactorStep === 'verify' ? (
                                <motion.div key="verify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                    <div className="space-y-2 text-center">
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Verify Synchronized Code</p>
                                        <input 
                                          type="text" 
                                          maxLength={6} 
                                          placeholder="000000" 
                                          value={otpCode} 
                                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} 
                                          className="h-16 w-full bg-white/5 border border-white/10 rounded-2xl text-center text-4xl font-mono tracking-[0.5em] text-white focus:outline-none focus:border-primary/50 transition-colors" 
                                        />
                                    </div>
                                    <Button className="w-full h-14 rounded-2xl bg-primary text-black font-black uppercase text-xs tracking-widest shadow-xl" onClick={handleMfaVerify} disabled={otpCode.length !== 6 || is2FAProcessing}>
                                        {is2FAProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Activate"}
                                    </Button>
                                    <button onClick={() => setTwoFactorStep('qr')} className="w-full text-[9px] font-black uppercase text-white/20 hover:text-white transition-colors">Back to QR Node</button>
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                    </div>
                </DialogContent>
            </Dialog>

            {/* MFA DISABLE CONFIRMATION */}
            <Dialog open={isMfaDisableConfirmOpen} onOpenChange={setIsMfaDisableConfirmOpen}>
                <DialogContent className="bg-[#0a0a0c] border-white/10 rounded-[3rem] p-8 max-w-[95vw] sm:max-w-[400px]">
                    <DialogHeader className="items-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-xl">
                            <ShieldAlert className="w-8 h-8" />
                        </div>
                        <DialogTitle className="text-xl font-black uppercase text-white tracking-tight">Deactivate MFA?</DialogTitle>
                        <DialogDescription className="text-xs text-red-400/80 leading-relaxed font-bold uppercase tracking-widest">
                            Removing this layer lowers your vault security. Are you sure you want to proceed?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-8 flex flex-col gap-3 sm:flex-col">
                        <Button 
                            className="w-full h-14 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-red-500/20" 
                            onClick={confirmMfaDisable}
                        >
                            Yes, Deactivate
                        </Button>
                        <Button 
                            variant="ghost" 
                            className="w-full h-12 rounded-2xl font-bold text-white/40 uppercase text-[10px]" 
                            onClick={() => setIsMfaDisableConfirmOpen(false)}
                        >
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 🛡️ SMART DEVICE PIN MODAL */}
            <Dialog open={isDevicePinModalOpen} onOpenChange={setIsDevicePinModalOpen}>
                <DialogContent className="bg-[#0a0a0c] border-white/10 rounded-[3rem] p-8 max-w-[95vw] sm:max-w-[400px] overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-purple-500 to-primary animate-gradient-flow" />
                    <DialogHeader className="items-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xl">
                            <Lock className="w-8 h-8" />
                        </div>
                        <DialogTitle className="text-xl font-black uppercase text-white">
                            {devicePinStep === 'create' ? 'Create Security PIN' : 'Confirm Security PIN'}
                        </DialogTitle>
                        <DialogDescription className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                            8-Digit Hardware Node Key
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-8 space-y-10">
                        <div className="flex justify-center gap-3">
                            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                                const val = devicePinStep === 'create' ? tempDevicePin : confirmDevicePin;
                                return (
                                    <div key={i} className={cn(
                                        "w-3 h-3 rounded-full border-2 transition-all duration-300",
                                        val.length > i ? "bg-primary border-primary shadow-[0_0_15px_rgba(245,158,11,0.5)]" : "border-white/10"
                                    )} />
                                )
                            })}
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                                <button key={n} onClick={() => handleDevicePinInput(n.toString())} className="h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-xl font-black text-white hover:bg-white/[0.08] active:scale-90 transition-all">{n}</button>
                            ))}
                            <div />
                            <button onClick={() => handleDevicePinInput("0")} className="h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-xl font-black text-white hover:bg-white/[0.08] active:scale-90 transition-all">0</button>
                            <button onClick={() => devicePinStep === 'create' ? setTempDevicePin(v => v.slice(0, -1)) : setConfirmDevicePin(v => v.slice(0, -1))} className="h-16 rounded-2xl flex items-center justify-center text-white/40 hover:text-white active:scale-90 transition-all">
                                <Delete className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isPinModalOpen} onOpenChange={setIsPinModalOpen}>
                <DialogContent className="bg-[#0a0a0c] border-white/10 rounded-[3rem] p-8 max-w-[95vw] sm:max-w-[400px] overflow-hidden"><div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-purple-500 to-primary animate-gradient-flow" /><DialogHeader className="items-center text-center space-y-4"><div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xl"><Lock className="w-8 h-8" /></div><DialogTitle className="text-xl font-black uppercase text-white">{pinStep === 'create' ? 'Create PIN' : 'Confirm PIN'}</DialogTitle></DialogHeader><div className="mt-8 space-y-10"><div className="flex justify-center gap-6">{[0, 1, 2, 3].map((i) => { const val = pinStep === 'create' ? tempPin : confirmPin; return (<div key={i} className={cn("w-4 h-4 rounded-full border-2 transition-all duration-300", val.length > i ? "bg-primary border-primary shadow-[0_0_15px_rgba(245,158,11,0.5)]" : "border-white/10")} />) })}</div><div className="grid grid-cols-3 gap-4">{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (<button key={n} onClick={() => handlePinInput(n.toString())} className="h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-xl font-black text-white hover:bg-white/[0.08] active:scale-90 transition-all">{n}</button>))}<div /><button onClick={() => handlePinInput("0")} className="h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-xl font-black text-white hover:bg-white/[0.08] active:scale-90 transition-all">0</button><button onClick={() => pinStep === 'create' ? setTempPin(v => v.slice(0, -1)) : setConfirmPin(v => v.slice(0, -1))} className="h-16 rounded-2xl flex items-center justify-center text-white/40 hover:text-white active:scale-90 transition-all"><Delete className="w-6 h-6" /></button></div></div></DialogContent>
            </Dialog>

            <Dialog open={isProtectionModalOpen} onOpenChange={setIsProtectionModalOpen}>
                <DialogContent className="bg-[#0a0a0c] border-white/10 rounded-[3rem] p-8 max-w-[95vw] sm:max-w-[400px] overflow-hidden"><div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-500 via-red-600 to-red-500 animate-gradient-flow" /><DialogHeader className="items-center text-center space-y-4"><div className="w-16 h-16 rounded-[1.5rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-xl"><ShieldOff className="w-8 h-8" /></div><DialogTitle className="text-xl font-black uppercase text-white">{isDisabled ? 'Disable Protection' : 'Enable Protection'}</DialogTitle></DialogHeader><div className="mt-8 space-y-10"><div className="flex justify-center gap-6">{[0, 1, 2, 3].map((i) => (<div key={i} className={cn("w-4 h-4 rounded-full border-2 transition-all duration-300", protectionPin.length > i ? "bg-red-500 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" : "border-white/10")} />))}</div><div className="grid grid-cols-3 gap-4">{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (<button key={n} onClick={() => handleProtectionPinInput(n.toString())} className="h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-xl font-black text-white hover:bg-white/[0.08] active:scale-90 transition-all">{n}</button>))}<div /><button onClick={() => handleProtectionPinInput("0")} className="h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-xl font-black text-white hover:bg-white/[0.08] active:scale-90 transition-all">0</button><button onClick={() => setProtectionPin(v => v.slice(0, -1))} className="h-16 rounded-2xl flex items-center justify-center text-white/40 hover:text-white active:scale-90 transition-all"><Delete className="w-6 h-6" /></button></div></div></DialogContent>
            </Dialog>

            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="bg-[#0a0a0c] border-red-500/20 rounded-[3rem] p-8 max-w-[95vw] sm:max-w-[400px]">
                    <DialogHeader className="items-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-xl">
                            <Trash2 className="w-8 h-8" />
                        </div>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">Nuclear Option</DialogTitle>
                        <DialogDescription className="text-xs text-red-400/80 leading-relaxed font-bold uppercase tracking-widest">
                            This action is final. Type <span className="text-white">DELETE</span> to confirm permanent vault destruction.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-8 space-y-6">
                        <Input 
                            placeholder="DELETE" 
                            value={deleteConfirm} 
                            onChange={(e) => setDeleteConfirm(e.target.value)} 
                            className="h-14 bg-white/5 border-red-500/10 rounded-2xl text-center font-black tracking-[0.2em] text-red-500 focus:border-red-500/50" 
                        />
                        <div className="flex flex-col gap-3">
                            <Button 
                                className="w-full h-14 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-red-500/20" 
                                onClick={handlePermanentDelete}
                                disabled={deleteConfirm !== 'DELETE' || isDeleting}
                            >
                                {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Destruction"}
                            </Button>
                            <Button 
                                variant="ghost" 
                                className="w-full h-12 rounded-2xl font-bold text-white/40 uppercase text-[10px]" 
                                onClick={() => setIsDeleteModalOpen(false)}
                            >
                                Abort Mission
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isCountryOpen} onOpenChange={setIsCountryOpen}>
                <DialogContent className="bg-[#0a0a0c] border-white/10 rounded-[3rem] p-0 h-[70vh] flex flex-col overflow-hidden shadow-2xl"><div className="p-6 border-b border-white/5 space-y-4 bg-white/[0.02]"><DialogHeader><DialogTitle className="text-xl font-black uppercase text-center text-white">Select Region</DialogTitle></DialogHeader><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" /><Input placeholder="Search countries..." value={searchCountry} onChange={(e) => setSearchCountry(e.target.value)} className="h-14 bg-black/40 border-white/10 pl-12 rounded-2xl focus-visible:ring-primary" /></div></div><ScrollArea className="flex-1 p-4"><div className="space-y-1 pb-10">{filteredCountries.map((c) => (<button key={c.code} onClick={() => { setCountry(c.code); setIsCountryOpen(false); }} className={cn("w-full p-5 flex items-center justify-between rounded-2xl transition-all group", country === c.code ? "bg-primary/10 border border-primary/30" : "hover:bg-white/5")}><div className="flex items-center gap-4"><span className="text-2xl">{c.flag}</span><div className="text-left"><p className="font-black text-sm text-white uppercase tracking-tight">{c.name}</p></div></div>{country === c.code && <Check className="w-4 h-4 text-primary" />}</button>))}</div></ScrollArea></DialogContent>
            </Dialog>
        </div>
    );
}
