
-- Inventory access passwords table (same structure as finance_access_passwords)
CREATE TABLE public.inventory_access_passwords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.inventory_access_passwords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own inventory password" ON public.inventory_access_passwords
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Also create for PC module
CREATE TABLE public.pc_inventory_access_passwords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.pc_inventory_access_passwords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own pc inventory password" ON public.pc_inventory_access_passwords
  FOR SELECT TO authenticated USING (user_id = auth.uid());
