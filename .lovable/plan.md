

## Plano: Geometria Unificada e Linhas Internas Contínuas no Corte Único

### Problema Atual

1. **Contorno externo** — as linhas do perímetro são segmentos individuais por peça/aresta, não formam uma geometria fechada e contínua.
2. **Linhas internas (corte compartilhado)** — quando duas linhas de corte se cruzam, elas se quebram no ponto de interseção ao invés de passar direto como linhas contínuas.

### Solução

Duas mudanças na função `computeSingleCutGeometry` em `src/lib/cutting-plan-pdf.ts`:

**A) Contorno externo como geometria fechada**
- Após o merge dos segmentos collineares, construir um **polígono fechado** a partir dos segmentos horizontais e verticais.
- Algoritmo: encontrar o canto superior-esquerdo, percorrer os segmentos conectando-os em ordem (sentido horário), gerando um path contínuo.
- O resultado será um conjunto de linhas que formam um retângulo unificado (ou forma em L/T se houver layout irregular), sem linhas soltas.

**B) Linhas internas contínuas (não quebrar em cruzamentos)**
- Atualmente, as linhas internas são geradas como segmentos curtos entre pares de peças adjacentes (limitadas ao overlap entre elas).
- Mudança: após coletar todas as linhas internas, **mergear segmentos collineares na mesma posição** — exatamente como já é feito para o contorno, mas aplicado às `cutLines`.
- Linhas verticais na mesma posição X serão unidas em uma só linha contínua que vai do topo ao fundo do grupo de peças.
- Linhas horizontais na mesma posição Y serão unidas da mesma forma.
- Isso faz com que uma linha de corte passe direto mesmo quando cruza com outra perpendicular — sem quebras.

### Mudanças Técnicas

**Arquivo:** `src/lib/cutting-plan-pdf.ts`

1. Na função `computeSingleCutGeometry`:
   - Separar as `cutLines` em horizontais e verticais (como `Segment[]`).
   - Aplicar `mergeCollinearSegments` nelas com tolerância generosa.
   - Converter de volta para `CutLine[]`.

2. Para o contorno externo:
   - Após o merge, ordenar os segmentos para formar um path conectado (polígono).
   - Alternativamente, calcular o **bounding box** do grupo de peças (com offset de halfKerf) e desenhar como um retângulo único quando todas as peças formam um bloco retangular contínuo. Para layouts não-retangulares, manter os segmentos merged mas garantir que se conectem nos cantos.

3. Preview no `SheetCuttingTab.tsx` — aplicar a mesma lógica de merge nas linhas vermelhas do preview para consistência visual.

