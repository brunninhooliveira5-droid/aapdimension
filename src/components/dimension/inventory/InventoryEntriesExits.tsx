import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useModule } from "@/contexts/ModuleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDownUp, ArrowDownToLine, ArrowUpFromLine, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CurrencyInput } from "./CurrencyInput";
import { InventoryPasswordPrompt } from "./InventoryPasswordPrompt";
import { InventoryDateFilter, filterByMonthYear, getMonthLabel } from "./InventoryDateFilter";
import { exportInventoryPdf } from "@/lib/inventory-pdf";

const DESTINATIONS = [
  { value: "producao", label: "Produção" },
  { value: "assistencia", label: "Assistência Técnica" },
  { value: "venda", label: "Venda" },
  { value: "testes", label: "Testes" },
  { value: "perda", label: "Perda" },
];

type MovementType = "entrada" | "saida";

export function InventoryEntriesExits() {
  const { session } = useAuth();
  const { tables } = useModule();
  const qc = useQueryClient();

  const [viewFilter, setViewFilter] = useState<"all" | "entrada" | "saida">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [pendingType, setPendingType] = useState<MovementType>("entrada");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const [entryForm, setEntryForm] = useState({ item_id: "", quantity: "", unit_cost: "", supplier_id: "", notes: "" });
  const [exitForm, setExitForm] = useState({ item_id: "", quantity: "", destination: "producao", linked_project: "", linked_machine: "", notes: "" });

  const table = tables.inventoryItems.startsWith("pc_") ? "pc" as const : "dimension" as const;

  const { data: items = [] } = useQuery({
    queryKey: [tables.inventoryItems],
    queryFn: async () => {
      const { data } = await supabase.from(tables.inventoryItems as any).select("id, name, internal_code, current_quantity").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: [tables.inventorySuppliers],
    queryFn: async () => {
      const { data } = await supabase.from(tables.inventorySuppliers as any).select("id, name").eq("is_active", true);
      return data || [];
    },
  });

  const { data: movements = [], isLoading } = useQuery({
    queryKey: [tables.inventoryMovements, "entries-exits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tables.inventoryMovements as any)
        .select(`*, ${tables.inventoryItems}(name, internal_code)`)
        .in("movement_type", ["entrada", "saida"])
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const typeFiltered = viewFilter === "all"
    ? movements
    : (movements as any[]).filter((m: any) => m.movement_type === viewFilter);
  const filtered = filterByMonthYear(typeFiltered as any[], month, year);
  const hasFilter = !!month || !!year;
  const filterLabel = hasFilter
    ? `${month ? getMonthLabel(month) : "Todos os meses"} / ${year || "Todos os anos"}`
    : "";

  const handleExport = () => {
    const title = viewFilter === "entrada" ? "Entradas de Estoque" : viewFilter === "saida" ? "Saídas de Estoque" : "Entradas e Saídas de Estoque";
    exportInventoryPdf({
      title,
      filterLabel,
      columns: ["Data", "Tipo", "Código", "Item", "Qtd", "Motivo", "Projeto"],
      rows: filtered.map((m: any) => [
        format(new Date(m.created_at), "dd/MM/yy HH:mm"),
        m.movement_type === "entrada" ? "Entrada" : "Saída",
        m[tables.inventoryItems]?.internal_code || "-",
        m[tables.inventoryItems]?.name || "-",
        String(Number(m.quantity)),
        m.reason || "-",
        m.linked_project || m.linked_machine || "-",
      ]),
    });
  };

  const handleNewMovement = (type: MovementType) => {
    setPendingType(type);
    setPasswordOpen(true);
  };

  const createEntry = useMutation({
    mutationFn: async () => {
      if (!entryForm.item_id || !entryForm.quantity) throw new Error("Item e quantidade obrigatórios");
      const qty = Number(entryForm.quantity);
      const cost = Number(entryForm.unit_cost) || 0;

      const { error: moveErr } = await supabase.from(tables.inventoryMovements as any).insert({
        item_id: entryForm.item_id, movement_type: "entrada", quantity: qty,
        unit_cost: cost, total_cost: qty * cost, supplier_id: entryForm.supplier_id || null,
        notes: entryForm.notes, reason: "Entrada manual", created_by: session?.user.id!,
      });
      if (moveErr) throw moveErr;

      const { data: item } = await supabase.from(tables.inventoryItems as any).select("current_quantity, avg_cost").eq("id", entryForm.item_id).single();
      if (item) {
        const oldQty = Number((item as any).current_quantity);
        const oldAvg = Number((item as any).avg_cost);
        const newQty = oldQty + qty;
        const newAvg = cost > 0 ? ((oldAvg * oldQty) + (cost * qty)) / newQty : oldAvg;
        await supabase.from(tables.inventoryItems as any).update({
          current_quantity: newQty, last_cost: cost > 0 ? cost : undefined, avg_cost: newAvg,
        }).eq("id", entryForm.item_id);
      }
    },
    onSuccess: () => {
      toast.success("Entrada registrada!");
      qc.invalidateQueries({ queryKey: [tables.inventoryItems] });
      qc.invalidateQueries({ queryKey: [tables.inventoryMovements] });
      setDialogOpen(false);
      setEntryForm({ item_id: "", quantity: "", unit_cost: "", supplier_id: "", notes: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createExit = useMutation({
    mutationFn: async () => {
      if (!exitForm.item_id || !exitForm.quantity) throw new Error("Item e quantidade obrigatórios");
      const qty = Number(exitForm.quantity);

      const { error: moveErr } = await supabase.from(tables.inventoryMovements as any).insert({
        item_id: exitForm.item_id, movement_type: "saida", quantity: qty,
        destination: exitForm.destination, linked_project: exitForm.linked_project,
        linked_machine: exitForm.linked_machine, notes: exitForm.notes,
        reason: `Saída: ${DESTINATIONS.find((d) => d.value === exitForm.destination)?.label}`,
        created_by: session?.user.id!,
      });
      if (moveErr) throw moveErr;

      const { data: item } = await supabase.from(tables.inventoryItems as any).select("current_quantity").eq("id", exitForm.item_id).single();
      if (item) {
        await supabase.from(tables.inventoryItems as any).update({
          current_quantity: Math.max(0, Number((item as any).current_quantity) - qty),
        }).eq("id", exitForm.item_id);
      }
    },
    onSuccess: () => {
      toast.success("Saída registrada!");
      qc.invalidateQueries({ queryKey: [tables.inventoryItems] });
      qc.invalidateQueries({ queryKey: [tables.inventoryMovements] });
      setDialogOpen(false);
      setExitForm({ item_id: "", quantity: "", destination: "producao", linked_project: "", linked_machine: "", notes: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <Card>
        <CardHeader className="pb-3 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDownUp className="h-4 w-4" />Entradas & Saídas
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleNewMovement("entrada")}>
                <ArrowDownToLine className="h-4 w-4 mr-1" />Entrada
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleNewMovement("saida")}>
                <ArrowUpFromLine className="h-4 w-4 mr-1" />Saída
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1">
              {(["all", "entrada", "saida"] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={viewFilter === f ? "default" : "ghost"}
                  className="text-xs h-7 px-2.5"
                  onClick={() => setViewFilter(f)}
                >
                  {f === "all" ? "Todos" : f === "entrada" ? "Entradas" : "Saídas"}
                </Button>
              ))}
            </div>
          </div>
          <InventoryDateFilter
            month={month} year={year}
            onMonthChange={setMonth} onYearChange={setYear}
            onClear={() => { setMonth(""); setYear(""); }}
            onExportPdf={handleExport}
            hasFilter={hasFilter}
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro encontrado.</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Projeto/Máquina</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs">{format(new Date(m.created_at), "dd/MM/yy HH:mm")}</TableCell>
                      <TableCell>
                        <Badge variant={m.movement_type === "entrada" ? "default" : "destructive"} className="text-[10px]">
                          {m.movement_type === "entrada" ? "Entrada" : "Saída"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{m[tables.inventoryItems]?.name || "-"}</TableCell>
                      <TableCell className="text-right">{Number(m.quantity)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.reason || "-"}</TableCell>
                      <TableCell className="text-xs">{m.linked_project || m.linked_machine || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <InventoryPasswordPrompt
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        onSuccess={() => setDialogOpen(true)}
        table={table}
        description={pendingType === "entrada" ? "Digite a senha do estoque para registrar uma entrada." : "Digite a senha do estoque para registrar uma saída."}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pendingType === "entrada" ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
              {pendingType === "entrada" ? "Registrar Entrada" : "Registrar Saída"}
            </DialogTitle>
          </DialogHeader>

          {pendingType === "entrada" ? (
            <div className="space-y-3">
              <div>
                <Label>Item *</Label>
                <Select value={entryForm.item_id} onValueChange={(v) => setEntryForm({ ...entryForm, item_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar item" /></SelectTrigger>
                  <SelectContent>{(items as any[]).map((i) => <SelectItem key={i.id} value={i.id}>{i.name} {i.internal_code && `(${i.internal_code})`}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Quantidade *</Label><Input type="number" value={entryForm.quantity} onChange={(e) => setEntryForm({ ...entryForm, quantity: e.target.value })} /></div>
                <div><Label>Valor Unitário</Label><CurrencyInput value={entryForm.unit_cost} onChange={(v) => setEntryForm({ ...entryForm, unit_cost: v })} /></div>
              </div>
              <div>
                <Label>Fornecedor</Label>
                <Select value={entryForm.supplier_id} onValueChange={(v) => setEntryForm({ ...entryForm, supplier_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{(suppliers as any[]).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Observação</Label><Textarea value={entryForm.notes} onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })} /></div>
              <Button onClick={() => createEntry.mutate()} disabled={createEntry.isPending} className="w-full">
                {createEntry.isPending ? "Registrando..." : "Registrar Entrada"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>Item *</Label>
                <Select value={exitForm.item_id} onValueChange={(v) => setExitForm({ ...exitForm, item_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar item" /></SelectTrigger>
                  <SelectContent>{(items as any[]).map((i) => <SelectItem key={i.id} value={i.id}>{i.name} (Estoque: {Number(i.current_quantity)})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Quantidade *</Label><Input type="number" value={exitForm.quantity} onChange={(e) => setExitForm({ ...exitForm, quantity: e.target.value })} /></div>
                <div>
                  <Label>Destino *</Label>
                  <Select value={exitForm.destination} onValueChange={(v) => setExitForm({ ...exitForm, destination: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DESTINATIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Projeto</Label><Input value={exitForm.linked_project} onChange={(e) => setExitForm({ ...exitForm, linked_project: e.target.value })} /></div>
                <div><Label>Máquina</Label><Input value={exitForm.linked_machine} onChange={(e) => setExitForm({ ...exitForm, linked_machine: e.target.value })} /></div>
              </div>
              <div><Label>Observação</Label><Textarea value={exitForm.notes} onChange={(e) => setExitForm({ ...exitForm, notes: e.target.value })} /></div>
              <Button onClick={() => createExit.mutate()} disabled={createExit.isPending} className="w-full">
                {createExit.isPending ? "Registrando..." : "Registrar Saída"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
