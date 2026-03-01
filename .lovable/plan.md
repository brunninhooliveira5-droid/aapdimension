
# Rotinas Recorrentes - Atividades Automatizadas por Gatilho

## Conceito

Criar um sistema de **modelos de rotinas recorrentes** (templates) na aba "Rotinas" do Portal Dimension. Cada rotina define um conjunto de tarefas que devem ser criadas automaticamente quando a rotina e ativada. Por exemplo, ao vender uma maquina, o admin ativa a rotina "Venda de Maquina" e o sistema gera automaticamente tarefas pre-definidas para cada setor (montagem, eletrica, expedição, etc.).

## Funcionalidades

1. **Cadastro de Modelos de Rotina** -- CRUD completo para templates de rotinas com:
   - Nome da rotina (ex: "Venda de Maquina", "Manutencao Preventiva")
   - Descricao
   - Lista de sub-tarefas, cada uma com: titulo, setor destino, prioridade, responsavel, prazo relativo (ex: +5 dias apos ativacao)

2. **Ativacao de Rotina** -- Botao "Ativar" que:
   - Solicita informacoes contextuais (ex: nome do cliente, modelo da maquina)
   - Cria automaticamente todas as sub-tarefas na tabela `dimension_tasks` ja com o setor atribuido
   - Calcula datas de vencimento baseadas no prazo relativo de cada sub-tarefa
   - Registra um log de ativacao para historico

3. **Historico de Ativacoes** -- Lista de rotinas ja ativadas com data e contexto

## Estrutura do Banco de Dados

Duas novas tabelas:

```text
dimension_routines
+-------------------+----------+------------------------------------+
| Coluna            | Tipo     | Descricao                          |
+-------------------+----------+------------------------------------+
| id                | uuid PK  | Identificador                      |
| title             | text     | Nome da rotina                     |
| description       | text     | Descricao                          |
| is_active         | boolean  | Se o template esta ativo           |
| tasks_template    | jsonb    | Array de sub-tarefas modelo        |
| created_by        | uuid     | Criador                            |
| created_at        | timestamptz | Data criacao                    |
| updated_at        | timestamptz | Data atualizacao                |
+-------------------+----------+------------------------------------+

dimension_routine_activations
+-------------------+----------+------------------------------------+
| Coluna            | Tipo     | Descricao                          |
+-------------------+----------+------------------------------------+
| id                | uuid PK  | Identificador                      |
| routine_id        | uuid FK  | Referencia a rotina                |
| context_data      | jsonb    | Dados contextuais (cliente, etc.)  |
| tasks_created     | integer  | Qtd de tarefas geradas             |
| activated_by      | uuid     | Quem ativou                        |
| activated_at      | timestamptz | Data da ativacao                |
+-------------------+----------+------------------------------------+
```

O campo `tasks_template` armazena um JSON como:
```json
[
  { "title": "Separar pecas", "sector": "montagem", "priority": "alta", "responsible": "", "days_offset": 0 },
  { "title": "Montar estrutura", "sector": "montagem", "priority": "alta", "responsible": "", "days_offset": 2 },
  { "title": "Instalacao eletrica", "sector": "eletrica", "priority": "alta", "responsible": "", "days_offset": 5 }
]
```

RLS: Apenas `admin_master` gerencia ambas as tabelas.

## Implementacao (Componente)

**`src/components/dimension/DimensionRoutines.tsx`** -- Substituir o placeholder atual com:

- **Listagem de rotinas** cadastradas em cards com nome, descricao e quantidade de sub-tarefas
- **Dialog de cadastro/edicao** com formulario para titulo, descricao e lista dinamica de sub-tarefas (adicionar/remover linhas com titulo, setor, prioridade, prazo relativo)
- **Dialog de ativacao** que mostra as tarefas que serao criadas, permite preencher dados de contexto (campo texto livre, ex: "Cliente: Joao - Maquina: CNC X") e confirma a geracao
- **Aba de historico** mostrando ativacoes anteriores com data, rotina usada e quantidade de tarefas geradas

## Fluxo do Usuario

1. Admin acessa aba "Rotinas" e cadastra um template (ex: "Venda de Maquina")
2. Adiciona sub-tarefas com setor, prioridade e prazo relativo
3. Quando ocorre uma venda, clica em "Ativar" no template
4. Preenche contexto (nome do cliente, modelo) e confirma
5. Sistema cria todas as tarefas em `dimension_tasks` com o setor ja atribuido
6. Tarefas aparecem automaticamente nos Kanbans dos respectivos setores

## Arquivos Modificados

- `supabase/migrations/` -- Nova migration para as duas tabelas + RLS
- `src/integrations/supabase/types.ts` -- Atualizado automaticamente
- `src/components/dimension/DimensionRoutines.tsx` -- Componente completo substituindo o placeholder
