## Integração Fichas de Produção com Estoque

O objetivo é transformar as fichas de produção em um sistema que vincula itens BOM diretamente ao estoque, permite "ativar" uma ficha para dar baixa automática, e gerar PDF com sinalização de itens em falta, e os itens que ja tem.

### 1. Adicionar coluna `inventory_item_id` na tabela de BOM items

Migração SQL para adicionar um campo opcional `inventory_item_id` (uuid, nullable, FK para inventory items) nas tabelas `production_bom_items` e `pc_production_bom_items`. Isso vincula cada item da BOM a um item real do estoque.

### 2. Adicionar campo de controle de ativação na ficha

Migração para adicionar `activated_at` (timestamp, nullable) nas tabelas `production_sheets` e `pc_production_sheets`. Quando preenchido, indica que a ficha já foi ativada e o estoque foi baixado.

### 3. Modificar BomEditor para selecionar itens do estoque

- Carregar a lista de itens do estoque (`inventoryItems`) via Supabase
- Adicionar um Select/Combobox "Vincular ao Estoque" em cada linha da BOM
- Ao selecionar um item do estoque, preencher automaticamente nome, custo unitário e unidade
- Salvar o `inventory_item_id` junto com o BOM item
- Manter a opção de item manual (sem vínculo)

### 4. Botão "Ativar Ficha / Dar Baixa no Estoque" no ProductionSheetDetail

- Novo botão na barra superior da ficha (visível apenas se `activated_at` é null)
- Ao clicar, exige confirmação (e opcionalmente a senha do estoque)
- Para cada BOM item com `inventory_item_id`:
  - Verifica se há quantidade suficiente no estoque
  - Registra uma movimentação de saída (`movement_type: 'saida'`, `reason: 'producao'`) na tabela de movimentos do estoque
  - Atualiza `current_quantity` do item no estoque
- Se algum item não tiver estoque suficiente, sinaliza quais estão em falta e pergunta se quer continuar (baixa parcial) ou cancelar
- Atualiza `activated_at` na ficha e muda status para `em_producao`

### 5. PDF com sinalização de itens em falta

Modificar `ProductionPdfExport` para:

- Buscar os dados de estoque atual para cada BOM item vinculado (`inventory_item_id`)
- Na tabela BOM do PDF, adicionar coluna "Estoque Atual"
- Itens com estoque insuficiente: linha em vermelho com texto "EM FALTA" e quantidade faltante
- Seção resumo no final: "Lista de Compras" com todos os itens em falta, quantidades necessárias vs disponíveis, e a diferença a ser comprada
- Título do PDF indica se é para uso interno ou para envio ao setor de compras

### Arquivos a modificar

- **Migração SQL**: adicionar `inventory_item_id` e `activated_at`
- `src/components/dimension/documentation/BomEditor.tsx`: Select de itens do estoque
- `src/components/dimension/documentation/ProductionSheetDetail.tsx`: botão ativar ficha
- `src/components/dimension/documentation/ProductionPdfExport.tsx`: sinalização de faltas e lista de compras
- `src/components/dimension/documentation/ProductionSheetsList.tsx`: exibir badge "Ativada" nos cards

### Fluxo do usuário

1. Cria ficha de produção para um produto (ex: "Máquina Orion")
2. Na aba BOM, seleciona itens do estoque (motor nema, parafusos, etc.) com quantidades
3. Gera PDF para verificar o que está em falta → envia para compras
4. Quando tudo estiver disponível, clica "Ativar Ficha" → baixa automática no estoque
5. Ficha muda para status "Em Produção"