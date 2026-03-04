

# Plano: Sistema Multiusuário por Cliente (Multi-Tenant)

Este é um recurso complexo que adiciona a capacidade de clientes (Administradores de Conta) gerenciarem seus próprios sub-usuários com permissões granulares por módulo.

---

## Visão Geral da Arquitetura

```text
┌─────────────────────────────────────────────────┐
│  admin_master (Dimension)                       │
│  - Vê tudo, gerencia tudo                       │
├─────────────────────────────────────────────────┤
│  Account (Empresa Cliente)                      │
│  ├── client_admin (dono da conta)               │
│  │   └── Gerencia membros + permissões          │
│  ├── operator (operador)                        │
│  ├── client_finance (financeiro do cliente)     │
│  └── viewer (somente leitura)                   │
├─────────────────────────────────────────────────┤
│  Dados compartilhados por account_id            │
│  (equipamentos, tickets, orçamentos, etc.)      │
└─────────────────────────────────────────────────┘
```

---

## 1. Modelo de Dados (Migrações SQL)

### Tabela `accounts`
```sql
CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
```

### Tabela `account_members`
```sql
CREATE TYPE public.account_member_role AS ENUM ('client_admin', 'operator', 'client_finance', 'viewer');

CREATE TABLE public.account_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role account_member_role NOT NULL DEFAULT 'operator',
  permissions jsonb NOT NULL DEFAULT '{
    "maquinas": true, "suporte": true, "manutencao": true,
    "equipamentos": true, "pecas": true, "financeiro": false,
    "orcamento": true, "configuracoes": true, "arquivos": true,
    "controle_producao": false, "gestao_financeira": false,
    "can_manage_users": false
  }'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(account_id, user_id)
);
ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;
```

### Tabela `account_invites`
```sql
CREATE TABLE public.account_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  whatsapp text,
  suggested_role account_member_role NOT NULL DEFAULT 'operator',
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pendente',
  invite_token text UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz
);
ALTER TABLE public.account_invites ENABLE ROW LEVEL SECURITY;
```

### Funções auxiliares (security definer)
```sql
-- Retorna account_id do usuário autenticado
CREATE OR REPLACE FUNCTION public.get_user_account_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT account_id FROM public.account_members
  WHERE user_id = _user_id AND is_active = true LIMIT 1;
$$;

-- Verifica se é client_admin da conta
CREATE OR REPLACE FUNCTION public.is_client_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_members
    WHERE user_id = _user_id AND role = 'client_admin' AND is_active = true
  );
$$;
```

### Políticas RLS
- **accounts**: SELECT se `owner_user_id = auth.uid()` OU membro ativo OU `admin_master`.
- **account_members**: SELECT/INSERT/UPDATE/DELETE se pertence à mesma conta como `client_admin` OU `admin_master`.
- **account_invites**: SELECT/INSERT/UPDATE se `client_admin` da mesma conta OU `admin_master`.

---

## 2. Provisioning: Criar Conta ao Aprovar Usuário

Quando o `admin_master` aprova um usuário com role `admin` (que passará a ser `client_admin`), o sistema automaticamente:
1. Cria um registro em `accounts` com o nome da empresa do perfil
2. Insere o usuário como `client_admin` em `account_members`

Isso será feito no `handleApprove` do `UsersPage.tsx`.

---

## 3. Integração com AuthContext

Modificar `AuthContext` para:
- Buscar `account_members` do usuário logado (account_id, role de membro, permissions)
- Expor `accountId`, `accountRole`, `accountPermissions` no contexto
- No `getSectionVisibility`, se o usuário tiver `accountPermissions`, aplicar como filtro adicional
- Novo helper `isClientAdmin()` para controlar acesso à página de gestão

---

## 4. UI: Página "Usuários da Empresa"

Nova página `/empresa/usuarios` acessível apenas por `client_admin` e `admin_master`:

**Funcionalidades:**
- Lista de membros da conta com role, status ativo/inativo, permissões
- Botão "Convidar Usuário" abre dialog com: nome, email, WhatsApp (opcional), role, toggles de permissões por módulo
- Ações por membro: editar permissões, desativar, remover
- Convites pendentes com opção de reenviar/cancelar
- Botão WhatsApp com mensagem pré-formatada contendo link de convite

**Componentes novos:**
- `src/pages/CompanyUsersPage.tsx` — página principal
- `src/components/company/InviteMemberDialog.tsx` — dialog de convite
- `src/components/company/MemberPermissionsEditor.tsx` — toggles de permissão

---

## 5. Fluxo de Convite (MVP)

1. `client_admin` preenche nome + email + role + permissões
2. Sistema insere em `account_invites` com `invite_token`
3. Exibe link de cadastro: `{origin}/login?invite={token}`
4. Botão WhatsApp com mensagem formatada contendo o link
5. Na tela de Login, detectar `?invite=token`:
   - Buscar convite válido (não expirado, status pendente)
   - Pré-preencher nome/email
   - Após signup + aprovação automática, inserir em `account_members` com as permissões definidas
6. Edge Function `accept-invite` (security definer) para processar a aceitação

---

## 6. Menu Lateral

No `AppSidebar.tsx`, adicionar item "Minha Empresa" (ícone `Building2`) visível quando `isClientAdmin()`:
```
{ title: "Minha Empresa", url: "/empresa/usuarios", icon: Building2, section: "empresa" }
```

No `getSectionVisibility`, account members com `permissions.can_manage_users = false` não verão este item.

---

## 7. Rota e Proteção

Em `App.tsx`, adicionar:
```tsx
<Route path="/empresa/usuarios" element={<RoleGate section="empresa"><CompanyUsersPage /></RoleGate>} />
```

---

## Resumo de Arquivos

| Ação | Arquivo |
|------|---------|
| Criar | `src/pages/CompanyUsersPage.tsx` |
| Criar | `src/components/company/InviteMemberDialog.tsx` |
| Criar | `src/components/company/MemberPermissionsEditor.tsx` |
| Criar | `supabase/functions/accept-invite/index.ts` |
| Editar | `src/contexts/AuthContext.tsx` (account context) |
| Editar | `src/components/AppSidebar.tsx` (menu item) |
| Editar | `src/data/menuRegistry.ts` (registry entry) |
| Editar | `src/App.tsx` (rota) |
| Editar | `src/pages/Login.tsx` (fluxo invite) |
| Editar | `src/pages/UsersPage.tsx` (auto-create account on approve) |
| Migração | 4 tabelas + 2 funções + RLS policies |

---

## Fases de Implementação

**Fase 1** — Modelo de dados: criar tabelas, funções, RLS (migração SQL)

**Fase 2** — AuthContext: integrar account_id/permissions no contexto de autenticação e visibilidade de menu

**Fase 3** — Página de gestão: CompanyUsersPage com listagem, convite, edição de permissões

**Fase 4** — Fluxo de convite: Login com token, edge function de aceitação, auto-provisioning

**Fase 5** — Integração: provisioning automático ao aprovar usuário, item no menu lateral

