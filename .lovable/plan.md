

## Modificar Template BOM para selecionar itens do estoque com filtro por tipo

### Objetivo
No dialog de "Novo/Editar Template BOM", substituir o input de texto "Item" por um fluxo com dois selects:
1. **Select de Tipo** (filtro): materia_prima, componente, consumivel, ferramenta, produto_acabado
2. **Select de Item** (do estoque): mostra apenas itens do tipo selecionado

Quando o usuario selecionar um item do estoque, o nome e o custo unitario sao preenchidos automaticamente.

### Implementacao

**Arquivo**: `src/components/dimension/documentation/ProductionTemplatesManager.tsx`

1. **Carregar itens do estoque** - useEffect para buscar `inventoryItems` (id, name, internal_code, item_type, unit_cost) da tabela `tables.inventoryItems`

2. **Adicionar campo `item_type` em cada BOM item** - ao adicionar item, incluir `item_type: ""` e `inventory_item_id: ""`

3. **Substituir o input de texto por dois selects por linha**:
   - Select "Tipo" com as opcoes: Materia-prima, Componente, Consumivel, Ferramenta, Produto Acabado
   - Select "Item" que filtra `inventoryItems` pelo `item_type` selecionado
   - Ao selecionar um item, preencher `item_nome` e `valor_unitario` automaticamente

4. **Manter compatibilidade** - os dados salvos no JSON continuam no mesmo formato, apenas com campos extras (`item_type`, `inventory_item_id`)

### Fluxo visual por linha de item
```text
[Select Tipo ▼] [Select Item (filtrado) ▼] [Qtd] [R$] [🗑]
```

### Detalhes tecnicos
- Usar `__none__` como valor padrao dos selects (conforme padrao do projeto)
- Filtro: `inventoryItems.filter(i => i.item_type === selectedType)`
- Auto-fill ao selecionar item: `item_nome = item.name`, `valor_unitario = item.unit_cost`, `inventory_item_id = item.id`
- Carregar itens apenas quando o dialog BOM abre (ou no mount)

