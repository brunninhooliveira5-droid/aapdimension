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
import { ArrowUpFromLine, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
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

export function InventoryExits() {
  const { session } = useAuth();
  const { tables } = useModule();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [form, setForm] = useState({ item_id: "", quantity: "", destination: "producao", linked_project: "", linked_machine: "", notes: "" });
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const table = tables.inventoryItems.startsWith("pc_") ? "pc" as const : "dimension" as const;

  const { data: items = [] } = useQuery({
    queryKey: [tables.inventoryItems],
    queryFn: async () => {
      const { data } = await supabase.from(tables.inventoryItems as any).select("id, name, internal_code, current_quantity").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: exits = [], isLoading } = useQuery({
    queryKey: [tables.inventoryMovements, "saidas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tables.inventoryMovements as any)
        .select(`*, ${tables.inventoryItems}(name, internal_code)`)
        .eq("movement_type", "saida")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = filterByMonthYear(exits as any[], month, year);
  const hasFilter = !!month || !!year;
  const filterLabel = hasFilter
    ? `${month ? getMonthLabel(month) : "Todos os meses"} / ${year || "Todos os anos"}`
    : "";

  const handleExport = () => {
    exportInventoryPdf({
      title: "Saídas de Estoque",
      filterLabel,
      columns: ["Data", "Código", "Item", "Qtd", "Motivo", "Projeto/Máquina"],
      rows: filtered.map((m: any) => [
        format(new Date(m.created_at), "dd/MM/yy HH:mm"),
        m[tables.inventoryItems]?.internal_code || "-",
        m[tables.inventoryItems]?.name || "-",
        String(Number(m.quantity)),
        m.reason || "-",
        m.linked_project || m.linked_machine || "-",
      ]),
    });
  };

  const createExit = useMutation({
    mutationFn: async () => {
      if (!form.item_id || !form.quantity) throw new Error("Item e quantidade obrigatórios");
      const qty = Number(form.quantity);

      const { error: moveErr } = await supabase.from(tables.inventoryMovements as any).insert({
        item_id: form.item_id, movement_type: "saida", quantity: qty,
        destination: form.destination, linked_project: form.linked_project,
        linked_machine: form.linked_machine, notes: form.notes,
        reason: `Saída: ${DESTINATIONS.find((d) => d.value === form.destination)?.label}`,
        created_by: session?.user.id!,
      });
      if (moveErr) throw moveErr;

      const { data: item } = await supabase.from(tables.inventoryItems as any).select("current_quantity").eq("id", form.item_id).single();
      if (item) {
        await supabase.from(tables.inventoryItems as any).update({
          current_quantity: Math.max(0, Number((item as any).current_quantity) - qty),
        }).eq("id", form.item_id);
      }
    },
    onSuccess: () => {
      toast.success("Saída registrada!");
      qc.invalidateQueries({ queryKey: [tables.inventoryItems] });
      qc.invalidateQueries({ queryKey: [tables.inventoryMovements] });
      setOpen(false);
      setForm({ item_id: "", quantity: "", destination: "producao", linked_project: "", linked_machine: "", notes: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <Card>
        <CardHeader className="pb-3 space-y-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><ArrowUpFromLine className="h-4 w-4" />Saídas</CardTitle>
            <Button size="sm" onClick={() => setPasswordOpen(true)}><Plus className="h-4 w-4 mr-1" />Nova Saída</Button>
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
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma saída encontrada.</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
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

      <InventoryPasswordPrompt open={passwordOpen} onOpenChange={setPasswordOpen} onSuccess={() => setOpen(true)} table={table} description="Digite a senha do estoque para registrar uma saída." />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Saída</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Item *</Label>
              <Select value={form.item_id} onValueChange={(v) => setForm({ ...form, item_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar item" /></SelectTrigger>
                <SelectContent>{(items as any[]).map((i) => <SelectItem key={i.id} value={i.id}>{i.name} (Estoque: {Number(i.current_quantity)})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Quantidade *</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
              <div>
                <Label>Destino *</Label>
                <Select value={form.destination} onValueChange={(v) => setForm({ ...form, destination: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DESTINATIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Projeto</Label><Input value={form.linked_project} onChange={(e) => setForm({ ...form, linked_project: e.target.value })} /></div>
              <div><Label>Máquina</Label><Input value={form.linked_machine} onChange={(e) => setForm({ ...form, linked_machine: e.target.value })} /></div>
            </div>
            <div><Label>Observação</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button onClick={() => createExit.mutate()} disabled={createExit.isPending} className="w-full">
              {createExit.isPending ? "Registrando..." : "Registrar Saída"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
