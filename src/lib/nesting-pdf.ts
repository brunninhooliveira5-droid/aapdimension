import jsPDF from "jspdf";
import type { NestingResult, NestingPiece } from "./nesting-engine";
import { pathToPolygon, normalizePolygon, scalePolygon } from "./nesting-geometry";

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

/** Convert SVG path data to polygon points for PDF rendering */
function pathToDrawPoints(pathData: string, bboxX: number, bboxY: number, bboxW: number, bboxH: number, drawW: number, drawH: number): { x: number; y: number }[] {
  const rawPts = pathToPolygon(pathData);
  if (rawPts.length < 3) return [];

  // Map from SVG bbox space to draw space
  const sx = drawW / (bboxW || 1);
  const sy = drawH / (bboxH || 1);

  return rawPts.map(p => ({
    x: (p.x - bboxX) * sx,
    y: (p.y - bboxY) * sy,
  }));
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
    const sheetTitle = `Chapa ${si + 1} — ${sheet.utilization.toFixed(1)}% aproveitamento${singleCut ? " (Corte Único)" : ""}`;
    doc.text(sheetTitle, margin, y);
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

    // Pieces — use real polygon shape when pathData available
    sheet.pieces.forEach((p) => {
      const pieceOx = ox + p.x * scale;
      const pieceOy = oy + p.y * scale;
      const ppw = p.width * scale;
      const pph = p.height * scale;

      // Parse color
      const hex = p.color.replace("#", "");
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);

      // Try to render real shape
      let drewPolygon = false;
      if (p.pathData && p.pathData.length > 2) {
        const bboxW = p.bboxW || p.width;
        const bboxH = p.bboxH || p.height;
        const bboxX = p.bboxX || 0;
        const bboxY = p.bboxY || 0;
        const pts = pathToDrawPoints(p.pathData, bboxX, bboxY, bboxW, bboxH, ppw, pph);

        if (pts.length >= 3) {
          // Draw filled polygon
          doc.setFillColor(r, g, b);
          doc.setDrawColor(r, g, b);

          // Build polygon path — use lines array for jsPDF
          const startX = pieceOx + pts[0].x;
          const startY = pieceOy + pts[0].y;
          
          // Use jsPDF triangle/lines approach for polygon
          // Draw filled shape using a series of triangles from centroid
          // First, draw outline
          doc.setLineWidth(0.3);
          
          // Draw the polygon outline
          for (let i = 0; i < pts.length; i++) {
            const curr = pts[i];
            const next = pts[(i + 1) % pts.length];
            doc.line(
              pieceOx + curr.x, pieceOy + curr.y,
              pieceOx + next.x, pieceOy + next.y
            );
          }

          // Fill with semi-transparent color using a light version
          const fillR = Math.min(255, r + Math.floor((255 - r) * 0.7));
          const fillG = Math.min(255, g + Math.floor((255 - g) * 0.7));
          const fillB = Math.min(255, b + Math.floor((255 - b) * 0.7));
          
          // Draw filled polygon using jsPDF triangle method
          const cx = pts.reduce((s, pt) => s + pt.x, 0) / pts.length;
          const cy = pts.reduce((s, pt) => s + pt.y, 0) / pts.length;
          
          doc.setFillColor(fillR, fillG, fillB);
          for (let i = 0; i < pts.length; i++) {
            const curr = pts[i];
            const next = pts[(i + 1) % pts.length];
            doc.triangle(
              pieceOx + cx, pieceOy + cy,
              pieceOx + curr.x, pieceOy + curr.y,
              pieceOx + next.x, pieceOy + next.y,
              "F"
            );
          }

          // Redraw outline on top
          doc.setDrawColor(r, g, b);
          doc.setLineWidth(0.4);
          for (let i = 0; i < pts.length; i++) {
            const curr = pts[i];
            const next = pts[(i + 1) % pts.length];
            doc.line(
              pieceOx + curr.x, pieceOy + curr.y,
              pieceOx + next.x, pieceOy + next.y
            );
          }

          drewPolygon = true;
        }
      }

      // Fallback: rectangle
      if (!drewPolygon) {
        doc.setFillColor(r + Math.floor((255 - r) * 0.7), g + Math.floor((255 - g) * 0.7), b + Math.floor((255 - b) * 0.7));
        doc.setDrawColor(r, g, b);
        doc.setLineWidth(0.3);
        doc.rect(pieceOx, pieceOy, ppw, pph, "FD");
      }

      // Label
      const maxFs = ps.pieceMainLabelSize || 7;
      const fs = Math.min(maxFs, ppw * 0.25, pph * 0.4);
      if (fs >= 3 && ppw > 8 && pph > 5) {
        doc.setFontSize(fs);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40);
        doc.text(p.label, pieceOx + ppw / 2, pieceOy + pph / 2, { align: "center", baseline: "middle" });
      }

      // Dimensions
      if (ppw > 15 && pph > 10) {
        const subFs = Math.min(ps.pieceSubLabelSize || 5, ppw * 0.18);
        if (subFs >= 2.5) {
          doc.setFontSize(subFs);
          doc.setTextColor(100);
          doc.text(`${p.width.toFixed(0)}×${p.height.toFixed(0)}`, pieceOx + ppw / 2, pieceOy + pph / 2 + fs * 0.6, { align: "center" });
        }
      }
    });

    // Single cut shared edges in PDF
    if (singleCut && sheet.pieces.length > 1) {
      doc.setDrawColor(217, 119, 6); // amber
      doc.setLineWidth(0.5);
      const tol = 2;
      for (let i = 0; i < sheet.pieces.length; i++) {
        for (let j = i + 1; j < sheet.pieces.length; j++) {
          const a = sheet.pieces[i];
          const b = sheet.pieces[j];
          const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
          const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));

          if (Math.abs((a.x + a.width) - b.x) < tol && overlapY > tol) {
            const ex = ox + ((a.x + a.width + b.x) / 2) * scale;
            const ey1 = oy + Math.max(a.y, b.y) * scale;
            const ey2 = oy + Math.min(a.y + a.height, b.y + b.height) * scale;
            doc.setLineDashPattern([2, 1.5], 0);
            doc.line(ex, ey1, ex, ey2);
          }
          if (Math.abs((b.x + b.width) - a.x) < tol && overlapY > tol) {
            const ex = ox + ((b.x + b.width + a.x) / 2) * scale;
            const ey1 = oy + Math.max(a.y, b.y) * scale;
            const ey2 = oy + Math.min(a.y + a.height, b.y + b.height) * scale;
            doc.setLineDashPattern([2, 1.5], 0);
            doc.line(ex, ey1, ex, ey2);
          }
          if (Math.abs((a.y + a.height) - b.y) < tol && overlapX > tol) {
            const ey = oy + ((a.y + a.height + b.y) / 2) * scale;
            const ex1 = ox + Math.max(a.x, b.x) * scale;
            const ex2 = ox + Math.min(a.x + a.width, b.x + b.width) * scale;
            doc.setLineDashPattern([2, 1.5], 0);
            doc.line(ex1, ey, ex2, ey);
          }
          if (Math.abs((b.y + b.height) - a.y) < tol && overlapX > tol) {
            const ey = oy + ((b.y + b.height + a.y) / 2) * scale;
            const ex1 = ox + Math.max(a.x, b.x) * scale;
            const ex2 = ox + Math.min(a.x + a.width, b.x + b.width) * scale;
            doc.setLineDashPattern([2, 1.5], 0);
            doc.line(ex1, ey, ex2, ey);
          }
        }
      }
      doc.setLineDashPattern([], 0); // reset
    }

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
