import jsPDF from "jspdf";

interface ReceiptData {
  receipt_number: number;
  receipt_type: string;
  receipt_date: string;
  party_name: string;
  party_document?: string;
  party_phone?: string;
  party_email?: string;
  amount: number;
  payment_method: string;
  reference_type: string;
  description?: string;
  observations?: string;
  base_text?: string;
}

interface PdfSettings {
  company_name?: string;
  document_number?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  footer_text?: string;
  institutional_text?: string;
  watermark_text?: string;
  watermark_image_url?: string;
  watermark_opacity?: number;
  signer_name?: string;
  signer_role?: string;
  primary_color?: string;
  show_logo?: boolean;
  show_footer?: boolean;
  show_observations?: boolean;
  show_emitter_signature?: boolean;
  show_party_signature?: boolean;
  show_watermark?: boolean;
}

const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

function hexToRGB(hex: string): [number, number, number] {
  hex = hex.replace("#", "");
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

async function loadImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null as any);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

function getImageDims(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.width, h: img.height });
    img.onerror = () => resolve({ w: 100, h: 100 });
    img.src = dataUrl;
  });
}

function numberToWords(value: number): string {
  const units = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const teens = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const tens = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const hundreds = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  if (value === 0) return "zero";
  const intPart = Math.floor(value);
  const centPart = Math.round((value - intPart) * 100);

  const convertGroup = (n: number): string => {
    if (n === 0) return "";
    if (n === 100) return "cem";
    const parts: string[] = [];
    if (n >= 100) { parts.push(hundreds[Math.floor(n / 100)]); n %= 100; }
    if (n >= 20) { parts.push(tens[Math.floor(n / 10)]); n %= 10; }
    if (n >= 10) { parts.push(teens[n - 10]); n = 0; }
    if (n > 0) parts.push(units[n]);
    return parts.join(" e ");
  };

  let result = "";
  if (intPart >= 1000000) {
    const millions = Math.floor(intPart / 1000000);
    result += (millions === 1 ? "um milhão" : convertGroup(millions) + " milhões");
    const remainder = intPart % 1000000;
    if (remainder > 0) result += " e " + (remainder >= 1000 ? "" : "") ;
    if (remainder >= 1000) {
      const thousands = Math.floor(remainder / 1000);
      result += (thousands === 1 ? "mil" : convertGroup(thousands) + " mil");
      const r2 = remainder % 1000;
      if (r2 > 0) result += " e " + convertGroup(r2);
    } else if (remainder > 0) {
      result += convertGroup(remainder);
    }
  } else if (intPart >= 1000) {
    const thousands = Math.floor(intPart / 1000);
    result += (thousands === 1 ? "mil" : convertGroup(thousands) + " mil");
    const remainder = intPart % 1000;
    if (remainder > 0) result += " e " + convertGroup(remainder);
  } else {
    result = convertGroup(intPart);
  }

  result += intPart === 1 ? " real" : " reais";
  if (centPart > 0) result += " e " + convertGroup(centPart) + (centPart === 1 ? " centavo" : " centavos");
  return result;
}

const typeLabel: Record<string, string> = { pagamento: "PAGAMENTO", recebimento: "RECEBIMENTO" };
const methodLabel: Record<string, string> = { dinheiro: "Dinheiro", pix: "PIX", transferencia: "Transferência", boleto: "Boleto", cartao: "Cartão", cheque: "Cheque", outro: "Outro" };
const refLabel: Record<string, string> = { servico: "Serviço", parcela: "Parcela", entrada: "Entrada", equipamento: "Equipamento", outro: "Outro" };

export async function generateReceiptPdf(
  data: ReceiptData,
  ps: PdfSettings | null,
  emitterSignatureUrl: string | null,
  partySignatureUrl: string | null
) {
  const doc = new jsPDF();
  const primary = ps?.primary_color ? hexToRGB(ps.primary_color) : [0, 102, 204] as [number, number, number];
  const pw = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let y = 15;

  // Pre-load images
  let logoData: string | null = null;
  let watermarkData: string | null = null;
  let emitterSigData: string | null = null;
  let partySigData: string | null = null;

  const promises: Promise<void>[] = [];
  if (ps?.show_logo !== false && ps?.logo_url) promises.push(loadImage(ps.logo_url).then(d => { logoData = d; }));
  if (ps?.show_watermark && (ps?.watermark_image_url || ps?.watermark_text)) {
    if (ps.watermark_image_url) promises.push(loadImage(ps.watermark_image_url).then(d => { watermarkData = d; }));
  }
  if (ps?.show_emitter_signature !== false && emitterSignatureUrl) promises.push(loadImage(emitterSignatureUrl).then(d => { emitterSigData = d; }));
  if (ps?.show_party_signature !== false && partySignatureUrl) {
    if (partySignatureUrl.startsWith("data:")) { partySigData = partySignatureUrl; }
    else promises.push(loadImage(partySignatureUrl).then(d => { partySigData = d; }));
  }
  await Promise.all(promises);

  // ── Header ──
  doc.setFillColor(...primary);
  doc.rect(0, 0, pw, 34, "F");

  if (logoData && ps?.show_logo !== false) {
    try {
      const dims = await getImageDims(logoData);
      const lh = 18;
      const lw = (dims.w / dims.h) * lh;
      doc.addImage(logoData, "PNG", pw - lw - 12, (34 - lh) / 2, lw, lh);
    } catch {}
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const title = `COMPROVANTE DE ${typeLabel[data.receipt_type] || "RECEBIMENTO"}`;
  doc.text(title, 14, 16);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const headerParts: string[] = [];
  if (ps?.company_name) headerParts.push(ps.company_name);
  if (ps?.document_number) headerParts.push(`CNPJ/CPF: ${ps.document_number}`);
  if (headerParts.length) doc.text(headerParts.join("  |  "), 14, 24);
  const contactParts: string[] = [];
  if (ps?.phone) contactParts.push(ps.phone);
  if (ps?.email) contactParts.push(ps.email);
  if (contactParts.length) doc.text(contactParts.join("  |  "), 14, 29);

  y = 40;

  if (ps?.address) {
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(7);
    doc.text(ps.address, 14, y);
    y += 5;
  }

  // Nº and Date
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text(`Nº ${String(data.receipt_number).padStart(4, "0")}`, 14, y + 2);
  const dateStr = data.receipt_date ? new Date(data.receipt_date + "T12:00:00").toLocaleDateString("pt-BR") : "";
  doc.text(`Data: ${dateStr}`, pw - 14, y + 2, { align: "right" });
  y += 10;

  doc.setDrawColor(...primary);
  doc.setLineWidth(0.5);
  doc.line(14, y, pw - 14, y);
  y += 8;

  // ── Base text ──
  if (data.base_text) {
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    const lines = doc.splitTextToSize(data.base_text, pw - 28) as string[];
    for (const line of lines) { doc.text(line, 14, y); y += 4.5; }
    y += 6;
  }

  // ── Party Data ──
  doc.setTextColor(...primary);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DADOS DA OPERAÇÃO", 14, y);
  y += 8;

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const rows: [string, string][] = [
    ["Nome:", data.party_name || "—"],
  ];
  if (data.party_document) rows.push(["CPF/CNPJ:", data.party_document]);
  if (data.party_phone) rows.push(["Telefone:", data.party_phone]);
  if (data.party_email) rows.push(["E-mail:", data.party_email]);
  rows.push(["Forma de Pagamento:", methodLabel[data.payment_method] || data.payment_method]);
  rows.push(["Referente a:", refLabel[data.reference_type] || data.reference_type]);

  for (const [label, value] of rows) {
    doc.setFont("helvetica", "bold");
    doc.text(label, 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, 65, y);
    y += 7;
  }
  y += 3;

  // ── Value Box ──
  doc.setFillColor(245, 245, 250);
  doc.roundedRect(14, y, pw - 28, 28, 3, 3, "F");
  y += 12;
  doc.setTextColor(...primary);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  const vLabel = data.receipt_type === "pagamento" ? "VALOR PAGO:" : "VALOR RECEBIDO:";
  doc.text(vLabel, 22, y);
  doc.setFontSize(16);
  doc.text(fmt(data.amount), pw - 22, y, { align: "right" });
  y += 8;
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`(${numberToWords(data.amount)})`, 22, y);
  y += 14;

  // ── Description ──
  if (data.description) {
    doc.setDrawColor(...primary);
    doc.setLineWidth(0.3);
    doc.line(14, y, pw - 14, y);
    y += 7;
    doc.setTextColor(...primary);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("DESCRIÇÃO / HISTÓRICO", 14, y);
    y += 6;
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const dl = doc.splitTextToSize(data.description, pw - 28) as string[];
    for (const line of dl) { doc.text(line, 14, y); y += 4.5; }
    y += 4;
  }

  // ── Observations ──
  if (data.observations && ps?.show_observations !== false) {
    doc.setDrawColor(...primary);
    doc.setLineWidth(0.3);
    doc.line(14, y, pw - 14, y);
    y += 7;
    doc.setTextColor(...primary);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVAÇÕES", 14, y);
    y += 6;
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const ol = doc.splitTextToSize(data.observations, pw - 28) as string[];
    for (const line of ol) { doc.text(line, 14, y); y += 4.5; }
    y += 4;
  }

  // ── Signatures ──
  y = Math.max(y + 10, pageH - 70);
  const sigWidth = (pw - 42) / 2;

  // Emitter signature (left)
  if (ps?.show_emitter_signature !== false) {
    const sigX = 14;
    let sigY = y;
    if (emitterSigData) {
      try {
        const dims = await getImageDims(emitterSigData);
        const sh = 18;
        const sw = Math.min((dims.w / dims.h) * sh, sigWidth);
        doc.addImage(emitterSigData, "PNG", sigX + (sigWidth - sw) / 2, sigY, sw, sh);
        sigY += sh + 2;
      } catch { sigY += 20; }
    } else {
      sigY += 20;
    }
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.3);
    doc.line(sigX, sigY, sigX + sigWidth, sigY);
    sigY += 4;
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(ps?.signer_name || "Emitente", sigX + sigWidth / 2, sigY, { align: "center" });
    if (ps?.signer_role) {
      sigY += 4;
      doc.setFont("helvetica", "normal");
      doc.text(ps.signer_role, sigX + sigWidth / 2, sigY, { align: "center" });
    }
  }

  // Party signature (right)
  if (ps?.show_party_signature !== false) {
    const sigX = pw - 14 - sigWidth;
    let sigY = y;
    if (partySigData) {
      try {
        const dims = await getImageDims(partySigData);
        const sh = 18;
        const sw = Math.min((dims.w / dims.h) * sh, sigWidth);
        doc.addImage(partySigData, "PNG", sigX + (sigWidth - sw) / 2, sigY, sw, sh);
        sigY += sh + 2;
      } catch { sigY += 20; }
    } else {
      sigY += 20;
    }
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.3);
    doc.line(sigX, sigY, sigX + sigWidth, sigY);
    sigY += 4;
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(data.party_name || "Outra Parte", sigX + sigWidth / 2, sigY, { align: "center" });
  }

  // ── Footer ──
  if (ps?.show_footer !== false) {
    const fY = pageH - 10;
    doc.setDrawColor(...primary);
    doc.setLineWidth(0.3);
    doc.line(14, fY - 3, pw - 14, fY - 3);
    doc.setTextColor(140, 140, 140);
    doc.setFontSize(7);
    doc.text(ps?.footer_text || "Comprovante gerado automaticamente", pw / 2, fY, { align: "center" });
  }

  // ── Watermark ──
  if (ps?.show_watermark) {
    const opacity = ps.watermark_opacity || 0.08;
    if (watermarkData) {
      try {
        const dims = await getImageDims(watermarkData);
        const wmMaxW = pw * 0.5;
        const wmMaxH = pageH * 0.3;
        const ratio = Math.min(wmMaxW / dims.w, wmMaxH / dims.h);
        const wmW = dims.w * ratio;
        const wmH = dims.h * ratio;
        const canvas = document.createElement("canvas");
        canvas.width = dims.w;
        canvas.height = dims.h;
        const ctx = canvas.getContext("2d")!;
        const img = new Image();
        await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = watermarkData!; });
        ctx.globalAlpha = opacity;
        ctx.drawImage(img, 0, 0);
        const transparentUrl = canvas.toDataURL("image/png");
        doc.addImage(transparentUrl, "PNG", (pw - wmW) / 2, (pageH - wmH) / 2, wmW, wmH);
      } catch {}
    } else if (ps.watermark_text) {
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(50);
      doc.setFont("helvetica", "bold");
      const gState = (doc as any).GState({ opacity });
      (doc as any).setGState(gState);
      doc.text(ps.watermark_text, pw / 2, pageH / 2, { align: "center", angle: 45 });
      (doc as any).setGState(new (doc as any).GState({ opacity: 1 }));
    }
  }

  const typeStr = data.receipt_type === "pagamento" ? "Pagamento" : "Recebimento";
  const fileName = `Comprovante_${typeStr}_${data.party_name.replace(/\s+/g, "_")}_${String(data.receipt_number).padStart(4, "0")}.pdf`;
  return { blob: doc.output("blob"), fileName };
}
