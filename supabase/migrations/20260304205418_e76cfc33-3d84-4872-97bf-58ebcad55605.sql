
-- Enum para roles de membros de conta
CREATE TYPE public.account_member_role AS ENUM ('client_admin', 'operator', 'client_finance', 'viewer');

-- Tabela accounts (empresas clientes)
CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Tabela account_members
CREATE TABLE public.account_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role account_member_role NOT NULL DEFAULT 'operator',
  permissions jsonb NOT NULL DEFAULT '{"maquinas":true,"suporte":true,"manutencao":true,"equipamentos":true,"pecas":true,"financeiro":false,"orcamento":true,"configuracoes":true,"arquivos":true,"controle_producao":false,"gestao_financeira":false,"can_manage_users":false}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(account_id, user_id)
);
ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;

-- Tabela account_invites
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

-- Função: retorna account_id do usuário
CREATE OR REPLACE FUNCTION public.get_user_account_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT account_id FROM public.account_members
  WHERE user_id = _user_id AND is_active = true LIMIT 1;
$$;

-- Função: verifica se é client_admin
CREATE OR REPLACE FUNCTION public.is_client_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_members
    WHERE user_id = _user_id AND role = 'client_admin' AND is_active = true
  );
$$;

-- RLS: accounts
CREATE POLICY "accounts_select" ON public.accounts FOR SELECT TO authenticated
USING (
  owner_user_id = auth.uid()
  OR id = public.get_user_account_id(auth.uid())
  OR public.has_role(auth.uid(), 'admin_master')
);
CREATE POLICY "accounts_insert" ON public.accounts FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin_master'));
CREATE POLICY "accounts_update" ON public.accounts FOR UPDATE TO authenticated
USING (
  owner_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin_master')
);

-- RLS: account_members
CREATE POLICY "members_select" ON public.account_members FOR SELECT TO authenticated
USING (
  account_id = public.get_user_account_id(auth.uid())
  OR public.has_role(auth.uid(), 'admin_master')
);
CREATE POLICY "members_insert" ON public.account_members FOR INSERT TO authenticated
WITH CHECK (
  (account_id = public.get_user_account_id(auth.uid()) AND public.is_client_admin(auth.uid()))
  OR public.has_role(auth.uid(), 'admin_master')
);
CREATE POLICY "members_update" ON public.account_members FOR UPDATE TO authenticated
USING (
  (account_id = public.get_user_account_id(auth.uid()) AND public.is_client_admin(auth.uid()))
  OR public.has_role(auth.uid(), 'admin_master')
);
CREATE POLICY "members_delete" ON public.account_members FOR DELETE TO authenticated
USING (
  (account_id = public.get_user_account_id(auth.uid()) AND public.is_client_admin(auth.uid()))
  OR public.has_role(auth.uid(), 'admin_master')
);

-- RLS: account_invites
CREATE POLICY "invites_select" ON public.account_invites FOR SELECT TO authenticated
USING (
  (account_id = public.get_user_account_id(auth.uid()) AND public.is_client_admin(auth.uid()))
  OR public.has_role(auth.uid(), 'admin_master')
);
CREATE POLICY "invites_insert" ON public.account_invites FOR INSERT TO authenticated
WITH CHECK (
  (account_id = public.get_user_account_id(auth.uid()) AND public.is_client_admin(auth.uid()))
  OR public.has_role(auth.uid(), 'admin_master')
);
CREATE POLICY "invites_update" ON public.account_invites FOR UPDATE TO authenticated
USING (
  (account_id = public.get_user_account_id(auth.uid()) AND public.is_client_admin(auth.uid()))
  OR public.has_role(auth.uid(), 'admin_master')
);
