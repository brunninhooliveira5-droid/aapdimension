
-- =============================================
-- Tabelas independentes de Fichas de Produção para Controle de Produção
-- =============================================

-- 1. pc_production_sheets
CREATE TABLE public.pc_production_sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_projeto TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'outro',
  cliente TEXT DEFAULT '',
  produto_modelo TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planejamento',
  data_inicio DATE,
  prazo_final DATE,
  observacoes TEXT DEFAULT '',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pc_production_sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage pc_production_sheets" ON public.pc_production_sheets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. pc_production_bom_items
CREATE TABLE public.pc_production_bom_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ficha_id UUID NOT NULL REFERENCES public.pc_production_sheets(id) ON DELETE CASCADE,
  item_nome TEXT NOT NULL DEFAULT '',
  categoria TEXT NOT NULL DEFAULT 'outro',
  unidade TEXT NOT NULL DEFAULT 'un',
  quantidade NUMERIC NOT NULL DEFAULT 0,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  fornecedor TEXT DEFAULT '',
  lead_time_dias INTEGER,
  observacao TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pc_production_bom_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage pc_production_bom_items" ON public.pc_production_bom_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. pc_production_process_steps
CREATE TABLE public.pc_production_process_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ficha_id UUID NOT NULL REFERENCES public.pc_production_sheets(id) ON DELETE CASCADE,
  etapa_nome TEXT NOT NULL DEFAULT '',
  setor_responsavel TEXT NOT NULL DEFAULT 'montagem',
  tempo_estimado_horas NUMERIC,
  prazo_dias INTEGER,
  data_alvo DATE,
  status TEXT NOT NULL DEFAULT 'todo',
  ordem INTEGER NOT NULL DEFAULT 0,
  observacao TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pc_production_process_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage pc_production_process_steps" ON public.pc_production_process_steps FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. pc_production_bom_templates
CREATE TABLE public.pc_production_bom_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  produto_modelo TEXT DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pc_production_bom_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage pc_production_bom_templates" ON public.pc_production_bom_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. pc_production_process_templates
CREATE TABLE public.pc_production_process_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  produto_modelo TEXT DEFAULT '',
  steps JSONB NOT NULL DEFAULT '[]',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pc_production_process_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage pc_production_process_templates" ON public.pc_production_process_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. pc_production_pdf_config
CREATE TABLE public.pc_production_pdf_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_nome TEXT DEFAULT 'Dimension',
  empresa_cnpj TEXT DEFAULT '',
  empresa_contato TEXT DEFAULT '',
  empresa_endereco TEXT DEFAULT '',
  logo_url TEXT,
  cor_principal TEXT DEFAULT '#1e40af',
  mostrar_cliente BOOLEAN DEFAULT true,
  mostrar_valores BOOLEAN DEFAULT true,
  mostrar_fornecedor BOOLEAN DEFAULT false,
  rodape_texto TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
ALTER TABLE public.pc_production_pdf_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage pc_production_pdf_config" ON public.pc_production_pdf_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
