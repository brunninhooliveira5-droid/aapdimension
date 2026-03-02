import { useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";

interface MaintenanceData {
  id: string;
  type: string;
  scheduled_date: string;
  status: string;
  machine_id: string;
  machine_model: string;
}

interface Props {
  maintenances: MaintenanceData[];
  isAdminMaster: boolean;
}

export function MaintenanceWidget({ maintenances, isAdminMaster }: Props) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  const filtered = maintenances.filter(m => {
    if (statusFilter !== "todos" && m.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!m.type.toLowerCase().includes(q) && !m.machine_model.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="gradient-card rounded-lg border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Manutenções Próximas</h3>
      {isAdminMaster && (
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 bg-accent border-border h-8 text-xs" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-accent border-border h-8 text-xs w-full sm:w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="agendada">Agendada</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="realizada">Realizada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma manutenção encontrada.</p>
        ) : filtered.map(m => (
          <div key={m.id}
            className={`flex items-center justify-between p-3 rounded-md bg-accent/50 ${isAdminMaster ? "cursor-pointer hover:bg-accent/80" : ""} transition-colors`}
            onClick={isAdminMaster ? () => navigate(`/maquinas/${m.machine_id}`) : undefined}>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{m.machine_model}</p>
              <p className="text-xs text-muted-foreground">{m.type} — {new Date(m.scheduled_date).toLocaleDateString("pt-BR")}</p>
            </div>
            <StatusBadge status={m.status} className="ml-3 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
