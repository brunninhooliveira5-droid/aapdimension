

# Comandos Iniciais e Finais do Programa CNC

## Resumo

Adicionar ao Gerador de Percurso uma configuração para Start G-code e End G-code personalizados, com presets por pós-processador, checkbox para ativar/desativar, e visualização separada no G-code gerado.

## Arquitetura

### 1. Tipos e Dados (`src/lib/toolpath-engine.ts`)

- Criar interface `CustomGcodeConfig` com campos: `useCustomStartEnd: boolean`, `startGcode: string`, `endGcode: string`
- Criar `DEFAULT_START_GCODE` e `DEFAULT_END_GCODE` como `Record<PostProcessor, string>` com presets para cada pós-processador (Mach3, GRBL, DDCS, LinuxCNC) baseados nos HEADERS/FOOTERS atuais, mas em formato multi-linha editável
- Adicionar `customGcode?: CustomGcodeConfig` ao `ToolpathProject`
- Modificar `generateGcode()` para aceitar um parâmetro opcional `customGcode` e, quando ativo, usar os comandos personalizados no lugar dos HEADERS/FOOTERS padrão
- Separar visualmente no G-code gerado com comentários: `(=== INÍCIO DO PROGRAMA ===)`, `(=== OPERAÇÕES ===)`, `(=== FIM DO PROGRAMA ===)`

### 2. Novo Componente (`src/components/toolpath/StartEndGcodePanel.tsx`)

Painel com:
- **Checkbox** "Usar comandos iniciais e finais personalizados"
- **Select** para carregar preset do pós-processador selecionado
- **Textarea** "Start G-code" com placeholder e exemplos
- **Textarea** "End G-code" com placeholder e exemplos
- **Botões de preset**: Mach3, GRBL, DDCS, LinuxCNC (preenchem automaticamente)
- **Select de nível**: "Projeto Atual", "Template", "Global" (salva em localStorage)
- Prioridade: Projeto > Template > Global

### 3. Integração na Página (`src/pages/ToolpathGeneratorPage.tsx`)

- Adicionar estado `customGcode` com valores padrão
- Criar nova aba no painel inferior chamada "Início/Fim" (ao lado de operations, simulation, gcode)
- Passar `customGcode` para `GcodePanel` e para `generateGcode()`

### 4. Modificação do GcodePanel (`src/components/toolpath/GcodePanel.tsx`)

- Receber `customGcode` como prop
- Passar para `generateGcode()` na geração
- No preview do G-code, aplicar highlighting visual (cores distintas para blocos início/operações/fim) usando spans com classes CSS

### 5. Persistência

- **Global**: `localStorage` key `dimension-gcode-start-end-global`
- **Template**: incluir `customGcode` no objeto `MachiningTemplate` ao salvar
- **Projeto**: estado local do componente

## Presets Padrão

```text
GRBL Start:    $H / G90 G21 G17 / M03 S12000 / G4 P2
GRBL End:      M05 / G0 Z10 / G0 X0 Y0 / M2

Mach3 Start:   % / O0001 / G90 G94 G21 / G17 / M03 S12000 / G4 P2
Mach3 End:     M05 / G28 G91 Z0 / G28 X0 Y0 / M30 / %

DDCS Start:    % / G90 G21 G17 / M03 S12000 / G4 P2
DDCS End:      M05 / G0 Z10 / G0 X0 Y0 / M30 / %

LinuxCNC Start: % / G90 G94 G21 G17 / G40 G49 G80 / M03 S12000 / G4 P2
LinuxCNC End:   M05 / G53 G0 Z0 / G53 G0 X0 Y0 / M2 / %
```

## Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/toolpath-engine.ts` | Interface `CustomGcodeConfig`, presets, modificar `generateGcode()` |
| `src/components/toolpath/StartEndGcodePanel.tsx` | **Novo** - UI de configuração |
| `src/components/toolpath/GcodePanel.tsx` | Receber e usar `customGcode` |
| `src/pages/ToolpathGeneratorPage.tsx` | Estado, nova aba "Início/Fim", integração |

