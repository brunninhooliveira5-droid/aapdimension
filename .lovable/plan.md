

## Plano: Corrigir Distorção do Contorno Externo no Corte Único

### Problema
A função `buildConnectedContour` tenta construir um polígono fechado ordenando pontos por ângulo a partir do centróide. Isso **só funciona para formas convexas**. Quando as peças formam layouts em L, T ou grades, o algoritmo conecta pontos errados criando linhas diagonais que cruzam o interior — exatamente o que aparece na imagem.

### Solução
**Eliminar o `buildConnectedContour` completamente.** Os segmentos H e V do contorno já estão corretos após o merge. Basta convertê-los diretamente em `CutLine[]` sem tentar formar um polígono.

### Mudança Técnica

**Arquivo:** `src/lib/cutting-plan-pdf.ts`

1. Na função `computeSingleCutGeometry` (linha ~497):
   - Remover a chamada a `buildConnectedContour(mergedH, mergedV)`
   - Converter os segmentos merged diretamente em linhas:
     ```
     contourLines = mergedH → { x1: start, y1: pos, x2: end, y2: pos }
                  + mergedV → { x1: pos, y1: start, x2: pos, y2: end }
     ```

2. Remover a função `buildConnectedContour` (linhas 518-578) — não é mais necessária.

Resultado: contorno externo será composto apenas de linhas horizontais e verticais corretas, sem diagonais.

