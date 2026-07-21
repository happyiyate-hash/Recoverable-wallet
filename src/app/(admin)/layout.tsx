
'use client';

import React, { useEffect } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useUser } from '@/contexts/user-provider';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * INSTITUTIONAL ADMIN LAYOUT
 * Version: 2.0.0 (Surgical Auth Lockdown)
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading } = useUser();
  const router = useRouter();

  // 🛡️ INSTITUTIONAL REDIRECT SENTINEL
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/auth/login');
      } else if (profile === null) {
        router.replace('/complete-profile');
      }
    }
  }, [user, profile, loading, router]);

  // 1. BOOTSTRAP GATE
  if (loading || !user || profile === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#050505] overflow-hidden">
      {/* LEFT: COMMAND STRIP */}
      <AdminSidebar />

      {/* RIGHT: MODULE CONTENT */}
      <main className="flex-1 h-full overflow-hidden relative flex flex-col">
        {children}
      </main>
    </div>
  );
}
