import jsPDF from "jspdf";
import type { NestingResult, NestingPiece } from "./nesting-engine";

interface NestingPdfData {
  projectName: string;
  materialName: string;
  matW: number;
  matH: number;
  unitPrice: number;
  kerf: number;
  singleCut: boolean;
  autoRotation: boolean;
  result: NestingResult;
  pdfSettings?: any;
}

export function exportNestingPdf(data: NestingPdfData) {
  const { projectName, materialName, matW, matH, unitPrice, kerf, singleCut, autoRotation, result, pdfSettings } = data;
  const ps = pdfSettings || {};
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 14;

  // ── Header ────────────────────────────────────────────────
  const titleSize = ps.titleFontSize || 14;
  doc.setFontSize(titleSize);
  doc.setFont("helvetica", "bold");
  doc.text(projectName || "Plano de Nesting", margin, 20);

  doc.setFontSize(ps.subtitleFontSize || 9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, margin, 27);
  doc.setTextColor(0);

  // ── Info table ────────────────────────────────────────────
  let y = 34;
  doc.setFontSize(8);
  const info = [
    ["Material", materialName || "-"],
    ["Dimensões", `${matW} × ${matH} mm`],
    ["Preço unitário", `R$ ${unitPrice.toFixed(2)}`],
    ["Kerf", `${kerf} mm`],
    ["Rotação automática", autoRotation ? "Sim" : "Não"],
    ["Corte único", singleCut ? "Sim" : "Não"],
    ["Chapas necessárias", String(result.totalSheets)],
    ["Aproveitamento total", `${result.totalUtilization.toFixed(1)}%`],
    ["Custo estimado", `R$ ${result.estimatedCost.toFixed(2)}`],
  ];

  info.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(label + ":", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + 50, y);
    y += 5;
  });

  // ── Sheet layouts ─────────────────────────────────────────
  result.sheets.forEach((sheet, si) => {
    if (y > ph - 80) {
      doc.addPage();
      y = 20;
    }

    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Chapa ${si + 1} — ${sheet.utilization.toFixed(1)}% aproveitamento`, margin, y);
    y += 4;

    // Draw layout
    const availW = pw - margin * 2;
    const availH = Math.min(120, ph - y - 30);
    const scaleX = availW / matW;
    const scaleY = availH / matH;
    const scale = Math.min(scaleX, scaleY);
    const drawW = matW * scale;
    const drawH = matH * scale;
    const ox = margin + (availW - drawW) / 2;
    const oy = y + 2;

    // Material bg
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(180);
    doc.rect(ox, oy, drawW, drawH, "FD");

    // Pieces
    sheet.pieces.forEach((p, pi) => {
      const px = ox + p.x * scale;
      const py = oy + p.y * scale;
      const ppw = p.width * scale;
      const pph = p.height * scale;

      // Parse color
      const hex = p.color.replace("#", "");
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);

      doc.setFillColor(r, g, b, 40);
      doc.setDrawColor(r, g, b);
      doc.rect(px, py, ppw, pph, "FD");

      // Label
      const maxFs = ps.pieceMainLabelSize || 7;
      const fs = Math.min(maxFs, ppw * 0.25, pph * 0.4);
      if (fs >= 3 && ppw > 8 && pph > 5) {
        doc.setFontSize(fs);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40);
        doc.text(p.label, px + ppw / 2, py + pph / 2, { align: "center", baseline: "middle" });
      }

      // Dimensions
      if (ppw > 15 && pph > 10) {
        const subFs = Math.min(ps.pieceSubLabelSize || 5, ppw * 0.18);
        if (subFs >= 2.5) {
          doc.setFontSize(subFs);
          doc.setTextColor(100);
          doc.text(`${p.width.toFixed(0)}×${p.height.toFixed(0)}`, px + ppw / 2, py + pph / 2 + fs * 0.6, { align: "center" });
        }
      }
    });

    doc.setTextColor(0);
    y = oy + drawH + 8;

    // Piece table for this sheet
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("Peça", margin, y);
    doc.text("Largura", margin + 40, y);
    doc.text("Altura", margin + 65, y);
    doc.text("Posição X", margin + 88, y);
    doc.text("Posição Y", margin + 112, y);
    doc.text("Rotação", margin + 138, y);
    y += 3.5;
    doc.setFont("helvetica", "normal");

    sheet.pieces.forEach((p) => {
      if (y > ph - 15) {
        doc.addPage();
        y = 20;
      }
      doc.text(p.label, margin, y);
      doc.text(`${p.width.toFixed(1)}`, margin + 40, y);
      doc.text(`${p.height.toFixed(1)}`, margin + 65, y);
      doc.text(`${p.x.toFixed(1)}`, margin + 88, y);
      doc.text(`${p.y.toFixed(1)}`, margin + 112, y);
      doc.text(`${p.rotation}°`, margin + 138, y);
      y += 3.5;
    });
  });

  // ── Footer ────────────────────────────────────────────────
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Página ${i}/${pageCount}`, pw - margin, ph - 8, { align: "right" });
  }

  doc.save(`${projectName || "nesting"}.pdf`);
}
