import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type UserProfile = {
  user_id: string;
  nome: string | null;
  loja: string;
  perfil: string;
  ativo: boolean;
};

type AuthContextValue = {
  session: any;
  profile: UserProfile | null;
  loading: boolean;
  profileError: string | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    db.auth.getSession().then(({ data, error }: any) => {
      if (!alive) return;
      if (error) setProfileError(error.message);
      setSession(data?.session ?? null);
      setLoading(false);
    });
    const { data } = db.auth.onAuthStateChange((_event: string, nextSession: any) => {
      if (!alive) return;
      setSession(nextSession);
      setLoading(false);
    });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let alive = true;
    setProfile(null);
    setProfileError(null);
    if (!session?.user?.id) { setProfileLoading(false); return; }
    setProfileLoading(true);
    db.from("inv_perfis").select("user_id,nome,loja,perfil,ativo")
      .eq("user_id", session.user.id).eq("ativo", true).maybeSingle()
      .then(({ data, error }: any) => {
        if (!alive) return;
        if (error) setProfileError(error.message);
        setProfile(data ?? null);
      })
      .finally(() => { if (alive) setProfileLoading(false); });
    return () => { alive = false; };
  }, [session?.user?.id]);

  async function signIn(email: string, password: string) {
    const { error } = await db.auth.signInWithPassword({ email: email.trim(), password });
    return error?.message ?? null;
  }

  async function signOut() {
    const { error } = await db.auth.signOut();
    if (error) setProfileError(error.message);
  }

  return <AuthContext.Provider value={{ session, profile, loading: loading || profileLoading, profileError, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth deve ser utilizado dentro de AuthProvider.");
  return value;
}
