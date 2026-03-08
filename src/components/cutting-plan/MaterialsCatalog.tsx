import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CatalogMaterial {
  id: string;
  name: string;
  category: string;
  width: number;
  height: number;
  length: number;
  unit_price: number;
  observation: string;
  is_active: boolean;
}

const CATEGORIES = [
  { value: "chapa", label: "Chapa" },
  { value: "tubo", label: "Tubo" },
  { value: "perfil", label: "Perfil" },
  { value: "outro", label: "Outro" },
];

export function MaterialsCatalog() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [materials, setMaterials] = useState<CatalogMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form
  const [name, setName] = useState("");
  const [category, setCategory] = useState("chapa");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [length, setLength] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [observation, setObservation] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchMaterials = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("cutting_plan_materials" as any)
      .select("*")
      .order("name") as any;
    setMaterials(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchMaterials(); }, []);

  const resetForm = () => {
    setName(""); setCategory("chapa"); setWidth(""); setHeight("");
    setLength(""); setUnitPrice(""); setObservation(""); setIsActive(true);
    setEditingId(null);
  };

  const openNew = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (mat: CatalogMaterial) => {
    setEditingId(mat.id);
    setName(mat.name);
    setCategory(mat.category);
    setWidth(String(mat.width || ""));
    setHeight(String(mat.height || ""));
    setLength(String(mat.length || ""));
    setUnitPrice(String(mat.unit_price || ""));
    setObservation(mat.observation || "");
    setIsActive(mat.is_active);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !userId) {
      toast.error("Informe o nome do material.");
      return;
    }
    setSaving(true);
    const payload = {
      user_id: userId,
      name: name.trim(),
      category,
      width: parseFloat(width) || 0,
      height: parseFloat(height) || 0,
      length: parseFloat(length) || 0,
      unit_price: parseFloat(unitPrice) || 0,
      observation: observation.trim(),
      is_active: isActive,
    };

    if (editingId) {
      await supabase.from("cutting_plan_materials" as any).update(payload as any).eq("id", editingId);
      toast.success("Material atualizado!");
    } else {
      await supabase.from("cutting_plan_materials" as any).insert(payload as any);
      toast.success("Material cadastrado!");
    }
    setSaving(false);
    setDialogOpen(false);
    resetForm();
    fetchMaterials();
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await supabase.from("cutting_plan_materials" as any).delete().eq("id", id);
    toast.success("Material excluído.");
    setDeleting(null);
    fetchMaterials();
  };

  const categoryLabel = (val: string) => CATEGORIES.find(c => c.value === val)?.label || val;

  const showSheetFields = category === "chapa" || category === "outro";
  const showTubeFields = category === "tubo" || category === "perfil" || category === "outro";

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2 text-foreground">
          <Database className="h-4 w-4 text-primary" /> Cadastro de Materiais
        </h3>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo Material
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : materials.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum material cadastrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Dimensões</TableHead>
                <TableHead>Valor (R$)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((mat) => (
                <TableRow key={mat.id}>
                  <TableCell className="font-medium">{mat.name}</TableCell>
                  <TableCell>{categoryLabel(mat.category)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {mat.category === "chapa" || mat.category === "outro"
                      ? `${mat.width} x ${mat.height} mm`
                      : `${mat.length} mm`}
                    {mat.category === "outro" && mat.length > 0 && ` / ${mat.length} mm`}
                  </TableCell>
                  <TableCell>{Number(mat.unit_price).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={mat.is_active ? "default" : "secondary"}>
                      {mat.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(mat)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(mat.id)}
                        disabled={deleting === mat.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Material" : "Novo Material"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Aço 1020" />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showSheetFields && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Largura (mm)</Label>
                  <Input type="number" value={width} onChange={(e) => setWidth(e.target.value)} placeholder="1000" />
                </div>
                <div>
                  <Label>Altura (mm)</Label>
                  <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="2000" />
                </div>
              </div>
            )}

            {showTubeFields && (
              <div>
                <Label>Comprimento (mm)</Label>
                <Input type="number" value={length} onChange={(e) => setLength(e.target.value)} placeholder="6000" />
              </div>
            )}

            <div>
              <Label>Valor unitário (R$)</Label>
              <Input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea value={observation} onChange={(e) => setObservation(e.target.value)} placeholder="Observações opcionais" rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="mat-active" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
              <Label htmlFor="mat-active" className="cursor-pointer">Ativo</Label>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editingId ? "Atualizar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
