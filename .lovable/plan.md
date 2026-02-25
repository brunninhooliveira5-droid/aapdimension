
# Mover Propostas para dentro do Portal Dimension

## Resumo
Mover a aba "Propostas" do menu lateral principal para dentro do Portal Dimension como uma nova sub-aba, mantendo 100% da funcionalidade atual.

## Alteracoes

### 1. `src/pages/DimensionPortal.tsx`
- Importar o componente `ProposalsPage` (ou seus sub-componentes diretamente)
- Adicionar nova entrada no array `tabs`: `{ value: "propostas", label: "Propostas", icon: FileText }`
- Adicionar `<TabsContent value="propostas">` renderizando o conteudo de Propostas
- Importar `useAuth` para verificar se o usuario e admin_master e mostrar a aba "Maquinas (Specs)" condicionalmente dentro das Propostas

### 2. `src/components/AppSidebar.tsx`
- Remover a linha `{ title: "Propostas", url: "/propostas", icon: FileText, section: "propostas" }` do array `basicMenuItems`

### 3. `src/App.tsx`
- Remover a rota `/propostas` (linha 76)
- Remover o import de `ProposalsPage`
- Adicionar redirect: `/propostas` -> `/dimension` para evitar links quebrados

### 4. Sem alteracoes no banco de dados
Nenhuma tabela ou politica precisa ser modificada. Toda a logica de propostas continua funcionando igual.

## Detalhes tecnicos

- Os componentes `ProposalCreator`, `ProposalHistory`, `ProposalPdfConfiguration` e `MachineSpecsCatalog` sao independentes da rota -- funcionam em qualquer lugar onde forem montados
- A visibilidade sera automaticamente restrita a `admin_master` pois o Portal Dimension ja possui essa restricao via `RoleGate` e permissoes no `AuthContext`
- O conteudo de Propostas sera renderizado com suas proprias sub-tabs internas (Nova Proposta, Historico, Config. PDF, Maquinas Specs) dentro da tab "Propostas" do portal
