import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    provider: string | null;
    is_pro: boolean | null;
    dodo_customer_id: string | null;
  } | null;
  loading: boolean;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  logout: async () => {},
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load initial session and listen to changes
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
        }
      } catch (err) {
        console.error("Error fetching initial session:", err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (mounted) {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fetch corresponding profile when user changes
  useEffect(() => {
    let mounted = true;
    if (!user) {
      setProfile(null);
      return;
    }

    async function fetchProfile() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (mounted && !error && data) {
          setProfile(data);
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
      }
    }

    fetchProfile();

    return () => {
      mounted = false;
    };
  }, [user]);

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Successfully logged out.");
    } catch (err: any) {
      toast.error(err.message || "Failed to log out.");
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/dashboard",
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Google OAuth initialization failed.");
    }
  };

  const signInWithApple = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: window.location.origin + "/dashboard",
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Apple OAuth initialization failed.");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        logout,
        signInWithGoogle,
        signInWithApple,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
