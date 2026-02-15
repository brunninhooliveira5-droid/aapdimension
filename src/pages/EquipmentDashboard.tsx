import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Cpu, Pencil, Trash2, ImagePlus, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EquipmentDetail {
  id: string;
  name: string;
  model: string;
  status: string;
  accessories: string[];
  category: string;
  image_path: string | null;
  image_url: string | null;
  created_at: string;
}

const EquipmentDashboard = () => {
  const { equipmentId } = useParams<{ equipmentId: string }>();
  const navigate = useNavigate();
  const editImageInputRef = useRef<HTMLInputElement>(null);

  const [equipment, setEquipment] = useState<EquipmentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editName, setEditName] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editAccessories, setEditAccessories] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    const { data } = supabase.storage.from("machine-files").getPublicUrl(imagePath);
    return data.publicUrl;
  };

  useEffect(() => {
    if (!equipmentId) return;

    const fetchEquipment = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("registered_equipment")
        .select("*")
        .eq("id", equipmentId)
        .single();

      if (error || !data) {
        toast.error("Equipamento não encontrado.");
        navigate("/cadastro-equipamentos");
        return;
      }

      setEquipment({
        id: data.id,
        name: data.name ?? "",
        model: data.model,
        status: data.status,
        accessories: data.accessories ?? [],
        category: data.category ?? "maquina",
        image_path: data.image_path,
        image_url: getImageUrl(data.image_path),
        created_at: data.created_at,
      });
      setLoading(false);
    };

    fetchEquipment();
  }, [equipmentId]);

  const openEditDialog = () => {
    if (!equipment) return;
    setEditName(equipment.name);
    setEditModel(equipment.model);
    setEditAccessories(equipment.accessories.join(", "));
    setEditCategory(equipment.category);
    setEditStatus(equipment.status);
    setEditImageFile(null);
    setEditImagePreview(equipment.image_url);
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!equipment || !editModel) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }

    const accessories = editAccessories.split(",").map(a => a.trim()).filter(Boolean);

    let imagePath = equipment.image_path;
    if (editImageFile) {
      const path = `images/${Date.now()}_${editImageFile.name}`;
      const { error: uploadErr } = await supabase.storage.from("machine-files").upload(path, editImageFile);
      if (uploadErr) {
        toast.error("Erro ao enviar imagem: " + uploadErr.message);
        return;
      }
      imagePath = path;
    }

    const { error } = await (supabase as any).from("registered_equipment").update({
      name: editName,
      model: editModel,
      serial_number: editModel,
      accessories,
      category: editCategory,
      status: editStatus,
      image_path: imagePath,
    }).eq("id", equipment.id);

    if (error) {
      toast.error("Erro ao atualizar: " + error.message);
      return;
    }

    toast.success("Equipamento atualizado!");
    setShowEditDialog(false);
    setEquipment({
      ...equipment,
      name: editName,
      model: editModel,
      accessories,
      category: editCategory,
      status: editStatus,
      image_path: imagePath,
      image_url: getImageUrl(imagePath),
    });
  };

  const handleDelete = async () => {
    if (!equipment) return;
    const { error } = await (supabase as any).from("registered_equipment").delete().eq("id", equipment.id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }
    toast.success("Equipamento excluído!");
    navigate("/cadastro-equipamentos");
  };

  if (loading || !equipment) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/cadastro-equipamentos")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center overflow-hidden">
            {equipment.image_url ? (
              <img src={equipment.image_url} alt={equipment.name || equipment.model} className="w-full h-full object-cover" />
            ) : (
              <Cpu className="w-6 h-6 text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{equipment.name || equipment.model}</h1>
              {equipment.category === "acessorio" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground font-medium uppercase tracking-wider">Acessório</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{equipment.model}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={equipment.status} />
          <Button variant="outline" size="sm" onClick={openEditDialog} className="gap-1.5 border-border">
            <Pencil className="w-3.5 h-3.5" /> Editar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">Excluir Equipamento</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir <strong>{equipment.name || equipment.model}</strong>? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Main Image */}
      <div className="gradient-card rounded-lg border border-border overflow-hidden">
        <div className="h-64 sm:h-80 bg-accent/50 flex items-center justify-center overflow-hidden">
          {equipment.image_url ? (
            <img src={equipment.image_url} alt={equipment.name || equipment.model} className="w-full h-full object-cover" />
          ) : (
            <Cpu className="w-20 h-20 text-muted-foreground/20" />
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="gradient-card rounded-lg border border-border p-4 flex items-center gap-3">
          <Cpu className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground uppercase">Modelo</p>
            <p className="text-sm font-medium text-foreground">{equipment.model}</p>
          </div>
        </div>
        <div className="gradient-card rounded-lg border border-border p-4 flex items-center gap-3">
          <Wrench className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground uppercase">Acessórios</p>
            <p className="text-sm font-medium text-foreground">{equipment.accessories.length > 0 ? equipment.accessories.join(", ") : "Nenhum"}</p>
          </div>
        </div>
        <div className="gradient-card rounded-lg border border-border p-4 flex items-center gap-3">
          <Cpu className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground uppercase">Categoria</p>
            <p className="text-sm font-medium text-foreground capitalize">{equipment.category === "acessorio" ? "Acessório" : "Máquina"}</p>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Equipamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-foreground">Foto do Equipamento</Label>
              <div
                className="relative h-32 rounded-lg border-2 border-dashed border-border bg-accent/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
                onClick={() => editImageInputRef.current?.click()}
              >
                {editImagePreview ? (
                  <img src={editImagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImagePlus className="w-6 h-6" />
                    <span className="text-xs">Clique para selecionar</span>
                  </div>
                )}
              </div>
              <input
                ref={editImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setEditImageFile(file);
                    setEditImagePreview(URL.createObjectURL(file));
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Categoria *</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger className="bg-accent border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="maquina">Máquina</SelectItem>
                  <SelectItem value="acessorio">Acessório</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger className="bg-accent border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="maintenance">Manutenção</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Nome</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Ex: CNC Principal" className="bg-accent border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Modelo *</Label>
              <Input value={editModel} onChange={e => setEditModel(e.target.value)} placeholder="Ex: Romi D800" className="bg-accent border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Acessórios</Label>
              <Input value={editAccessories} onChange={e => setEditAccessories(e.target.value)} placeholder="Separados por vírgula" className="bg-accent border-border" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-border">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSaveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EquipmentDashboard;
