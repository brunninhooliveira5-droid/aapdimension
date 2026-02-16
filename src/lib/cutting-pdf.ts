/**
 * ══════════════════════════════════════════════════════
 * MÓDULO DE GERAÇÃO DE PDF — ORÇAMENTO DE CORTE CNC
 * ══════════════════════════════════════════════════════
 *
 * FLUXO DE GERAÇÃO:
 *   1. Coleta dos dados do orçamento (QuoteCalculationResult + inputs do usuário)
 *   2. Validação dos dados obrigatórios
 *   3. Montagem do layout (cabeçalho → corpo → tabela → rodapé)
 *   4. Inserção dos valores calculados
 *   5. Geração do arquivo (Blob)
 *   6. Download via link programático
 *
 * INDEPENDÊNCIA:
 *   Este módulo NÃO contém lógica de cálculo.
 *   Recebe apenas dados já calculados.
 *
 * ══════════════════════════════════════════════════════
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { PdfSettings } from "@/components/cutting-quote/PdfConfiguration";

export interface PdfQuoteData {
  // Dados gerais
  customerName: string;
  date: string;
  machineName: string;
  material: string;
  thickness: string;
  quantity: number;
  fileName: string;

  // Resumo técnico
  pathLengthM: number;
  effectiveSpeedMMmin: number;
  estimatedTimeMin: number;

  // Resumo financeiro
  cutPrice: number;         // Valor do corte (editável pelo usuário)
  materialCost: number;     // Valor do material (0 se do cliente)
  totalPrice: number;       // Total final

  // Extras
  deliveryDeadline: string;
}

/**
 * Converte hex (#rrggbb) para [R, G, B]
 */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

/**
 * Converte imagem URL para data URL via canvas (evita CORS no jsPDF)
 */
async function imageToDataUrl(url: string): Promise<string | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = url;
    });
    if (!img.complete || img.naturalWidth === 0) return null;

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);

    const isJpeg = url.toLowerCase().includes(".jpg") || url.toLowerCase().includes(".jpeg");
    return canvas.toDataURL(isJpeg ? "image/jpeg" : "image/png");
  } catch {
    return null;
  }
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * ── ETAPA PRINCIPAL: Gera o PDF e dispara o download ──
 *
 * Estrutura do documento:
 * ┌──────────────────────────────────────┐
 * │  CABEÇALHO (barra colorida)         │
 * │  Logo + Nome da empresa + Contato   │
 * ├──────────────────────────────────────┤
 * │  CORPO                              │
 * │  Endereço | Data | Cliente | Prazo  │
 * ├──────────────────────────────────────┤
 * │  TABELA — Resumo do Orçamento       │
 * │  Arquivo | Máquina | Material       │
 * │  Espessura | Quantidade             │
 * │  Comprimento | Velocidade | Tempo   │
 * │  Valor do Corte | Valor Material    │
 * │  TOTAL                              │
 * ├──────────────────────────────────────┤
 * │  RODAPÉ (texto livre)               │
 * └──────────────────────────────────────┘
 */
export async function generateQuotePDF(
  data: PdfQuoteData,
  settings: PdfSettings | null
): Promise<void> {
  const s = settings || {} as PdfSettings;
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  const primaryRgb = hexToRgb(s.primary_color || "#1a1a2e");
  const accentRgb = hexToRgb(s.accent_color || "#e94560");

  let yPos = 14;

  // ── 1. CABEÇALHO ──
  doc.setFillColor(...primaryRgb);
  doc.rect(0, 0, pageW, 32, "F");

  // Logo
  if (s.logo_url) {
    try {
      const dataUrl = await imageToDataUrl(s.logo_url);
      if (dataUrl) {
        const img = new Image();
        img.src = dataUrl;
        await new Promise<void>((r) => { img.onload = () => r(); img.onerror = () => r(); });
        if (img.naturalWidth > 0) {
          const ratio = img.naturalWidth / img.naturalHeight;
          const logoH = 18;
          const logoW = logoH * ratio;
          const isJpeg = s.logo_url.toLowerCase().includes(".jpg") || s.logo_url.toLowerCase().includes(".jpeg");
          doc.addImage(dataUrl, isJpeg ? "JPEG" : "PNG", 14, 7, logoW, logoH);
        }
      }
    } catch { /* skip logo */ }
  }

  // Nome da empresa
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(s.company_name || "Orçamento de Corte CNC", pageW - 14, 16, { align: "right" });

  // Contato
  doc.setFontSize(8);
  const contactParts: string[] = [];
  if (s.company_phone) contactParts.push(s.company_phone);
  if (s.company_email) contactParts.push(s.company_email);
  if (contactParts.length > 0) {
    doc.text(contactParts.join(" | "), pageW - 14, 23, { align: "right" });
  }
  if (s.company_cnpj) {
    doc.text(`CNPJ: ${s.company_cnpj}`, pageW - 14, 28, { align: "right" });
  }

  doc.setTextColor(0, 0, 0);
  yPos = 40;

  // ── 2. CORPO ──
  if (s.company_address) {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(s.company_address, 14, yPos);
    yPos += 6;
  }

  if (s.show_date !== false) {
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Data: ${data.date}`, 14, yPos);
    yPos += 6;
  }
  if (s.show_customer !== false && data.customerName.trim()) {
    doc.setFontSize(10);
    doc.text(`Cliente: ${data.customerName.trim()}`, 14, yPos);
    yPos += 6;
  }
  if (s.show_delivery !== false && data.deliveryDeadline.trim()) {
    doc.setFontSize(10);
    doc.text(`Prazo de Entrega: ${data.deliveryDeadline.trim()}`, 14, yPos);
    yPos += 6;
  }

  // ── 3. TABELA ──
  const body: string[][] = [];

  // Dados gerais
  body.push(["Arquivo", data.fileName]);
  body.push(["Máquina", data.machineName]);
  if (s.show_material !== false) body.push(["Material", data.material]);
  if (s.show_thickness !== false) body.push(["Espessura", data.thickness]);
  body.push(["Quantidade", String(data.quantity)]);

  // Resumo técnico
  body.push(["", ""]); // separator
  body.push(["Comprimento de Corte", `${data.pathLengthM.toFixed(2)} m`]);
  body.push(["Velocidade Efetiva", `${data.effectiveSpeedMMmin.toFixed(0)} mm/min`]);
  body.push(["Tempo Estimado", `${data.estimatedTimeMin.toFixed(1)} min`]);

  // Resumo financeiro
  body.push(["", ""]); // separator
  if (s.show_cutting_value !== false) body.push(["Valor do Corte", fmtBRL(data.cutPrice)]);
  if (s.show_material_value !== false && data.materialCost > 0) {
    body.push(["Valor do Material", fmtBRL(data.materialCost)]);
  }
  body.push(["", ""]);
  body.push(["TOTAL", fmtBRL(data.totalPrice)]);

  autoTable(doc, {
    startY: yPos + 4,
    head: [["Item", "Valor"]],
    body,
    theme: "striped",
    styles: { fontSize: 10 },
    headStyles: { fillColor: primaryRgb },
    didParseCell: (cellData: any) => {
      // Bold + accent color for TOTAL row
      if (cellData.row.index === body.length - 1) {
        cellData.cell.styles.fontStyle = "bold";
        cellData.cell.styles.fontSize = 12;
        if (cellData.column.index === 1) {
          cellData.cell.styles.textColor = accentRgb;
        }
      }
      // Gray for separator rows
      if (cellData.row.raw && cellData.row.raw[0] === "" && cellData.row.raw[1] === "") {
        cellData.cell.styles.minCellHeight = 2;
        cellData.cell.styles.fontSize = 2;
      }
    },
  });

  // ── 4. RODAPÉ ──
  if (s.footer_text) {
    const finalY = (doc as any).lastAutoTable?.finalY || yPos + 60;
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    const lines = doc.splitTextToSize(s.footer_text, pageW - 28);
    doc.text(lines, 14, finalY + 12);
  }

  // ── 5/6. GERAÇÃO E DOWNLOAD ──
  const pdfBlob = doc.output("blob");
  const blobUrl = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = `orcamento_${data.fileName.replace(/\.\w+$/, "")}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}
