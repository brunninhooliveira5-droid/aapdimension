import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface CashFlowPdfData {
  initialBalance: number;
  balanceType: string;
  horizon: string;
  projections: {
    date: string;
    label: string;
    receivable: number;
    payable: number;
    net: number;
    balance: number;
  }[];
  summary30: { totalIn: number; totalOut: number; endBalance: number; negDays: number };
  summary60: { totalIn: number; totalOut: number; endBalance: number; negDays: number };
  summary90: { totalIn: number; totalOut: number; endBalance: number; negDays: number };
}

const fmt = (v: number) =>
  `R$ ${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const fmtSigned = (v: number) =>
  `${v < 0 ? "- " : ""}R$ ${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export function generateCashFlowPdf(data: CashFlowPdfData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = margin;

  // Header
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Fluxo de Caixa — Projeção", margin, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const now = new Date();
  doc.text(
    `Gerado em ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    margin, 20
  );
  doc.text(`Horizonte: ${data.horizon} dias`, pageWidth - margin, 20, { align: "right" });

  y = 36;

  // Initial balance info
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text(`Saldo Inicial (${data.balanceType}):`, margin, y);
  doc.setTextColor(data.initialBalance >= 0 ? 16 : 220, data.initialBalance >= 0 ? 185 : 38, data.initialBalance >= 0 ? 129 : 38);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(fmtSigned(data.initialBalance), margin + 50, y);

  y += 10;

  // Summary cards
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  const cardWidth = (pageWidth - margin * 2 - 8) / 3;
  const summaries = [
    { label: "30 Dias", data: data.summary30 },
    { label: "60 Dias", data: data.summary60 },
    { label: "90 Dias", data: data.summary90 },
  ];

  summaries.forEach((s, i) => {
    const x = margin + i * (cardWidth + 4);
    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(x, y, cardWidth, 30, 2, 2, "F");

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(s.label, x + 4, y + 6);

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(16, 185, 129);
    doc.text(`Entradas: ${fmt(s.data.totalIn)}`, x + 4, y + 12);
    doc.setTextColor(239, 68, 68);
    doc.text(`Saídas: ${fmt(s.data.totalOut)}`, x + 4, y + 17);

    const eb = s.data.endBalance;
    doc.setTextColor(eb >= 0 ? 16 : 220, eb >= 0 ? 185 : 38, eb >= 0 ? 129 : 38);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`Saldo: ${fmtSigned(eb)}`, x + 4, y + 24);

    if (s.data.negDays > 0) {
      doc.setTextColor(239, 68, 68);
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.text(`⚠ ${s.data.negDays} dia(s) negativo(s)`, x + 4, y + 28);
    }
  });

  y += 38;

  // Mini chart area — draw a simple line chart
  const chartH = 45;
  const chartW = pageWidth - margin * 2;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, chartW, chartH, 2, 2, "F");

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Evolução do Saldo", margin + 4, y + 6);

  const days = Number(data.horizon);
  const chartData = data.projections.slice(0, days + 1);
  if (chartData.length > 1) {
    const balances = chartData.map((d) => d.balance);
    const maxVal = Math.max(...balances, 0);
    const minVal = Math.min(...balances, 0);
    const range = maxVal - minVal || 1;

    const plotX = margin + 4;
    const plotW = chartW - 8;
    const plotY = y + 10;
    const plotH = chartH - 14;

    // Zero line
    const zeroY = plotY + plotH - ((0 - minVal) / range) * plotH;
    doc.setDrawColor(239, 68, 68);
    doc.setLineDashPattern([1, 1], 0);
    doc.setLineWidth(0.2);
    doc.line(plotX, zeroY, plotX + plotW, zeroY);
    doc.setLineDashPattern([], 0);

    // Balance line
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.5);
    for (let i = 1; i < chartData.length; i++) {
      const x1 = plotX + ((i - 1) / (chartData.length - 1)) * plotW;
      const x2 = plotX + (i / (chartData.length - 1)) * plotW;
      const y1 = plotY + plotH - ((chartData[i - 1].balance - minVal) / range) * plotH;
      const y2 = plotY + plotH - ((chartData[i].balance - minVal) / range) * plotH;
      doc.line(x1, y1, x2, y2);
    }

    // Labels
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(fmtSigned(maxVal), plotX, plotY + 2);
    doc.text(fmtSigned(minVal), plotX, plotY + plotH + 3);
    doc.text(chartData[0].label, plotX, plotY + plotH + 3 + 3);
    doc.text(chartData[chartData.length - 1].label, plotX + plotW, plotY + plotH + 3 + 3, { align: "right" });
  }

  y += chartH + 6;

  // Table — daily movements
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Movimentações Diárias", margin, y);
  y += 4;

  const tableRows = data.projections
    .filter((d) => d.receivable > 0 || d.payable > 0)
    .map((d) => [
      d.label,
      d.receivable > 0 ? fmt(d.receivable) : "—",
      d.payable > 0 ? fmt(d.payable) : "—",
      fmtSigned(d.net),
      fmtSigned(d.balance),
    ]);

  if (tableRows.length === 0) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text("Nenhuma movimentação projetada no período.", margin, y + 6);
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Data", "Entradas", "Saídas", "Líquido", "Saldo"]],
      body: tableRows,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold", fontSize: 7 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { halign: "left", cellWidth: 22 },
        1: { halign: "right", textColor: [16, 185, 129] },
        2: { halign: "right", textColor: [239, 68, 68] },
        3: { halign: "right" },
        4: { halign: "right", fontStyle: "bold" },
      },
      didParseCell: (hookData) => {
        if (hookData.section === "body") {
          // Color net column
          if (hookData.column.index === 3) {
            const raw = data.projections.filter((d) => d.receivable > 0 || d.payable > 0)[hookData.row.index];
            if (raw && raw.net < 0) hookData.cell.styles.textColor = [239, 68, 68];
            else hookData.cell.styles.textColor = [16, 185, 129];
          }
          // Color balance column
          if (hookData.column.index === 4) {
            const raw = data.projections.filter((d) => d.receivable > 0 || d.payable > 0)[hookData.row.index];
            if (raw && raw.balance < 0) hookData.cell.styles.textColor = [239, 68, 68];
          }
        }
      },
    });
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(241, 245, 249);
    doc.rect(0, ph - 10, pageWidth, 10, "F");
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.text("Relatório gerado automaticamente — Fluxo de Caixa", margin, ph - 4);
    doc.text(`Página ${i}/${totalPages}`, pageWidth - margin, ph - 4, { align: "right" });
  }

  // Download
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fluxo-de-caixa-${data.horizon}dias-${now.toISOString().split("T")[0]}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
