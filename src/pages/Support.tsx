import { useState, useEffect } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Pencil, Trash2, User, Cpu, CalendarDays } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const problemTypes = ["Erro de Software", "Mecânico", "Elétrico", "Calibração", "Outro"];

interface TicketRow {
  id: string;
  type: string;
  description: string;
  status: string;
  created_at: string;
  machine_id: string;
  user_id: string;
}

interface MachineOption {
  id: string;
  model: string;
  serial_number: string;
  name: string;
}

const Support = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin_master" || user?.role === "admin";

  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [machines, setMachines] = useState<MachineOption[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [newMachine, setNewMachine] = useState("");
  const [newType, setNewType] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Detail dialog state
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);
  const [profileDetails, setProfileDetails] = useState<Record<string, any>>({});

  // Edit state
  const [editTicket, setEditTicket] = useState<TicketRow | null>(null);
  const [editType, setEditType] = useState("");
  const [editDesc, setEditDesc] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const { data: ticketsData } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });
      setTickets(ticketsData ?? []);

      const { data: machinesData } = await supabase
        .from("machines")
        .select("id, model, serial_number, name");
      setMachines(machinesData ?? []);

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name, email, company, phone");
      const profileMap: Record<string, string> = {};
      const profileFull: Record<string, any> = {};
      (profilesData ?? []).forEach((p: any) => {
        profileMap[p.id] = p.name;
        profileFull[p.id] = p;
      });
      setProfiles(profileMap);
      setProfileDetails(profileFull);
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMachine || !newType || !newDesc.trim()) {
      toast.error("Preencha todos os campos.");
      return;
    }
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from("tickets")
      .insert({
        machine_id: newMachine,
        type: newType,
        description: newDesc,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao abrir chamado: " + error.message);
      return;
    }
    toast.success("Chamado aberto com sucesso!");
    setTickets(prev => [data as TicketRow, ...prev]);
    setOpen(false);
    setNewMachine("");
    setNewType("");
    setNewDesc("");
  };

  const handleChangeStatus = async (ticketId: string, newStatus: string) => {
    const { error } = await supabase
      .from("tickets")
      .update({ status: newStatus } as any)
      .eq("id", ticketId);
    if (error) {
      toast.error("Erro ao atualizar status: " + error.message);
      return;
    }
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
    toast.success("Status atualizado!");
  };

  const handleEditSave = async () => {
    if (!editTicket || !editType || !editDesc.trim()) {
      toast.error("Preencha todos os campos.");
      return;
    }
    const { error } = await supabase
      .from("tickets")
      .update({ type: editType, description: editDesc } as any)
      .eq("id", editTicket.id);
    if (error) {
      toast.error("Erro ao atualizar: " + error.message);
      return;
    }
    setTickets(prev => prev.map(t => t.id === editTicket.id ? { ...t, type: editType, description: editDesc } : t));
    setEditTicket(null);
    toast.success("Chamado atualizado!");
  };

  const handleDelete = async (ticketId: string) => {
    const { error } = await supabase
      .from("tickets")
      .delete()
      .eq("id", ticketId);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    toast.success("Chamado excluído!");
  };

  const getMachineName = (machineId: string) => {
    const m = machines.find(m => m.id === machineId);
    return m ? `${m.name || m.model} — ${m.serial_number}` : machineId;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Suporte</h1>
          <p className="text-sm text-muted-foreground mt-1">{tickets.length} chamados</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Chamado
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Abrir Chamado</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Máquina</Label>
                <Select value={newMachine} onValueChange={setNewMachine}>
                  <SelectTrigger className="bg-accent border-border"><SelectValue placeholder="Selecione a máquina" /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {machines.map(m => <SelectItem key={m.id} value={m.id}>{m.name || m.model} — {m.serial_number}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Tipo de Problema</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="bg-accent border-border"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {problemTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Descrição</Label>
                <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Descreva o problema detalhadamente..." className="bg-accent border-border min-h-[100px]" required />
              </div>
              <Button type="submit" className="w-full">Enviar Chamado</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum chamado registrado.</p>
        ) : (
          tickets.map(ticket => (
            <div key={ticket.id} className="gradient-card rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center gap-4 cursor-pointer hover:bg-accent/30 rounded-md p-1 -m-1 transition-colors" onClick={() => setSelectedTicket(ticket)}>
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={ticket.status} />
                  </div>
                  <p className="text-sm font-medium text-foreground mt-1">{getMachineName(ticket.machine_id)} — {ticket.type}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{ticket.description}</p>
                </div>
                <p className="text-xs text-muted-foreground shrink-0">{new Date(ticket.created_at).toLocaleDateString("pt-BR")}</p>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-3 pt-2 border-t border-border/50 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Status:</span>
                    <Select value={ticket.status} onValueChange={(val) => handleChangeStatus(ticket.id, val)}>
                      <SelectTrigger className="h-7 text-xs bg-accent border-border w-auto min-w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aberto">Aberto</SelectItem>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                        <SelectItem value="resolvido">Resolvido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1 ml-auto">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={() => {
                      setEditTicket(ticket);
                      setEditType(ticket.type);
                      setEditDesc(ticket.description);
                    }}>
                      <Pencil className="w-3 h-3" /> Editar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3 h-3" /> Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-foreground">Excluir Chamado</AlertDialogTitle>
                          <AlertDialogDescription>Tem certeza que deseja excluir este chamado? Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(ticket.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editTicket} onOpenChange={(open) => !open && setEditTicket(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Chamado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-foreground">Tipo de Problema</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger className="bg-accent border-border"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {problemTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Descrição</Label>
              <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} className="bg-accent border-border min-h-[100px]" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-border">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleEditSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">Detalhes do Chamado</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedTicket.status} />
                <span className="text-xs text-muted-foreground">{new Date(selectedTicket.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-accent/30">
                  <User className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground uppercase">Aberto por</p>
                    <p className="text-sm font-medium text-foreground">{profiles[selectedTicket.user_id] || "—"}</p>
                    {profileDetails[selectedTicket.user_id]?.email && (
                      <p className="text-xs text-muted-foreground">{profileDetails[selectedTicket.user_id].email}</p>
                    )}
                    {profileDetails[selectedTicket.user_id]?.phone && (
                      <p className="text-xs text-muted-foreground">{profileDetails[selectedTicket.user_id].phone}</p>
                    )}
                    {profileDetails[selectedTicket.user_id]?.company && (
                      <p className="text-xs text-muted-foreground">{profileDetails[selectedTicket.user_id].company}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-accent/30">
                  <Cpu className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground uppercase">Máquina</p>
                    <p className="text-sm font-medium text-foreground">{getMachineName(selectedTicket.machine_id)}</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-accent/30">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Tipo de Problema</p>
                  <p className="text-sm font-medium text-foreground">{selectedTicket.type}</p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-accent/30">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Descrição</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-border">Fechar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Support;
