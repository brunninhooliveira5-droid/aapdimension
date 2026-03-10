

## Plano: QR Code PIX com Valor Embutido no PDF de Orçamento

### Situação Atual
- O PDF de orçamento de corte usa uma **imagem estática** de QR Code (upload manual nas configurações). Ao escanear, não há valor nem chave PIX codificados — é apenas uma imagem.
- O PDF de comprovantes já gera QR dinâmico via biblioteca `qrcode`, mas codifica apenas a chave PIX (sem valor).

### O Que Será Feito
Gerar o QR Code PIX **dinamicamente** no padrão BRCode/EMV (padrão oficial do Banco Central), incluindo o valor total do orçamento. Quando o cliente escanear, o app do banco já mostrará o valor preenchido.

### Requisitos
Para gerar um QR Code PIX válido com valor, precisamos de dados que hoje não existem na configuração do orçamento de corte:
- **Chave PIX** (CPF, CNPJ, email, telefone ou chave aleatória)
- **Nome do beneficiário** (quem recebe)
- **Cidade do beneficiário**

### Mudanças Planejadas

1. **Adicionar campos PIX na configuração do PDF de orçamento** (`PdfConfiguration.tsx` / tabela `cutting_quote_pdf_settings`):
   - `pix_key` (string) — chave PIX
   - `pix_beneficiary` (string) — nome do favorecido
   - `pix_city` (string) — cidade

2. **Criar função geradora de payload BRCode** (`src/lib/pix-payload.ts`):
   - Monta o payload EMV com merchant info, chave, valor e CRC16
   - Segue o padrão oficial do PIX estático

3. **Atualizar `cutting-pdf.ts`**:
   - Em vez de usar a imagem estática, gerar QR Code dinâmico via `qrcode` library (já instalada) com o payload PIX contendo o `totalPrice`
   - Manter fallback para imagem estática caso não haja chave PIX configurada
   - Exibir chave e valor ao lado do QR no PDF

4. **Migração de banco**: Adicionar colunas `pix_key`, `pix_beneficiary`, `pix_city` na tabela `cutting_quote_pdf_settings`

### Resultado
Ao escanear o QR Code no PDF, o app bancário abrirá com valor, chave e nome do favorecido já preenchidos.

