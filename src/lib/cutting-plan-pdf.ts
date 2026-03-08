import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { SheetCuttingResult, TubeCuttingResult } from "./cutting-plan-engine";

export type PdfScale = "a4" | "1:1";

interface CuttingPlanPdfData {
  planName: string;
  planType: "chapa" | "tubo";
  materialName: string;
  dimensions: string;
  unitPrice: number;
  kerfWidth: number;
  pieces: { width?: number; height?: number; length?: number; quantity: number }[];
  result: SheetCuttingResult | TubeCuttingResult;
  clientName?: string;
  projectName?: string;
  scale?: PdfScale;
  folderName?: string;
  singleCut?: boolean;
}

export interface ExportOptions {
  exportA4: boolean;
  exportRealScale: boolean;
  folderName: string;
  singleCut?: boolean;
}

export async function exportCuttingPlanWithOptions(data: Omit<CuttingPlanPdfData, "scale">, options: ExportOptions) {
  if (options.exportA4) {
    exportCuttingPlanPdf({ ...data, scale: "a4" });
  }
  if (options.exportRealScale) {
    await exportCuttingPlanPdf({ ...data, scale: "1:1", folderName: options.folderName, singleCut: options.singleCut });
  }
}

const MM_TO_PT = 2.83465; // 1mm = 2.83465 points

export async function exportCuttingPlanPdf(data: CuttingPlanPdfData) {
  const scale = data.scale || "a4";
  const isRealScale = scale === "1:1";

  // For 1:1 sheet cutting, create ZIP with individual PDFs
  if (isRealScale && data.planType === "chapa" && "layouts" in data.result) {
    return exportSheetRealScale(data);
  }

  // Default A4 export
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Plano de Corte", pw / 2, 20, { align: "center" });

  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text(data.planName || "Sem nome", pw / 2, 28, { align: "center" });

  // Info section
  doc.setFontSize(10);
  let y = 40;
  const line = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}: `, 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, 14 + doc.getTextWidth(`${label}: `), y);
    y += 6;
  };

  line("Tipo", data.planType === "chapa" ? "Corte de Chapa" : "Corte de Tubos");
  line("Material", data.materialName);
  line("Dimensões", data.dimensions);
  line("Valor unitário", `R$ ${data.unitPrice.toFixed(2)}`);
  line("Largura da serra", `${data.kerfWidth} mm`);
  if (data.clientName) line("Cliente", data.clientName);
  if (data.projectName) line("Projeto", data.projectName);
  line("Data", new Date().toLocaleDateString("pt-BR"));
  y += 4;

  // Pieces table
  if (data.planType === "chapa") {
    autoTable(doc, {
      startY: y,
      head: [["Peça", "Largura (mm)", "Altura (mm)", "Quantidade"]],
      body: data.pieces.map((p, i) => [`Peça ${i + 1}`, String(p.width ?? 0), String(p.height ?? 0), String(p.quantity)]),
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
    });
  } else {
    autoTable(doc, {
      startY: y,
      head: [["Peça", "Comprimento (mm)", "Quantidade"]],
      body: data.pieces.map((p, i) => [`Peça ${i + 1}`, String(p.length ?? 0), String(p.quantity)]),
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
    });
  }

  y = (doc as any).lastAutoTable.finalY + 10;

  // Results
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Resultado", 14, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const r = data.result;
  if ("totalSheets" in r) {
    line("Chapas necessárias", String(r.totalSheets));
  } else {
    line("Barras necessárias", String(r.totalBars));
  }
  line("Aproveitamento", `${r.totalUtilization.toFixed(1)}%`);

  if ("totalSheets" in r) {
    line("Sobra total", `${(r.totalWaste / 1_000_000).toFixed(4)} m²`);
  } else {
    line("Sobra total", `${r.totalWaste.toFixed(1)} mm`);
  }

  line("Custo estimado", `R$ ${r.estimatedCost.toFixed(2)}`);

  // Per-unit breakdown
  y += 4;
  if ("layouts" in r && r.layouts.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Chapa", "Peças", "Aproveitamento"]],
      body: r.layouts.map((l, i) => [
        `Chapa ${i + 1}`,
        String(l.pieces.length),
        `${l.utilization.toFixed(1)}%`,
      ]),
      theme: "grid",
      headStyles: { fillColor: [34, 197, 94] },
    });

    // Draw A4-scaled layouts
    drawSheetLayoutsA4(doc, r, data);
  } else if ("bars" in r && r.bars.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Barra", "Peças", "Aproveitamento", "Sobra (mm)"]],
      body: r.bars.map((b, i) => [
        `Barra ${i + 1}`,
        String(b.segments.length),
        `${b.utilization.toFixed(1)}%`,
        b.wasteLength.toFixed(1),
      ]),
      theme: "grid",
      headStyles: { fillColor: [34, 197, 94] },
    });
  }

  const filename = `plano-corte-${(data.planName || "sem-nome").replace(/\s+/g, "-").toLowerCase()}.pdf`;
  doc.save(filename);
}

// Colors for pieces
const PIECE_COLORS: [number, number, number][] = [
  [59, 130, 246],   // blue
  [34, 197, 94],    // green
  [249, 115, 22],   // orange
  [168, 85, 247],   // purple
  [236, 72, 153],   // pink
  [14, 165, 233],   // sky
  [234, 179, 8],    // yellow
  [239, 68, 68],    // red
];

function getPieceColorPdf(index: number): [number, number, number] {
  return PIECE_COLORS[index % PIECE_COLORS.length];
}

function drawSheetLayoutsA4(doc: jsPDF, r: SheetCuttingResult, data: CuttingPlanPdfData) {
  const dims = data.dimensions.replace(/\s/g, "").split("x");
  const matW = parseFloat(dims[0]) || 1000;
  const matH = parseFloat(dims[1]) || 1000;
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxDrawW = pw - margin * 2;
  const maxDrawH = ph - margin * 2 - 30; // leave space for title

  r.layouts.forEach((layout, li) => {
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Chapa ${li + 1} — Aproveitamento: ${layout.utilization.toFixed(1)}%`, pw / 2, 15, { align: "center" });

    // Calculate scale to fit A4
    const scaleX = maxDrawW / matW;
    const scaleY = maxDrawH / matH;
    const s = Math.min(scaleX, scaleY);
    const drawW = matW * s;
    const drawH = matH * s;
    const ox = (pw - drawW) / 2;
    const oy = 25;

    // Material boundary
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.5);
    doc.setFillColor(240, 240, 240);
    doc.rect(ox, oy, drawW, drawH, "FD");

    // Dimension labels
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`${matW} mm`, ox + drawW / 2, oy - 3, { align: "center" });
    doc.text(`${matH} mm`, ox - 3, oy + drawH / 2, { align: "center", angle: 90 });

    // Draw pieces
    layout.pieces.forEach((p, pi) => {
      const px = ox + p.x * s;
      const py = oy + p.y * s;
      const pW = p.width * s;
      const pH = p.height * s;
      const color = getPieceColorPdf(p.pieceIndex ?? pi);

      doc.setFillColor(color[0], color[1], color[2]);
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.3);
      doc.rect(px, py, pW, pH, "FD");

      // Piece label
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(Math.min(7, pW * 0.3, pH * 0.3));
      doc.setFont("helvetica", "bold");
      const label = `P${(p.pieceIndex ?? pi) + 1}`;
      const dimLabel = `${p.width}x${p.height}`;
      if (pW > 12 && pH > 8) {
        doc.text(label, px + pW / 2, py + pH / 2 - 1.5, { align: "center" });
        doc.setFontSize(Math.min(5, pW * 0.2, pH * 0.2));
        doc.text(dimLabel, px + pW / 2, py + pH / 2 + 2.5, { align: "center" });
      }
    });

    // Scrap areas
    const maxX = layout.pieces.length > 0 ? Math.max(...layout.pieces.map(p => p.x + p.width)) : 0;
    const maxY = layout.pieces.length > 0 ? Math.max(...layout.pieces.map(p => p.y + p.height)) : 0;

    doc.setTextColor(200, 100, 0);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");

    if (maxX < matW) {
      const sx = ox + maxX * s;
      const sw = (matW - maxX) * s;
      doc.setDrawColor(230, 140, 50);
      doc.setLineWidth(0.3);
      doc.setLineDashPattern([2, 2], 0);
      doc.rect(sx, oy, sw, drawH);
      if (sw > 10) {
        doc.text(`Sobra ${(matW - maxX).toFixed(0)}x${matH} mm`, sx + sw / 2, oy + drawH / 2, { align: "center" });
      }
    }
    if (maxY < matH) {
      const sy = oy + maxY * s;
      const sh = (matH - maxY) * s;
      const clipW = Math.min(matW, maxX) * s;
      doc.setDrawColor(230, 140, 50);
      doc.setLineWidth(0.3);
      doc.rect(ox, sy, clipW, sh);
      if (sh > 6 && clipW > 10) {
        doc.text(`Sobra ${Math.min(matW, maxX).toFixed(0)}x${(matH - maxY).toFixed(0)} mm`, ox + clipW / 2, sy + sh / 2, { align: "center" });
      }
    }

    doc.setLineDashPattern([], 0);

    // Legend
    const legendY = oy + drawH + 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("Legenda:", margin, legendY);
    doc.setFont("helvetica", "normal");

    doc.setFillColor(240, 240, 240);
    doc.rect(margin + 25, legendY - 3, 6, 4, "F");
    doc.text("Material", margin + 33, legendY);

    doc.setFillColor(59, 130, 246);
    doc.rect(margin + 55, legendY - 3, 6, 4, "F");
    doc.text("Peça", margin + 63, legendY);

    doc.setDrawColor(230, 140, 50);
    doc.setLineDashPattern([2, 2], 0);
    doc.rect(margin + 80, legendY - 3, 6, 4);
    doc.setLineDashPattern([], 0);
    doc.text("Sobra/Retalho", margin + 88, legendY);
  });
}

async function exportSheetRealScale(data: CuttingPlanPdfData) {
  const dims = data.dimensions.replace(/\s/g, "").split("x");
  const matW = parseFloat(dims[0]) || 1000;
  const matH = parseFloat(dims[1]) || 1000;
  const r = data.result as SheetCuttingResult;
  const folderName = data.folderName || "plano-corte-1x1";
  const singleCut = data.singleCut ?? false;
  const kerf = data.kerfWidth || 0;

  const zip = new JSZip();
  const folder = zip.folder(folderName)!;

  r.layouts.forEach((layout, li) => {
    const pageMargin = 5;
    const pageW = matW + pageMargin * 2;
    const pageH = matH + pageMargin * 2;

    const doc = new jsPDF({
      orientation: pageW > pageH ? "landscape" : "portrait",
      unit: "mm",
      format: [pageW, pageH],
    });

    const ox = pageMargin;
    const oy = pageMargin;

    // Material boundary only
    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(0.5);
    doc.setFillColor(245, 245, 245);
    doc.rect(ox, oy, matW, matH, "FD");

    if (singleCut && kerf > 0) {
      // === CORTE ÚNICO MODE ===
      // Only draw cut lines — no filled piece rectangles

      // Piece labels (dark text, no background)
      layout.pieces.forEach((p, pi) => {
        doc.setTextColor(40, 40, 40);
        const fontSize = Math.min(12, p.width * 0.15, p.height * 0.15);
        if (fontSize >= 3) {
          doc.setFontSize(fontSize);
          doc.setFont("helvetica", "bold");
          doc.text(`P${(p.pieceIndex ?? pi) + 1}`, ox + p.x + p.width / 2, oy + p.y + p.height / 2 - fontSize * 0.2, { align: "center" });
          doc.setFontSize(Math.max(3, fontSize * 0.7));
          doc.text(`${p.width}x${p.height}`, ox + p.x + p.width / 2, oy + p.y + p.height / 2 + fontSize * 0.5, { align: "center" });
        }
      });

      // Collect unique shared cut lines between adjacent pieces
      const cutLines = computeSharedCutLines(layout.pieces, kerf, matW, matH);

      // Draw cut lines — solid red lines
      doc.setDrawColor(220, 30, 30);
      doc.setLineWidth(0.3);

      cutLines.forEach(line => {
        doc.line(ox + line.x1, oy + line.y1, ox + line.x2, oy + line.y2);
      });
    } else {
      // === NORMAL MODE — independent contours ===
      layout.pieces.forEach((p, pi) => {
        const color = getPieceColorPdf(p.pieceIndex ?? pi);
        doc.setFillColor(color[0], color[1], color[2]);
        doc.setDrawColor(40, 40, 40);
        doc.setLineWidth(0.3);
        doc.rect(ox + p.x, oy + p.y, p.width, p.height, "FD");

        doc.setTextColor(255, 255, 255);
        const fontSize = Math.min(12, p.width * 0.15, p.height * 0.15);
        if (fontSize >= 3) {
          doc.setFontSize(fontSize);
          doc.setFont("helvetica", "bold");
          doc.text(`P${(p.pieceIndex ?? pi) + 1}`, ox + p.x + p.width / 2, oy + p.y + p.height / 2 - fontSize * 0.2, { align: "center" });
          doc.setFontSize(Math.max(3, fontSize * 0.7));
          doc.text(`${p.width}x${p.height}`, ox + p.x + p.width / 2, oy + p.y + p.height / 2 + fontSize * 0.5, { align: "center" });
        }
      });
    }

    const pdfBlob = doc.output("blob");
    folder.file(`chapa-${li + 1}.pdf`, pdfBlob);
  });

  const zipBlob = await zip.generateAsync({ type: "blob" });
  saveAs(zipBlob, `${folderName}.zip`);
}

// ─── Shared Cut Lines Logic ────────────────────────────────

interface CutLine {
  x1: number; y1: number; x2: number; y2: number;
}

interface PlacedPiece {
  x: number; y: number; width: number; height: number;
  pieceIndex?: number;
}

/**
 * Finds unique shared cut lines between adjacent pieces.
 * A shared cut is a line at the center of the kerf gap between two pieces
 * that share a parallel edge.
 * Also adds border cuts along the material edge where pieces touch.
 */
function computeSharedCutLines(
  pieces: PlacedPiece[],
  kerf: number,
  matW: number,
  matH: number
): CutLine[] {
  const TOLERANCE = 0.5; // mm tolerance for adjacency detection
  const lines: CutLine[] = [];
  const lineSet = new Set<string>();

  const addLine = (x1: number, y1: number, x2: number, y2: number) => {
    // Normalize line direction for dedup
    const key = x1 < x2 || (x1 === x2 && y1 < y2)
      ? `${x1.toFixed(2)},${y1.toFixed(2)}-${x2.toFixed(2)},${y2.toFixed(2)}`
      : `${x2.toFixed(2)},${y2.toFixed(2)}-${x1.toFixed(2)},${y1.toFixed(2)}`;
    if (!lineSet.has(key)) {
      lineSet.add(key);
      lines.push({ x1, y1, x2, y2 });
    }
  };

  for (let i = 0; i < pieces.length; i++) {
    const a = pieces[i];
    const aRight = a.x + a.width;
    const aBottom = a.y + a.height;

    for (let j = i + 1; j < pieces.length; j++) {
      const b = pieces[j];
      const bRight = b.x + b.width;
      const bBottom = b.y + b.height;

      // Check vertical shared edge (A's right edge meets B's left edge)
      const gapH = b.x - aRight;
      if (Math.abs(gapH - kerf) < TOLERANCE) {
        const overlapTop = Math.max(a.y, b.y);
        const overlapBot = Math.min(aBottom, bBottom);
        if (overlapBot - overlapTop > TOLERANCE) {
          const cx = aRight + kerf / 2;
          addLine(cx, overlapTop, cx, overlapBot);
        }
      }

      // Check vertical shared edge (B's right edge meets A's left edge)
      const gapH2 = a.x - bRight;
      if (Math.abs(gapH2 - kerf) < TOLERANCE) {
        const overlapTop = Math.max(a.y, b.y);
        const overlapBot = Math.min(aBottom, bBottom);
        if (overlapBot - overlapTop > TOLERANCE) {
          const cx = bRight + kerf / 2;
          addLine(cx, overlapTop, cx, overlapBot);
        }
      }

      // Check horizontal shared edge (A's bottom edge meets B's top edge)
      const gapV = b.y - aBottom;
      if (Math.abs(gapV - kerf) < TOLERANCE) {
        const overlapLeft = Math.max(a.x, b.x);
        const overlapRight = Math.min(aRight, bRight);
        if (overlapRight - overlapLeft > TOLERANCE) {
          const cy = aBottom + kerf / 2;
          addLine(overlapLeft, cy, overlapRight, cy);
        }
      }

      // Check horizontal shared edge (B's bottom edge meets A's top edge)
      const gapV2 = a.y - bBottom;
      if (Math.abs(gapV2 - kerf) < TOLERANCE) {
        const overlapLeft = Math.max(a.x, b.x);
        const overlapRight = Math.min(aRight, bRight);
        if (overlapRight - overlapLeft > TOLERANCE) {
          const cy = bBottom + kerf / 2;
          addLine(overlapLeft, cy, overlapRight, cy);
        }
      }
    }

    // Border cuts — outer edges of pieces that touch material boundary
    // Left border
    if (a.x < TOLERANCE) {
      addLine(0, a.y, 0, aBottom);
    }
    // Top border
    if (a.y < TOLERANCE) {
      addLine(a.x, 0, aRight, 0);
    }
    // Right border (piece edge, not shared)
    // Only add if no neighbor to the right
    // Bottom border (piece edge, not shared)
    // These are handled by shared cuts or are individual piece outlines
  }

  // Add outer contour cuts for piece edges that are NOT shared with another piece
  for (let i = 0; i < pieces.length; i++) {
    const a = pieces[i];
    const aRight = a.x + a.width;
    const aBottom = a.y + a.height;

    // Right edge — check if shared
    const hasRightNeighbor = pieces.some((b, j) => {
      if (j === i) return false;
      const gap = b.x - aRight;
      if (Math.abs(gap - kerf) >= TOLERANCE) return false;
      const overlapTop = Math.max(a.y, b.y);
      const overlapBot = Math.min(aBottom, b.y + b.height);
      return overlapBot - overlapTop > TOLERANCE;
    });
    if (!hasRightNeighbor) {
      addLine(aRight, a.y, aRight, aBottom);
    }

    // Bottom edge — check if shared
    const hasBottomNeighbor = pieces.some((b, j) => {
      if (j === i) return false;
      const gap = b.y - aBottom;
      if (Math.abs(gap - kerf) >= TOLERANCE) return false;
      const overlapLeft = Math.max(a.x, b.x);
      const overlapRight = Math.min(aRight, b.x + b.width);
      return overlapRight - overlapLeft > TOLERANCE;
    });
    if (!hasBottomNeighbor) {
      addLine(a.x, aBottom, aRight, aBottom);
    }

    // Left edge if not at material border and not shared
    if (a.x >= TOLERANCE) {
      const hasLeftNeighbor = pieces.some((b, j) => {
        if (j === i) return false;
        const gap = a.x - (b.x + b.width);
        if (Math.abs(gap - kerf) >= TOLERANCE) return false;
        const overlapTop = Math.max(a.y, b.y);
        const overlapBot = Math.min(aBottom, b.y + b.height);
        return overlapBot - overlapTop > TOLERANCE;
      });
      if (!hasLeftNeighbor) {
        addLine(a.x, a.y, a.x, aBottom);
      }
    }

    // Top edge if not at material border and not shared
    if (a.y >= TOLERANCE) {
      const hasTopNeighbor = pieces.some((b, j) => {
        if (j === i) return false;
        const gap = a.y - (b.y + b.height);
        if (Math.abs(gap - kerf) >= TOLERANCE) return false;
        const overlapLeft = Math.max(a.x, b.x);
        const overlapRight = Math.min(aRight, b.x + b.width);
        return overlapRight - overlapLeft > TOLERANCE;
      });
      if (!hasTopNeighbor) {
        addLine(a.x, a.y, aRight, a.y);
      }
    }
  }

  return lines;
}
