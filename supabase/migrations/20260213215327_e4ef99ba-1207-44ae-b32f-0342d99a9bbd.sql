
-- ===== ENUM =====
CREATE TYPE public.app_role AS ENUM ('admin_master', 'admin', 'operador', 'financeiro');

-- ===== PROFILES =====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  initials TEXT NOT NULL DEFAULT '',
  company TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ===== USER ROLES (separate table per security guidelines) =====
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'operador',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ===== SECURITY DEFINER FUNCTION =====
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
$$;

-- ===== MACHINES =====
CREATE TABLE public.machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  serial_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  install_date DATE NOT NULL DEFAULT CURRENT_DATE,
  accessories TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

-- ===== TICKETS =====
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- ===== MAINTENANCES =====
CREATE TABLE public.maintenances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'agendada',
  scheduled_date DATE NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.maintenances ENABLE ROW LEVEL SECURITY;

-- ===== INVOICES =====
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  installment INTEGER NOT NULL,
  total_installments INTEGER NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'em_aberto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- ===== FINANCIAL SUMMARY =====
CREATE TABLE public.financial_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_contracted NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_open NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_overdue NUMERIC(12,2) NOT NULL DEFAULT 0,
  next_due_date DATE
);
ALTER TABLE public.financial_summary ENABLE ROW LEVEL SECURITY;

-- ===== RLS POLICIES =====

-- Profiles: users see own, admin_master sees all
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Admin master reads all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin_master'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Insert own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

-- User roles: users see own, admin_master manages all
CREATE POLICY "Users read own role" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin master reads all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin_master'));
CREATE POLICY "Admin master inserts roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin_master'));
CREATE POLICY "Admin master updates roles" ON public.user_roles FOR UPDATE USING (public.has_role(auth.uid(), 'admin_master'));
CREATE POLICY "Admin master deletes roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin_master'));

-- Machines: owner or admin_master
CREATE POLICY "Owner reads machines" ON public.machines FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Admin master reads all machines" ON public.machines FOR SELECT USING (public.has_role(auth.uid(), 'admin_master'));
CREATE POLICY "Admin master inserts machines" ON public.machines FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin_master'));

-- Tickets: owner or admin_master
CREATE POLICY "Owner reads tickets" ON public.tickets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin master reads all tickets" ON public.tickets FOR SELECT USING (public.has_role(auth.uid(), 'admin_master'));
CREATE POLICY "Owner creates tickets" ON public.tickets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner updates tickets" ON public.tickets FOR UPDATE USING (user_id = auth.uid());

-- Maintenances: owner or admin_master
CREATE POLICY "Owner reads maintenances" ON public.maintenances FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin master reads all maintenances" ON public.maintenances FOR SELECT USING (public.has_role(auth.uid(), 'admin_master'));
CREATE POLICY "Owner creates maintenances" ON public.maintenances FOR INSERT WITH CHECK (user_id = auth.uid());

-- Invoices: owner or admin_master, financeiro sees own
CREATE POLICY "Owner reads invoices" ON public.invoices FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin master reads all invoices" ON public.invoices FOR SELECT USING (public.has_role(auth.uid(), 'admin_master'));

-- Financial summary
CREATE POLICY "Owner reads summary" ON public.financial_summary FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin master reads all summaries" ON public.financial_summary FOR SELECT USING (public.has_role(auth.uid(), 'admin_master'));

-- ===== TRIGGER: auto-create profile on signup =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, initials)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), 2))
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'operador'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== TRIGGER: update updated_at =====
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
