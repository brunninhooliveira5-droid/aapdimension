import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface PdfOptions {
  title: string;
  filterLabel?: string;
  columns: string[];
  rows: string[][];
}

export function exportInventoryPdf({ title, filterLabel, columns, rows }: PdfOptions) {
  const doc = new jsPDF({ orientation: rows[0]?.length > 5 ? "landscape" : "portrait" });

  doc.setFontSize(14);
  doc.text(title, 14, 18);

  if (filterLabel) {
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Filtro: ${filterLabel}`, 14, 25);
    doc.setTextColor(0);
  }

  doc.setFontSize(8);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, filterLabel ? 31 : 25);

  autoTable(doc, {
    startY: filterLabel ? 35 : 29,
    head: [columns],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  doc.save(`${title.toLowerCase().replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
