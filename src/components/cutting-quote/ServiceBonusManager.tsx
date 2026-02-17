import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Gift, Plus, TrendingUp, TrendingDown, Trash2, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

interface BonusEntry {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  type: string;
  granted_by: string;
  created_at: string;
  notes: string | null;
}

interface ServiceUser {
  id: string;
  name: string;
  email: string;
  company: string;
}

export function ServiceBonusManager() {
  const { session } = useAuth();
  const [users, setUsers] = useState<ServiceUser[]>([]);
  const [bonuses, setBonuses] = useState<BonusEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  // New bonus form
  const [formUserId, setFormUserId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formType, setFormType] = useState("credito");
  const [formDescription, setFormDescription] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);

    // Get service users
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "servico");

    if (!roleRows || roleRows.length === 0) {
      setUsers([]);
      setBonuses([]);
      setLoading(false);
      return;
    }

    const serviceIds = roleRows.map(r => r.user_id);

    const [{ data: profiles }, { data: bonusData }] = await Promise.all([
      supabase.from("profiles").select("id, name, email, company").in("id", serviceIds),
      supabase.from("service_bonuses" as any).select("*").in("user_id", serviceIds).order("created_at", { ascending: false }),
    ]);

    setUsers((profiles ?? []).map((p: any) => ({ id: p.id, name: p.name, email: p.email, company: p.company ?? "" })));
    setBonuses((bonusData as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [session]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const getUserBalance = (userId: string) => {
    const userBonuses = bonuses.filter(b => b.user_id === userId);
    const credits = userBonuses.filter(b => b.type === "credito").reduce((s, b) => s + Number(b.amount), 0);
    const debits = userBonuses.filter(b => b.type === "debito").reduce((s, b) => s + Number(b.amount), 0);
    return credits - debits;
  };

  const handleAdd = async () => {
    if (!formUserId || !formAmount || Number(formAmount) <= 0) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    if (!session?.user) return;

    setSaving(true);
    const { error } = await supabase.from("service_bonuses" as any).insert({
      user_id: formUserId,
      amount: Number(formAmount),
      type: formType,
      description: formDescription || (formType === "credito" ? "Bônus adicionado" : "Bônus removido"),
      granted_by: session.user.id,
      notes: formNotes || null,
    } as any);

    if (error) {
      toast.error("Erro ao registrar bônus.");
    } else {
      toast.success(`Bônus ${formType === "credito" ? "adicionado" : "debitado"} com sucesso.`);
      setShowAddDialog(false);
      resetForm();
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("service_bonuses" as any).delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir registro.");
    } else {
      toast.success("Registro excluído.");
      setBonuses(prev => prev.filter(b => b.id !== id));
    }
  };

  const resetForm = () => {
    setFormUserId("");
    setFormAmount("");
    setFormType("credito");
    setFormDescription("");
    setFormNotes("");
  };

  const filteredBonuses = selectedUserId
    ? bonuses.filter(b => b.user_id === selectedUserId)
    : bonuses;

  const getUserName = (userId: string) => users.find(u => u.id === userId)?.name ?? "—";

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Carregando bônus...</p>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" />
              Gestão de Bônus — Clientes de Serviço
            </CardTitle>
            <CardDescription>Adicione, remova e visualize o histórico de bônus de cada cliente.</CardDescription>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => { resetForm(); setShowAddDialog(true); }}>
            <Plus className="w-3.5 h-3.5" /> Novo Bônus
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balance Summary Cards */}
        {users.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {users.map(u => {
              const bal = getUserBalance(u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => setSelectedUserId(prev => prev === u.id ? "" : u.id)}
                  className={`rounded-lg border p-3 text-left transition-colors hover:border-primary/40 ${
                    selectedUserId === u.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <p className="text-xs font-medium truncate">{u.name}</p>
                  {u.company && <p className="text-[10px] text-muted-foreground truncate">{u.company}</p>}
                  <p className={`text-sm font-bold mt-1 ${bal >= 0 ? "text-primary" : "text-destructive"}`}>
                    {fmt(bal)}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* Filter */}
        {selectedUserId && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1 text-xs">
              <Users className="w-3 h-3" />
              {getUserName(selectedUserId)}
            </Badge>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedUserId("")}>
              Limpar filtro
            </Button>
          </div>
        )}

        {/* History Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBonuses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    Nenhum bônus registrado{selectedUserId ? " para este cliente" : ""}.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBonuses.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="text-xs">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        {format(new Date(b.created_at), "dd/MM/yyyy HH:mm")}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-medium">{getUserName(b.user_id)}</TableCell>
                    <TableCell>
                      {b.type === "credito" ? (
                        <Badge className="text-[10px] bg-primary gap-0.5"><TrendingUp className="w-3 h-3" />Crédito</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] gap-0.5"><TrendingDown className="w-3 h-3" />Débito</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <p className="truncate max-w-[200px]">{b.description}</p>
                      {b.notes && <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{b.notes}</p>}
                    </TableCell>
                    <TableCell className={`text-xs text-right font-bold ${b.type === "credito" ? "text-primary" : "text-destructive"}`}>
                      {b.type === "credito" ? "+" : "−"}{fmt(Number(b.amount))}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir registro de bônus?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(b.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Add Bonus Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" />
              Novo Bônus
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Cliente *</Label>
              <Select value={formUserId} onValueChange={setFormUserId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id} className="text-sm">
                      {u.name}{u.company ? ` — ${u.company}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo *</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credito">Crédito (+)</SelectItem>
                    <SelectItem value="debito">Débito (−)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor (R$) *</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value)}
                  className="h-9 text-sm"
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Input
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                className="h-9 text-sm"
                placeholder="Ex: Bônus de indicação"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observações</Label>
              <Textarea
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                className="text-sm min-h-[60px]"
                placeholder="Notas internas (opcional)"
              />
            </div>
            <Button className="w-full" onClick={handleAdd} disabled={saving}>
              {saving ? "Salvando..." : `Registrar ${formType === "credito" ? "Crédito" : "Débito"}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
