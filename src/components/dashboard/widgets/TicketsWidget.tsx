import { useState } from "react";
import { Search, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TicketData {
  id: string;
  type: string;
  description: string;
  status: string;
  machine_id: string;
  machine_model: string;
}

interface Props {
  tickets: TicketData[];
  setTickets: React.Dispatch<React.SetStateAction<TicketData[]>>;
  isAdmin: boolean;
}

export function TicketsWidget({ tickets, setTickets, isAdmin }: Props) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  const filtered = tickets.filter(t => {
    if (statusFilter !== "todos" && t.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!t.type.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q) && !t.machine_model.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="gradient-card rounded-lg border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Chamados Recentes</h3>
        {!isAdmin && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => navigate("/suporte")}>
            <Plus className="w-3 h-3" /> Novo Chamado
          </Button>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 bg-accent border-border h-8 text-xs" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-accent border-border h-8 text-xs w-full sm:w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="aberto">Aberto</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="resolvido">Resolvido</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum chamado encontrado.</p>
        ) : filtered.map(ticket => (
          <div key={ticket.id} className="flex items-center justify-between p-3 rounded-md bg-accent/50 cursor-pointer hover:bg-accent/80 transition-colors"
            onClick={() => navigate(`/maquinas/${ticket.machine_id}`)}>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{ticket.machine_model}</p>
              <p className="text-xs text-muted-foreground truncate">{ticket.type} — {ticket.description}</p>
            </div>
            <div className="flex items-center gap-2 ml-3 shrink-0">
              <StatusBadge status={ticket.status} />
              {!isAdmin && (
                <button className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                  title="Excluir chamado"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const { error } = await supabase.from("tickets").delete().eq("id", ticket.id);
                    if (error) { toast.error("Erro ao excluir chamado"); return; }
                    setTickets(prev => prev.filter(t => t.id !== ticket.id));
                    toast.success("Chamado excluído");
                  }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
