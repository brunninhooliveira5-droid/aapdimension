
-- Remover policies de somente leitura do financeiro
DROP POLICY "Financeiro reads finance categories" ON finance_categories;
DROP POLICY "Financeiro reads legal_cases" ON legal_cases;
DROP POLICY "Financeiro reads legal_collections" ON legal_collections;
DROP POLICY "Financeiro reads legal_contracts" ON legal_contracts;

-- Também atualizar finance_simulator_settings (Assistente de Decisão)
DROP POLICY "Financeiro reads simulator settings" ON finance_simulator_settings;

-- Criar policies de acesso total para financeiro
CREATE POLICY "Financeiro manages finance categories"
  ON finance_categories FOR ALL
  USING (has_role(auth.uid(), 'financeiro'))
  WITH CHECK (has_role(auth.uid(), 'financeiro'));

CREATE POLICY "Financeiro manages legal_cases"
  ON legal_cases FOR ALL
  USING (has_role(auth.uid(), 'financeiro'))
  WITH CHECK (has_role(auth.uid(), 'financeiro'));

CREATE POLICY "Financeiro manages legal_collections"
  ON legal_collections FOR ALL
  USING (has_role(auth.uid(), 'financeiro'))
  WITH CHECK (has_role(auth.uid(), 'financeiro'));

CREATE POLICY "Financeiro manages legal_contracts"
  ON legal_contracts FOR ALL
  USING (has_role(auth.uid(), 'financeiro'))
  WITH CHECK (has_role(auth.uid(), 'financeiro'));

CREATE POLICY "Financeiro manages simulator settings"
  ON finance_simulator_settings FOR ALL
  USING (has_role(auth.uid(), 'financeiro'))
  WITH CHECK (has_role(auth.uid(), 'financeiro'));
