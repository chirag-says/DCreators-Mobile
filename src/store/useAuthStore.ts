import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Profile, ConsultantProfile, UserRole } from '../types';

interface AuthState {
  // User state
  user: { id: string; email: string } | null;
  profile: Profile | null;
  consultantProfile: ConsultantProfile | null;
  currentRole: UserRole;

  // UI state
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signInWithOTP: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyOTP: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
  fetchProfile: () => Promise<void>;
  fetchConsultantProfile: () => Promise<void>;
  setRole: (role: UserRole) => void;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  profile: null,
  consultantProfile: null,
  currentRole: 'client',
  isLoading: false,
  isInitialized: false,
  error: null,

  // Initialize: check if user already has a session
  initialize: async () => {
    try {
      set({ isLoading: true });
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        set({
          user: { id: session.user.id, email: session.user.email ?? '' },
        });
        // Fetch profile data
        await get().fetchProfile();
        await get().fetchConsultantProfile();
      }
    } catch (err) {
      console.error('Auth init error:', err);
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  // Step 1: Send OTP to email
  signInWithOTP: async (email: string) => {
    try {
      set({ isLoading: true, error: null });
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        set({ error: error.message });
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send OTP';
      set({ error: message });
      return { success: false, error: message };
    } finally {
      set({ isLoading: false });
    }
  },

  // Step 2: Verify OTP
  verifyOTP: async (email: string, token: string) => {
    try {
      set({ isLoading: true, error: null });
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) {
        set({ error: error.message });
        return { success: false, error: error.message };
      }

      if (data.user) {
        set({
          user: { id: data.user.id, email: data.user.email ?? '' },
        });
        // Profile is auto-created by DB trigger, fetch it
        await get().fetchProfile();
        await get().fetchConsultantProfile();
      }

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'OTP verification failed';
      set({ error: message });
      return { success: false, error: message };
    } finally {
      set({ isLoading: false });
    }
  },

  // Update user profile (name, phone, address, etc.)
  updateProfile: async (data: Partial<Profile>) => {
    try {
      set({ isLoading: true, error: null });
      const userId = get().user?.id;
      if (!userId) return { success: false, error: 'Not authenticated' };

      const { error } = await supabase
        .from('profiles')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        set({ error: error.message });
        return { success: false, error: error.message };
      }

      // Refresh profile
      await get().fetchProfile();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed';
      set({ error: message });
      return { success: false, error: message };
    } finally {
      set({ isLoading: false });
    }
  },

  // Fetch user profile from DB
  fetchProfile: async () => {
    const userId = get().user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      set({ profile: data as Profile });
    }
  },

  // Fetch consultant profile (may not exist)
  fetchConsultantProfile: async () => {
    const userId = get().user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from('consultant_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      set({ consultantProfile: data as ConsultantProfile });
    } else {
      set({ consultantProfile: null });
    }
  },

  // Set current role (client or consultant)
  setRole: (role: UserRole) => {
    set({ currentRole: role });
  },

  // Sign out
  signOut: async () => {
    await supabase.auth.signOut();
    set({
      user: null,
      profile: null,
      consultantProfile: null,
      currentRole: 'client',
      error: null,
    });
  },

  // Clear error
  clearError: () => set({ error: null }),
}));
