import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Plus, Settings, Users } from "lucide-react";
import { WorkDiaryList } from "@/components/work-diary/WorkDiaryList";
import { WorkDiaryForm } from "@/components/work-diary/WorkDiaryForm";
import { WorkDiaryPdfConfig } from "@/components/work-diary/WorkDiaryPdfConfig";
import { WorkDiaryClients } from "@/components/work-diary/WorkDiaryClients";
import { useAuth } from "@/contexts/AuthContext";

const allTabs = [
  { value: "list", label: "Registros", icon: ClipboardList, permKey: "diario_registros" },
  { value: "form", label: "Novo Registro", icon: Plus, permKey: "diario_novo" },
  { value: "clients", label: "Clientes", icon: Users, permKey: "diario_clientes" },
  { value: "pdf-config", label: "Configuração de PDF", icon: Settings, permKey: "diario_config_pdf" },
];

export default function WorkDiaryPage() {
  const [activeTab, setActiveTab] = useState("list");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const { user, getSectionVisibility } = useAuth();
  const isAdmin = user?.role === "admin_master";

  const visibleTabs = allTabs.filter((t) => {
    if (isAdmin) return true;
    return getSectionVisibility(t.permKey) !== "hidden";
  });

  const handleEdit = (id: string) => {
    setEditingEntryId(id);
    setActiveTab("form");
  };

  const handleNew = () => {
    setEditingEntryId(null);
    setActiveTab("form");
  };

  const handleSaved = () => {
    setEditingEntryId(null);
    setActiveTab("list");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Diário de Obra / Serviço</h1>
        <p className="text-muted-foreground text-sm">Registre atividades, obras e serviços com fotos e gere PDFs profissionais.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent p-0">
          {visibleTabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <t.icon className="h-3.5 w-3.5" /> {t.value === "form" && editingEntryId ? "Editar Registro" : t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="list">
          <WorkDiaryList onEdit={handleEdit} onNew={handleNew} />
        </TabsContent>
        <TabsContent value="form">
          <WorkDiaryForm entryId={editingEntryId} onSaved={handleSaved} onCancel={() => setActiveTab("list")} />
        </TabsContent>
        <TabsContent value="clients">
          <WorkDiaryClients />
        </TabsContent>
        <TabsContent value="pdf-config">
          <WorkDiaryPdfConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
