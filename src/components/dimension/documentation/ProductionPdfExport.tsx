import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useModule } from "@/contexts/ModuleContext";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusLabels: Record<string, string> = {
  planejamento: "Planejamento", em_producao: "Em Produção", finalizado: "Finalizado", pausado: "Pausado"
};
const tipoLabels: Record<string, string> = {
  router: "Router CNC", laser: "Laser", torno: "Torno", "3d": "Impressão 3D", acessorio: "Acessório", outro: "Outro"
};
const categoriaLabels: Record<string, string> = {
  mecanica: "Mecânica", eletrica: "Elétrica", eletronica: "Eletrônica", acabamento: "Acabamento", outro: "Outro"
};
const stepStatusLabels: Record<string, string> = {
  todo: "A Fazer", doing: "Fazendo", waiting: "Aguardando", done: "Concluído"
};
const setorLabels: Record<string, string> = {
  cnc: "CNC", laser: "Laser", torno: "Torno", "3d": "3D", montagem: "Montagem", eletrica: "Elétrica", adm: "Adm"
};

interface Props {
  sheet: {
    id: string; nome_projeto: string; tipo: string; cliente: string; produto_modelo: string;
    status: string; data_inicio: string | null; prazo_final: string | null; observacoes: string;
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}

export function ProductionPdfExport({ sheet }: Props) {
  const { tables } = useModule();
  const [config, setConfig] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [generatingType, setGeneratingType] = useState<"full" | "compras" | null>(null);

  useEffect(() => {
    supabase.from(tables.productionPdfConfig as any).select("*").limit(1).single().then(({ data }) => {
      setConfig(data || { empresa_nome: "Dimension", cor_principal: "#1e40af", mostrar_cliente: true, mostrar_valores: true, mostrar_fornecedor: false });
    });
  }, [tables]);

  const fetchData = async () => {
    const [bomRes, stepsRes] = await Promise.all([
      supabase.from(tables.productionBomItems as any).select("*").eq("ficha_id", sheet.id).order("created_at"),
      supabase.from(tables.productionProcessSteps as any).select("*").eq("ficha_id", sheet.id).order("ordem"),
    ]);
    const bomItems = (bomRes.data as any[]) || [];
    const processSteps = (stepsRes.data as any[]) || [];

    // Fetch inventory data for linked items
    const linkedIds = bomItems.filter(i => i.inventory_item_id).map(i => i.inventory_item_id);
    let invMap = new Map<string, any>();
    if (linkedIds.length > 0) {
      const { data: invData } = await supabase
        .from(tables.inventoryItems as any)
        .select("id, name, current_quantity, internal_code")
        .in("id", linkedIds);
      invMap = new Map((invData as any[] || []).map((i: any) => [i.id, i]));
    }

    return { bomItems, processSteps, invMap };
  };

  const generatePdf = async (type: "full" | "compras") => {
    setGenerating(true);
    setGeneratingType(type);
    try {
      const { bomItems, processSteps, invMap } = await fetchData();
      const cfg = config || {};
      const doc = new jsPDF();
      const mainColor = cfg.cor_principal || "#1e40af";
      const [r, g, b] = hexToRgb(mainColor);

      // Header
      doc.setFillColor(r, g, b);
      doc.rect(0, 0, 210, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(cfg.empresa_nome || "Dimension", 14, 14);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      if (cfg.empresa_cnpj) doc.text(`CNPJ: ${cfg.empresa_cnpj}`, 14, 20);
      if (cfg.empresa_contato) doc.text(cfg.empresa_contato, 14, 24);
      doc.text(`Emitido em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 150, 20);

      let y = 36;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(type === "compras" ? "Lista de Compras - Produção" : "Ficha de Produção", 14, y);
      y += 8;

      // Info section
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const info: string[][] = [
        ["Projeto:", sheet.nome_projeto],
        ["Tipo:", tipoLabels[sheet.tipo] || sheet.tipo],
        ["Status:", statusLabels[sheet.status] || sheet.status],
      ];
      if (cfg.mostrar_cliente && sheet.cliente) info.push(["Cliente:", sheet.cliente]);
      if (sheet.produto_modelo) info.push(["Modelo:", sheet.produto_modelo]);
      if (sheet.data_inicio) info.push(["Início:", format(new Date(sheet.data_inicio), "dd/MM/yyyy")]);
      if (sheet.prazo_final) info.push(["Prazo:", format(new Date(sheet.prazo_final), "dd/MM/yyyy")]);

      info.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, 14, y);
        doc.setFont("helvetica", "normal");
        doc.text(value, 45, y);
        y += 5;
      });

      if (bomItems.length > 0) {
        y += 6;
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Lista de Materiais (BOM)", 14, y);
        y += 2;

        const bomHead = ["Item", "Categoria", "Unid.", "Qtd."];
        if (cfg.mostrar_valores) bomHead.push("Vlr. Unit.", "Subtotal");
        if (cfg.mostrar_fornecedor) bomHead.push("Fornecedor");
        bomHead.push("Estoque", "Status");

        const bomBody = bomItems.map(i => {
          const row = [i.item_nome, categoriaLabels[i.categoria] || i.categoria, i.unidade, String(i.quantidade)];
          if (cfg.mostrar_valores) row.push(`R$ ${Number(i.valor_unitario).toFixed(2)}`, `R$ ${(i.quantidade * i.valor_unitario).toFixed(2)}`);
          if (cfg.mostrar_fornecedor) row.push(i.fornecedor || "-");

          const inv = i.inventory_item_id ? invMap.get(i.inventory_item_id) : null;
          if (inv) {
            row.push(String(inv.current_quantity));
            row.push(inv.current_quantity >= i.quantidade ? "OK" : "EM FALTA");
          } else {
            row.push("-");
            row.push("Manual");
          }
          return row;
        });

        const statusColIndex = bomHead.length - 1;

        autoTable(doc, {
          head: [bomHead], body: bomBody, startY: y,
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: { fillColor: [r, g, b] },
          didParseCell: (data) => {
            if (data.section === "body" && data.column.index === statusColIndex) {
              const val = data.cell.raw as string;
              if (val === "EM FALTA") {
                data.cell.styles.textColor = [220, 38, 38];
                data.cell.styles.fontStyle = "bold";
              } else if (val === "OK") {
                data.cell.styles.textColor = [22, 163, 74];
                data.cell.styles.fontStyle = "bold";
              }
            }
          }
        });

        y = (doc as any).lastAutoTable.finalY + 3;
        if (cfg.mostrar_valores) {
          const total = bomItems.reduce((s: number, i: any) => s + i.quantidade * i.valor_unitario, 0);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(`Total BOM: R$ ${total.toFixed(2)}`, 14, y);
          y += 6;
        }

        // Shopping list section
        const shortages = bomItems.filter(i => {
          if (!i.inventory_item_id) return false;
          const inv = invMap.get(i.inventory_item_id);
          return !inv || inv.current_quantity < i.quantidade;
        });

        if (shortages.length > 0) {
          y += 4;
          if (y > 240) { doc.addPage(); y = 20; }
          doc.setFillColor(254, 226, 226);
          doc.roundedRect(12, y - 4, 186, 8, 2, 2, "F");
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(220, 38, 38);
          doc.text("🛒 Lista de Compras (Itens em Falta)", 14, y + 2);
          y += 8;
          doc.setTextColor(0, 0, 0);

          const comprasHead = ["Item", "Qtd. Necessária", "Estoque Atual", "Comprar"];
          const comprasBody = shortages.map(i => {
            const inv = invMap.get(i.inventory_item_id);
            const available = inv?.current_quantity || 0;
            return [i.item_nome, String(i.quantidade), String(available), String(Math.max(0, i.quantidade - available))];
          });

          autoTable(doc, {
            head: [comprasHead], body: comprasBody, startY: y,
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [220, 38, 38] },
          });
          y = (doc as any).lastAutoTable.finalY + 3;
        }
      }

      // Process steps (only for full PDF)
      if (type === "full" && processSteps.length > 0) {
        y += 4;
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Mapeamento de Processos", 14, y);
        y += 2;

        const procHead = ["#", "Etapa", "Setor", "Status", "Horas", "Prazo (dias)", "Data Alvo"];
        const procBody = processSteps.map((s: any, i: number) => [
          String(i + 1), s.etapa_nome, setorLabels[s.setor_responsavel] || s.setor_responsavel,
          stepStatusLabels[s.status] || s.status, s.tempo_estimado_horas ? String(s.tempo_estimado_horas) : "-",
          s.prazo_dias ? String(s.prazo_dias) : "-", s.data_alvo ? format(new Date(s.data_alvo), "dd/MM/yyyy") : "-"
        ]);

        autoTable(doc, {
          head: [procHead], body: procBody, startY: y,
          styles: { fontSize: 7, cellPadding: 2 }, headStyles: { fillColor: [r, g, b] },
        });

        y = (doc as any).lastAutoTable.finalY + 3;
        const totalDias = processSteps.reduce((s: number, p: any) => s + (p.prazo_dias || 0), 0);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(`Prazo total estimado: ${totalDias} dias`, 14, y);
      }

      if (type === "full" && sheet.observacoes) {
        y += 8;
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Observações", 14, y);
        y += 5;
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(sheet.observacoes, 180);
        doc.text(lines, 14, y);
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(120);
        doc.text(cfg.rodape_texto || `${cfg.empresa_nome || "Dimension"} - Documentação de Produção`, 14, 290);
        doc.text(`Página ${i} de ${pageCount}`, 180, 290);
      }

      const suffix = type === "compras" ? "compras" : "ficha";
      doc.save(`${suffix}-${sheet.nome_projeto.replace(/\s+/g, "-").toLowerCase()}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF");
    }
    setGenerating(false);
    setGeneratingType(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Exportar Documentação PDF</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          O PDF incluirá: dados do projeto, lista de materiais (BOM) com status de estoque, e mapeamento de processos.
        </p>
        <div className="flex gap-3 flex-wrap">
          <Button onClick={() => generatePdf("full")} disabled={generating}>
            <FileDown className="h-4 w-4 mr-2" />
            {generatingType === "full" ? "Gerando..." : "Ficha Completa"}
          </Button>
          <Button variant="outline" onClick={() => generatePdf("compras")} disabled={generating}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            {generatingType === "compras" ? "Gerando..." : "Lista de Compras"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
