import { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "admin" | "operador" | "financeiro" | "admin_master";

export const roleLabels: Record<UserRole, string> = {
  admin_master: "Administrador Master",
  admin: "Administrador",
  operador: "Operador",
  financeiro: "Financeiro",
};

interface User {
  name: string;
  email: string;
  role: UserRole;
  initials: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string) => void;
  logout: () => void;
  hasAccess: (section: string) => boolean;
}

/**
 * Defines which menu sections each role can access.
 * - admin_master / admin: full access
 * - operador: no financial
 * - financeiro: only home + financial + settings
 */
const rolePermissions: Record<UserRole, string[]> = {
  admin_master: ["home", "maquinas", "suporte", "manutencao", "financeiro", "configuracoes", "usuarios"],
  admin: ["home", "maquinas", "suporte", "manutencao", "financeiro", "configuracoes"],
  operador: ["home", "maquinas", "suporte", "manutencao", "configuracoes"],
  financeiro: ["home", "financeiro", "configuracoes"],
};

/** Map of known emails to their user profiles (mock) */
const knownUsers: Record<string, User> = {
  "dimension_cnc@hotmail.com": {
    name: "Dimension CNC",
    email: "dimension_cnc@hotmail.com",
    role: "admin_master",
    initials: "DC",
  },
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string) => {
    const lower = email.toLowerCase();
    const known = knownUsers[lower];
    setIsAuthenticated(true);
    setUser(
      known ?? {
        name: "João Costa",
        email: lower,
        role: "admin",
        initials: "JC",
      }
    );
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  const hasAccess = (section: string): boolean => {
    if (!user) return false;
    return rolePermissions[user.role]?.includes(section) ?? false;
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, hasAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
