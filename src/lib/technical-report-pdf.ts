import jsPDF from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  em_andamento: "Em Andamento",
  finalizado: "Finalizado",
  enviado: "Enviado",
};
export async function generateTechnicalReportPdf(report: any, files?: any[]) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 15;

  // Helper
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
    doc.setFillColor(30, 64, 120);
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
  doc.setFillColor(30, 64, 120);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  addText("DIMENSION CNC", margin, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  addText("Relatório Técnico de Atendimento", margin, 18);

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

  // ====== FOTOS ======
  const photos = (files || []).filter((f: any) => f.mime_type?.startsWith("image/"));
  if (photos.length > 0) {
    drawSectionTitle("REGISTROS FOTOGRÁFICOS");
    for (const photo of photos) {
      try {
        checkPage(55);
        const img = await loadImage(photo.file_path);
        const maxW = contentWidth / 2;
        const maxH = 45;
        const ratio = Math.min(maxW / img.width, maxH / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        doc.addImage(img, "JPEG", margin + 2, y, w, h);
        y += h + 4;
        doc.setFontSize(7);
        addText(photo.file_name, margin + 2, y);
        y += 5;
      } catch {
        // skip broken images
      }
    }
  }

  // ====== ASSINATURAS ======
  checkPage(35);
  drawSectionTitle("ASSINATURAS");
  y += 5;
  doc.setDrawColor(100);
  // Técnico
  doc.line(margin + 5, y + 12, margin + 75, y + 12);
  doc.setFontSize(8);
  addText(report.technician_signature || "Técnico Responsável", margin + 15, y + 17);
  doc.setFontSize(7);
  addText("Assinatura do Técnico", margin + 20, y + 21);
  // Cliente
  doc.line(margin + 95, y + 12, margin + 165, y + 12);
  doc.setFontSize(8);
  addText(report.client_signature || "Cliente", margin + 115, y + 17);
  doc.setFontSize(7);
  addText("Assinatura do Cliente", margin + 112, y + 21);

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
