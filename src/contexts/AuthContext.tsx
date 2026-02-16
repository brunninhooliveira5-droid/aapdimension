import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";

export type UserRole = "admin_master" | "admin" | "operador" | "financeiro";

export const roleLabels: Record<UserRole, string> = {
  admin_master: "Administrador Master",
  admin: "Administrador",
  operador: "Operador",
  financeiro: "Financeiro",
};

const rolePermissions: Record<UserRole, string[]> = {
  admin_master: ["home", "maquinas", "suporte", "manutencao", "equipamentos", "pecas", "financeiro", "configuracoes", "usuarios", "boletins", "orcamento", "arquivos"],
  admin: ["home", "maquinas", "suporte", "manutencao", "equipamentos", "pecas", "financeiro", "configuracoes", "orcamento", "arquivos"],
  operador: ["home", "maquinas", "suporte", "manutencao", "equipamentos", "pecas", "configuracoes", "orcamento", "arquivos"],
  financeiro: ["home", "equipamentos", "financeiro", "configuracoes", "arquivos"],
};

interface Profile {
  name: string;
  email: string;
  initials: string;
  company: string;
  role: UserRole;
  approved: boolean;
}

interface SignupExtra {
  company: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: Profile | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string, name: string, role?: UserRole, extra?: SignupExtra) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  hasAccess: (section: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string, email: string): Promise<Profile | null> => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    const role = (roleData?.role as UserRole) ?? "operador";
    const approved = (profile as any)?.approved ?? false;

    const p: Profile = {
      name: profile?.name ?? email.split("@")[0],
      email: profile?.email ?? email,
      initials: profile?.initials ?? email.substring(0, 2).toUpperCase(),
      company: profile?.company ?? "",
      role,
      approved,
    };

    return p;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          setTimeout(async () => {
            const p = await fetchProfile(newSession.user.id, newSession.user.email ?? "");
            if (p && !p.approved && p.role !== "admin_master") {
              toast.error("Seu cadastro ainda não foi aprovado pelo administrador.", { duration: 5000 });
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
            } else {
              setUser(p);
            }
            setIsLoading(false);
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      setSession(existingSession);
      if (existingSession?.user) {
        const p = await fetchProfile(existingSession.user.id, existingSession.user.email ?? "");
        if (p && !p.approved && p.role !== "admin_master") {
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
        } else {
          setUser(p);
        }
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    // The onAuthStateChange will handle the approval check
    return { error: null };
  };

  const signup = async (email: string, password: string, name: string, role?: UserRole, extra?: SignupExtra) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          name,
          role: role ?? "operador",
          company: extra?.company ?? "",
          address: extra?.address ?? "",
          city: extra?.city ?? "",
          state: extra?.state ?? "",
          zip_code: extra?.zip_code ?? "",
          phone: extra?.phone ?? "",
        },
      },
    });
    if (error) return { error: error.message };

    // Sign out immediately — user must wait for approval
    await supabase.auth.signOut();
    return { error: null };
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
        isAuthenticated: !!session && !!user,
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
