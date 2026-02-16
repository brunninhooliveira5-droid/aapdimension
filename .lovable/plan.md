

## Adicionar Badge "FREE" e Botao "Solicitar PRO" no Sidebar

### O que sera feito

1. **Badge "FREE"** no perfil do sidebar para usuarios sem acesso PRO, com visual discreto (cinza/muted) para contrastar com o badge "PRO" dourado/primario.

2. **Botao "Solicitar PRO"** visivel apenas para usuarios sem acesso PRO, posicionado na secao ACESSO PRO do sidebar, permitindo que o usuario solicite a ativacao ao administrador.

3. **Notificacao ao Admin Master** via registro no banco de dados quando um usuario solicitar acesso PRO.

---

### Detalhes da implementacao

#### 1. Badge FREE no perfil (AppSidebar.tsx)

- Onde o badge PRO aparece hoje, adicionar um `else` para exibir badge "FREE" com estilo `bg-muted text-muted-foreground`
- Remover o icone Crown do avatar para usuarios FREE
- Manter a mesma estrutura visual, apenas trocando cores e texto

#### 2. Botao "Solicitar PRO" na secao ACESSO PRO (AppSidebar.tsx)

- Abaixo dos itens bloqueados (com cadeado), adicionar um botao pequeno "Solicitar Acesso PRO"
- Visivel apenas quando `!hasProAccess()`
- Ao clicar, abre um dialog de confirmacao simples
- Apos confirmar, registra a solicitacao no banco de dados e exibe toast de sucesso

#### 3. Tabela de solicitacoes (migracao SQL)

- Criar tabela `pro_access_requests` com colunas: `id`, `user_id`, `status` (pending/approved/rejected), `created_at`, `reviewed_at`, `reviewed_by`
- RLS: usuario pode inserir/ler suas proprias solicitacoes; admin_master pode ler todas

#### 4. Visibilidade das solicitacoes para Admin Master

- Na aba "Planos PRO" da pagina de usuarios (`ProPlanManager.tsx`), adicionar indicador visual (badge ou icone) nos usuarios que possuem solicitacao pendente

---

### Arquivos modificados

| Arquivo | Alteracao |
|---|---|
| `src/components/AppSidebar.tsx` | Badge FREE, botao solicitar PRO com dialog |
| `src/components/users/ProPlanManager.tsx` | Indicador de solicitacao pendente |
| `supabase/migrations/` | Nova tabela `pro_access_requests` com RLS |

