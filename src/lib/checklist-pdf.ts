import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PdfSettings {
  logo_url: string;
  company_name: string;
  footer_text: string;
  watermark_text: string;
  watermark_image_url: string;
  watermark_opacity: number;
  primary_color: string;
  show_signature: boolean;
  show_responsible: boolean;
  show_project: boolean;
  show_date: boolean;
  show_notes: boolean;
  subtitle: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}

export async function generateChecklistPdf(checklistId: string, userId: string) {
  // Load checklist
  const { data: cl } = await (supabase as any).from("pc_checklists").select("*").eq("id", checklistId).single();
  if (!cl) throw new Error("Checklist não encontrado");

  // Load sections + tasks
  const { data: secs } = await (supabase as any)
    .from("pc_checklist_sections")
    .select("*")
    .eq("checklist_id", checklistId)
    .order("sort_order");

  const sections: any[] = [];
  for (const s of secs || []) {
    const { data: tasks } = await (supabase as any)
      .from("pc_checklist_tasks")
      .select("*")
      .eq("section_id", s.id)
      .order("sort_order");
    sections.push({ ...s, tasks: tasks || [] });
  }

  // Load PDF settings
  const { data: settings } = await (supabase as any)
    .from("pc_checklist_pdf_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  const cfg: PdfSettings = {
    logo_url: settings?.logo_url || "",
    company_name: settings?.company_name || "",
    footer_text: settings?.footer_text || "",
    watermark_text: settings?.watermark_text || "",
    watermark_image_url: settings?.watermark_image_url || "",
    watermark_opacity: settings?.watermark_opacity ?? 0.1,
    primary_color: settings?.primary_color || "#1a1a2e",
    show_signature: settings?.show_signature ?? false,
    show_responsible: settings?.show_responsible ?? true,
    show_project: settings?.show_project ?? true,
    show_date: settings?.show_date ?? true,
    show_notes: settings?.show_notes ?? true,
    subtitle: settings?.subtitle || "",
  };

  const doc = new jsPDF("p", "mm", "a4");
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const rgb = hexToRgb(cfg.primary_color);
  let y = margin;

  // --- Watermark function ---
  function drawWatermark() {
    if (cfg.watermark_text) {
      doc.saveGraphicsState();
      doc.setGState(new (doc as any).GState({ opacity: cfg.watermark_opacity }));
      doc.setFontSize(50);
      doc.setTextColor(200, 200, 200);
      const textW = doc.getTextWidth(cfg.watermark_text);
      doc.text(cfg.watermark_text, (pageW - textW) / 2, pageH / 2, { angle: 45 });
      doc.restoreGraphicsState();
    }
  }

  // --- Header ---
  drawWatermark();

  // Company name
  if (cfg.company_name) {
    doc.setFontSize(10);
    doc.setTextColor(...rgb);
    doc.text(cfg.company_name, margin, y);
    y += 4;
  }
  if (cfg.subtitle) {
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(cfg.subtitle, margin, y);
    y += 4;
  }

  // Header bar
  y += 2;
  doc.setFillColor(...rgb);
  doc.rect(margin, y, pageW - margin * 2, 8, "F");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(cl.title || "Checklist", margin + 3, y + 5.5);
  y += 12;

  // Meta info
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  const meta: string[] = [];
  if (cfg.show_date && cl.checklist_date) {
    meta.push("Data: " + format(new Date(cl.checklist_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }));
  }
  if (cfg.show_responsible && cl.general_responsible) {
    meta.push("Responsável: " + cl.general_responsible);
  }
  if (cfg.show_project && cl.project_name) {
    meta.push("Projeto/Cliente: " + cl.project_name);
  }
  if (meta.length > 0) {
    doc.text(meta.join("   |   "), margin, y);
    y += 6;
  }

  // Progress
  const totalTasks = sections.reduce((a, s) => a + s.tasks.length, 0);
  const doneTasks = sections.reduce((a, s) => a + s.tasks.filter((t: any) => t.is_done).length, 0);
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(`Progresso: ${doneTasks}/${totalTasks} (${pct}%)`, margin, y);

  // Progress bar
  const barW = 40;
  const barH = 3;
  const barX = margin + doc.getTextWidth(`Progresso: ${doneTasks}/${totalTasks} (${pct}%)`) + 4;
  doc.setDrawColor(200, 200, 200);
  doc.rect(barX, y - 2.5, barW, barH);
  if (pct > 0) {
    doc.setFillColor(...rgb);
    doc.rect(barX, y - 2.5, (barW * pct) / 100, barH, "F");
  }
  y += 6;

  // --- Sections ---
  for (const sec of sections) {
    if (y > pageH - 40) {
      doc.addPage();
      y = margin;
      drawWatermark();
    }

    // Section title
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.rect(margin, y, pageW - margin * 2, 6, "F");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(sec.title || "Seção", margin + 2, y + 4.2);
    y += 8;

    if (sec.notes) {
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text("Obs: " + sec.notes, margin + 2, y);
      y += 4;
    }

    // Tasks table
    if (sec.tasks.length > 0) {
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["", "Atividade", "Prazo", "Responsável"]],
        body: sec.tasks.map((t: any) => [
          t.is_done ? "☑" : "☐",
          t.activity || "",
          t.due_date ? format(new Date(t.due_date + "T12:00:00"), "dd/MM/yy") : "",
          t.responsible || "",
        ]),
        styles: { fontSize: 7.5, cellPadding: 1.5 },
        headStyles: { fillColor: rgb, textColor: [255, 255, 255], fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 8, halign: "center" },
          1: { cellWidth: "auto" },
          2: { cellWidth: 22 },
          3: { cellWidth: 35 },
        },
        didDrawPage: () => drawWatermark(),
      });
      y = (doc as any).lastAutoTable.finalY + 4;
    }
  }

  // Notes
  if (cfg.show_notes && cl.notes) {
    if (y > pageH - 30) {
      doc.addPage();
      y = margin;
      drawWatermark();
    }
    doc.setFontSize(8);
    doc.setTextColor(...rgb);
    doc.text("Observações:", margin, y);
    y += 4;
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    const lines = doc.splitTextToSize(cl.notes, pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 3.5 + 4;
  }

  // Signature
  if (cfg.show_signature) {
    if (y > pageH - 30) {
      doc.addPage();
      y = margin;
      drawWatermark();
    }
    y += 10;
    const lineW = 60;
    doc.setDrawColor(80, 80, 80);
    doc.line(margin, y, margin + lineW, y);
    doc.line(pageW - margin - lineW, y, pageW - margin, y);
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text("Responsável", margin + lineW / 2, y + 4, { align: "center" });
    doc.text("Aprovação", pageW - margin - lineW / 2, y + 4, { align: "center" });
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    if (cfg.footer_text) {
      doc.text(cfg.footer_text, margin, pageH - 6);
    }
    doc.text(`Página ${i}/${totalPages}`, pageW - margin, pageH - 6, { align: "right" });
  }

  doc.save(`checklist-${cl.title || "sem-titulo"}.pdf`);
}
