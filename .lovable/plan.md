
# Melhorias nas Sub-tarefas de Rotinas Recorrentes

## Problemas Identificados
1. A lista de setores esta fixa no codigo (hardcoded) em vez de usar os setores criados dinamicamente na Visao Geral
2. Sub-tarefas nao tem opcao de upload/download de arquivos

## Solucao

### 1. Setores Dinamicos
Substituir a lista fixa `sectorOptions` por uma consulta ao banco na tabela `dimension_production_cards`, que e onde os setores sao gerenciados na dashboard Visao Geral. O select de setor em cada sub-tarefa mostrara apenas os setores cadastrados.

### 2. Upload/Download de Arquivos nas Sub-tarefas
Criar uma tabela para armazenar arquivos vinculados aos templates de sub-tarefas das rotinas. Cada sub-tarefa do template podera ter arquivos anexados que serao copiados para as tarefas geradas quando a rotina for ativada.

**Nova tabela: `dimension_routine_template_files`**
- `id` (uuid PK)
- `routine_id` (uuid) - referencia a rotina
- `task_index` (integer) - indice da sub-tarefa no array de templates
- `file_name` (text) - nome original do arquivo
- `file_path` (text) - caminho no storage
- `file_size` (bigint)
- `mime_type` (text)
- `uploaded_by` (uuid)
- `created_at` (timestamptz)

RLS: Apenas `admin_master`.

### 3. Fluxo de Ativacao com Arquivos
Quando a rotina for ativada, os arquivos de cada sub-tarefa do template serao copiados para as tarefas criadas na tabela `dimension_task_files`, mantendo a associacao correta.

## Mudancas Tecnicas

### Banco de Dados (Migration)
- Criar tabela `dimension_routine_template_files` com RLS para `admin_master`

### `src/components/dimension/DimensionRoutines.tsx`
- Remover array fixo `sectorOptions`
- Adicionar `useEffect` para buscar setores de `dimension_production_cards`
- Adicionar em cada sub-tarefa do formulario:
  - Area de upload de arquivos com botao e lista de arquivos anexados
  - Botao de download e remocao para cada arquivo
- Na ativacao: copiar arquivos do template para as tarefas criadas via storage copy + insert em `dimension_task_files`
- Manter bucket existente `dimension-task-files` para os arquivos

## Fluxo do Usuario
1. Ao criar/editar uma rotina, cada sub-tarefa mostra um select com os setores reais do sistema
2. Em cada sub-tarefa, o usuario pode anexar arquivos (ex: manual, checklist)
3. Ao ativar a rotina, as tarefas sao criadas com os arquivos ja copiados e disponiveis para download
