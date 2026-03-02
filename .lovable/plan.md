

## Personalizar Cor de Fundo do Sistema

Adicionar uma seção "Aparencia" na pagina de Configuracoes onde o usuario pode, alem de alternar entre modo claro/escuro, escolher uma cor de fundo personalizada.

### O que sera feito

1. **Nova secao "Aparencia" na pagina de Configuracoes**
   - Card com icone Palette, contendo o toggle claro/escuro (movido do header ou duplicado aqui) e um seletor de cor de fundo
   - Opcoes de cores pre-definidas (paleta com ~8-10 cores populares: azul escuro padrao, cinza, azul marinho, verde escuro, roxo escuro, marrom, etc.) exibidas como circulos clicaveis
   - Input de cor customizada (campo hex + color picker nativo do navegador) para liberdade total
   - Botao "Restaurar padrao" para voltar a cor original do tema

2. **Logica de aplicacao da cor**
   - Ao selecionar uma cor, o sistema sobrescreve a variavel CSS `--background` no elemento `<html>` via inline style
   - A preferencia e salva no `localStorage` (chave `custom-bg-color`)
   - No carregamento da pagina, o `ThemeToggle` (ou um novo hook `useCustomTheme`) aplica a cor salva
   - Quando o usuario troca entre claro/escuro, a cor customizada e mantida (ela substitui apenas o fundo, as outras variaveis do tema continuam funcionando)

3. **Arquivos modificados**
   - `src/pages/SettingsPage.tsx` — nova secao "Aparencia" com seletor de cores e toggle de tema
   - `src/components/ThemeToggle.tsx` — integrar leitura da cor customizada do localStorage ao aplicar o tema
   - `src/index.css` — nenhuma alteracao necessaria (as cores serao aplicadas via style inline no root)

### Detalhes tecnicos

- As cores pre-definidas serao um array de objetos `{ name: string, value: string }` renderizados como circulos com borda de selecao
- O color picker usara `<input type="color">` nativo, sem dependencias extras
- A cor sera aplicada com `document.documentElement.style.setProperty('--background', hslFromHex(cor))` convertendo hex para HSL para manter compatibilidade com o sistema de variaveis CSS existente
- Ao clicar "Restaurar padrao", remove-se o inline style e o localStorage, voltando ao valor definido no CSS

