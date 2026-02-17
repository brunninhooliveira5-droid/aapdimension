

# Acesso Total do Financeiro ao Modulo Financeiro

## Resumo
Atualmente, o perfil "financeiro" tem acesso limitado em algumas areas do modulo de Gestao Financeira. O objetivo e igualar suas permissoes as do Admin Master dentro do modulo financeiro.

## Areas que precisam de ajuste

### 1. Juridico (Contratos, Processos, Cobrancas)
- Hoje: financeiro so pode visualizar
- Depois: financeiro podera criar, editar e excluir registros

### 2. Categorias Financeiras
- Hoje: financeiro so pode visualizar
- Depois: financeiro podera criar, editar e desativar categorias

### 3. Assistente de Decisao (Configuracoes do Simulador)
- Hoje: somente admin_master pode alterar configuracoes (reserva minima, limite de comprometimento, etc.)
- Depois: financeiro tambem podera ajustar essas configuracoes

## Detalhes Tecnicos

### Alteracoes no Banco de Dados (RLS Policies)
Atualizacao de 4 tabelas para dar permissao total ao perfil `financeiro`:

| Tabela | Permissao Atual | Nova Permissao |
|--------|----------------|----------------|
| `finance_categories` | Somente leitura | Leitura + Escrita + Exclusao |
| `legal_cases` | Somente leitura | Leitura + Escrita + Exclusao |
| `legal_collections` | Somente leitura | Leitura + Escrita + Exclusao |
| `legal_contracts` | Somente leitura | Leitura + Escrita + Exclusao |

Para cada tabela, a policy de SELECT existente sera substituida por uma policy ALL (acesso completo).

### Alteracoes no Frontend (5 arquivos)

1. **`src/components/financeiro/LegalModule.tsx`** (3 pontos)
   - `ContractsTab`: `canEdit = user?.role === "admin_master"` -> incluir `financeiro`
   - `CasesTab`: idem
   - `CollectionsTab`: idem

2. **`src/components/financeiro/FinanceCategories.tsx`** (1 ponto)
   - `canEdit = user?.role === "admin_master"` -> incluir `financeiro`

3. **`src/components/financeiro/DecisionAssistant.tsx`** (1 ponto)
   - `isAdmin = user?.role === "admin_master"` -> incluir `financeiro`

### Migracao SQL

```text
-- Remover policies de somente leitura do financeiro
DROP POLICY "Financeiro reads finance categories" ON finance_categories;
DROP POLICY "Financeiro reads legal_cases" ON legal_cases;
DROP POLICY "Financeiro reads legal_collections" ON legal_collections;
DROP POLICY "Financeiro reads legal_contracts" ON legal_contracts;

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
```

### Componentes ja com acesso correto (nao precisam de alteracao)
- Contas a Pagar
- Contas a Receber
- Despesas Fixas
- Dividas (Emprestimos e Inadimplencia)
- Dashboard, Fluxo de Caixa, Relatorios (somente leitura por natureza)

