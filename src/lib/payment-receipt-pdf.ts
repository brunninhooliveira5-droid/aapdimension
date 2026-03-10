import jsPDF from "jspdf";

interface ReceiptData {
  clientName: string;
  paymentMethod: string;
  totalPrice: number;
  fileName: string;
  material: string;
  thickness: string;
  date: string;
  notes: string;
}

interface ReceiptPdfSettings {
  company_name?: string;
  company_cnpj?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  company_cep?: string;
  logo_url?: string;
  primary_color?: string;
  footer_text?: string;
  show_watermark?: boolean;
  watermark_url?: string;
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
  if (intPart >= 1000) {
    const thousands = Math.floor(intPart / 1000);
    result += (thousands === 1 ? "mil" : convertGroup(thousands) + " mil");
    const remainder = intPart % 1000;
    if (remainder > 0) result += " e " + convertGroup(remainder);
  } else {
    result = convertGroup(intPart);
  }

  result += intPart === 1 ? " real" : " reais";

  if (centPart > 0) {
    result += " e " + convertGroup(centPart) + (centPart === 1 ? " centavo" : " centavos");
  }

  return result;
}

export async function generatePaymentReceiptPdf(
  data: ReceiptData,
  ps: ReceiptPdfSettings | null,
  signatureUrl: string | null
) {
  const doc = new jsPDF();
  const primary = ps?.primary_color ? hexToRGB(ps.primary_color) : [0, 102, 204] as [number, number, number];
  const pw = doc.internal.pageSize.getWidth();
  let y = 15;

  // Pre-load images
  let logoData: string | null = null;
  let watermarkData: string | null = null;
  let signatureData: string | null = null;

  const promises: Promise<void>[] = [];
  if (ps?.logo_url) promises.push(loadImage(ps.logo_url).then(d => { logoData = d; }));
  if (ps?.show_watermark && ps?.watermark_url) promises.push(loadImage(ps.watermark_url).then(d => { watermarkData = d; }));
  if (signatureUrl) promises.push(loadImage(signatureUrl).then(d => { signatureData = d; }));
  await Promise.all(promises);

  // ── Header ──
  doc.setFillColor(...primary);
  doc.rect(0, 0, pw, 34, "F");

  if (logoData) {
    try {
      const dims = await getImageDims(logoData);
      const lh = 18;
      const lw = (dims.w / dims.h) * lh;
      doc.addImage(logoData, "PNG", pw - lw - 12, (34 - lh) / 2, lw, lh);
    } catch {}
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("COMPROVANTE DE PAGAMENTO", 14, 17);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const headerParts: string[] = [];
  if (ps?.company_name) headerParts.push(ps.company_name);
  if (ps?.company_cnpj) headerParts.push(`CNPJ: ${ps.company_cnpj}`);
  if (headerParts.length) doc.text(headerParts.join("  |  "), 14, 25);
  const contactParts: string[] = [];
  if (ps?.company_phone) contactParts.push(ps.company_phone);
  if (ps?.company_email) contactParts.push(ps.company_email);
  if (contactParts.length) doc.text(contactParts.join("  |  "), 14, 30);

  y = 42;

  // Company address
  if (ps?.company_address) {
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(7);
    const addr = ps.company_cep ? `${ps.company_address} - CEP: ${ps.company_cep}` : ps.company_address;
    doc.text(addr, 14, y);
    y += 6;
  }

  // Date
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text(`Data: ${data.date}`, pw - 14, y, { align: "right" });
  y += 8;

  // ── Divider ──
  doc.setDrawColor(...primary);
  doc.setLineWidth(0.5);
  doc.line(14, y, pw - 14, y);
  y += 10;

  // ── Client ──
  doc.setTextColor(...primary);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DADOS DO PAGAMENTO", 14, y);
  y += 8;

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const rows = [
    ["Cliente:", data.clientName || "—"],
    ["Serviço:", `Corte CNC - ${data.fileName}`],
    ["Material:", `${data.material} (${data.thickness})`],
    ["Forma de Pagamento:", data.paymentMethod || "—"],
  ];

  for (const [label, value] of rows) {
    doc.setFont("helvetica", "bold");
    doc.text(label, 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, 65, y);
    y += 7;
  }

  y += 5;

  // ── Value Box ──
  doc.setFillColor(245, 245, 250);
  doc.roundedRect(14, y, pw - 28, 28, 3, 3, "F");
  y += 12;
  doc.setTextColor(...primary);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("VALOR PAGO:", 22, y);
  doc.setFontSize(16);
  doc.text(fmt(data.totalPrice), pw - 22, y, { align: "right" });
  y += 8;
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const extenso = numberToWords(data.totalPrice);
  doc.text(`(${extenso})`, 22, y);
  y += 14;

  // ── Notes ──
  if (data.notes) {
    doc.setDrawColor(...primary);
    doc.setLineWidth(0.3);
    doc.line(14, y, pw - 14, y);
    y += 8;
    doc.setTextColor(...primary);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVAÇÕES", 14, y);
    y += 6;
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(data.notes, pw - 28) as string[];
    for (const line of noteLines) {
      doc.text(line, 14, y);
      y += 4.5;
    }
    y += 5;
  }

  // ── Signature ──
  y += 15;
  const sigCenterX = pw / 2;

  if (signatureData) {
    try {
      const dims = await getImageDims(signatureData);
      const sh = 20;
      const sw = (dims.w / dims.h) * sh;
      doc.addImage(signatureData, "PNG", sigCenterX - sw / 2, y, sw, sh);
      y += sh + 3;
    } catch {}
  } else {
    y += 22;
  }

  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);
  doc.line(sigCenterX - 45, y, sigCenterX + 45, y);
  y += 5;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Assinatura / Responsável", sigCenterX, y, { align: "center" });

  // ── Footer ──
  const fY = doc.internal.pageSize.getHeight() - 10;
  doc.setDrawColor(...primary);
  doc.setLineWidth(0.3);
  doc.line(14, fY - 3, pw - 14, fY - 3);
  doc.setTextColor(140, 140, 140);
  doc.setFontSize(7);
  doc.text(ps?.footer_text || "Comprovante gerado automaticamente", pw / 2, fY, { align: "center" });

  // ── Watermark ──
  if (watermarkData && ps?.show_watermark) {
    try {
      const pageH = doc.internal.pageSize.getHeight();
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
      ctx.globalAlpha = 0.08;
      ctx.drawImage(img, 0, 0);
      const transparentUrl = canvas.toDataURL("image/png");
      doc.addImage(transparentUrl, "PNG", (pw - wmW) / 2, (pageH - wmH) / 2, wmW, wmH);
    } catch {}
  }

  const fileName = `Comprovante_${data.clientName.replace(/\s+/g, "_")}_${data.date.replace(/\//g, "-")}.pdf`;
  return { blob: doc.output("blob"), fileName };
}
