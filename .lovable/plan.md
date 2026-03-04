

## Plano: Controle de Acesso por Setor de Produção

O administrador poderá definir quais setores de produção cada sub-usuário pode acessar, diretamente na tela de permissões do membro.

### Como funciona

1. **Nova tabela `pc_member_sector_access`** -- armazena quais setores cada membro pode acessar
   - `id`, `account_id`, `user_id`, `sector_key` (referência ao key do card de produção), `created_at`
   - RLS: apenas `client_admin` da mesma conta pode ler/escrever; membros podem ler seus próprios registros

2. **Lógica de acesso** -- Se não houver registros para um usuário, ele vê **todos** os setores (comportamento padrão atual). Se houver pelo menos 1 registro, ele só vê os setores listados. O admin sempre vê todos.

3. **UI de configuração no editor de permissões** -- Ao editar permissões de um membro em "Minha Empresa", adicionar uma seção "Setores de Produção" abaixo das permissões de módulos. Essa seção busca os setores existentes (`pc_production_cards`) e exibe checkboxes/switches para cada setor. O admin marca quais setores o usuário pode ver.

4. **Filtragem nos componentes** -- `ProductionCards.tsx` e `SectorKanban` filtram os cards exibidos baseado nos setores permitidos para o usuário logado (ou personificado).

### Alterações

| Arquivo | Mudança |
|---|---|
| **Migration SQL** | Criar tabela `pc_member_sector_access` com RLS |
| **MemberPermissionsEditor.tsx** | Adicionar seção de seleção de setores com switches por setor |
| **CompanyUsersPage.tsx** | Passar `accountId` ao editor e salvar/carregar setores permitidos |
| **ProductionCards.tsx** | Filtrar cards exibidos baseado nos setores permitidos do usuário |
| **DimensionOverview.tsx** | Filtrar setores no kanban baseado no acesso |

### Fluxo do admin
1. Vai em "Minha Empresa" > clica no lápis de um sub-usuário
2. Além dos switches de módulos, vê a lista de setores de produção
3. Marca/desmarca quais setores o usuário pode acessar
4. Salva -- o sub-usuário só verá os setores permitidos

