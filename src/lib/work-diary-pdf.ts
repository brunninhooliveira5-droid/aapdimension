import jsPDF from "jspdf";
import { format } from "date-fns";

const typeLabels: Record<string, string> = {
  obra: "Obra", servico: "Serviço", atividade_interna: "Atividade Interna",
  inspecao: "Inspeção", visita_tecnica: "Visita Técnica", outro: "Outro",
};
const statusLabels: Record<string, string> = {
  concluido: "Concluído", parcialmente_concluido: "Parcialmente Concluído",
  nao_concluido: "Não Concluído", impedimento: "Impedimento",
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function generateWorkDiaryPdf(entry: any, files: any[], config: any, profile: any) {
  const doc = new jsPDF("p", "mm", "a4");
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 15;
  const cw = pw - m * 2;
  let y = 15;
  const cfg = config || {};
  const dateStr = entry.entry_date ? format(new Date(entry.entry_date), "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy");
  const hc = (cfg.header_color || "30,64,120").split(",").map(Number);
  const [hR, hG, hB] = [hc[0] || 30, hc[1] || 64, hc[2] || 120];

  const checkPage = (n: number) => { if (y + n > ph - 20) { doc.addPage(); y = 15; } };

  const sectionTitle = (title: string) => {
    checkPage(12);
    doc.setFillColor(hR, hG, hB);
    doc.rect(m, y, cw, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(title, m + 3, y + 5);
    doc.setTextColor(0, 0, 0);
    y += 10;
  };

  const field = (label: string, value: string) => {
    checkPage(8);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(label + ":", m + 2, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value || "-", cw - 40);
    doc.text(lines.join("\n"), m + 42, y);
    y += Math.max(5, lines.length * 4) + 1;
  };

  const textBlock = (label: string, value: string) => {
    if (!value) return;
    checkPage(12);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(label + ":", m + 2, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value, cw - 4);
    lines.forEach((line: string) => { checkPage(5); doc.text(line, m + 4, y); y += 4; });
    y += 2;
  };

  // === HEADER ===
  doc.setFillColor(hR, hG, hB);
  doc.rect(0, 0, pw, 28, "F");

  let headerX = m;
  if (cfg.show_logo !== false && cfg.logo_url) {
    try {
      const logo = await loadImage(cfg.logo_url);
      const lh = 18;
      const lw = (logo.width / logo.height) * lh;
      doc.addImage(logo, "PNG", m, 5, lw, lh);
      headerX = m + lw + 5;
    } catch { /* skip */ }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(cfg.company_name || "DIÁRIO DE OBRA", headerX, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Diário de Obra / Serviço", headerX, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  const numText = `Nº ${entry.entry_number || "—"}`;
  doc.text(numText, pw - m - doc.getTextWidth(numText), 12);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(dateStr, pw - m - doc.getTextWidth(dateStr), 18);

  doc.setTextColor(0, 0, 0);
  y = 33;

  // === DADOS GERAIS ===
  sectionTitle("DADOS GERAIS");
  field("Data", dateStr);
  if (cfg.show_time !== false) field("Horário", `${entry.time_start || "--:--"} às ${entry.time_end || "--:--"}`);
  field("Título", entry.title);
  field("Tipo", typeLabels[entry.activity_type] || entry.activity_type);
  field("Local", entry.location);
  field("Responsável", entry.responsible);
  
  const deadlineStr = entry.execution_deadline
    ? format(new Date(entry.execution_deadline), "dd/MM/yyyy")
    : "Prazo não definido";
  field("Prazo de Execução", deadlineStr);

  if (entry.unit_value) field("Unitário", entry.unit_value);

  // === SERVIÇOS CONTRATADOS ===
  const services: { name: string }[] = Array.isArray(entry.contracted_services) ? entry.contracted_services : [];
  if (services.length > 0) {
    sectionTitle("SERVIÇOS CONTRATADOS");
    services.forEach((s, i) => {
      checkPage(6);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`${i + 1}. ${s.name}`, m + 4, y);
      y += 5;
    });
    y += 2;
  }

  // === MATERIAIS NECESSÁRIOS ===
  const materials: { name: string; quantity: string; has: string; missing: string }[] = Array.isArray(entry.required_materials) ? entry.required_materials : [];
  if (materials.length > 0) {
    sectionTitle("MATERIAIS NECESSÁRIOS");
    // Table header
    checkPage(8);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    const colX = [m + 2, m + 82, m + 107, m + 132];
    doc.text("Material", colX[0], y);
    doc.text("Qtd", colX[1], y);
    doc.text("Tem", colX[2], y);
    doc.text("Falta", colX[3], y);
    y += 2;
    doc.setDrawColor(180);
    doc.line(m + 2, y, m + cw - 2, y);
    y += 3;
    doc.setFont("helvetica", "normal");
    materials.forEach((mat) => {
      checkPage(6);
      doc.text(mat.name || "-", colX[0], y);
      doc.text(mat.quantity || "-", colX[1], y);
      doc.text(mat.has || "-", colX[2], y);
      doc.text(mat.missing || "-", colX[3], y);
      y += 5;
    });
    y += 2;
  }

  // === DESCRIÇÃO ===
  sectionTitle("DESCRIÇÃO DA ATIVIDADE");
  textBlock("Atividade Executada", entry.description);
  textBlock("Processo de Execução", entry.execution_process);
  if (cfg.show_materials !== false) textBlock("Materiais Utilizados", entry.materials_used);
  textBlock("Equipe Envolvida", entry.team);
  textBlock("Observações", entry.observations);

  // === STATUS ===
  if (cfg.show_status !== false) {
    sectionTitle("STATUS");
    field("Status", statusLabels[entry.status] || entry.status);
    if (entry.pending_reason && (entry.status === "nao_concluido" || entry.status === "parcialmente_concluido")) {
      textBlock("Motivo / Pendência", entry.pending_reason);
    }
    if (entry.impediment_reason && entry.status === "impedimento") {
      textBlock("Motivo do Impedimento", entry.impediment_reason);
    }
  }

  // === FOTOS ===
  const photos = (files || []).filter((f: any) => f.mime_type?.startsWith("image/"));
  if (cfg.show_photos !== false && photos.length > 0) {
    sectionTitle("REGISTROS FOTOGRÁFICOS");
    for (const photo of photos) {
      try {
        checkPage(75);
        const img = await loadImage(photo.file_url);
        const maxW = cw * 0.7;
        const maxH = 65;
        const ratio = Math.min(maxW / img.width, maxH / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        doc.addImage(img, "JPEG", m + 2, y, w, h);
        y += h + 3;
        if (photo.caption) {
          doc.setFontSize(7);
          doc.setFont("helvetica", "italic");
          doc.text(photo.caption, m + 2, y);
          y += 5;
        }
        doc.setFont("helvetica", "normal");
        y += 2;
      } catch { /* skip */ }
    }
  }

  // === ASSINATURA ===
  if (cfg.show_signature !== false) {
    checkPage(50);
    sectionTitle("ASSINATURA");
    y += 3;

    const sigAreaH = (profile as any)?.signature_size || 35;
    const sigLineY = y + sigAreaH;

    if (profile?.signature_url) {
      try {
        const sigImg = await loadImage(profile.signature_url);
        const zoom = ((profile as any)?.signature_zoom || 100) / 100;
        const maxW = cw * 0.4;
        const sigRatio = Math.min(maxW / sigImg.width, sigAreaH / sigImg.height) * zoom;
        const sW = sigImg.width * sigRatio;
        const sH = sigImg.height * sigRatio;
        const offX = ((profile as any)?.signature_offset_x || 0) * 0.3;
        const offY = ((profile as any)?.signature_offset_y || 0) * 0.3;
        doc.addImage(sigImg, "PNG", m + 5 + offX, sigLineY - sH + offY, sW, sH);
      } catch { /* skip */ }
    }

    y = sigLineY;
    doc.setDrawColor(100);
    doc.line(m + 2, y, m + cw / 2 - 5, y);
    y += 4;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(profile?.name || entry.responsible || "Responsável", m + 5, y);
    y += 4;
    if (cfg.role_title) {
      doc.setFontSize(7);
      doc.text(cfg.role_title, m + 5, y);
      y += 4;
    }
    doc.setFontSize(7);
    doc.text(`Data: ${dateStr}`, m + 5, y);
    y += 8;
  }

  // === FOOTER ===
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(130);
    const footerText = cfg.footer_text
      ? `${cfg.footer_text} — Registro #${entry.entry_number || ""} — Página ${i}/${totalPages}`
      : `Diário de Obra/Serviço — Registro #${entry.entry_number || ""} — Página ${i}/${totalPages}`;
    doc.text(footerText, m, ph - 8);
    doc.setTextColor(0);
  }

  doc.save(`diario-${entry.entry_number || "novo"}-${dateStr.replace(/\//g, "-")}.pdf`);
}
