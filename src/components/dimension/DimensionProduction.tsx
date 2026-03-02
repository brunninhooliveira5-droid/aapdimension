import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useModule } from "@/contexts/ModuleContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const statusLabels: Record<string, string> = { em_fabricacao: "Em fabricação", aguardando_peca: "Aguardando peça", teste: "Teste", pronto: "Pronto" };
const statusColors: Record<string, string> = { em_fabricacao: "bg-blue-500/10 text-blue-600", aguardando_peca: "bg-amber-500/10 text-amber-600", teste: "bg-purple-500/10 text-purple-600", pronto: "bg-green-500/10 text-green-600" };

const emptyForm = { project_name: "", client_name: "", machine_name: "", status: "em_fabricacao", priority: "media", responsible: "", estimated_deadline: "", notes: "" };

export function DimensionProduction() {
  const { tables } = useModule();
  const { session } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    const { data } = await supabase.from(tables.productionItems as any).select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (item: any) => { setEditing(item); setForm({ project_name: item.project_name, client_name: item.client_name, machine_name: item.machine_name, status: item.status, priority: item.priority, responsible: item.responsible, estimated_deadline: item.estimated_deadline ?? "", notes: item.notes }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.project_name.trim()) return;
    setSaving(true);
    const payload: any = { ...form, estimated_deadline: form.estimated_deadline || null };
    if (editing) {
      await supabase.from(tables.productionItems as any).update(payload).eq("id", editing.id);
      toast.success("Atualizado!");
    } else {
      payload.created_by = session?.user?.id;
      await supabase.from(tables.productionItems as any).insert(payload);
      toast.success("Item criado!");
    }
    setDialogOpen(false); setSaving(false); fetch();
  };

  const handleDelete = async (id: string) => {
    await supabase.from(tables.productionItems as any).delete().eq("id", id);
    toast.success("Excluído!"); fetch();
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">Quadro de Produção</h3>
        <Button size="sm" className="gap-1.5" onClick={openCreate}><Plus className="h-3.5 w-3.5" />Novo Item</Button>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Projeto</TableHead>
              <TableHead className="text-xs">Cliente</TableHead>
              <TableHead className="text-xs">Máquina</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Prazo</TableHead>
              <TableHead className="text-xs">Responsável</TableHead>
              <TableHead className="text-xs w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Nenhum item de produção.</TableCell></TableRow>
            ) : items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-sm font-medium">{item.project_name}</TableCell>
                <TableCell className="text-sm">{item.client_name}</TableCell>
                <TableCell className="text-sm">{item.machine_name}</TableCell>
                <TableCell><Badge variant="outline" className={`text-[9px] ${statusColors[item.status]}`}>{statusLabels[item.status]}</Badge></TableCell>
                <TableCell className="text-xs">{item.estimated_deadline ? format(new Date(item.estimated_deadline + "T00:00:00"), "dd/MM/yy", { locale: ptBR }) : "—"}</TableCell>
                <TableCell className="text-xs">{item.responsible || "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir?</AlertDialogTitle><AlertDialogDescription>Ação irreversível.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar Item" : "Novo Item de Produção"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome do Projeto" value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Cliente" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
              <Input placeholder="Máquina" value={form.machine_name} onChange={(e) => setForm({ ...form, machine_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="alta">Alta</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="baixa">Baixa</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Responsável" value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} />
              <Input type="date" value={form.estimated_deadline} onChange={(e) => setForm({ ...form, estimated_deadline: e.target.value })} />
            </div>
            <Textarea placeholder="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
