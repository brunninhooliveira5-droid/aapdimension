

## Plano: Controle de Sub-Usuários pelo Admin Master

### Resumo

O Admin Master podera: (1) ver quantos sub-usuarios cada perfil/conta tem, (2) editar o limite `max_members` de cada conta, e (3) personificar sub-usuarios diretamente da tabela de usuarios.

### Alteracoes

#### 1. Exibir contagem de sub-usuarios na tabela de usuarios (UsersPage)

Na tabela de usuarios aprovados (perfil `admin`), adicionar uma coluna **"Sub-Usuários"** que mostra `X / Y` (atual / limite). Para isso:
- Ao carregar usuarios, buscar todas as `accounts` com `account_members` agrupados
- Para usuarios com role `admin`, exibir a contagem de membros (excluindo client_admin) e o `max_members`

#### 2. Editar limite de sub-usuarios (max_members)

Ao clicar na contagem ou em um botao de edicao na linha do usuario admin:
- Abrir um dialog simples com um input numerico para alterar `max_members`
- Salvar via `supabase.from("accounts").update({ max_members }).eq("owner_user_id", userId)`
- Somente visivel/acessivel pelo admin_master

#### 3. Personificar sub-usuarios

O admin master ja consegue personificar qualquer usuario via `start_impersonation` (que usa a RPC que verifica `admin_master`). O que falta e:
- Buscar os sub-usuarios (account_members) de cada conta
- Permitir expandir a linha de um usuario `admin` para ver seus sub-usuarios
- Adicionar botao de personificacao nos sub-usuarios listados

### Arquivos Modificados

| Arquivo | Mudanca |
|---|---|
| **UsersPage.tsx** | Adicionar coluna "Sub-Usuários" com contagem; botao para editar max_members; linhas expandiveis mostrando sub-usuarios com botao de personificacao |

### Fluxo

1. Admin Master abre "Gestao de Usuarios"
2. Na tabela de aprovados, usuarios com role `admin` mostram coluna "Sub-Usuários: 2/3"
3. Clicando no icone de edicao, abre dialog para alterar o limite
4. Clicando em expandir (chevron), mostra lista dos sub-usuarios daquele admin
5. Cada sub-usuario tem botao de personificacao (mesmo fluxo existente)

