

# Plano: Corrigir Recursão Infinita nas Políticas RLS

## Problema Raiz

A query `account_members` retorna **erro 500** com `"infinite recursion detected in policy for relation account_members"`. Isso impede:
- O AuthContext de carregar `accountMembership`
- A página "Minha Empresa" de funcionar
- O auto-provisioning de conta

**Causa**: Existem políticas RLS duplicadas e conflitantes nas tabelas `account_members` e `accounts`:

1. **`account_members`** tem 2 políticas SELECT:
   - `members_select` — usa `get_user_account_id(auth.uid())` (seguro, sem recursão)
   - `Members can view same account members` — faz subquery direta em `account_members` (causa recursão infinita)

2. **`account_members`** tem 2 políticas INSERT duplicadas

3. **`accounts`** tem política SELECT `Users can view own account` que faz subquery em `account_members` diretamente (recursão), além da política correta `accounts_select` que usa `get_user_account_id()`

4. **`accounts`** tem 2 políticas INSERT conflitantes (uma exige `admin_master`, outra permite `owner_user_id = auth.uid()`)

## Solução

Uma única migração SQL para:
1. Dropar as políticas duplicadas/problemáticas
2. Manter apenas as que usam funções `SECURITY DEFINER` (sem recursão)

### Políticas a remover:
- `account_members`: `"Members can view same account members"` (SELECT recursivo)
- `account_members`: `"Account owners can insert members"` (INSERT duplicado)
- `accounts`: `"Users can view own account"` (SELECT recursivo)
- `accounts`: `"Users can create their own account"` (INSERT conflitante — vamos integrar na política existente)

### Política a atualizar:
- `accounts`: `accounts_insert` — permitir tanto `admin_master` quanto `owner_user_id = auth.uid()` (para auto-provisioning funcionar)

## Arquivo Modificado

| Acao | Arquivo |
|------|---------|
| Migração SQL | Dropar 4 políticas duplicadas, atualizar 1 política INSERT |

Nenhuma mudança de código frontend necessária — o problema é exclusivamente nas RLS policies do banco.

