import { maintenances, machines } from "@/data/mockData";
import { StatusBadge } from "@/components/StatusBadge";
import { Calendar, Wrench } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const scheduled = maintenances.filter(m => m.status === "agendada");
const completed = maintenances.filter(m => m.status === "realizada");

const Maintenance = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-foreground">Manutenção</h1>
        <p className="text-sm text-muted-foreground mt-1">{maintenances.length} registros</p>
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
          {scheduled.map(m => (
            <MaintenanceCard key={m.id} maintenance={m} />
          ))}
        </TabsContent>

        <TabsContent value="realizadas" className="space-y-3 mt-4">
          {completed.map(m => (
            <MaintenanceCard key={m.id} maintenance={m} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

function MaintenanceCard({ maintenance }: { maintenance: typeof maintenances[0] }) {
  return (
    <div className="gradient-card rounded-lg border border-border p-4 flex items-center gap-4 hover:border-primary/20 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
        <Wrench className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{maintenance.machineName}</p>
        <p className="text-xs text-muted-foreground">{maintenance.type} • {maintenance.userName}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(maintenance.date).toLocaleDateString("pt-BR")}
        </div>
        <StatusBadge status={maintenance.status} />
      </div>
    </div>
  );
}

export default Maintenance;
