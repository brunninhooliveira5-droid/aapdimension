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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, Plus } from "lucide-react";
import { toast } from "sonner";

export function InventorySuppliers() {
  const { session } = useAuth();
  const { tables } = useModule();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", contact_name: "", whatsapp: "", email: "", avg_delivery_days: "", notes: "" });

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: [tables.inventorySuppliers],
    queryFn: async () => {
      const { data, error } = await supabase.from(tables.inventorySuppliers as any).select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const createSupplier = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Nome obrigatório");
      const { error } = await supabase.from(tables.inventorySuppliers as any).insert({
        name: form.name.trim(),
        contact_name: form.contact_name,
        whatsapp: form.whatsapp,
        email: form.email,
        avg_delivery_days: Number(form.avg_delivery_days) || 0,
        notes: form.notes,
        created_by: session?.user.id!,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fornecedor cadastrado!");
      qc.invalidateQueries({ queryKey: [tables.inventorySuppliers] });
      setOpen(false);
      setForm({ name: "", contact_name: "", whatsapp: "", email: "", avg_delivery_days: "", notes: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" />Fornecedores</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo Fornecedor</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Fornecedor</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Contato</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
                  <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Label>Prazo Entrega (dias)</Label><Input type="number" value={form.avg_delivery_days} onChange={(e) => setForm({ ...form, avg_delivery_days: e.target.value })} /></div>
                </div>
                <div><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <Button onClick={() => createSupplier.mutate()} disabled={createSupplier.isPending} className="w-full">
                  {createSupplier.isPending ? "Salvando..." : "Cadastrar Fornecedor"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
        ) : (suppliers as any[]).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum fornecedor cadastrado.</p>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Prazo (dias)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(suppliers as any[]).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.contact_name || "-"}</TableCell>
                    <TableCell>{s.whatsapp || "-"}</TableCell>
                    <TableCell>{s.email || "-"}</TableCell>
                    <TableCell>{s.avg_delivery_days || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
