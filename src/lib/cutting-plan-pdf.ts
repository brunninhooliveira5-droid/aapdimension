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
      const geometry = computeSingleCutGeometry(layout.pieces, kerf, matW, matH);

      // Draw outer contour — solid dark lines
      doc.setDrawColor(40, 40, 40);
      doc.setLineWidth(0.4);
      geometry.contourLines.forEach(line => {
        doc.line(ox + line.x1, oy + line.y1, ox + line.x2, oy + line.y2);
      });

      // Draw internal cut lines — solid red lines
      doc.setDrawColor(220, 30, 30);
      doc.setLineWidth(0.3);
      geometry.cutLines.forEach(line => {
        doc.line(ox + line.x1, oy + line.y1, ox + line.x2, oy + line.y2);
      });

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

// ─── Single Cut Geometry Logic ──────────────────────────────

interface CutLine {
  x1: number; y1: number; x2: number; y2: number;
}

interface PlacedPiece {
  x: number; y: number; width: number; height: number;
  pieceIndex?: number;
}

interface Segment {
  pos: number;
  start: number;
  end: number;
}

interface SingleCutGeometry {
  contourLines: CutLine[];
  cutLines: CutLine[];
}

/**
 * Computes the unified outer contour and internal cut lines for single-cut mode.
 * Adjacent pieces separated by exactly the kerf width share a single cut line
 * centered in the kerf gap. Their outer edges are merged into continuous contour lines.
 */
function computeSingleCutGeometry(
  pieces: PlacedPiece[],
  kerf: number,
  _matW: number,
  _matH: number
): SingleCutGeometry {
  const TOL = 0.5;
  const halfKerf = kerf / 2;
  const hContourSegs: Segment[] = [];
  const vContourSegs: Segment[] = [];
  // Collect internal cuts as segments for merging
  const hInternalSegs: Segment[] = [];
  const vInternalSegs: Segment[] = [];

  for (let i = 0; i < pieces.length; i++) {
    const a = pieces[i];
    const aR = a.x + a.width;
    const aB = a.y + a.height;

    // --- RIGHT EDGE ---
    const rightShared = getSharedRanges(pieces, i, "right", kerf, TOL);
    if (rightShared.length > 0) {
      for (const range of rightShared) {
        vInternalSegs.push({ pos: aR + halfKerf, start: range.start - halfKerf, end: range.end + halfKerf });
      }
      const unshared = subtractRanges(a.y, aB, rightShared);
      for (const u of unshared) {
        vContourSegs.push({ pos: aR + halfKerf, start: u.start - halfKerf, end: u.end + halfKerf });
      }
    } else {
      vContourSegs.push({ pos: aR + halfKerf, start: a.y - halfKerf, end: aB + halfKerf });
    }

    // --- BOTTOM EDGE ---
    const bottomShared = getSharedRanges(pieces, i, "bottom", kerf, TOL);
    if (bottomShared.length > 0) {
      for (const range of bottomShared) {
        hInternalSegs.push({ pos: aB + halfKerf, start: range.start - halfKerf, end: range.end + halfKerf });
      }
      const unshared = subtractRanges(a.x, aR, bottomShared);
      for (const u of unshared) {
        hContourSegs.push({ pos: aB + halfKerf, start: u.start - halfKerf, end: u.end + halfKerf });
      }
    } else {
      hContourSegs.push({ pos: aB + halfKerf, start: a.x - halfKerf, end: aR + halfKerf });
    }

    // --- LEFT EDGE ---
    const leftShared = getSharedRanges(pieces, i, "left", kerf, TOL);
    if (leftShared.length > 0) {
      const unshared = subtractRanges(a.y, aB, leftShared);
      for (const u of unshared) {
        vContourSegs.push({ pos: a.x - halfKerf, start: u.start - halfKerf, end: u.end + halfKerf });
      }
    } else {
      vContourSegs.push({ pos: a.x - halfKerf, start: a.y - halfKerf, end: aB + halfKerf });
    }

    // --- TOP EDGE ---
    const topShared = getSharedRanges(pieces, i, "top", kerf, TOL);
    if (topShared.length > 0) {
      const unshared = subtractRanges(a.x, aR, topShared);
      for (const u of unshared) {
        hContourSegs.push({ pos: a.y - halfKerf, start: u.start - halfKerf, end: u.end + halfKerf });
      }
    } else {
      hContourSegs.push({ pos: a.y - halfKerf, start: a.x - halfKerf, end: aR + halfKerf });
    }
  }

  // Merge collinear contour segments
  const mergedH = mergeCollinearSegments(hContourSegs, kerf + TOL);
  const mergedV = mergeCollinearSegments(vContourSegs, kerf + TOL);

  // Convert merged segments directly to lines (no polygon tracing needed)
  const contourLines: CutLine[] = [];
  for (const s of mergedH) {
    contourLines.push({ x1: s.start, y1: s.pos, x2: s.end, y2: s.pos });
  }
  for (const s of mergedV) {
    contourLines.push({ x1: s.pos, y1: s.start, x2: s.pos, y2: s.end });
  }

  // Merge internal cut segments so they pass through intersections continuously
  const mergedHInternal = mergeCollinearSegments(hInternalSegs, kerf + TOL);
  const mergedVInternal = mergeCollinearSegments(vInternalSegs, kerf + TOL);

  const cutLines: CutLine[] = [];
  for (const s of mergedHInternal) {
    cutLines.push({ x1: s.start, y1: s.pos, x2: s.end, y2: s.pos });
  }
  for (const s of mergedVInternal) {
    cutLines.push({ x1: s.pos, y1: s.start, x2: s.pos, y2: s.end });
  }

  return { contourLines, cutLines };
}

/**
 * Builds a connected contour polygon from merged horizontal and vertical segments.
 * Collects all endpoints, finds intersections, and traces the outline clockwise.
 */
function buildConnectedContour(hSegs: Segment[], vSegs: Segment[]): CutLine[] {
  // Collect all corner points where H and V segments meet
  const TOL = 0.5;
  const points: { x: number; y: number }[] = [];
  const pointSet = new Set<string>();

  const addPoint = (x: number, y: number) => {
    const key = `${x.toFixed(1)},${y.toFixed(1)}`;
    if (!pointSet.has(key)) {
      pointSet.add(key);
      points.push({ x, y });
    }
  };

  // Find intersection points between H and V segments
  for (const h of hSegs) {
    for (const v of vSegs) {
      if (v.pos >= h.start - TOL && v.pos <= h.end + TOL &&
          h.pos >= v.start - TOL && h.pos <= v.end + TOL) {
        addPoint(v.pos, h.pos);
      }
    }
    // Also add H segment endpoints
    addPoint(h.start, h.pos);
    addPoint(h.end, h.pos);
  }
  for (const v of vSegs) {
    addPoint(v.pos, v.start);
    addPoint(v.pos, v.end);
  }

  if (points.length < 3) {
    // Fallback: just return raw segments as lines
    const lines: CutLine[] = [];
    for (const s of hSegs) lines.push({ x1: s.start, y1: s.pos, x2: s.end, y2: s.pos });
    for (const s of vSegs) lines.push({ x1: s.pos, y1: s.start, x2: s.pos, y2: s.end });
    return lines;
  }

  // Sort points to trace clockwise polygon
  // Find centroid
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;

  // Sort by angle from centroid (clockwise)
  const sorted = [...points].sort((a, b) => {
    const angleA = Math.atan2(a.y - cy, a.x - cx);
    const angleB = Math.atan2(b.y - cy, b.x - cx);
    return angleA - angleB;
  });

  // Connect consecutive points to form closed polygon
  const contourLines: CutLine[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i];
    const next = sorted[(i + 1) % sorted.length];
    contourLines.push({ x1: curr.x, y1: curr.y, x2: next.x, y2: next.y });
  }

  return contourLines;
}

/**
 * For a given piece edge direction, find all overlapping ranges with adjacent pieces
 * that are separated by exactly the kerf width.
 */
function getSharedRanges(
  pieces: PlacedPiece[],
  pieceIdx: number,
  direction: "right" | "bottom" | "left" | "top",
  kerf: number,
  tol: number
): { start: number; end: number }[] {
  const a = pieces[pieceIdx];
  const aR = a.x + a.width;
  const aB = a.y + a.height;
  const ranges: { start: number; end: number }[] = [];

  for (let j = 0; j < pieces.length; j++) {
    if (j === pieceIdx) continue;
    const b = pieces[j];
    const bR = b.x + b.width;
    const bB = b.y + b.height;

    if (direction === "right") {
      const gap = b.x - aR;
      if (Math.abs(gap - kerf) < tol) {
        const overlapStart = Math.max(a.y, b.y);
        const overlapEnd = Math.min(aB, bB);
        if (overlapEnd - overlapStart > tol) {
          ranges.push({ start: overlapStart, end: overlapEnd });
        }
      }
    } else if (direction === "bottom") {
      const gap = b.y - aB;
      if (Math.abs(gap - kerf) < tol) {
        const overlapStart = Math.max(a.x, b.x);
        const overlapEnd = Math.min(aR, bR);
        if (overlapEnd - overlapStart > tol) {
          ranges.push({ start: overlapStart, end: overlapEnd });
        }
      }
    } else if (direction === "left") {
      const gap = a.x - bR;
      if (Math.abs(gap - kerf) < tol) {
        const overlapStart = Math.max(a.y, b.y);
        const overlapEnd = Math.min(aB, bB);
        if (overlapEnd - overlapStart > tol) {
          ranges.push({ start: overlapStart, end: overlapEnd });
        }
      }
    } else if (direction === "top") {
      const gap = a.y - bB;
      if (Math.abs(gap - kerf) < tol) {
        const overlapStart = Math.max(a.x, b.x);
        const overlapEnd = Math.min(aR, bR);
        if (overlapEnd - overlapStart > tol) {
          ranges.push({ start: overlapStart, end: overlapEnd });
        }
      }
    }
  }

  return ranges;
}

/**
 * Subtract shared ranges from a full edge range, returning the unshared portions.
 */
function subtractRanges(
  fullStart: number,
  fullEnd: number,
  shared: { start: number; end: number }[]
): { start: number; end: number }[] {
  if (shared.length === 0) return [{ start: fullStart, end: fullEnd }];

  const sorted = [...shared].sort((a, b) => a.start - b.start);
  const result: { start: number; end: number }[] = [];
  let cursor = fullStart;

  for (const s of sorted) {
    if (s.start > cursor) {
      result.push({ start: cursor, end: s.start });
    }
    cursor = Math.max(cursor, s.end);
  }
  if (cursor < fullEnd) {
    result.push({ start: cursor, end: fullEnd });
  }

  return result;
}

/**
 * Merge collinear segments on the same position that are within gapTolerance of each other.
 * This connects edges of adjacent pieces across kerf gaps into single continuous lines.
 */
function mergeCollinearSegments(segments: Segment[], gapTolerance: number): Segment[] {
  // Group by rounded position
  const groups = new Map<string, Segment[]>();
  for (const s of segments) {
    const key = s.pos.toFixed(1);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  const result: Segment[] = [];
  for (const [, segs] of groups) {
    segs.sort((a, b) => a.start - b.start);
    let current = { pos: segs[0].pos, start: segs[0].start, end: segs[0].end };

    for (let i = 1; i < segs.length; i++) {
      if (segs[i].start <= current.end + gapTolerance) {
        current.end = Math.max(current.end, segs[i].end);
      } else {
        result.push({ ...current });
        current = { pos: segs[i].pos, start: segs[i].start, end: segs[i].end };
      }
    }
    result.push({ ...current });
  }

  return result;
}
