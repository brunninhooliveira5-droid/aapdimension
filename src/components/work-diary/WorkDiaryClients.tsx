import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { applyPhoneMask } from "@/lib/phone-mask";

interface Client {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  notes: string;
}

const emptyClient: Omit<Client, "id"> = {
  name: "", company: "", phone: "", email: "",
  address: "", city: "", state: "", notes: "",
};

export function WorkDiaryClients() {
  const { effectiveUserId } = useEffectiveUser();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyClient });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (effectiveUserId) loadClients(); }, [effectiveUserId]);

  const loadClients = async () => {
    const { data } = await supabase
      .from("work_diary_clients")
      .select("*")
      .eq("user_id", effectiveUserId!)
      .order("name");
    setClients((data as any[]) || []);
  };

  const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handlePhoneChange = (val: string) => update("phone", applyPhoneMask(val));

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyClient });
    setDialogOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditingId(c.id);
    setForm({ name: c.name, company: c.company, phone: c.phone, email: c.email, address: c.address, city: c.city, state: c.state, notes: c.notes });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!effectiveUserId || !form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from("work_diary_clients").update(form as any).eq("id", editingId);
        if (error) throw error;
        toast.success("Cliente atualizado!");
      } else {
        const { error } = await supabase.from("work_diary_clients").insert({ ...form, user_id: effectiveUserId } as any);
        if (error) throw error;
        toast.success("Cliente cadastrado!");
      }
      setDialogOpen(false);
      loadClients();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este cliente?")) return;
    await supabase.from("work_diary_clients").delete().eq("id", id);
    toast.success("Cliente excluído");
    loadClients();
  };

  const filtered = clients.filter((c) =>
    `${c.name} ${c.company} ${c.phone}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Clientes Cadastrados</CardTitle>
          <Button size="sm" onClick={openNew}><Plus className="h-3.5 w-3.5 mr-1" /> Novo Cliente</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum cliente cadastrado.</p>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.company}</TableCell>
                      <TableCell>{c.phone}</TableCell>
                      <TableCell>{c.email}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div>
              <Label>Empresa</Label>
              <Input value={form.company} onChange={(e) => update("company", e.target.value)} placeholder="Nome da empresa" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => handlePhoneChange(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="sm:col-span-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div className="sm:col-span-2">
              <Label>Endereço</Label>
              <Input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Rua, número" />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Cidade" />
            </div>
            <div>
              <Label>Estado</Label>
              <Input value={form.state} onChange={(e) => update("state", e.target.value)} placeholder="UF" maxLength={2} />
            </div>
            <div className="sm:col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} placeholder="Anotações sobre o cliente..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
