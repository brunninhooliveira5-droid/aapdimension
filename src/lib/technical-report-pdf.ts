import jsPDF from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  orcamento: "Orçamento",
  em_andamento: "Em Andamento",
  executado: "Executado",
  finalizado: "Finalizado",
  enviado: "Enviado",
};

interface SignatureOptions {
  technicianSignatureUrl?: string | null;
  technicianCompany?: string;
  signatureSize?: number;
  signatureOffsetX?: number;
  signatureOffsetY?: number;
  signatureZoom?: number;
  signatureDarkness?: number;
}

interface PdfConfig {
  company_name?: string;
  role_title?: string;
  phone?: string;
  email?: string;
  city?: string;
  logo_url?: string;
  footer_text?: string;
  show_logo?: boolean;
  show_photos?: boolean;
  show_checklist?: boolean;
  show_signature?: boolean;
  show_watermark?: boolean;
  watermark_opacity?: number;
  header_color?: string;
  watermark_image_url?: string;
  logo_bg_color?: string;
}

export async function generateTechnicalReportPdf(report: any, files?: any[], signatureOpts?: SignatureOptions, pdfConfig?: PdfConfig) {
  const cfg = pdfConfig || {};
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 15;

  // Parse header color
  const hc = (cfg.header_color || "30,64,120").split(",").map(Number);
  const hr = hc[0] || 30, hg = hc[1] || 64, hb = hc[2] || 120;

  // Load watermark image
  let watermarkImg: HTMLImageElement | null = null;
  if (cfg.show_watermark && cfg.watermark_image_url) {
    try { watermarkImg = await loadImage(cfg.watermark_image_url); } catch { /* ignore */ }
  }

  // Load logo
  let logoImg: HTMLImageElement | null = null;
  if (cfg.show_logo !== false && cfg.logo_url) {
    try { logoImg = await loadImage(cfg.logo_url); } catch { /* ignore */ }
  }

  const addText = (text: string, x: number, yPos: number, opts?: any) => {
    doc.text(text, x, yPos, opts);
  };

  const checkPage = (needed: number) => {
    if (y + needed > 270) {
      doc.addPage();
      y = 15;
    }
  };

  const drawSectionTitle = (title: string) => {
    checkPage(12);
    doc.setFillColor(hr, hg, hb);
    doc.rect(margin, y, contentWidth, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    addText(title, margin + 3, y + 5);
    doc.setTextColor(0, 0, 0);
    y += 10;
  };

  const drawField = (label: string, value: string) => {
    checkPage(8);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    addText(label + ":", margin + 2, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value || "-", contentWidth - 40);
    addText(lines.join("\n"), margin + 42, y);
    y += Math.max(5, lines.length * 4) + 1;
  };

  const drawTextBlock = (label: string, value: string) => {
    checkPage(12);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    addText(label + ":", margin + 2, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value || "N/A", contentWidth - 4);
    lines.forEach((line: string) => {
      checkPage(5);
      addText(line, margin + 4, y);
      y += 4;
    });
    y += 2;
  };

  // ====== HEADER ======
  doc.setFillColor(hr, hg, hb);
  doc.rect(0, 0, pageWidth, 28, "F");

  // Logo
  let logoOffset = 0;
  if (logoImg && cfg.show_logo !== false) {
    const lMaxH = 18;
    const lRatio = Math.min(30 / logoImg.width, lMaxH / logoImg.height);
    const lw = logoImg.width * lRatio;
    const lh = logoImg.height * lRatio;
    // Apply tint if needed
    if (cfg.logo_bg_color) {
      const canvas = document.createElement("canvas");
      canvas.width = logoImg.width;
      canvas.height = logoImg.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(logoImg, 0, 0);
      ctx.globalCompositeOperation = "source-in";
      ctx.fillStyle = cfg.logo_bg_color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      doc.addImage(canvas.toDataURL("image/png"), "PNG", margin, 5, lw, lh);
    } else {
      doc.addImage(logoImg, "PNG", margin, 5, lw, lh);
    }
    logoOffset = lw + 4;
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  addText(cfg.company_name || "DIMENSION CNC", margin + logoOffset, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  addText("Relatório Técnico de Atendimento", margin + logoOffset, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  const reportNum = `Nº ${report.report_number || "—"}`;
  addText(reportNum, pageWidth - margin - doc.getTextWidth(reportNum), 12);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const dateStr = report.attendance_date
    ? format(new Date(report.attendance_date), "dd/MM/yyyy")
    : format(new Date(), "dd/MM/yyyy");
  addText(dateStr, pageWidth - margin - doc.getTextWidth(dateStr), 18);
  const statusText = `Status: ${statusLabels[report.status] || report.status || "—"}`;
  addText(statusText, pageWidth - margin - doc.getTextWidth(statusText), 24);

  doc.setTextColor(0, 0, 0);
  y = 33;

  // ====== DADOS DO ATENDIMENTO ======
  drawSectionTitle("DADOS DO ATENDIMENTO");
  drawField("Data", dateStr);
  drawField("Horário", `${report.time_start || "--:--"} às ${report.time_end || "--:--"}`);
  drawField("Técnico Responsável", report.technician_name);
  drawField("Status", statusLabels[report.status] || report.status || "—");

  // ====== DADOS DO CLIENTE ======
  drawSectionTitle("DADOS DO CLIENTE");
  drawField("Cliente", report.client_name);
  drawField("Empresa", report.client_company);
  drawField("Cidade / Local", report.client_city);

  // ====== DADOS DO EQUIPAMENTO ======
  drawSectionTitle("DADOS DO EQUIPAMENTO");
  drawField("Equipamento", report.equipment_name);
  drawField("Modelo", report.machine_model);
  drawField("Nº de Série", report.serial_number);
  if (report.related_ticket) drawField("Chamado", report.related_ticket);

  // ====== DESCRIÇÃO DO ATENDIMENTO ======
  drawSectionTitle("DESCRIÇÃO DO ATENDIMENTO");
  drawTextBlock("Problema Relatado", report.problem_reported);
  drawTextBlock("Diagnóstico Técnico", report.technical_diagnosis);
  drawTextBlock("Serviço Executado", report.service_performed);
  drawTextBlock("Peças Substituídas", report.parts_replaced);
  drawTextBlock("Testes Realizados", report.tests_performed);
  drawTextBlock("Recomendações ao Cliente", report.recommendations);
  drawTextBlock("Observações Finais", report.final_observations);

  // ====== CHECKLIST ======
  if (cfg.show_checklist !== false) {
    const checklist = Array.isArray(report.checklist) ? report.checklist : [];
    if (checklist.length > 0) {
      drawSectionTitle("CHECKLIST TÉCNICO");
      checklist.forEach((item: any) => {
        checkPage(6);
        doc.setFontSize(8);
        const mark = item.checked ? "☑" : "☐";
        addText(`${mark}  ${item.label}`, margin + 4, y);
        y += 5;
      });
      y += 2;
    }
  }

  // ====== FOTOS ======
  const photos = (files || []).filter((f: any) => f.mime_type?.startsWith("image/"));
  if (photos.length > 0) {
    drawSectionTitle("REGISTROS FOTOGRÁFICOS");
    for (const photo of photos) {
      try {
        checkPage(75);
        const img = await loadImage(photo.file_path);
        const maxW = contentWidth * 0.7;
        const maxH = 65;
        const ratio = Math.min(maxW / img.width, maxH / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        doc.addImage(img, "JPEG", margin + 2, y, w, h);
        y += h + 3;
        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        addText(photo.file_name, margin + 2, y);
        y += 4;
        if (photo.description) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          const descLines = doc.splitTextToSize(photo.description, contentWidth - 4);
          descLines.forEach((line: string) => {
            checkPage(5);
            addText(line, margin + 2, y);
            y += 4;
          });
        }
        doc.setFont("helvetica", "normal");
        y += 3;
      } catch {
        // skip broken images
      }
    }
  }

  // ====== ASSINATURAS ======
  checkPage(60);
  drawSectionTitle("ASSINATURAS");
  y += 3;

  const sigColWidth = contentWidth / 2 - 5;
  const sigLeftX = margin;
  const sigRightX = margin + sigColWidth + 10;
  const sigStartY = y;

  // Fixed signature area height — matches the preview container
  const sigAreaH = signatureOpts?.signatureSize || 35;
  let techSigRenderedH = sigAreaH; // actual drawn height for client constraint

  // --- Technician Signature ---
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  addText("Assinatura do Técnico", sigLeftX + 2, y);
  y += 5;

  let techSigDrawn = false;
  const techSigAreaTop = y;
  const techLineY = techSigAreaTop + sigAreaH; // line is always at bottom of fixed area

  if (signatureOpts?.technicianSignatureUrl) {
    try {
      let sigImg = await loadImage(signatureOpts.technicianSignatureUrl);
      const darkness = signatureOpts?.signatureDarkness || 100;
      if (darkness !== 100) {
        sigImg = await applyDarknessFilter(sigImg, darkness);
      }
      const zoom = (signatureOpts?.signatureZoom || 100) / 100;
      const sigMaxW = sigColWidth - 10;
      const sigRatio = Math.min(sigMaxW / sigImg.width, sigAreaH / sigImg.height) * zoom;
      const sigW = sigImg.width * sigRatio;
      const sigH = sigImg.height * sigRatio;
      techSigRenderedH = sigH;
      // Bottom-align: signature bottom edge sits ON the line
      const offX = (signatureOpts?.signatureOffsetX || 0) * 0.3;
      const offY = (signatureOpts?.signatureOffsetY || 0) * 0.3;
      doc.addImage(sigImg, "PNG", sigLeftX + 5 + offX, techLineY - sigH + offY, sigW, sigH);
      techSigDrawn = true;
    } catch {
      // fallback to line
    }
  }

  y = techLineY;

  // Line
  doc.setDrawColor(100);
  doc.line(sigLeftX + 2, y, sigLeftX + sigColWidth - 2, y);
  y += 4;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  addText(report.technician_signature || report.technician_name || "Técnico Responsável", sigLeftX + 5, y);
  y += 4;
  if (signatureOpts?.technicianCompany) {
    doc.setFontSize(7);
    addText(signatureOpts.technicianCompany, sigLeftX + 5, y);
    y += 4;
  }
  doc.setFontSize(7);
  addText(`Data: ${dateStr}`, sigLeftX + 5, y);

  const techEndY = y;

  // --- Client Signature ---
  let cy = sigStartY;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  addText("Assinatura do Cliente", sigRightX + 2, cy);
  cy += 5;

  const clientSigAreaTop = cy;
  const clientLineY = clientSigAreaTop + sigAreaH; // same fixed area height

  let clientSigDrawn = false;
  if (report.client_signature_image_url) {
    try {
      const clientImg = await loadImage(report.client_signature_image_url);
      const cSigMaxW = sigColWidth - 10;
      const cSigMaxH = Math.min(sigAreaH, techSigRenderedH);
      const cRatio = Math.min(cSigMaxW / clientImg.width, cSigMaxH / clientImg.height);
      const cW = clientImg.width * cRatio;
      const cH = clientImg.height * cRatio;
      // Bottom-align: client signature bottom edge sits ON the line
      doc.addImage(clientImg, "PNG", sigRightX + 5, clientLineY - cH, cW, cH);
      clientSigDrawn = true;
    } catch {
      // fallback
    }
  }

  cy = clientLineY;

  doc.setDrawColor(100);
  doc.line(sigRightX + 2, cy, sigRightX + sigColWidth - 2, cy);
  cy += 4;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  addText(report.client_signature || "Cliente", sigRightX + 5, cy);
  cy += 4;
  doc.setFontSize(7);
  addText(`Data: ${dateStr}`, sigRightX + 5, cy);

  y = Math.max(techEndY, cy) + 8;

  // ====== FOOTER ======
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(130);
    const footerText = `Dimension CNC — Relatório Técnico #${report.report_number || ""} — Página ${i}/${totalPages}`;
    addText(footerText, margin, 290);
    doc.setTextColor(0);
  }

  doc.save(`relatorio-tecnico-${report.report_number || "novo"}.pdf`);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function applyDarknessFilter(img: HTMLImageElement, darkness: number): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.filter = `contrast(${darkness / 100}) brightness(${Math.min(1, 200 / darkness)})`;
    ctx.drawImage(img, 0, 0);
    const processed = new Image();
    processed.onload = () => resolve(processed);
    processed.src = canvas.toDataURL("image/png");
  });
}
