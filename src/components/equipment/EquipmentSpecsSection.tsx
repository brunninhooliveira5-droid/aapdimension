import { useState } from "react";
import { BookOpen, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  equipmentId: string;
}

export const EquipmentSpecsSection = ({ equipmentId }: Props) => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin_master";

  const [showDialog, setShowDialog] = useState(false);
  const [specsData, setSpecsData] = useState<Record<string, string>>({});
  const [specsId, setSpecsId] = useState<string | null>(null);
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecValue, setNewSpecValue] = useState("");
  const [savingSpecs, setSavingSpecs] = useState(false);
  const [editingSpecKey, setEditingSpecKey] = useState<string | null>(null);
  const [editSpecKey, setEditSpecKey] = useState("");
  const [editSpecValue, setEditSpecValue] = useState("");

  const openDialog = async () => {
    setShowDialog(true);
    const { data } = await (supabase as any)
      .from("registered_equipment_specs")
      .select("*")
      .eq("equipment_id", equipmentId)
      .maybeSingle();
    if (data) {
      setSpecsId(data.id);
      setSpecsData(data.spec_data ?? {});
    } else {
      setSpecsId(null);
      setSpecsData({});
    }
  };

  const saveSpecsToDb = async (data: Record<string, string>) => {
    setSavingSpecs(true);
    if (specsId) {
      const { error } = await (supabase as any)
        .from("registered_equipment_specs")
        .update({ spec_data: data })
        .eq("id", specsId);
      if (error) { toast.error("Erro ao salvar: " + error.message); setSavingSpecs(false); return; }
    } else {
      const { data: inserted, error } = await (supabase as any)
        .from("registered_equipment_specs")
        .insert({ equipment_id: equipmentId, spec_data: data })
        .select()
        .single();
      if (error) { toast.error("Erro ao salvar: " + error.message); setSavingSpecs(false); return; }
      if (inserted) setSpecsId(inserted.id);
    }
    toast.success("Ficha técnica salva!");
    setSavingSpecs(false);
  };

  const handleAddSpec = async () => {
    if (!newSpecKey.trim()) return;
    const updated = { ...specsData, [newSpecKey.trim()]: newSpecValue.trim() };
    setSpecsData(updated);
    setNewSpecKey("");
    setNewSpecValue("");
    await saveSpecsToDb(updated);
  };

  const handleRemoveSpec = async (key: string) => {
    const copy = { ...specsData };
    delete copy[key];
    setSpecsData(copy);
    await saveSpecsToDb(copy);
  };

  const handleEditSpecSave = async () => {
    if (!editingSpecKey || !editSpecKey.trim()) return;
    const copy = { ...specsData };
    if (editingSpecKey !== editSpecKey.trim()) delete copy[editingSpecKey];
    copy[editSpecKey.trim()] = editSpecValue.trim();
    setSpecsData(copy);
    setEditingSpecKey(null);
    await saveSpecsToDb(copy);
  };

  return (
    <>
      <div
        className="gradient-card rounded-lg border border-border p-5 cursor-pointer hover:border-primary/50 transition-colors"
        onClick={openDialog}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Ficha Técnica do Fabricante</h3>
            <p className="text-xs text-muted-foreground">Clique para ver os dados técnicos do equipamento</p>
          </div>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Ficha Técnica do Fabricante</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {isAdmin && (
              <div className="space-y-3 p-4 rounded-lg border border-border bg-accent/30">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Adicionar Ficha
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-foreground text-xs">Nome do Campo</Label>
                    <Input value={newSpecKey} onChange={e => setNewSpecKey(e.target.value)} placeholder="Ex: Potência, Peso, Voltagem..." className="bg-accent border-border" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-foreground text-xs">Valor</Label>
                    <Input value={newSpecValue} onChange={e => setNewSpecValue(e.target.value)} placeholder="Ex: 5000W, 120kg..." className="bg-accent border-border" onKeyDown={e => e.key === "Enter" && handleAddSpec()} />
                  </div>
                </div>
                <Button size="sm" className="gap-1.5" onClick={handleAddSpec} disabled={savingSpecs}>
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Dados Técnicos ({Object.keys(specsData).length})</h4>
              {Object.keys(specsData).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum dado técnico cadastrado.</p>
              ) : (
                Object.entries(specsData).map(([key, value]) => (
                  <div key={key} className="p-3 rounded-lg border border-border bg-accent/30 space-y-2">
                    {editingSpecKey === key ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-foreground text-xs">Nome do Campo</Label>
                            <Input value={editSpecKey} onChange={e => setEditSpecKey(e.target.value)} className="bg-accent border-border" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-foreground text-xs">Valor</Label>
                            <Input value={editSpecValue} onChange={e => setEditSpecValue(e.target.value)} className="bg-accent border-border" onKeyDown={e => e.key === "Enter" && handleEditSpecSave()} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleEditSpecSave} disabled={savingSpecs}>Salvar</Button>
                          <Button size="sm" variant="outline" className="border-border" onClick={() => setEditingSpecKey(null)}>Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider">{key}</p>
                            <p className="text-sm text-foreground mt-0.5">{value}</p>
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-2 pt-1 border-t border-border/50">
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={() => {
                              setEditingSpecKey(key);
                              setEditSpecKey(key);
                              setEditSpecValue(value);
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
                                  <AlertDialogTitle className="text-foreground">Excluir Campo</AlertDialogTitle>
                                  <AlertDialogDescription>Tem certeza que deseja excluir o campo <strong>{key}</strong>?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRemoveSpec(key)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-border">Fechar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
