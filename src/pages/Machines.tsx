import { machines } from "@/data/mockData";
import { StatusBadge } from "@/components/StatusBadge";
import { Cpu, Hash, CalendarDays, Wrench } from "lucide-react";

const Machines = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">Minhas Máquinas</h1>
        <p className="text-sm text-muted-foreground mt-1">{machines.length} máquinas registradas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {machines.map(machine => (
          <div key={machine.id} className="gradient-card rounded-lg border border-border p-5 space-y-4 hover:border-primary/30 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{machine.model}</h3>
                  <p className="text-xs font-mono text-muted-foreground">{machine.serialNumber}</p>
                </div>
              </div>
              <StatusBadge status={machine.status} />
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Instalação: {new Date(machine.installDate).toLocaleDateString("pt-BR")}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Wrench className="w-3.5 h-3.5" />
                <span>Acessórios: {machine.accessories.join(", ")}</span>
              </div>
            </div>

            <div className="flex gap-4 pt-2 border-t border-border">
              <div className="text-center flex-1">
                <p className="text-lg font-bold text-foreground">{machine.tickets}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Chamados</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-lg font-bold text-foreground">{machine.maintenances}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Manutenções</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Machines;
