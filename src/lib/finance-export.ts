import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ExportRow {
  cols: string[];
}

interface ExportConfig {
  title: string;
  columns: string[];
  rows: ExportRow[];
  summary?: string;
  accentColor?: [number, number, number];
}

const now = () => {
  const d = new Date();
  return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
};

export function exportFinanceListPdf(config: ExportConfig) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageW, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(config.title, margin, 11);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Gerado em ${now()}`, margin, 18);
  if (config.summary) {
    doc.text(config.summary, pageW - margin, 18, { align: "right" });
  }

  // Table
  autoTable(doc, {
    startY: 30,
    margin: { left: margin, right: margin },
    head: [config.columns],
    body: config.rows.map((r) => r.cols),
    styles: { fontSize: 7, cellPadding: 2.5 },
    headStyles: {
      fillColor: config.accentColor || [30, 41, 59],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(241, 245, 249);
    doc.rect(0, ph - 10, pageW, 10, "F");
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.text("Relatório gerado automaticamente", margin, ph - 4);
    doc.text(`Página ${i}/${totalPages}`, pageW - margin, ph - 4, { align: "right" });
  }

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${config.title.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportFinanceListCsv(config: ExportConfig) {
  const header = config.columns.join(";");
  const rows = config.rows.map((r) => r.cols.join(";"));
  const content = [header, ...rows].join("\n");

  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${config.title.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface WeeklySummaryConfig {
  weekStart: string;
  weekEnd: string;
  totalReceivedWeek: number;
  totalPaidWeek: number;
  balance: number;
  totalDuePay: number;
  totalDueRec: number;
  topReceipts: { label: string; amount: number }[];
  topPayments: { label: string; amount: number }[];
  pendingItems: { label: string; amount: number; date: string; type: "pagar" | "receber" }[];
}

export function exportWeeklySummaryPdf(config: WeeklySummaryConfig) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const formatDate = (d: string) => { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };

  // Header
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo Semanal Financeiro", margin, 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Período: ${formatDate(config.weekStart)} a ${formatDate(config.weekEnd)}`, margin, 20);
  doc.text(`Gerado em ${now()}`, pageW - margin, 20, { align: "right" });

  let y = 38;

  // Summary cards
  const cardW = (pageW - margin * 2 - 12) / 4;
  const cards = [
    { label: "Recebido", value: fmt(config.totalReceivedWeek), color: [16, 185, 129] as [number, number, number] },
    { label: "Pago", value: fmt(config.totalPaidWeek), color: [239, 68, 68] as [number, number, number] },
    { label: "Saldo Semana", value: fmt(config.balance), color: config.balance >= 0 ? [16, 185, 129] as [number, number, number] : [239, 68, 68] as [number, number, number] },
    { label: "Pendente", value: fmt(config.totalDuePay + config.totalDueRec), color: [245, 158, 11] as [number, number, number] },
  ];

  cards.forEach((card, i) => {
    const x = margin + i * (cardW + 4);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, cardW, 20, 2, 2, "F");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text(card.label, x + cardW / 2, y + 7, { align: "center" });
    doc.setFontSize(11);
    doc.setTextColor(...card.color);
    doc.setFont("helvetica", "bold");
    doc.text(card.value, x + cardW / 2, y + 15, { align: "center" });
  });

  y += 28;

  // Top Receipts
  const sectionTitle = (title: string, yPos: number) => {
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin, yPos);
    return yPos + 6;
  };

  if (config.topReceipts.length > 0) {
    y = sectionTitle("Maiores Recebimentos", y);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Cliente / Descrição", "Valor"]],
      body: config.topReceipts.map(r => [r.label, fmt(r.amount)]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 1: { halign: "right" } },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Top Payments
  if (config.topPayments.length > 0) {
    y = sectionTitle("Maiores Pagamentos", y);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Fornecedor / Descrição", "Valor"]],
      body: config.topPayments.map(p => [p.label, fmt(p.amount)]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 1: { halign: "right" } },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Pending items
  if (config.pendingItems.length > 0) {
    y = sectionTitle("Pendentes da Semana", y);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Tipo", "Nome", "Vencimento", "Valor"]],
      body: config.pendingItems.map(item => [
        item.type === "pagar" ? "Pagar" : "Receber",
        item.label,
        formatDate(item.date),
        fmt(item.amount),
      ]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 3: { halign: "right" } },
    });
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(241, 245, 249);
    doc.rect(0, ph - 10, pageW, 10, "F");
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.text("Relatório gerado automaticamente", margin, ph - 4);
    doc.text(`Página ${i}/${totalPages}`, pageW - margin, ph - 4, { align: "right" });
  }

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `resumo-semanal-${config.weekStart}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
