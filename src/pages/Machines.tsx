import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Cpu, CalendarDays, Wrench, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MachineRow {
  id: string;
  name: string;
  model: string;
  serial_number: string;
  status: string;
  install_date: string;
  accessories: string[];
  owner_id: string;
  owner_name: string;
  ticket_count: number;
  maintenance_count: number;
}

interface ProfileOption {
  id: string;
  name: string;
}

const Machines = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin_master" || user?.role === "admin";

  const [machines, setMachines] = useState<MachineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);

  // Form state
  const [formName, setFormName] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formSerial, setFormSerial] = useState("");
  const [formOwner, setFormOwner] = useState("");
  const [formAccessories, setFormAccessories] = useState("");

  const fetchMachines = async () => {
    setLoading(true);
    const { data: machinesData } = await supabase.from("machines").select("*");

    if (machinesData) {
      const ownerIds = [...new Set(machinesData.map(m => m.owner_id))];
      const { data: ownerProfiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", ownerIds);
      const ownerMap = new Map(ownerProfiles?.map(p => [p.id, p.name]) ?? []);

      // Get ticket counts per machine
      const { data: ticketCounts } = await supabase
        .from("tickets")
        .select("machine_id");
      const ticketMap = new Map<string, number>();
      ticketCounts?.forEach(t => ticketMap.set(t.machine_id, (ticketMap.get(t.machine_id) ?? 0) + 1));

      // Get maintenance counts per machine
      const { data: maintCounts } = await supabase
        .from("maintenances")
        .select("machine_id");
      const maintMap = new Map<string, number>();
      maintCounts?.forEach(m => maintMap.set(m.machine_id, (maintMap.get(m.machine_id) ?? 0) + 1));

      setMachines(machinesData.map(m => ({
        id: m.id,
        name: (m as any).name ?? "",
        model: m.model,
        serial_number: m.serial_number,
        status: m.status,
        install_date: m.install_date,
        accessories: m.accessories ?? [],
        owner_id: m.owner_id,
        owner_name: ownerMap.get(m.owner_id) ?? "—",
        ticket_count: ticketMap.get(m.id) ?? 0,
        maintenance_count: maintMap.get(m.id) ?? 0,
      })));
    }
    setLoading(false);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("id, name").eq("approved", true);
    setProfiles(data ?? []);
  };

  useEffect(() => {
    fetchMachines();
    if (isAdmin) fetchProfiles();
  }, []);

  const handleAddMachine = async () => {
    if (!formModel || !formSerial || !formOwner) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    const accessories = formAccessories.split(",").map(a => a.trim()).filter(Boolean);

    const { error } = await supabase.from("machines").insert({
      name: formName,
      model: formModel,
      serial_number: formSerial,
      owner_id: formOwner,
      accessories,
    } as any);

    if (error) {
      toast.error("Erro ao adicionar máquina: " + error.message);
      return;
    }

    toast.success("Máquina adicionada com sucesso!");
    setShowAddDialog(false);
    setFormName("");
    setFormModel("");
    setFormSerial("");
    setFormOwner("");
    setFormAccessories("");
    fetchMachines();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Minhas Máquinas</h1>
          <p className="text-sm text-muted-foreground mt-1">{machines.length} máquinas registradas</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Adicionar Máquina
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {machines.map(machine => (
          <div
            key={machine.id}
            className="gradient-card rounded-lg border border-border p-5 space-y-4 hover:border-primary/30 transition-colors cursor-pointer"
            onClick={() => navigate(`/maquinas/${machine.id}`)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{machine.name || machine.model}</h3>
                  <p className="text-xs font-mono text-muted-foreground">{machine.serial_number}</p>
                </div>
              </div>
              <StatusBadge status={machine.status} />
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-3.5 h-3.5" />
                <span>Proprietário: {machine.owner_name}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Instalação: {new Date(machine.install_date).toLocaleDateString("pt-BR")}</span>
              </div>
              {machine.accessories.length > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Acessórios: {machine.accessories.join(", ")}</span>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-2 border-t border-border">
              <div className="text-center flex-1">
                <p className="text-lg font-bold text-foreground">{machine.ticket_count}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Chamados</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-lg font-bold text-foreground">{machine.maintenance_count}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Manutenções</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Machine Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Adicionar Máquina</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-foreground">Nome da Máquina</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ex: CNC Principal" className="bg-accent border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Modelo *</Label>
              <Input value={formModel} onChange={e => setFormModel(e.target.value)} placeholder="Ex: Romi D800" className="bg-accent border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Número de Série *</Label>
              <Input value={formSerial} onChange={e => setFormSerial(e.target.value)} placeholder="Ex: SN-2024-001" className="bg-accent border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Proprietário *</Label>
              <Select value={formOwner} onValueChange={setFormOwner}>
                <SelectTrigger className="bg-accent border-border"><SelectValue placeholder="Selecione o usuário" /></SelectTrigger>
                <SelectContent>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Acessórios</Label>
              <Input value={formAccessories} onChange={e => setFormAccessories(e.target.value)} placeholder="Separados por vírgula" className="bg-accent border-border" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-border">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleAddMachine}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Machines;
