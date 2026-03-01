import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileDown, List, Route, Settings } from "lucide-react";
import { BomEditor } from "./BomEditor";
import { ProcessStepsEditor } from "./ProcessStepsEditor";
import { ProductionPdfExport } from "./ProductionPdfExport";

const statusLabels: Record<string, string> = {
  planejamento: "Planejamento", em_producao: "Em Produção", finalizado: "Finalizado", pausado: "Pausado"
};
const statusColors: Record<string, string> = {
  planejamento: "bg-blue-500/10 text-blue-600", em_producao: "bg-amber-500/10 text-amber-600",
  finalizado: "bg-green-500/10 text-green-600", pausado: "bg-muted text-muted-foreground"
};
const tipoLabels: Record<string, string> = {
  router: "Router CNC", laser: "Laser", torno: "Torno", "3d": "Impressão 3D", acessorio: "Acessório", outro: "Outro"
};

interface Props {
  sheet: {
    id: string; nome_projeto: string; tipo: string; cliente: string; produto_modelo: string;
    status: string; data_inicio: string | null; prazo_final: string | null; observacoes: string;
  };
  onBack: () => void;
}

export function ProductionSheetDetail({ sheet, onBack }: Props) {
  const [tab, setTab] = useState("bom");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h2 className="text-lg font-bold">{sheet.nome_projeto}</h2>
          <div className="flex gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className="text-xs">{tipoLabels[sheet.tipo] || sheet.tipo}</Badge>
            <Badge className={`text-xs ${statusColors[sheet.status] || ""}`}>{statusLabels[sheet.status] || sheet.status}</Badge>
            {sheet.cliente && <span className="text-xs text-muted-foreground">• {sheet.cliente}</span>}
            {sheet.produto_modelo && <span className="text-xs text-muted-foreground">• {sheet.produto_modelo}</span>}
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-transparent p-0 gap-1">
          <TabsTrigger value="bom" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <List className="h-3.5 w-3.5" />BOM
          </TabsTrigger>
          <TabsTrigger value="processos" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Route className="h-3.5 w-3.5" />Processos
          </TabsTrigger>
          <TabsTrigger value="pdf" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileDown className="h-3.5 w-3.5" />Exportar PDF
          </TabsTrigger>
        </TabsList>
        <TabsContent value="bom"><BomEditor fichaId={sheet.id} /></TabsContent>
        <TabsContent value="processos"><ProcessStepsEditor fichaId={sheet.id} /></TabsContent>
        <TabsContent value="pdf"><ProductionPdfExport sheet={sheet} /></TabsContent>
      </Tabs>
    </div>
  );
}
