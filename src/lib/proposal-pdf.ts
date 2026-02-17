import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ProposalPdfData {
  id: string;
  client_name: string;
  client_company: string;
  client_email: string;
  client_phone: string;
  client_document: string;
  model_name: string;
  description: string;
  tech_specs: string;
  included_items: { name: string }[];
  optional_items: { name: string; price: number | null }[];
  base_price: number;
  optional_total: number;
  total_price: number;
  delivery_days: number | null;
  notes: string;
  payment_conditions: string;
  validity_days: number;
  pdfSettings?: {
    company_name?: string;
    company_email?: string;
    company_phone?: string;
    company_cnpj?: string;
    company_address?: string;
    company_cep?: string;
    logo_url?: string;
    primary_color?: string;
    accent_color?: string;
    footer_text?: string;
    show_payment_conditions?: boolean;
    show_watermark?: boolean;
    watermark_url?: string;
  } | null;
}

const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

function hexToRGB(hex: string): [number, number, number] {
  hex = hex.replace("#", "");
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

export async function generateProposalPdf(data: ProposalPdfData) {
  const doc = new jsPDF();
  const ps = data.pdfSettings;
  const primaryColor = ps?.primary_color ? hexToRGB(ps.primary_color) : [0, 102, 204] as [number, number, number];
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(ps?.company_name || "PROPOSTA COMERCIAL", 14, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const headerInfo: string[] = [];
  if (ps?.company_email) headerInfo.push(ps.company_email);
  if (ps?.company_phone) headerInfo.push(ps.company_phone);
  if (ps?.company_cnpj) headerInfo.push(`CNPJ: ${ps.company_cnpj}`);
  if (headerInfo.length > 0) doc.text(headerInfo.join("  |  "), 14, 26);
  if (ps?.company_address) {
    const addr = ps.company_cep ? `${ps.company_address} - CEP: ${ps.company_cep}` : ps.company_address;
    doc.text(addr, 14, 32);
  }

  // Date info
  y = 42;
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  const today = new Date();
  doc.text(`Data: ${today.toLocaleDateString("pt-BR")}`, pageWidth - 14, y, { align: "right" });
  doc.text(`Proposta Nº: ${data.id.slice(0, 8).toUpperCase()}`, pageWidth - 14, y + 5, { align: "right" });
  doc.text(`Validade: ${data.validity_days} dias`, pageWidth - 14, y + 10, { align: "right" });

  // Client section
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DADOS DO CLIENTE", 14, y);
  y += 6;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  if (data.client_name) { doc.text(`Nome: ${data.client_name}`, 14, y); y += 5; }
  if (data.client_company) { doc.text(`Empresa: ${data.client_company}`, 14, y); y += 5; }
  if (data.client_document) { doc.text(`CPF/CNPJ: ${data.client_document}`, 14, y); y += 5; }
  if (data.client_email) { doc.text(`E-mail: ${data.client_email}`, 14, y); y += 5; }
  if (data.client_phone) { doc.text(`Telefone: ${data.client_phone}`, 14, y); y += 5; }

  // Equipment
  y += 6;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("EQUIPAMENTO", 14, y);
  y += 6;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(data.model_name, 14, y);
  y += 5;

  if (data.description) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const descLines = doc.splitTextToSize(data.description, pageWidth - 28);
    doc.text(descLines, 14, y);
    y += descLines.length * 4.5 + 3;
  }

  // Tech specs
  if (data.tech_specs) {
    y += 3;
    doc.setTextColor(...primaryColor);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("ESPECIFICAÇÕES TÉCNICAS", 14, y);
    y += 5;
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const specLines = doc.splitTextToSize(data.tech_specs, pageWidth - 28);
    doc.text(specLines, 14, y);
    y += specLines.length * 4.5 + 3;
  }

  // Included items
  if (data.included_items.length > 0) {
    if (y > 240) { doc.addPage(); y = 15; }
    y += 3;
    doc.setTextColor(...primaryColor);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("ITENS INCLUSOS", 14, y);
    y += 6;
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    data.included_items.forEach(item => {
      if (y > 275) { doc.addPage(); y = 15; }
      doc.text(`•  ${item.name}`, 18, y);
      y += 5;
    });
  }

  // Optional items
  if (data.optional_items.length > 0) {
    if (y > 240) { doc.addPage(); y = 15; }
    y += 5;
    doc.setTextColor(...primaryColor);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("ITENS OPCIONAIS SELECIONADOS", 14, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      head: [["Item", "Valor"]],
      body: data.optional_items.map(item => [
        item.name,
        item.price != null ? fmt(item.price) : "Consultar",
      ]),
      headStyles: { fillColor: primaryColor, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
      theme: "grid",
    });

    y = (doc as any).lastAutoTable.finalY + 5;
  }

  // Pricing summary
  if (data.base_price > 0 || data.total_price > 0) {
    if (y > 240) { doc.addPage(); y = 15; }
    y += 3;
    doc.setFillColor(245, 245, 250);
    doc.roundedRect(14, y, pageWidth - 28, data.optional_total > 0 ? 32 : 22, 3, 3, "F");
    y += 7;

    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Equipamento:", 20, y);
    doc.text(fmt(data.base_price), pageWidth - 20, y, { align: "right" });
    y += 5;

    if (data.optional_total > 0) {
      doc.text("Opcionais:", 20, y);
      doc.text(fmt(data.optional_total), pageWidth - 20, y, { align: "right" });
      y += 5;
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(20, y, pageWidth - 20, y);
    y += 5;
    doc.setTextColor(...primaryColor);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", 20, y);
    doc.text(fmt(data.total_price), pageWidth - 20, y, { align: "right" });
    y += 8;
  }

  // Conditions
  if (data.payment_conditions || data.delivery_days || data.notes) {
    if (y > 240) { doc.addPage(); y = 15; }
    y += 5;
    doc.setTextColor(...primaryColor);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("CONDIÇÕES", 14, y);
    y += 6;
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    if (data.payment_conditions && (ps?.show_payment_conditions !== false)) {
      doc.text(`Pagamento: ${data.payment_conditions}`, 14, y);
      y += 5;
    }
    if (data.delivery_days) {
      doc.text(`Prazo de entrega: ${data.delivery_days} dias úteis`, 14, y);
      y += 5;
    }
    if (data.notes) {
      const noteLines = doc.splitTextToSize(`Observações: ${data.notes}`, pageWidth - 28);
      doc.text(noteLines, 14, y);
      y += noteLines.length * 4.5;
    }
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 12;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.3);
  doc.line(14, footerY - 4, pageWidth - 14, footerY - 4);
  doc.setTextColor(140, 140, 140);
  doc.setFontSize(7);
  doc.text(ps?.footer_text || "Proposta gerada automaticamente - Dimension CNC", pageWidth / 2, footerY, { align: "center" });

  // Watermark on all pages
  if (ps?.show_watermark && ps?.watermark_url) {
    try {
      const response = await fetch(ps.watermark_url);
      const blob = await response.blob();
      const imgData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      const pageCount = doc.getNumberOfPages();
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const wmW = pageW * 0.6;
      const wmH = pageH * 0.4;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.saveGraphicsState();
        (doc as any).setGState(new (doc as any).GState({ opacity: 0.08 }));
        doc.addImage(imgData, "PNG", (pageW - wmW) / 2, (pageH - wmH) / 2, wmW, wmH);
        doc.restoreGraphicsState();
      }
    } catch (err) {
      console.error("Erro ao carregar marca d'água:", err);
    }
  }

  // Download
  const fileName = `Proposta_${data.model_name.replace(/\s+/g, "_")}_${data.client_name.replace(/\s+/g, "_")}.pdf`;
  const pdfBlob = doc.output("blob");
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
