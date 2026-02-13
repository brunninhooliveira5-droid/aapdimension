import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type UserRole = "admin_master" | "admin" | "operador" | "financeiro";

export const roleLabels: Record<UserRole, string> = {
  admin_master: "Administrador Master",
  admin: "Administrador",
  operador: "Operador",
  financeiro: "Financeiro",
};

const rolePermissions: Record<UserRole, string[]> = {
  admin_master: ["home", "maquinas", "suporte", "manutencao", "financeiro", "configuracoes", "usuarios"],
  admin: ["home", "maquinas", "suporte", "manutencao", "financeiro", "configuracoes"],
  operador: ["home", "maquinas", "suporte", "manutencao", "configuracoes"],
  financeiro: ["home", "financeiro", "configuracoes"],
};

interface Profile {
  name: string;
  email: string;
  initials: string;
  company: string;
  role: UserRole;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: Profile | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string, name: string, role?: UserRole) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  hasAccess: (section: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string, email: string) => {
    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    // Fetch role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    const role = (roleData?.role as UserRole) ?? "operador";

    setUser({
      name: profile?.name ?? email.split("@")[0],
      email: profile?.email ?? email,
      initials: profile?.initials ?? email.substring(0, 2).toUpperCase(),
      company: profile?.company ?? "",
      role,
    });
  };

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          // Use setTimeout to avoid potential deadlock with Supabase client
          setTimeout(() => {
            fetchProfile(newSession.user.id, newSession.user.email ?? "");
          }, 0);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      if (existingSession?.user) {
        fetchProfile(existingSession.user.id, existingSession.user.email ?? "");
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signup = async (email: string, password: string, name: string, role?: UserRole) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name, role: role ?? "operador" },
      },
    });
    return { error: error?.message ?? null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const hasAccess = (section: string): boolean => {
    if (!user) return false;
    return rolePermissions[user.role]?.includes(section) ?? false;
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!session,
        isLoading,
        user,
        session,
        login,
        signup,
        logout,
        hasAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
