import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useModule } from "@/contexts/ModuleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowUpFromLine, Plus } from "lucide-react";
import { toast } from "sonner";

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
  const [form, setForm] = useState({ item_id: "", quantity: "", destination: "producao", linked_project: "", linked_machine: "", notes: "" });

  const { data: items = [] } = useQuery({
    queryKey: [tables.inventoryItems],
    queryFn: async () => {
      const { data } = await supabase.from(tables.inventoryItems as any).select("id, name, internal_code, current_quantity").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const createExit = useMutation({
    mutationFn: async () => {
      if (!form.item_id || !form.quantity) throw new Error("Item e quantidade obrigatórios");
      const qty = Number(form.quantity);

      const { error: moveErr } = await supabase.from(tables.inventoryMovements as any).insert({
        item_id: form.item_id,
        movement_type: "saida",
        quantity: qty,
        destination: form.destination,
        linked_project: form.linked_project,
        linked_machine: form.linked_machine,
        notes: form.notes,
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><ArrowUpFromLine className="h-4 w-4" />Saídas</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova Saída</Button>
            </DialogTrigger>
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
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">As saídas registradas aparecem na aba Movimentações com tipo "Saída".</p>
      </CardContent>
    </Card>
  );
}
