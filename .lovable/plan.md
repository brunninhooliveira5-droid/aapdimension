

## Plan: Logs de Calibração de Estoque

### Objetivo
Criar um sistema de logs dedicado para calibrações de estoque, com uma nova aba "Logs" no controle de estoque para consultar o historico completo de calibrações (item, motivo, data, usuario, quantidade anterior/nova).

### 1. Nova tabela no banco de dados

Criar tabelas `inventory_calibration_logs` e `pc_inventory_calibration_logs` (para ambos os modulos) com as colunas:
- `id`, `item_id` (ref ao item), `old_quantity`, `new_quantity`, `difference`, `reason`, `calibrated_by` (user id), `created_at`
- RLS: leitura e inserção para usuarios autenticados

### 2. Atualizar ModuleContext

Adicionar `inventoryCalibrationLogs` ao mapeamento de tabelas em `dimensionConfig` e `productionControlConfig`.

### 3. Registrar log na calibração

Em `InventoryItemsList.tsx`, dentro de `executeCalibrate`, apos salvar a movimentacao, inserir tambem na tabela de logs com: item_id, old_quantity, new_quantity, difference, reason, calibrated_by.

### 4. Novo componente `InventoryCalibrationLogs.tsx`

Tabela consultavel com:
- Lista cronologica de todas as calibrações
- Colunas: Data, Item (nome + codigo), Qtd Anterior, Qtd Nova, Diferença, Motivo, Responsavel
- Filtro por item ou busca por texto

### 5. Nova aba no `InventoryControl.tsx`

Adicionar aba "Logs" (icone `FileText`) entre "Inventario" e "Configurações", renderizando o novo componente.

