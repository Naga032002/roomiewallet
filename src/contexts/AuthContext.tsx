import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fallback: never stay stuck on loading more than 6 seconds
    const fallbackTimer = setTimeout(() => {
      setLoading(false);
    }, 6_000);

    // onAuthStateChange always fires INITIAL_SESSION immediately on mount —
    // use it as the single source of truth (avoids race with getSession)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Only process events that mean we have a session
      if (session?.user) {
        const authUser = session.user;
        const userData: User = {
          uid: authUser.id,
          email: authUser.email || '',
          displayName: authUser.user_metadata?.full_name
            || authUser.user_metadata?.name
            || authUser.email?.split('@')[0]
            || 'User',
          photoURL: authUser.user_metadata?.avatar_url
            || authUser.user_metadata?.picture
            || '',
        };

        // Set user & stop loading immediately — don't await the upsert
        setUser(userData);
        setLoading(false);
        clearTimeout(fallbackTimer);

        // Fire-and-forget profile upsert — only on actual sign-in (not every session check)
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
          supabase.from('profiles').upsert({
            id: userData.uid,
            email: userData.email,
            display_name: userData.displayName,
            photo_url: userData.photoURL,
          }, { onConflict: 'id' }).then(({ error }) => {
            if (error) console.error('Profile upsert error:', error);
          });
        }
      } else {
        // No session: SIGNED_OUT, expired token, etc.
        setUser(null);
        setLoading(false);
        clearTimeout(fallbackTimer);
      }
    });

    return () => {
      clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, []);


  const signInWithGoogle = async () => {
    // Use the current origin so it works from both localhost AND mobile (192.168.x.x:5173)
    const redirectTo = `${window.location.origin}/`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) throw error;
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
