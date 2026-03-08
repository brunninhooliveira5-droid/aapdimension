import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { SheetCuttingResult, TubeCuttingResult } from "./cutting-plan-engine";

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
}

export function exportCuttingPlanPdf(data: CuttingPlanPdfData) {
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
