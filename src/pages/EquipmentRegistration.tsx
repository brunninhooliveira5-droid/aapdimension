import { useState, useEffect, useRef } from "react";
import { Plus, Cpu, CalendarDays, Wrench, User, ImagePlus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EquipmentRow {
  id: string;
  name: string;
  model: string;
  serial_number: string;
  status: string;
  install_date: string;
  accessories: string[];
  owner_id: string;
  owner_name: string;
  image_url: string | null;
  category: string;
}

interface ProfileOption {
  id: string;
  name: string;
}

const EquipmentRegistration = () => {
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<EquipmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);

  const [formName, setFormName] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formAccessories, setFormAccessories] = useState("");
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
  const [formCategory, setFormCategory] = useState<string>("maquina");
  const [filterCategory, setFilterCategory] = useState<string>("todos");
  const [editingItem, setEditingItem] = useState<EquipmentRow | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const filteredItems = items.filter(m => {
    if (filterCategory !== "todos" && m.category !== filterCategory) return false;
    return true;
  });

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    const { data } = supabase.storage.from("machine-files").getPublicUrl(imagePath);
    return data.publicUrl;
  };

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("registered_equipment")
      .select("*")
      .order("created_at", { ascending: true });

    if (data) {
      const ownerIds = [...new Set(data.map((m: any) => m.owner_id))];
      const { data: ownerProfiles } = await supabase.from("profiles").select("id, name").in("id", ownerIds as string[]);
      const ownerMap = new Map(ownerProfiles?.map(p => [p.id, p.name]) ?? []);

      setItems(data.map((m: any) => ({
        id: m.id,
        name: m.name ?? "",
        model: m.model,
        serial_number: m.serial_number,
        status: m.status,
        install_date: m.install_date,
        accessories: m.accessories ?? [],
        owner_id: m.owner_id,
        owner_name: ownerMap.get(m.owner_id) ?? "—",
        image_url: getImageUrl(m.image_path),
        category: m.category ?? "maquina",
      })));
    }
    setLoading(false);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("id, name").eq("approved", true);
    setProfiles(data ?? []);
  };

  useEffect(() => {
    fetchItems();
    fetchProfiles();
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormImageFile(file);
      setFormImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAdd = async () => {
    if (!formModel) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    let imagePath: string | null = null;

    if (formImageFile) {
      const path = `images/${Date.now()}_${formImageFile.name}`;
      const { error: uploadErr } = await supabase.storage.from("machine-files").upload(path, formImageFile);
      if (uploadErr) {
        toast.error("Erro ao enviar imagem: " + uploadErr.message);
        return;
      }
      imagePath = path;
    }

    const accessories = formAccessories.split(",").map(a => a.trim()).filter(Boolean);

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("registered_equipment").insert({
      name: formName,
      model: formModel,
      serial_number: formModel,
      owner_id: user?.id,
      accessories,
      image_path: imagePath,
      category: formCategory,
    });

    if (error) {
      toast.error("Erro ao adicionar: " + error.message);
      return;
    }

    toast.success("Equipamento cadastrado com sucesso!");
    setShowAddDialog(false);
    resetForm();
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("registered_equipment").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir: " + error.message); return; }
    toast.success("Equipamento excluído!");
    fetchItems();
  };

  const handleEdit = (item: EquipmentRow) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormModel(item.model);
    setFormAccessories(item.accessories.join(", "));
    setFormCategory(item.category);
    setFormImageFile(null);
    setFormImagePreview(item.image_url);
    setShowEditDialog(true);
  };

  const handleUpdate = async () => {
    if (!editingItem || !formModel) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    let imagePath: string | undefined = undefined;

    if (formImageFile) {
      const path = `images/${Date.now()}_${formImageFile.name}`;
      const { error: uploadErr } = await supabase.storage.from("machine-files").upload(path, formImageFile);
      if (uploadErr) {
        toast.error("Erro ao enviar imagem: " + uploadErr.message);
        return;
      }
      imagePath = path;
    }

    const accessories = formAccessories.split(",").map(a => a.trim()).filter(Boolean);

    const updateData: any = {
      name: formName,
      model: formModel,
      serial_number: formModel,
      accessories,
      category: formCategory,
    };
    if (imagePath !== undefined) updateData.image_path = imagePath;

    const { error } = await (supabase as any).from("registered_equipment").update(updateData).eq("id", editingItem.id);

    if (error) {
      toast.error("Erro ao atualizar: " + error.message);
      return;
    }

    toast.success("Equipamento atualizado com sucesso!");
    setShowEditDialog(false);
    resetForm();
    fetchItems();
  };

  const resetForm = () => {
    setFormName("");
    setFormModel("");
    setFormAccessories("");
    setFormImageFile(null);
    setFormImagePreview(null);
    setFormCategory("maquina");
    setEditingItem(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Cadastro de Equipamentos</h1>
          <p className="text-sm text-muted-foreground mt-1">{filteredItems.length} itens registrados</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="bg-accent border-border h-9 text-xs w-[160px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas categorias</SelectItem>
              <SelectItem value="maquina">Máquinas</SelectItem>
              <SelectItem value="acessorio">Acessórios</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => { setFormCategory("maquina"); setShowAddDialog(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Adicionar Máquina
          </Button>
          <Button variant="outline" onClick={() => { setFormCategory("acessorio"); setShowAddDialog(true); }} className="gap-2 border-border">
            <Plus className="w-4 h-4" /> Adicionar Acessório
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Cpu className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">Nenhum equipamento cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className="gradient-card rounded-lg border border-border overflow-hidden hover:border-primary/30 transition-colors"
            >
              <div className="h-40 bg-accent/50 flex items-center justify-center overflow-hidden">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name || item.model} className="w-full h-full object-cover" />
                ) : (
                  <Cpu className="w-12 h-12 text-muted-foreground/30" />
                )}
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{item.name || item.model}</h3>
                      {item.category === "acessorio" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground font-medium uppercase tracking-wider">Acessório</span>
                      )}
                    </div>
                    
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                <div className="space-y-2 text-sm">
                  {item.accessories.length > 0 && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Acessórios: {item.accessories.join(", ")}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleEdit(item)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                    onClick={() => handleDelete(item.id)}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {formCategory === "acessorio" ? "Adicionar Acessório" : "Adicionar Máquina"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-foreground">Foto do Equipamento</Label>
              <div
                className="relative h-32 rounded-lg border-2 border-dashed border-border bg-accent/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
                onClick={() => imageInputRef.current?.click()}
              >
                {formImagePreview ? (
                  <img src={formImagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImagePlus className="w-6 h-6" />
                    <span className="text-xs">Clique para selecionar</span>
                  </div>
                )}
              </div>
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Categoria *</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger className="bg-accent border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="maquina">Máquina</SelectItem>
                  <SelectItem value="acessorio">Acessório</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Nome</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ex: CNC Principal" className="bg-accent border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Modelo *</Label>
              <Input value={formModel} onChange={e => setFormModel(e.target.value)} placeholder="Ex: Romi D800" className="bg-accent border-border" />
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
            <Button onClick={handleAdd}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Equipamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-foreground">Foto do Equipamento</Label>
              <div
                className="relative h-32 rounded-lg border-2 border-dashed border-border bg-accent/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
                onClick={() => imageInputRef.current?.click()}
              >
                {formImagePreview ? (
                  <img src={formImagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImagePlus className="w-6 h-6" />
                    <span className="text-xs">Clique para selecionar</span>
                  </div>
                )}
              </div>
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Categoria *</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger className="bg-accent border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="maquina">Máquina</SelectItem>
                  <SelectItem value="acessorio">Acessório</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Nome</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ex: CNC Principal" className="bg-accent border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Modelo *</Label>
              <Input value={formModel} onChange={e => setFormModel(e.target.value)} placeholder="Ex: Romi D800" className="bg-accent border-border" />
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
            <Button onClick={handleUpdate}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EquipmentRegistration;
