import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useModule } from "@/contexts/ModuleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BookmarkCheck, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  reservado: { label: "Reservado", color: "bg-blue-500 text-white" },
  em_producao: { label: "Em Produção", color: "bg-amber-500 text-white" },
  consumido: { label: "Consumido", color: "bg-emerald-500 text-white" },
  cancelado: { label: "Cancelado", color: "bg-muted text-muted-foreground" },
};

export function InventoryReservations() {
  const { session } = useAuth();
  const { tables } = useModule();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ item_id: "", quantity: "", linked_order: "", linked_machine: "", notes: "" });

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: [tables.inventoryReservations],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tables.inventoryReservations as any)
        .select(`*, ${tables.inventoryItems}(name)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: [tables.inventoryItems],
    queryFn: async () => {
      const { data } = await supabase.from(tables.inventoryItems as any).select("id, name, current_quantity, reserved_quantity").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const createReservation = useMutation({
    mutationFn: async () => {
      if (!form.item_id || !form.quantity) throw new Error("Item e quantidade obrigatórios");
      const qty = Number(form.quantity);

      const { error } = await supabase.from(tables.inventoryReservations as any).insert({
        item_id: form.item_id,
        quantity: qty,
        linked_order: form.linked_order,
        linked_machine: form.linked_machine,
        notes: form.notes,
        reserved_by: session?.user.id!,
      });
      if (error) throw error;

      const { data: item } = await supabase.from(tables.inventoryItems as any).select("reserved_quantity").eq("id", form.item_id).single();
      if (item) {
        await supabase.from(tables.inventoryItems as any).update({
          reserved_quantity: Number((item as any).reserved_quantity) + qty,
        }).eq("id", form.item_id);
      }
    },
    onSuccess: () => {
      toast.success("Reserva criada!");
      qc.invalidateQueries({ queryKey: [tables.inventoryReservations] });
      qc.invalidateQueries({ queryKey: [tables.inventoryItems] });
      setOpen(false);
      setForm({ item_id: "", quantity: "", linked_order: "", linked_machine: "", notes: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, item_id, quantity }: { id: string; status: string; item_id: string; quantity: number }) => {
      await supabase.from(tables.inventoryReservations as any).update({
        status,
        consumed_at: status === "consumido" ? new Date().toISOString() : null,
      }).eq("id", id);

      if (status === "consumido") {
        const { data: item } = await supabase.from(tables.inventoryItems as any).select("current_quantity, reserved_quantity").eq("id", item_id).single();
        if (item) {
          await supabase.from(tables.inventoryItems as any).update({
            current_quantity: Math.max(0, Number((item as any).current_quantity) - quantity),
            reserved_quantity: Math.max(0, Number((item as any).reserved_quantity) - quantity),
          }).eq("id", item_id);
        }
      } else if (status === "cancelado") {
        const { data: item } = await supabase.from(tables.inventoryItems as any).select("reserved_quantity").eq("id", item_id).single();
        if (item) {
          await supabase.from(tables.inventoryItems as any).update({
            reserved_quantity: Math.max(0, Number((item as any).reserved_quantity) - quantity),
          }).eq("id", item_id);
        }
      }
    },
    onSuccess: () => {
      toast.success("Reserva atualizada!");
      qc.invalidateQueries({ queryKey: [tables.inventoryReservations] });
      qc.invalidateQueries({ queryKey: [tables.inventoryItems] });
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><BookmarkCheck className="h-4 w-4" />Reservas de Produção</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova Reserva</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Reserva</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Item *</Label>
                  <Select value={form.item_id} onValueChange={(v) => setForm({ ...form, item_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>{(items as any[]).map((i) => <SelectItem key={i.id} value={i.id}>{i.name} (Disp: {Number(i.current_quantity) - Number(i.reserved_quantity)})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Quantidade *</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Ordem/Projeto</Label><Input value={form.linked_order} onChange={(e) => setForm({ ...form, linked_order: e.target.value })} /></div>
                  <div><Label>Máquina</Label><Input value={form.linked_machine} onChange={(e) => setForm({ ...form, linked_machine: e.target.value })} /></div>
                </div>
                <Button onClick={() => createReservation.mutate()} disabled={createReservation.isPending} className="w-full">
                  {createReservation.isPending ? "Salvando..." : "Criar Reserva"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
        ) : (reservations as any[]).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma reserva.</p>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead>Ordem/Projeto</TableHead>
                  <TableHead>Máquina</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(reservations as any[]).map((r) => {
                  const s = STATUS_MAP[r.status] || { label: r.status, color: "" };
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r[tables.inventoryItems]?.name}</TableCell>
                      <TableCell className="text-right">{Number(r.quantity)}</TableCell>
                      <TableCell className="text-xs">{r.linked_order || "-"}</TableCell>
                      <TableCell className="text-xs">{r.linked_machine || "-"}</TableCell>
                      <TableCell><Badge className={s.color}>{s.label}</Badge></TableCell>
                      <TableCell className="text-xs">{format(new Date(r.created_at), "dd/MM/yy")}</TableCell>
                      <TableCell>
                        {r.status === "reservado" && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus.mutate({ id: r.id, status: "consumido", item_id: r.item_id, quantity: Number(r.quantity) })}>Consumir</Button>
                            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => updateStatus.mutate({ id: r.id, status: "cancelado", item_id: r.item_id, quantity: Number(r.quantity) })}>Cancelar</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
