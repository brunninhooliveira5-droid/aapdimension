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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowDownToLine, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CurrencyInput } from "./CurrencyInput";
import { InventoryPasswordPrompt } from "./InventoryPasswordPrompt";
import { InventoryDateFilter, filterByMonthYear, getMonthLabel } from "./InventoryDateFilter";
import { exportInventoryPdf } from "@/lib/inventory-pdf";

export function InventoryEntries() {
  const { session } = useAuth();
  const { tables } = useModule();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [form, setForm] = useState({ item_id: "", quantity: "", unit_cost: "", supplier_id: "", notes: "" });
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const table = tables.inventoryItems.startsWith("pc_") ? "pc" as const : "dimension" as const;

  const { data: items = [] } = useQuery({
    queryKey: [tables.inventoryItems],
    queryFn: async () => {
      const { data } = await supabase.from(tables.inventoryItems as any).select("id, name, internal_code").eq("is_active", true).order("name");
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

  const { data: entries = [], isLoading } = useQuery({
    queryKey: [tables.inventoryMovements, "entradas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tables.inventoryMovements as any)
        .select(`*, ${tables.inventoryItems}(name, internal_code)`)
        .eq("movement_type", "entrada")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = filterByMonthYear(entries as any[], month, year);
  const hasFilter = !!month || !!year;
  const filterLabel = hasFilter
    ? `${month ? getMonthLabel(month) : "Todos os meses"} / ${year || "Todos os anos"}`
    : "";

  const handleExport = () => {
    exportInventoryPdf({
      title: "Entradas de Estoque",
      filterLabel,
      columns: ["Data", "Item", "Qtd", "Motivo", "Projeto"],
      rows: filtered.map((m: any) => [
        format(new Date(m.created_at), "dd/MM/yy HH:mm"),
        m[tables.inventoryItems]?.name || "-",
        String(Number(m.quantity)),
        m.reason || "-",
        m.linked_project || "-",
      ]),
    });
  };

  const createEntry = useMutation({
    mutationFn: async () => {
      if (!form.item_id || !form.quantity) throw new Error("Item e quantidade obrigatórios");
      const qty = Number(form.quantity);
      const cost = Number(form.unit_cost) || 0;

      const { error: moveErr } = await supabase.from(tables.inventoryMovements as any).insert({
        item_id: form.item_id, movement_type: "entrada", quantity: qty,
        unit_cost: cost, total_cost: qty * cost, supplier_id: form.supplier_id || null,
        notes: form.notes, reason: "Entrada manual", created_by: session?.user.id!,
      });
      if (moveErr) throw moveErr;

      const { data: item } = await supabase.from(tables.inventoryItems as any).select("current_quantity, avg_cost").eq("id", form.item_id).single();
      if (item) {
        const oldQty = Number((item as any).current_quantity);
        const oldAvg = Number((item as any).avg_cost);
        const newQty = oldQty + qty;
        const newAvg = cost > 0 ? ((oldAvg * oldQty) + (cost * qty)) / newQty : oldAvg;
        await supabase.from(tables.inventoryItems as any).update({
          current_quantity: newQty, last_cost: cost > 0 ? cost : undefined, avg_cost: newAvg,
        }).eq("id", form.item_id);
      }
    },
    onSuccess: () => {
      toast.success("Entrada registrada!");
      qc.invalidateQueries({ queryKey: [tables.inventoryItems] });
      qc.invalidateQueries({ queryKey: [tables.inventoryMovements] });
      setOpen(false);
      setForm({ item_id: "", quantity: "", unit_cost: "", supplier_id: "", notes: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <Card>
        <CardHeader className="pb-3 space-y-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><ArrowDownToLine className="h-4 w-4" />Entradas</CardTitle>
            <Button size="sm" onClick={() => setPasswordOpen(true)}><Plus className="h-4 w-4 mr-1" />Nova Entrada</Button>
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
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma entrada encontrada.</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Projeto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs">{format(new Date(m.created_at), "dd/MM/yy HH:mm")}</TableCell>
                      <TableCell className="font-medium">{m[tables.inventoryItems]?.name || "-"}</TableCell>
                      <TableCell className="text-right">{Number(m.quantity)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.reason || "-"}</TableCell>
                      <TableCell className="text-xs">{m.linked_project || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <InventoryPasswordPrompt open={passwordOpen} onOpenChange={setPasswordOpen} onSuccess={() => setOpen(true)} table={table} description="Digite a senha do estoque para registrar uma entrada." />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Entrada</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Item *</Label>
              <Select value={form.item_id} onValueChange={(v) => setForm({ ...form, item_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar item" /></SelectTrigger>
                <SelectContent>{(items as any[]).map((i) => <SelectItem key={i.id} value={i.id}>{i.name} {i.internal_code && `(${i.internal_code})`}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Quantidade *</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
              <div><Label>Valor Unitário</Label><CurrencyInput value={form.unit_cost} onChange={(v) => setForm({ ...form, unit_cost: v })} /></div>
            </div>
            <div>
              <Label>Fornecedor</Label>
              <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{(suppliers as any[]).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Observação</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button onClick={() => createEntry.mutate()} disabled={createEntry.isPending} className="w-full">
              {createEntry.isPending ? "Registrando..." : "Registrar Entrada"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
