'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import type { UserProfile, SessionNode } from '@/lib/types';

interface UserContextType {
  user: User | null;
  profile: UserProfile | null | undefined;
  isPremium: boolean;
  loading: boolean;
  sessions: SessionNode[];
  activeSessionId: string | null;
  isBalanceHidden: boolean;
  setIsBalanceHidden: (val: boolean) => void;
  signOut: () => Promise<void>;
  switchSession: (sessionId: string) => Promise<void>;
  removeSession: (sessionId: string) => void;
  refreshProfile: () => Promise<void>;
  updateSessionRegistry: (userId: string, profile: UserProfile, session?: Session | null) => void;
  setIsRestricted: (val: boolean) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);
const REGISTRY_KEY = 'ss-identity-registry';
const PRIVACY_KEY = 'ss-balance-visibility';

/**
 * INSTITUTIONAL USER DATA PROVIDER (STABLE SESSION STANDARD)
 * Version: 21.0.0 (Privacy Toggle Standard)
 */
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  
  // 👁️ PRIVACY STATE: Persist balance visibility preference
  const [isBalanceHidden, setIsBalanceHiddenState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(PRIVACY_KEY) === 'true';
  });

  const setIsBalanceHidden = (val: boolean) => {
    setIsBalanceHiddenState(val);
    localStorage.setItem(PRIVACY_KEY, val ? 'true' : 'false');
  };

  // 📥 INITIAL HYDRATION: Load registry node from localStorage instantly
  const [sessions, setSessions] = useState<SessionNode[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(REGISTRY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Placeholder for restricted state handled by SecurityGate
  const [, setRestrictedState] = useState(false);

  /**
   * AUTHORITATIVE TERMINATION
   */
  const signOut = useCallback(async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn("[SIGN_OUT_ADVISORY] Local purge only.");
    } finally {
      setUser(null);
      setProfile(null);
      if (user?.id) {
        localStorage.removeItem(`ss-profile-cache-${user.id}`);
      }
      window.location.href = '/auth/login';
    }
  }, [user?.id]);

  /**
   * REGISTRY MERGE PROTOCOL
   */
  const updateSessionRegistry = useCallback((userId: string, updatedProfile: UserProfile, currentSession?: Session | null) => {
    if (typeof window === 'undefined' || !userId) return;

    setSessions(prevSessions => {
      const filtered = prevSessions.filter(s => s.id !== userId);
      const sessionData = currentSession ? {
        access_token: currentSession.access_token,
        refresh_token: currentSession.refresh_token
      } : prevSessions.find(s => s.id === userId)?.session;

      const nextNode: SessionNode = { 
        id: userId, 
        profile: updatedProfile, 
        lastActive: Date.now(),
        session: sessionData
      };

      const nextBundle = [nextNode, ...filtered];
      localStorage.setItem(REGISTRY_KEY, JSON.stringify(nextBundle));
      return nextBundle;
    });
  }, []);

  const fetchProfile = useCallback(async (userId: string, currentSession?: Session | null) => {
    if (!supabase || !userId) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        const userProfile = data as UserProfile;
        setProfile(userProfile);
        localStorage.setItem(`ss-profile-cache-${userId}`, JSON.stringify(data));
        updateSessionRegistry(userId, userProfile, currentSession);
        return userProfile;
      }
    } catch (e) {
      console.warn("[DATA_REFRESH_ADVISORY] Profile sync deferred.");
    }
    return null;
  }, [updateSessionRegistry]);

  /**
   * ATOMIC SESSION INITIALIZATION
   */
  useEffect(() => {
    let profileSubscription: any;
    let isMounted = true;

    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (session?.user) {
          setUser(session.user);
          const cached = localStorage.getItem(`ss-profile-cache-${session.user.id}`);
          if (cached) setProfile(JSON.parse(cached));
          await fetchProfile(session.user.id, session);

          profileSubscription = supabase
            .channel(`profile:${session.user.id}`)
            .on('postgres_changes', { 
              event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` 
            }, (payload) => {
              const updated = payload.new as UserProfile;
              setProfile(updated);
              updateSessionRegistry(session.user.id, updated);
            })
            .subscribe();
        } else {
          const path = window.location.pathname;
          if (!path.startsWith('/auth')) {
            window.location.href = '/auth/login';
          }
        }
      } catch (e) {
        console.error("[INIT_SESSION_FAIL]", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id, session);
      } else {
        setUser(null);
        setProfile(null);
        const path = window.location.pathname;
        if (!path.startsWith('/auth')) {
          window.location.href = '/auth/login';
        }
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (profileSubscription) supabase.removeChannel(profileSubscription);
    };
  }, [fetchProfile, updateSessionRegistry]);

  const switchSession = useCallback(async (sessionId: string) => {
    const targetNode = sessions.find(s => s.id === sessionId);
    if (!targetNode?.session) return;

    try {
      setLoading(true);
      setUser(null);
      setProfile(null);
      const { error } = await supabase.auth.setSession({
        access_token: targetNode.session.access_token,
        refresh_token: targetNode.session.refresh_token
      });
      if (error) throw error;
      window.location.href = '/';
    } catch (e) {
      await signOut();
    }
  }, [sessions, signOut]);

  const removeSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== sessionId);
      localStorage.setItem(REGISTRY_KEY, JSON.stringify(next));
      return next;
    });
    if (sessionId === user?.id) signOut();
  }, [user?.id, signOut]);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const isPremium = useMemo(() => {
    return profile?.premium_expires_at ? new Date(profile.premium_expires_at) > new Date() : false;
  }, [profile?.premium_expires_at]);

  const contextValue = useMemo(() => ({
    user, 
    profile, 
    isPremium, 
    loading, 
    sessions,
    activeSessionId: user?.id || null,
    isBalanceHidden,
    setIsBalanceHidden,
    signOut, 
    switchSession, 
    removeSession, 
    refreshProfile, 
    updateSessionRegistry,
    setIsRestricted: (val: boolean) => setRestrictedState(val)
  }), [user, profile, isPremium, loading, sessions, isBalanceHidden, signOut, switchSession, removeSession, refreshProfile, updateSessionRegistry]);

  return <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>;
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) throw new Error('useUser must be used within UserProvider');
  return context;
};
