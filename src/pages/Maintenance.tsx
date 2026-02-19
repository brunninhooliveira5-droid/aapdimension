import { useState, useEffect } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Calendar, Wrench, Search, Filter, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface MaintenanceRow {
  id: string;
  type: string;
  scheduled_date: string;
  status: string;
  notes: string | null;
  machine_id: string;
  user_id: string;
}

interface MachineInfo {
  id: string;
  name: string;
  model: string;
  serial_number: string;
}

interface ProfileInfo {
  id: string;
  name: string;
}

const Maintenance = () => {
  const [maintenances, setMaintenances] = useState<MaintenanceRow[]>([]);
  const [machines, setMachines] = useState<Record<string, MachineInfo>>({});
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("todos");

  useEffect(() => {
    const fetchData = async () => {
      const { data: maintData } = await supabase
        .from("maintenances")
        .select("*")
        .order("scheduled_date", { ascending: false });
      setMaintenances(maintData ?? []);

      const { data: machinesData } = await supabase
        .from("machines")
        .select("id, name, model, serial_number");
      const machineMap: Record<string, MachineInfo> = {};
      (machinesData ?? []).forEach((m: any) => { machineMap[m.id] = m; });
      setMachines(machineMap);

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name");
      const profileMap: Record<string, string> = {};
      (profilesData ?? []).forEach((p: ProfileInfo) => { profileMap[p.id] = p.name; });
      setProfiles(profileMap);
    };
    fetchData();
  }, []);

  const getMachineName = (machineId: string) => {
    const m = machines[machineId];
    return m ? (m.name || m.model) : "—";
  };

  const applyFilters = (items: MaintenanceRow[]) => {
    return items.filter(m => {
      if (filterType !== "todos" && m.type !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const machineName = getMachineName(m.machine_id).toLowerCase();
        const userName = (profiles[m.user_id] || "").toLowerCase();
        if (!m.type.toLowerCase().includes(q) && !machineName.includes(q) && !userName.includes(q) && !(m.notes || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  };

  const scheduled = applyFilters(maintenances.filter(m => m.status !== "realizada"));
  const completed = applyFilters(maintenances.filter(m => m.status === "realizada"));

  const maintenanceTypes = [...new Set(maintenances.map(m => m.type))];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">Manutenção</h1>
        <p className="text-sm text-muted-foreground mt-1">{maintenances.length} registros</p>
      </div>

      {/* Informativo */}
      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Área gerenciada pela Dimension CNC</p>
          <p className="mt-1">
            Esta seção é utilizada exclusivamente pela equipe Dimension para sinalizar manutenções preventivas, observações técnicas e recomendações a serem realizadas nos seus equipamentos.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por máquina, tipo, usuário..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 bg-accent border-border h-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="bg-accent border-border h-9 w-full sm:w-[180px]">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Tipos</SelectItem>
            {maintenanceTypes.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="agendadas">
        <TabsList className="bg-accent border border-border">
          <TabsTrigger value="agendadas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Agendadas ({scheduled.length})
          </TabsTrigger>
          <TabsTrigger value="realizadas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Realizadas ({completed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agendadas" className="space-y-3 mt-4">
          {scheduled.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma manutenção encontrada.</p>
          ) : (
            scheduled.map(m => (
              <MaintenanceCard key={m.id} maintenance={m} machineName={getMachineName(m.machine_id)} userName={profiles[m.user_id] || "—"} />
            ))
          )}
        </TabsContent>

        <TabsContent value="realizadas" className="space-y-3 mt-4">
          {completed.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma manutenção encontrada.</p>
          ) : (
            completed.map(m => (
              <MaintenanceCard key={m.id} maintenance={m} machineName={getMachineName(m.machine_id)} userName={profiles[m.user_id] || "—"} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

function MaintenanceCard({ maintenance, machineName, userName }: { maintenance: MaintenanceRow; machineName: string; userName: string }) {
  return (
    <div className="gradient-card rounded-lg border border-border p-4 flex items-center gap-4 hover:border-primary/20 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
        <Wrench className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{machineName}</p>
        <p className="text-xs text-muted-foreground">{maintenance.type} • {userName}</p>
        {maintenance.notes && <p className="text-xs text-muted-foreground truncate mt-0.5">{maintenance.notes}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(maintenance.scheduled_date).toLocaleDateString("pt-BR")}
        </div>
        <StatusBadge status={maintenance.status} />
      </div>
    </div>
  );
}

export default Maintenance;
