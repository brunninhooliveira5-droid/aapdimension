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
