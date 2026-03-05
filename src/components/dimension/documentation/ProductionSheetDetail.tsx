import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, FileDown, List, Route, Play, AlertTriangle, CheckCircle2 } from "lucide-react";
import { BomEditor } from "./BomEditor";
import { ProcessStepsEditor } from "./ProcessStepsEditor";
import { ProductionPdfExport } from "./ProductionPdfExport";
import { InventoryPasswordPrompt } from "../inventory/InventoryPasswordPrompt";
import { supabase } from "@/integrations/supabase/client";
import { useModule } from "@/contexts/ModuleContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
    activated_at?: string | null;
  };
  onBack: () => void;
}

interface ShortageItem {
  item_nome: string;
  needed: number;
  available: number;
}

export function ProductionSheetDetail({ sheet, onBack }: Props) {
  const [tab, setTab] = useState("bom");
  const { tables } = useModule();
  const { session } = useAuth();
  const [activating, setActivating] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [shortages, setShortages] = useState<ShortageItem[]>([]);
  const [activatedAt, setActivatedAt] = useState(sheet.activated_at || null);

  const checkAndActivate = async () => {
    setActivating(true);
    try {
      // Fetch BOM items with inventory link
      const { data: bomItems } = await supabase
        .from(tables.productionBomItems as any)
        .select("*")
        .eq("ficha_id", sheet.id);

      const linked = ((bomItems as any[]) || []).filter((i: any) => i.inventory_item_id);
      if (linked.length === 0) {
        toast.error("Nenhum item da BOM está vinculado ao estoque.");
        setActivating(false);
        return;
      }

      // Fetch current inventory quantities
      const invIds = linked.map((i: any) => i.inventory_item_id);
      const { data: invItems } = await supabase
        .from(tables.inventoryItems as any)
        .select("id, name, current_quantity")
        .in("id", invIds);

      const invMap = new Map((invItems as any[] || []).map((i: any) => [i.id, i]));

      const shortageList: ShortageItem[] = [];
      for (const bom of linked) {
        const inv = invMap.get(bom.inventory_item_id);
        const available = inv?.current_quantity || 0;
        if (available < bom.quantidade) {
          shortageList.push({ item_nome: bom.item_nome, needed: bom.quantidade, available });
        }
      }

      if (shortageList.length > 0) {
        setShortages(shortageList);
        setShowConfirmDialog(true);
        setActivating(false);
        return;
      }

      await executeActivation(linked, invMap);
    } catch {
      toast.error("Erro ao ativar ficha");
      setActivating(false);
    }
  };

  const executeActivation = async (linkedItems: any[], invMap: Map<string, any>) => {
    setActivating(true);
    try {
      for (const bom of linkedItems) {
        const inv = invMap.get(bom.inventory_item_id);
        if (!inv) continue;
        const newQty = Math.max(0, inv.current_quantity - bom.quantidade);

        // Register movement
        await supabase.from(tables.inventoryMovements as any).insert({
          item_id: bom.inventory_item_id,
          movement_type: "saida",
          quantity: bom.quantidade,
          reason: "producao",
          linked_project: sheet.nome_projeto,
          performed_by: session?.user.id,
        } as any);

        // Update quantity
        await supabase.from(tables.inventoryItems as any)
          .update({ current_quantity: newQty } as any)
          .eq("id", bom.inventory_item_id);

        inv.current_quantity = newQty;
      }

      // Mark sheet as activated
      await supabase.from(tables.productionSheets as any)
        .update({ activated_at: new Date().toISOString(), status: "em_producao" } as any)
        .eq("id", sheet.id);

      setActivatedAt(new Date().toISOString());
      toast.success("Ficha ativada! Baixa no estoque realizada.");
      setShowConfirmDialog(false);
    } catch {
      toast.error("Erro ao dar baixa no estoque");
    }
    setActivating(false);
  };

  const handlePasswordSuccess = () => {
    checkAndActivate();
  };

  const handleForceActivation = async () => {
    // Fetch BOM and inventory again for partial deduction
    const { data: bomItems } = await supabase
      .from(tables.productionBomItems as any).select("*").eq("ficha_id", sheet.id);
    const linked = ((bomItems as any[]) || []).filter((i: any) => i.inventory_item_id);
    const invIds = linked.map((i: any) => i.inventory_item_id);
    const { data: invItems } = await supabase
      .from(tables.inventoryItems as any).select("id, name, current_quantity").in("id", invIds);
    const invMap = new Map((invItems as any[] || []).map((i: any) => [i.id, i]));
    await executeActivation(linked, invMap);
  };

  const isActivated = !!activatedAt;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h2 className="text-lg font-bold">{sheet.nome_projeto}</h2>
          <div className="flex gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className="text-xs">{tipoLabels[sheet.tipo] || sheet.tipo}</Badge>
            <Badge className={`text-xs ${statusColors[sheet.status] || ""}`}>{statusLabels[sheet.status] || sheet.status}</Badge>
            {isActivated && <Badge className="text-xs bg-green-500/10 text-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Ativada</Badge>}
            {sheet.cliente && <span className="text-xs text-muted-foreground">• {sheet.cliente}</span>}
            {sheet.produto_modelo && <span className="text-xs text-muted-foreground">• {sheet.produto_modelo}</span>}
          </div>
        </div>
        {!isActivated && (
          <Button size="sm" onClick={() => setShowPasswordPrompt(true)} disabled={activating} className="gap-1.5">
            <Play className="h-3.5 w-3.5" />
            {activating ? "Ativando..." : "Ativar Ficha"}
          </Button>
        )}
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

      {/* Password prompt */}
      <InventoryPasswordPrompt
        open={showPasswordPrompt}
        onOpenChange={setShowPasswordPrompt}
        onSuccess={handlePasswordSuccess}
        title="Autenticação para Ativação"
        description="Digite a senha do estoque para confirmar a baixa de materiais."
      />

      {/* Shortage confirmation dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Itens com Estoque Insuficiente
            </DialogTitle>
            <DialogDescription>Os seguintes itens não possuem quantidade suficiente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {shortages.map((s, i) => (
              <div key={i} className="flex justify-between items-center p-2 rounded-md bg-destructive/5 border border-destructive/20">
                <span className="text-sm font-medium">{s.item_nome}</span>
                <span className="text-xs text-destructive font-semibold">
                  Precisa: {s.needed} | Tem: {s.available}
                </span>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleForceActivation} disabled={activating}>
              {activating ? "Ativando..." : "Ativar mesmo assim"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
