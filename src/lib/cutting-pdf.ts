/**
 * ══════════════════════════════════════════════════════
 * MÓDULO DE GERAÇÃO DE PDF — ORÇAMENTO DE CORTE CNC
 * ══════════════════════════════════════════════════════
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import type { PdfSettings } from "@/components/cutting-quote/PdfConfiguration";
import type { SpeedFactorOrigin } from "@/lib/cutting-calculations";
import { generatePixPayload } from "@/lib/pix-payload";

export interface PdfQuoteData {
  // Dados gerais
  customerName: string;
  customerPhone: string;
  date: string;
  machineName: string;
  material: string;
  thickness: string;
  quantity: number;
  fileName: string;
  useDimensionMaterials?: boolean;
  useMasterPricing?: boolean;

  // Resumo técnico
  pathLengthM: number;
  baseSpeedMMmin: number;
  baseSpeedOrigin: string;
  speedFactor: number;
  speedFactorOrigin: SpeedFactorOrigin;
  effectiveSpeedMMmin: number;
  estimatedTimeMin: number;
  passesFinal: number;
  passesOrigin: string;
  effectiveCutLengthM: number;

  // Resumo financeiro
  cutPrice: number;
  materialCost: number;
  serviceValue: number;
  serviceValueIncluded: boolean;
  serviceDescription: string;
  totalPrice: number;

  // Extras
  deliveryDeadline: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

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

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(s.company_name || "Orçamento de Corte CNC", pageW - 14, 16, { align: "right" });

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
    if (data.customerPhone.trim()) {
      doc.text(`Contato: ${data.customerPhone.trim()}`, 105, yPos);
    }
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
  if (s.show_material !== false) {
    const materialLabel = data.useDimensionMaterials ? `${data.material} (Material da Dimension)` : data.material;
    body.push(["Material", materialLabel]);
  }
  if (data.useDimensionMaterials) {
    body.push(["Fornecedor Material", "Dimension CNC"]);
  }
  if (s.show_thickness !== false) body.push(["Espessura", data.thickness]);

  // Resumo técnico
  if (data.passesFinal > 1) {
    body.push(["", ""]);
    const passesLabel = data.passesOrigin === "manual_override" ? `${data.passesFinal} (Override manual)` : `${data.passesFinal}`;
    body.push(["Passadas", passesLabel]);
    body.push(["Comprimento Efetivo", `${data.effectiveCutLengthM.toFixed(2)} m`]);
  }

  // Resumo financeiro
  body.push(["", ""]);
  if (s.show_cutting_value !== false) body.push(["Valor do Corte", fmtBRL(data.cutPrice)]);
  if (s.show_material_value !== false && data.materialCost > 0) {
    body.push(["Valor do Material", fmtBRL(data.materialCost)]);
  }
  if (s.show_service_value !== false && data.serviceValueIncluded && data.serviceValue > 0) {
    const serviceLabel = s.label_service_value || "Valor de Serviço";
    body.push([serviceLabel, fmtBRL(data.serviceValue)]);
    if (data.serviceDescription?.trim()) {
      body.push(["Descrição do Serviço", data.serviceDescription.trim()]);
    }
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
      if (cellData.row.index === body.length - 1) {
        cellData.cell.styles.fontStyle = "bold";
        cellData.cell.styles.fontSize = 12;
        if (cellData.column.index === 1) {
          cellData.cell.styles.textColor = accentRgb;
        }
      }
      if (cellData.row.raw && cellData.row.raw[0] === "" && cellData.row.raw[1] === "") {
        cellData.cell.styles.minCellHeight = 2;
        cellData.cell.styles.fontSize = 2;
      }
    },
  });

  // ── 4. QR CODE PIX ──
  let finalY = (doc as any).lastAutoTable?.finalY || yPos + 60;

  if (s.pix_qr_image_url?.trim()) {
    try {
      const qrDataUrl = await imageToDataUrl(s.pix_qr_image_url);
      if (qrDataUrl) {
        finalY += 8;
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text("Pagamento via PIX:", 14, finalY);
        finalY += 4;
        doc.addImage(qrDataUrl, "PNG", 14, finalY, 40, 40);
        finalY += 44;
      }
    } catch { /* skip pix qr */ }
  }

  // ── 5. RODAPÉ ──
  if (s.footer_text) {
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    const lines = doc.splitTextToSize(s.footer_text, pageW - 28);
    doc.text(lines, 14, finalY + 4);
  }

  // ── MARCA D'ÁGUA (imagem) ──
  if (s.show_watermark && s.watermark_url?.trim()) {
    try {
      const wmDataUrl = await imageToDataUrl(s.watermark_url);
      if (wmDataUrl) {
        const pageH = doc.internal.pageSize.getHeight();
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.saveGraphicsState();
          doc.setGState(new (doc as any).GState({ opacity: 0.06 }));
          const wmW = 120;
          const wmH = 120;
          const centerX = (pageW - wmW) / 2;
          const centerY = (pageH - wmH) / 2;
          doc.addImage(wmDataUrl, "PNG", centerX, centerY, wmW, wmH);
          doc.restoreGraphicsState();
        }
      }
    } catch { /* skip watermark */ }
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
