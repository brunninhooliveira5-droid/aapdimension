
## Adicionar Filtro de Tipo de Item

**Objetivo**: Implementar um filtro de tipo para a lista de itens, permitindo visualizar apenas componentes específicos (materia_prima, componente, consumivel, ferramenta, produto_acabado).

**Estrutura do Componente**:
1. Adicionar estado `selectedType` para armazenar o tipo selecionado (vazio por padrão = todos)
2. Criar Select com opções baseadas no array `ITEM_TYPES` existente
3. Modificar lógica de filtro para incluir verificação de tipo junto com busca textual
4. Posicionar o filtro na seção de busca, ao lado ou abaixo do input de pesquisa

**Implementação**:
- State: `const [selectedType, setSelectedType] = useState("");`
- Filtro atualizado: verificar se `selectedType === ""` (todos) ou `item.item_type === selectedType`
- UI: Select dentro de CardContent, antes da tabela, com largura consistente
- Labels: "Todos os Tipos" como opção padrão

**Arquivos a Modificar**:
- `src/components/dimension/inventory/InventoryItemsList.tsx` (adicionar estado, filtro e Select)

**Resultado Visual**:
- Dropdown "Tipo de Item" na área de filtros
- Filtro funcional que combina com busca por nome/código
- Sem mudanças no banco de dados ou estrutura
