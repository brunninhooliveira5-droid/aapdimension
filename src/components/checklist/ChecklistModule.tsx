import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, Settings } from "lucide-react";
import { ChecklistList } from "./ChecklistList";
import { ChecklistEditor } from "./ChecklistEditor";
import { ChecklistPdfConfig } from "./ChecklistPdfConfig";

export function ChecklistModule() {
  const [tab, setTab] = useState("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "editor">("list");

  function handleEdit(id: string) {
    setEditingId(id);
    setView("editor");
  }

  function handleNew() {
    setEditingId(null);
    setView("editor");
  }

  function handleBack() {
    setView("list");
    setEditingId(null);
  }

  function handleSaved() {
    setView("list");
    setEditingId(null);
  }

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-transparent p-0 gap-1">
          <TabsTrigger value="list" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ClipboardCheck className="h-3.5 w-3.5" /> Checklists
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings className="h-3.5 w-3.5" /> Configurar PDF
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          {view === "list" ? (
            <ChecklistList onEdit={handleEdit} onNew={handleNew} />
          ) : (
            <ChecklistEditor checklistId={editingId} onBack={handleBack} onSaved={handleSaved} />
          )}
        </TabsContent>
        <TabsContent value="config">
          <ChecklistPdfConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
