import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, FileDown, List, Route, Play, AlertTriangle, CheckCircle2, Undo2 } from "lucide-react";
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

interface DeactivateShortageItem {
  inventory_item_id: string;
  item_nome: string;
  bom_qty: number;
  actual_deducted: number;
  shortage: number;
  purchased: boolean;
  purchased_qty: number;
}

export function ProductionSheetDetail({ sheet, onBack }: Props) {
  const [tab, setTab] = useState("bom");
  const { tables } = useModule();
  const { session } = useAuth();
  const [activating, setActivating] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [showDeactivatePasswordPrompt, setShowDeactivatePasswordPrompt] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDeactivateConfirmDialog, setShowDeactivateConfirmDialog] = useState(false);
  const [shortages, setShortages] = useState<ShortageItem[]>([]);
  const [activatedAt, setActivatedAt] = useState(sheet.activated_at || null);

  // Deactivation shortage state
  const [deactivateShortages, setDeactivateShortages] = useState<DeactivateShortageItem[]>([]);
  const [deactivateNormalItems, setDeactivateNormalItems] = useState<{ inventory_item_id: string; qty: number }[]>([]);

  // ── ACTIVATION ──

  const checkAndActivate = async () => {
    setActivating(true);
    try {
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
        const actualDeducted = Math.min(inv.current_quantity, bom.quantidade);
        const shortage = Math.max(0, bom.quantidade - inv.current_quantity);
        const newQty = Math.max(0, inv.current_quantity - bom.quantidade);

        await supabase.from(tables.inventoryMovements as any).insert({
          item_id: bom.inventory_item_id,
          movement_type: "saida",
          quantity: actualDeducted,
          reason: "producao",
          notes: shortage > 0 ? `Faltou ${shortage} un` : "",
          linked_project: sheet.nome_projeto,
          created_by: session?.user.id,
        } as any);

        await supabase.from(tables.inventoryItems as any)
          .update({ current_quantity: newQty } as any)
          .eq("id", bom.inventory_item_id);

        // Save deducted and shortage info on BOM item
        await supabase.from(tables.productionBomItems as any)
          .update({ deducted_quantity: actualDeducted, shortage_quantity: shortage } as any)
          .eq("id", bom.id);

        inv.current_quantity = newQty;
      }

      // Create tasks from process steps
      const { data: processSteps } = await supabase
        .from(tables.productionProcessSteps as any)
        .select("*")
        .eq("ficha_id", sheet.id)
        .order("ordem");

      if (processSteps && (processSteps as any[]).length > 0) {
        const today = new Date();
        const tasks = (processSteps as any[]).map((step: any) => {
          const startDate = step.data_inicio
            ? step.data_inicio
            : step.prazo_dias
              ? new Date(today.getTime()).toISOString().split("T")[0]
              : null;
          const dueDate = step.data_alvo
            ? step.data_alvo
            : step.prazo_dias
              ? new Date(today.getTime() + step.prazo_dias * 86400000).toISOString().split("T")[0]
              : sheet.prazo_final || null;
          return {
            title: `${step.etapa_nome} — ${sheet.nome_projeto}`,
            description: `Etapa de produção da ficha "${sheet.nome_projeto}"${sheet.cliente ? ` • Cliente: ${sheet.cliente}` : ""}${sheet.produto_modelo ? ` • Modelo: ${sheet.produto_modelo}` : ""}`,
            priority: "media",
            category: "producao",
            sector: step.setor_responsavel || null,
            start_date: startDate,
            due_date: dueDate,
            status: "a_fazer",
            created_by: session?.user.id,
          };
        });
        const { error: taskError } = await supabase.from(tables.tasks as any).insert(tasks as any);
        if (taskError) {
          console.error("Erro ao criar tarefas:", taskError);
          toast.error("Baixa no estoque OK, mas erro ao criar tarefas nos setores");
        } else {
          toast.success(`${tasks.length} tarefa(s) criada(s) nos setores`);
        }
      }

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
    const { data: bomItems } = await supabase
      .from(tables.productionBomItems as any).select("*").eq("ficha_id", sheet.id);
    const linked = ((bomItems as any[]) || []).filter((i: any) => i.inventory_item_id);
    const invIds = linked.map((i: any) => i.inventory_item_id);
    const { data: invItems } = await supabase
      .from(tables.inventoryItems as any).select("id, name, current_quantity").in("id", invIds);
    const invMap = new Map((invItems as any[] || []).map((i: any) => [i.id, i]));
    await executeActivation(linked, invMap);
  };

  // ── DEACTIVATION ──

  const handleDeactivatePasswordSuccess = async () => {
    // Fetch BOM items and check movements to detect shortages
    const { data: bomItems } = await supabase
      .from(tables.productionBomItems as any).select("*").eq("ficha_id", sheet.id);
    const linked = ((bomItems as any[]) || []).filter((i: any) => i.inventory_item_id);

    if (linked.length === 0) {
      setDeactivateNormalItems([]);
      setDeactivateShortages([]);
      setShowDeactivateConfirmDialog(true);
      return;
    }

    // Find saida movements for this project
    const { data: movements } = await supabase
      .from(tables.inventoryMovements as any)
      .select("*")
      .eq("movement_type", "saida")
      .eq("reason", "producao")
      .eq("linked_project", sheet.nome_projeto);

    const movementMap = new Map<string, number>();
    for (const m of (movements as any[] || [])) {
      movementMap.set(m.item_id, (movementMap.get(m.item_id) || 0) + m.quantity);
    }

    const shortageItems: DeactivateShortageItem[] = [];
    const normalItems: { inventory_item_id: string; qty: number }[] = [];

    for (const bom of linked) {
      const actualDeducted = movementMap.get(bom.inventory_item_id) || 0;
      if (actualDeducted < bom.quantidade) {
        // This was a shortage item
        shortageItems.push({
          inventory_item_id: bom.inventory_item_id,
          item_nome: bom.item_nome,
          bom_qty: bom.quantidade,
          actual_deducted: actualDeducted,
          shortage: bom.quantidade - actualDeducted,
          purchased: false,
          purchased_qty: 0,
        });
      } else {
        normalItems.push({ inventory_item_id: bom.inventory_item_id, qty: actualDeducted });
      }
    }

    setDeactivateShortages(shortageItems);
    setDeactivateNormalItems(normalItems);
    setShowDeactivateConfirmDialog(true);
  };

  const updateDeactivateShortage = (index: number, field: string, value: any) => {
    setDeactivateShortages(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "purchased" && !value) {
        updated[index].purchased_qty = 0;
      }
      return updated;
    });
  };

  const executeDeactivation = async () => {
    setDeactivating(true);
    try {
      // 1. Return normal items (full deducted quantity)
      for (const item of deactivateNormalItems) {
        const { data: invItem } = await supabase
          .from(tables.inventoryItems as any)
          .select("id, current_quantity")
          .eq("id", item.inventory_item_id)
          .single();
        if (!invItem) continue;

        const returnQty = item.qty;
        const newQty = (invItem as any).current_quantity + returnQty;

        await supabase.from(tables.inventoryMovements as any).insert({
          item_id: item.inventory_item_id,
          movement_type: "entrada",
          quantity: returnQty,
          reason: "devolucao",
          linked_project: `Desistência: ${sheet.nome_projeto}`,
          created_by: session?.user.id,
        } as any);

        await supabase.from(tables.inventoryItems as any)
          .update({ current_quantity: newQty } as any)
          .eq("id", item.inventory_item_id);
      }

      // 2. Handle shortage items
      for (const item of deactivateShortages) {
        const { data: invItem } = await supabase
          .from(tables.inventoryItems as any)
          .select("id, current_quantity")
          .eq("id", item.inventory_item_id)
          .single();
        if (!invItem) continue;

        // Return what was ACTUALLY deducted from stock
        const baseReturn = item.actual_deducted;
        // Plus purchased quantity if applicable
        const purchasedReturn = item.purchased ? item.purchased_qty : 0;
        const totalReturn = baseReturn + purchasedReturn;

        if (totalReturn > 0) {
          const newQty = (invItem as any).current_quantity + totalReturn;

          await supabase.from(tables.inventoryMovements as any).insert({
            item_id: item.inventory_item_id,
            movement_type: "entrada",
            quantity: totalReturn,
            reason: "devolucao",
            notes: item.purchased ? `Comprado: ${purchasedReturn} un` : "Item em falta - não comprado",
            linked_project: `Desistência: ${sheet.nome_projeto}`,
            created_by: session?.user.id,
          } as any);

          await supabase.from(tables.inventoryItems as any)
            .update({ current_quantity: newQty } as any)
            .eq("id", item.inventory_item_id);
        }
      }

      // 3. Mark sheet as deactivated
      await supabase.from(tables.productionSheets as any)
        .update({ activated_at: null, status: "planejamento" } as any)
        .eq("id", sheet.id);

      setActivatedAt(null);
      setShowDeactivateConfirmDialog(false);
      toast.success("Ficha desativada! Estoque ajustado com sucesso.");
    } catch {
      toast.error("Erro ao desativar ficha.");
    }
    setDeactivating(false);
  };

  const isActivated = !!activatedAt;
  const hasDeactivateShortages = deactivateShortages.length > 0;

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
        {!isActivated ? (
          <Button size="sm" onClick={() => setShowPasswordPrompt(true)} disabled={activating} className="gap-1.5">
            <Play className="h-3.5 w-3.5" />
            {activating ? "Ativando..." : "Ativar Ficha"}
          </Button>
        ) : (
          <Button size="sm" variant="destructive" onClick={() => setShowDeactivatePasswordPrompt(true)} disabled={deactivating} className="gap-1.5">
            <Undo2 className="h-3.5 w-3.5" />
            {deactivating ? "Desativando..." : "Desativar Ficha"}
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

      {/* Password prompts */}
      <InventoryPasswordPrompt
        open={showPasswordPrompt}
        onOpenChange={setShowPasswordPrompt}
        onSuccess={handlePasswordSuccess}
        title="Autenticação para Ativação"
        description="Digite a senha do estoque para confirmar a baixa de materiais."
      />
      <InventoryPasswordPrompt
        open={showDeactivatePasswordPrompt}
        onOpenChange={setShowDeactivatePasswordPrompt}
        onSuccess={handleDeactivatePasswordSuccess}
        title="Autenticação para Desativação"
        description="Digite a senha do estoque para confirmar a devolução dos materiais."
      />

      {/* Deactivate confirmation dialog */}
      <Dialog open={showDeactivateConfirmDialog} onOpenChange={setShowDeactivateConfirmDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Undo2 className="h-5 w-5" />
              Desativar Ficha de Produção
            </DialogTitle>
            <DialogDescription>
              {hasDeactivateShortages
                ? "Os itens abaixo estavam em falta na ativação. Informe se foram comprados para ajuste correto do estoque."
                : "Ao desativar, todos os materiais serão devolvidos ao estoque. Deseja continuar?"
              }
            </DialogDescription>
          </DialogHeader>

          {hasDeactivateShortages && (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {deactivateShortages.map((item, i) => (
                <div key={i} className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{item.item_nome}</span>
                    <span className="text-xs text-muted-foreground">
                      BOM: {item.bom_qty} | Baixado: {item.actual_deducted} | Faltou: {item.shortage}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`purchased-${i}`}
                        checked={item.purchased}
                        onCheckedChange={(v) => updateDeactivateShortage(i, "purchased", v)}
                      />
                      <Label htmlFor={`purchased-${i}`} className="text-sm cursor-pointer">
                        Comprou?
                      </Label>
                    </div>
                    {item.purchased && (
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Qtd comprada:</Label>
                        <Input
                          type="number"
                          min={0}
                          value={item.purchased_qty || ""}
                          onChange={(e) => updateDeactivateShortage(i, "purchased_qty", Number(e.target.value) || 0)}
                          className="w-20 h-8 text-sm"
                          placeholder="0"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.purchased
                      ? `→ Retorna ao estoque: ${item.actual_deducted + item.purchased_qty} un`
                      : `→ Retorna ao estoque: ${item.actual_deducted > 0 ? item.actual_deducted + " un (só o que foi baixado)" : "0 un (nada foi baixado)"}`
                    }
                  </p>
                </div>
              ))}
            </div>
          )}

          {deactivateNormalItems.length > 0 && hasDeactivateShortages && (
            <p className="text-xs text-muted-foreground">
              + {deactivateNormalItems.length} item(ns) sem falta serão devolvidos normalmente.
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeactivateConfirmDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={executeDeactivation} disabled={deactivating}>
              {deactivating ? "Desativando..." : "Confirmar Desativação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shortage confirmation dialog (activation) */}
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
