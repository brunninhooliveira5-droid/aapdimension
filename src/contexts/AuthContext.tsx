import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";

export type UserRole = "admin_master" | "admin" | "operador" | "financeiro" | "servico" | "usuario_interno";

export const roleLabels: Record<UserRole, string> = {
  admin_master: "Administrador Master",
  admin: "Administrador",
  operador: "Operador",
  financeiro: "Financeiro",
  servico: "Serviço",
  usuario_interno: "Usuário Interno",
};

const rolePermissions: Record<UserRole, string[]> = {
  admin_master: ["home", "maquinas", "suporte", "manutencao", "equipamentos", "pecas", "financeiro", "gestao_financeira", "configuracoes", "usuarios", "boletins", "orcamento", "arquivos", "propostas", "dimension", "controle_producao"],
  admin: ["home", "maquinas", "suporte", "manutencao", "equipamentos", "pecas", "financeiro", "configuracoes", "orcamento", "arquivos"],
  operador: ["home", "maquinas", "suporte", "manutencao", "equipamentos", "pecas", "configuracoes", "orcamento", "arquivos"],
  financeiro: ["home", "equipamentos", "financeiro", "gestao_financeira", "configuracoes", "arquivos"],
  servico: ["home", "equipamentos", "configuracoes", "orcamento"],
  usuario_interno: ["home", "configuracoes"],
};

export type SectionVisibility = "visible" | "locked" | "hidden";

interface UserPlan {
  plan: string;
  pro_access: boolean;
  features_enabled: string[];
  max_quotes_per_month: number;
  max_financial_entries: number;
  valid_until: string | null;
  pro_activated_at: string | null;
}

interface Profile {
  name: string;
  email: string;
  initials: string;
  company: string;
  role: UserRole;
  approved: boolean;
  userPlan: UserPlan | null;
  sectionAccess: Record<string, SectionVisibility>;
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
  /** The real admin profile when impersonating, otherwise null */
  realAdminUser: Profile | null;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string, name: string, role?: UserRole, extra?: SignupExtra) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  hasAccess: (section: string) => boolean;
  getSectionVisibility: (section: string) => SectionVisibility;
  hasProAccess: (feature?: string) => boolean;
  loadImpersonatedProfile: (targetUserId: string) => Promise<void>;
  clearImpersonatedProfile: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [realAdminUser, setRealAdminUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string, email: string): Promise<Profile | null> => {
    const [{ data: profile }, { data: roleData }, { data: planData }, { data: accessData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId).single(),
      supabase.from("user_plans").select("*").eq("user_id", userId).single(),
      supabase.from("user_section_access" as any).select("sections").eq("user_id", userId).single(),
    ]);

    const role = (roleData?.role as UserRole) ?? "operador";
    const approved = (profile as any)?.approved ?? false;

    const userPlan: UserPlan | null = planData
      ? {
          plan: planData.plan,
          pro_access: planData.pro_access,
          features_enabled: planData.features_enabled ?? [],
          max_quotes_per_month: planData.max_quotes_per_month,
          max_financial_entries: planData.max_financial_entries,
          valid_until: planData.valid_until ?? null,
          pro_activated_at: planData.pro_activated_at ?? null,
        }
      : null;

    // admin_master always has full pro access
    if (role === "admin_master" && userPlan) {
      userPlan.pro_access = true;
    }

    const sectionAccess: Record<string, SectionVisibility> = (accessData as any)?.sections ?? {};

    const p: Profile = {
      name: profile?.name ?? email.split("@")[0],
      email: profile?.email ?? email,
      initials: profile?.initials ?? email.substring(0, 2).toUpperCase(),
      company: profile?.company ?? "",
      role,
      approved,
      userPlan,
      sectionAccess,
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
              // Update last_access_at
              if (newSession.user.id) {
                supabase.from("user_plans").update({ last_access_at: new Date().toISOString() } as any).eq("user_id", newSession.user.id).then(() => {});
              }
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
          // Check if impersonation is active from localStorage
          try {
            const impState = JSON.parse(localStorage.getItem("impersonation_state") || "{}");
            if (impState.active && impState.targetUserId && p?.role === "admin_master") {
              // Store admin profile, then load target profile
              setRealAdminUser(p);
              const targetP = await fetchProfile(impState.targetUserId, "");
              setUser(targetP);
            } else {
              setUser(p);
            }
          } catch {
            setUser(p);
          }
        }
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    // Record login activity and event (don't block login on failure)
    if (data.user) {
      supabase.rpc("record_login_activity", { p_user_id: data.user.id }).then(() => {});
      supabase.rpc("record_login_event", { p_user_id: data.user.id }).then(() => {});
    }
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
    await supabase.auth.signOut();
    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRealAdminUser(null);
    setSession(null);
  };

  const loadImpersonatedProfile = useCallback(async (targetUserId: string) => {
    // Save current user as admin before overwriting
    setRealAdminUser(user);
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", targetUserId).single();
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", targetUserId).single();
    const { data: planData } = await supabase.from("user_plans").select("*").eq("user_id", targetUserId).single();
    const { data: accessData } = await supabase.from("user_section_access" as any).select("sections").eq("user_id", targetUserId).single();

    const role = (roleData?.role as UserRole) ?? "operador";
    const userPlan: UserPlan | null = planData
      ? {
          plan: planData.plan,
          pro_access: planData.pro_access,
          features_enabled: planData.features_enabled ?? [],
          max_quotes_per_month: planData.max_quotes_per_month,
          max_financial_entries: planData.max_financial_entries,
          valid_until: planData.valid_until ?? null,
          pro_activated_at: planData.pro_activated_at ?? null,
        }
      : null;

    const sectionAccess: Record<string, SectionVisibility> = (accessData as any)?.sections ?? {};

    setUser({
      name: profile?.name ?? "",
      email: profile?.email ?? "",
      initials: profile?.initials ?? "",
      company: profile?.company ?? "",
      role,
      approved: (profile as any)?.approved ?? false,
      userPlan,
      sectionAccess,
    });
  }, [user]);

  const clearImpersonatedProfile = useCallback(() => {
    if (realAdminUser) {
      setUser(realAdminUser);
      setRealAdminUser(null);
    }
  }, [realAdminUser]);

  const getSectionVisibility = (section: string): SectionVisibility => {
    if (!user) return "hidden";
    if (user.role === "admin_master") return "visible";
    const override = user.sectionAccess[section];
    if (override) return override;
    const roleAllows = rolePermissions[user.role]?.includes(section) ?? false;
    if (!roleAllows) return "hidden";
    return "visible";
  };

  const hasAccess = (section: string): boolean => {
    const vis = getSectionVisibility(section);
    return vis === "visible" || vis === "locked";
  };

  const hasProAccess = (feature?: string): boolean => {
    if (!user) return false;
    if (user.role === "admin_master") return true;
    if (!user.userPlan) return false;
    if (!user.userPlan.pro_access) return false;
    if (user.userPlan.valid_until) {
      const expiresAt = new Date(user.userPlan.valid_until);
      if (expiresAt <= new Date()) return false;
    }
    if (feature && !user.userPlan.features_enabled.includes(feature)) return false;
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!session && !!user,
        isLoading,
        user,
        session,
        realAdminUser,
        login,
        signup,
        logout,
        hasAccess,
        getSectionVisibility,
        hasProAccess,
        loadImpersonatedProfile,
        clearImpersonatedProfile,
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
