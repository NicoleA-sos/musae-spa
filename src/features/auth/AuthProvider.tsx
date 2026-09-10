import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { AppError } from '../../lib/errors';
import { isSupabaseConfigured, requireSupabaseClient, supabase } from '../../lib/supabase';
import type { UserRole } from '../../types/domain';

export interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: UserRole;
  status: 'active' | 'inactive';
}

interface SignUpInput {
  fullName: string;
  email: string;
  password: string;
}

interface SignInInput {
  email: string;
  password: string;
}

interface ProfileInput {
  fullName: string;
  phone: string;
}

interface AuthContextValue {
  isConfigured: boolean;
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<{ needsEmailConfirmation: boolean }>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (input: ProfileInput) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('profiles')
    .select('id, email, full_name, phone, role, status')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new AppError('No se pudo cargar tu perfil. Inténtalo nuevamente.', error.code);
  }

  if (!data) return null;

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    phone: data.phone,
    role: data.role as UserRole,
    status: data.status as 'active' | 'inactive',
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  const syncSession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);

    if (!nextSession) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const nextProfile = await fetchProfile(nextSession.user.id);
      setProfile(nextProfile);
    } catch {
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isActive = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (isActive) {
        void syncSession(data.session);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(() => {
        if (isActive) {
          void syncSession(nextSession);
        }
      }, 0);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [syncSession]);

  const refreshProfile = useCallback(async () => {
    if (!session) {
      setProfile(null);
      return;
    }

    const nextProfile = await fetchProfile(session.user.id);
    setProfile(nextProfile);
  }, [session]);

  const signIn = useCallback(async ({ email, password }: SignInInput) => {
    const client = requireSupabaseClient();
    const { error } = await client.auth.signInWithPassword({ email, password });

    if (error) {
      throw new AppError(error.message, error.code);
    }
  }, []);

  const signUp = useCallback(async ({ fullName, email, password }: SignUpInput) => {
    const client = requireSupabaseClient();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin + '/iniciar-sesion',
      },
    });

    if (error) {
      throw new AppError(error.message, error.code);
    }

    return { needsEmailConfirmation: !data.session };
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const client = requireSupabaseClient();
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/recuperar-contrasena',
    });

    if (error) {
      throw new AppError('No se pudo enviar el correo de recuperación. Inténtalo nuevamente.', error.code);
    }
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const client = requireSupabaseClient();
    const { error } = await client.auth.updateUser({ password });

    if (error) {
      throw new AppError('No se pudo actualizar la contraseña. Solicita un enlace nuevo e inténtalo otra vez.', error.code);
    }
  }, []);

  const signOut = useCallback(async () => {
    const client = requireSupabaseClient();
    const { error } = await client.auth.signOut();

    if (error) {
      throw new AppError('No se pudo cerrar la sesión. Inténtalo nuevamente.', error.code);
    }
  }, []);

  const updateProfile = useCallback(
    async ({ fullName, phone }: ProfileInput) => {
      if (!session) {
        throw new AppError('Debes iniciar sesión para actualizar tu perfil.');
      }

      const client = requireSupabaseClient();
      const { error } = await client
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
        })
        .eq('id', session.user.id);

      if (error) {
        throw new AppError('No se pudieron guardar los cambios del perfil.', error.code);
      }

      await refreshProfile();
    },
    [refreshProfile, session],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      isConfigured: isSupabaseConfigured,
      isLoading,
      session,
      user: session?.user ?? null,
      profile,
      signIn,
      signUp,
      requestPasswordReset,
      updatePassword,
      signOut,
      updateProfile,
      refreshProfile,
    }),
    [isLoading, profile, refreshProfile, requestPasswordReset, session, signIn, signOut, signUp, updatePassword, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de AuthProvider.');
  }

  return context;
}
