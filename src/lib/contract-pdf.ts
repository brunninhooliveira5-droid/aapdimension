import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ContractItem {
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface ContractData {
  contract_number: number;
  client_name: string;
  client_document: string;
  client_address: string;
  client_phone: string;
  client_email: string;
  client_responsible: string;
  closing_date: string;
  issue_date: string;
  validity_date: string | null;
  machine_model: string;
  machine_description: string;
  machine_specs: string;
  machine_included_items: string[];
  machine_optional_items: string[];
  total_value: number;
  payment_method: string;
  payment_entry: number;
  payment_installments: string;
  payment_balance: number;
  payment_notes: string;
  commercial_conditions: string;
  clauses: string;
  general_notes: string;
  status: string;
  items: ContractItem[];
}

interface PdfSettings {
  company_name?: string;
  company_cnpj?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  logo_url?: string;
  footer_text?: string;
  institutional_text?: string;
  watermark_text?: string;
  watermark_image_url?: string;
  watermark_opacity?: number;
  show_watermark?: boolean;
  signer_name?: string;
  signer_role?: string;
  signature_url?: string;
  primary_color?: string;
  accent_color?: string;
}

const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const fmtDate = (d: string) => {
  if (!d) return "";
  try { return new Date(d + "T12:00:00").toLocaleDateString("pt-BR"); } catch { return d; }
};

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

const PAGE_BOTTOM = 268;

function checkPage(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_BOTTOM) { doc.addPage(); return 18; }
  return y;
}

function printLines(doc: jsPDF, lines: string[], x: number, y: number, lh: number): number {
  for (const line of lines) {
    y = checkPage(doc, y, lh);
    doc.text(line, x, y);
    y += lh;
  }
  return y;
}

export async function generateContractPdf(data: ContractData, ps: PdfSettings | null) {
  const doc = new jsPDF();
  const primary = ps?.primary_color ? hexToRGB(ps.primary_color) : [0, 102, 204] as [number, number, number];
  const accent = ps?.accent_color ? hexToRGB(ps.accent_color) : [233, 69, 96] as [number, number, number];
  const pw = doc.internal.pageSize.getWidth();
  let y = 15;

  // Pre-load images
  let logoData: string | null = null;
  let watermarkImgData: string | null = null;
  let signatureData: string | null = null;

  const promises: Promise<void>[] = [];
  if (ps?.logo_url) promises.push(loadImage(ps.logo_url).then(d => { logoData = d; }));
  if (ps?.show_watermark && ps?.watermark_image_url) promises.push(loadImage(ps.watermark_image_url).then(d => { watermarkImgData = d; }));
  if (ps?.signature_url) promises.push(loadImage(ps.signature_url).then(d => { signatureData = d; }));
  await Promise.all(promises);

  // ── Header ──
  doc.setFillColor(...primary);
  doc.rect(0, 0, pw, 36, "F");

  if (logoData) {
    try {
      const dims = await getImageDims(logoData);
      const lh = 20;
      const lw = (dims.w / dims.h) * lh;
      doc.addImage(logoData, "PNG", pw - lw - 12, (36 - lh) / 2, lw, lh);
    } catch {}
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("CONTRATO DE VENDA", 14, 16);
  doc.setFontSize(10);
  doc.text(`Nº ${String(data.contract_number).padStart(4, "0")}`, 14, 24);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const infoParts: string[] = [];
  if (ps?.company_name) infoParts.push(ps.company_name);
  if (ps?.company_cnpj) infoParts.push(`CNPJ: ${ps.company_cnpj}`);
  if (infoParts.length) doc.text(infoParts.join("  |  "), 14, 32);

  y = 42;

  // Company info line
  const companyInfo: string[] = [];
  if (ps?.company_address) companyInfo.push(ps.company_address);
  if (ps?.company_phone) companyInfo.push(ps.company_phone);
  if (ps?.company_email) companyInfo.push(ps.company_email);
  if (companyInfo.length) {
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(7);
    doc.text(companyInfo.join("  •  "), 14, y);
    y += 6;
  }

  // Dates
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.text(`Data de Emissão: ${fmtDate(data.issue_date)}  |  Fechamento: ${fmtDate(data.closing_date)}${data.validity_date ? `  |  Validade: ${fmtDate(data.validity_date)}` : ""}`, 14, y);
  y += 8;

  // ── Client ──
  const sectionTitle = (title: string) => {
    y = checkPage(doc, y, 15);
    doc.setDrawColor(...primary);
    doc.setLineWidth(0.5);
    doc.line(14, y, pw - 14, y);
    y += 7;
    doc.setTextColor(...primary);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, y);
    y += 6;
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
  };

  sectionTitle("DADOS DO CLIENTE");
  const clientLines: string[] = [];
  if (data.client_name) clientLines.push(`Nome/Razão Social: ${data.client_name}`);
  if (data.client_document) clientLines.push(`CPF/CNPJ: ${data.client_document}`);
  if (data.client_address) clientLines.push(`Endereço: ${data.client_address}`);
  if (data.client_phone) clientLines.push(`Telefone: ${data.client_phone}`);
  if (data.client_email) clientLines.push(`E-mail: ${data.client_email}`);
  if (data.client_responsible) clientLines.push(`Responsável: ${data.client_responsible}`);
  for (const line of clientLines) {
    y = checkPage(doc, y, 5);
    doc.text(line, 14, y);
    y += 5;
  }

  // ── Machine ──
  y += 3;
  sectionTitle("EQUIPAMENTO");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 40, 40);
  doc.text(data.machine_model, 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);

  if (data.machine_description) {
    const descLines = doc.splitTextToSize(data.machine_description, pw - 28) as string[];
    y = printLines(doc, descLines, 14, y, 4.5);
    y += 2;
  }

  if (data.machine_specs) {
    y += 2;
    y = checkPage(doc, y, 10);
    doc.setTextColor(...primary);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Especificações Técnicas:", 14, y);
    y += 5;
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");
    const specLines = doc.splitTextToSize(data.machine_specs, pw - 28) as string[];
    y = printLines(doc, specLines, 14, y, 4.5);
  }

  if (data.machine_included_items?.length > 0) {
    y += 4;
    y = checkPage(doc, y, 10);
    doc.setTextColor(...primary);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Itens Inclusos:", 14, y);
    y += 5;
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");
    for (const item of data.machine_included_items) {
      y = checkPage(doc, y, 5);
      doc.text(`•  ${item}`, 18, y);
      y += 5;
    }
  }

  // ── Contract Items Table ──
  if (data.items?.length > 0) {
    y += 5;
    sectionTitle("ITENS CONTRATADOS");

    autoTable(doc, {
      startY: y,
      head: [["#", "Descrição", "Qtd", "Valor Unit.", "Subtotal"]],
      body: data.items.map((item, idx) => [
        String(idx + 1),
        item.description,
        String(item.quantity),
        fmt(item.unit_price),
        fmt(item.subtotal),
      ]),
      headStyles: { fillColor: primary, fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        2: { cellWidth: 18, halign: "center" },
        3: { cellWidth: 30, halign: "right" },
        4: { cellWidth: 30, halign: "right" },
      },
      margin: { left: 14, right: 14 },
      theme: "grid",
    });

    y = (doc as any).lastAutoTable.finalY + 5;
  }

  // ── Total ──
  y = checkPage(doc, y, 20);
  doc.setFillColor(245, 245, 250);
  doc.roundedRect(14, y, pw - 28, 16, 3, 3, "F");
  y += 10;
  doc.setTextColor(...primary);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("VALOR TOTAL:", 20, y);
  doc.setTextColor(...accent);
  doc.text(fmt(data.total_value), pw - 20, y, { align: "right" });
  y += 12;

  // ── Payment ──
  if (data.payment_method || data.commercial_conditions) {
    sectionTitle("CONDIÇÕES COMERCIAIS");
    if (data.payment_method) {
      doc.text(`Forma de Pagamento: ${data.payment_method}`, 14, y); y += 5;
    }
    if (data.payment_entry > 0) {
      doc.text(`Entrada: ${fmt(data.payment_entry)}`, 14, y); y += 5;
    }
    if (data.payment_installments) {
      doc.text(`Parcelamento: ${data.payment_installments}`, 14, y); y += 5;
    }
    if (data.payment_balance > 0) {
      doc.text(`Saldo: ${fmt(data.payment_balance)}`, 14, y); y += 5;
    }
    if (data.payment_notes) {
      y += 2;
      const pLines = doc.splitTextToSize(data.payment_notes, pw - 28) as string[];
      y = printLines(doc, pLines, 14, y, 4.5);
    }
    if (data.commercial_conditions) {
      y += 3;
      const cLines = doc.splitTextToSize(data.commercial_conditions, pw - 28) as string[];
      y = printLines(doc, cLines, 14, y, 4.5);
    }
  }

  // ── Clauses ──
  if (data.clauses) {
    y += 5;
    sectionTitle("CLÁUSULAS CONTRATUAIS");
    const clauseLines = doc.splitTextToSize(data.clauses, pw - 28) as string[];
    y = printLines(doc, clauseLines, 14, y, 4.5);
  }

  // ── General notes ──
  if (data.general_notes) {
    y += 5;
    sectionTitle("OBSERVAÇÕES");
    const noteLines = doc.splitTextToSize(data.general_notes, pw - 28) as string[];
    y = printLines(doc, noteLines, 14, y, 4.5);
  }

  // ── Signatures ──
  y += 15;
  y = checkPage(doc, y, 50);
  doc.setTextColor(...primary);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("ASSINATURAS", 14, y);
  y += 10;

  const sigBlockW = (pw - 28 - 20) / 2;
  const sigX1 = 14;
  const sigX2 = 14 + sigBlockW + 20;

  // Seller signature
  if (signatureData) {
    try {
      const dims = await getImageDims(signatureData);
      const sh = 18;
      const sw = (dims.w / dims.h) * sh;
      doc.addImage(signatureData, "PNG", sigX1 + (sigBlockW - sw) / 2, y, sw, sh);
      y += sh + 2;
    } catch {}
  } else {
    y += 20;
  }

  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);
  doc.line(sigX1, y, sigX1 + sigBlockW, y);
  y += 4;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(ps?.signer_name || "VENDEDOR", sigX1 + sigBlockW / 2, y, { align: "center" });
  if (ps?.signer_role) {
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.text(ps.signer_role, sigX1 + sigBlockW / 2, y, { align: "center" });
  }

  // Client signature area
  const clientSigY = y - (ps?.signer_role ? 8 : 4) - 20;
  const clientLineY = clientSigY + 20;
  doc.setDrawColor(100, 100, 100);
  doc.line(sigX2, clientLineY, sigX2 + sigBlockW, clientLineY);
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(data.client_name || "COMPRADOR", sigX2 + sigBlockW / 2, clientLineY + 4, { align: "center" });
  if (data.client_responsible) {
    doc.setFont("helvetica", "normal");
    doc.text(data.client_responsible, sigX2 + sigBlockW / 2, clientLineY + 8, { align: "center" });
  }

  // ── Footer on all pages ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const fY = doc.internal.pageSize.getHeight() - 10;
    doc.setDrawColor(...primary);
    doc.setLineWidth(0.3);
    doc.line(14, fY - 3, pw - 14, fY - 3);
    doc.setTextColor(140, 140, 140);
    doc.setFontSize(7);
    doc.text(ps?.footer_text || "Contrato gerado automaticamente - Dimension CNC", pw / 2, fY, { align: "center" });
    doc.text(`Página ${i} de ${totalPages}`, pw - 14, fY, { align: "right" });
  }

  // ── Watermark ──
  if (ps?.show_watermark) {
    const opacity = ps.watermark_opacity ?? 0.08;
    const pageCount = doc.getNumberOfPages();
    const pageH = doc.internal.pageSize.getHeight();

    if (ps.watermark_text) {
      // Text watermark
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setTextColor(180, 180, 180);
        doc.setFontSize(50);
        doc.setFont("helvetica", "bold");
        const gState = (doc as any).GState({ opacity });
        (doc as any).setGState(gState);
        doc.text(ps.watermark_text, pw / 2, pageH / 2, { align: "center", angle: 45 });
        (doc as any).setGState((doc as any).GState({ opacity: 1 }));
      }
    } else if (watermarkImgData) {
      try {
        const dims = await getImageDims(watermarkImgData);
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
        await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = watermarkImgData!; });
        ctx.globalAlpha = opacity;
        ctx.drawImage(img, 0, 0);
        const transparentUrl = canvas.toDataURL("image/png");

        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.addImage(transparentUrl, "PNG", (pw - wmW) / 2, (pageH - wmH) / 2, wmW, wmH);
        }
      } catch {}
    }
  }

  const fileName = `Contrato_${String(data.contract_number).padStart(4, "0")}_${data.client_name.replace(/\s+/g, "_")}.pdf`;
  return { blob: doc.output("blob"), fileName };
}
