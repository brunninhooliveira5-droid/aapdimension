
-- 1) Fichas de Produção
CREATE TABLE public.production_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_projeto text NOT NULL,
  tipo text NOT NULL DEFAULT 'outro',
  cliente text DEFAULT '',
  produto_modelo text DEFAULT '',
  status text NOT NULL DEFAULT 'planejamento',
  data_inicio date DEFAULT NULL,
  prazo_final date DEFAULT NULL,
  observacoes text DEFAULT '',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.production_sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin master manages production_sheets" ON public.production_sheets FOR ALL USING (has_role(auth.uid(), 'admin_master'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));
CREATE TRIGGER update_production_sheets_updated_at BEFORE UPDATE ON public.production_sheets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2) BOM Items
CREATE TABLE public.production_bom_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id uuid NOT NULL REFERENCES public.production_sheets(id) ON DELETE CASCADE,
  item_nome text NOT NULL DEFAULT '',
  categoria text NOT NULL DEFAULT 'outro',
  unidade text NOT NULL DEFAULT 'un',
  quantidade numeric NOT NULL DEFAULT 0,
  valor_unitario numeric NOT NULL DEFAULT 0,
  fornecedor text DEFAULT '',
  lead_time_dias integer DEFAULT NULL,
  observacao text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.production_bom_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin master manages production_bom_items" ON public.production_bom_items FOR ALL USING (has_role(auth.uid(), 'admin_master'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));
CREATE TRIGGER update_production_bom_items_updated_at BEFORE UPDATE ON public.production_bom_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3) Process Steps
CREATE TABLE public.production_process_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id uuid NOT NULL REFERENCES public.production_sheets(id) ON DELETE CASCADE,
  etapa_nome text NOT NULL DEFAULT '',
  setor_responsavel text NOT NULL DEFAULT 'montagem',
  tempo_estimado_horas numeric DEFAULT NULL,
  prazo_dias integer DEFAULT NULL,
  data_alvo date DEFAULT NULL,
  status text NOT NULL DEFAULT 'todo',
  ordem integer NOT NULL DEFAULT 0,
  observacao text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.production_process_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin master manages production_process_steps" ON public.production_process_steps FOR ALL USING (has_role(auth.uid(), 'admin_master'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));
CREATE TRIGGER update_production_process_steps_updated_at BEFORE UPDATE ON public.production_process_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4) BOM Templates
CREATE TABLE public.production_bom_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  produto_modelo text DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.production_bom_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin master manages production_bom_templates" ON public.production_bom_templates FOR ALL USING (has_role(auth.uid(), 'admin_master'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

-- 5) Process Templates
CREATE TABLE public.production_process_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  produto_modelo text DEFAULT '',
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.production_process_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin master manages production_process_templates" ON public.production_process_templates FOR ALL USING (has_role(auth.uid(), 'admin_master'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

-- 6) PDF Config
CREATE TABLE public.production_pdf_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_nome text DEFAULT 'Dimension',
  empresa_cnpj text DEFAULT '',
  empresa_contato text DEFAULT '',
  empresa_endereco text DEFAULT '',
  logo_url text DEFAULT NULL,
  cor_principal text DEFAULT '#1e40af',
  mostrar_cliente boolean DEFAULT true,
  mostrar_valores boolean DEFAULT true,
  mostrar_fornecedor boolean DEFAULT false,
  rodape_texto text DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid DEFAULT NULL
);
ALTER TABLE public.production_pdf_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin master manages production_pdf_config" ON public.production_pdf_config FOR ALL USING (has_role(auth.uid(), 'admin_master'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));
