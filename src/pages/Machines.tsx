import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Cpu, CalendarDays, Wrench, User, ImagePlus, Filter, Trash2, Pencil, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EquipCatalogItem {
  id: string;
  name: string;
  image_url: string | null;
  category: string;
}

interface MachineRow {
  id: string;
  name: string;
  model: string;
  serial_number: string;
  status: string;
  install_date: string;
  accessories: string[];
  owner_id: string;
  owner_name: string;
  ticket_count: number;
  maintenance_count: number;
  image_url: string | null;
  category: string;
}

interface ProfileOption {
  id: string;
  name: string;
}

const Machines = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdminMaster = user?.role === "admin_master";
  const isAdmin = isAdminMaster || user?.role === "admin";
  const imageInputRef = useRef<HTMLInputElement>(null);
  const catalogImageRef = useRef<HTMLInputElement>(null);

  const [machines, setMachines] = useState<MachineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);

  const [formName, setFormName] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formSerial, setFormSerial] = useState("");
  const [formOwner, setFormOwner] = useState("");
  const [formAccessories, setFormAccessories] = useState("");
  const [formInstallDate, setFormInstallDate] = useState(new Date().toISOString().split("T")[0]);
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
  const [filterOwnerId, setFilterOwnerId] = useState<string>("todos");
  const [formCategory, setFormCategory] = useState<string>("maquina");
  const [filterCategory, setFilterCategory] = useState<string>("todos");

  // Catalog state (admin master only)
  const [catalogItems, setCatalogItems] = useState<EquipCatalogItem[]>([]);
  const [showCatalogDialog, setShowCatalogDialog] = useState(false);
  const [catalogName, setCatalogName] = useState("");
  const [catalogCategory, setCatalogCategory] = useState<string>("maquina");
  const [catalogImageFile, setCatalogImageFile] = useState<File | null>(null);
  const [catalogImagePreview, setCatalogImagePreview] = useState<string | null>(null);
  const [editingCatalogItem, setEditingCatalogItem] = useState<EquipCatalogItem | null>(null);

  const filteredMachines = machines.filter(m => {
    if (filterOwnerId !== "todos" && m.owner_id !== filterOwnerId) return false;
    if (filterCategory !== "todos" && m.category !== filterCategory) return false;
    return true;
  });

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    const { data } = supabase.storage.from("machine-files").getPublicUrl(imagePath);
    return data.publicUrl;
  };

  const fetchMachines = async () => {
    setLoading(true);
    const { data: machinesData } = await supabase.from("machines").select("*");

    if (machinesData) {
      const ownerIds = [...new Set(machinesData.map(m => m.owner_id))];
      const { data: ownerProfiles } = await supabase.from("profiles").select("id, name").in("id", ownerIds);
      const ownerMap = new Map(ownerProfiles?.map(p => [p.id, p.name]) ?? []);

      const { data: ticketCounts } = await supabase.from("tickets").select("machine_id");
      const ticketMap = new Map<string, number>();
      ticketCounts?.forEach(t => ticketMap.set(t.machine_id, (ticketMap.get(t.machine_id) ?? 0) + 1));

      const { data: maintCounts } = await supabase.from("maintenances").select("machine_id");
      const maintMap = new Map<string, number>();
      maintCounts?.forEach(m => maintMap.set(m.machine_id, (maintMap.get(m.machine_id) ?? 0) + 1));

      setMachines(machinesData.map(m => ({
        id: m.id,
        name: (m as any).name ?? "",
        model: m.model,
        serial_number: m.serial_number,
        status: m.status,
        install_date: m.install_date,
        accessories: m.accessories ?? [],
        owner_id: m.owner_id,
        owner_name: ownerMap.get(m.owner_id) ?? "—",
        ticket_count: ticketMap.get(m.id) ?? 0,
        maintenance_count: maintMap.get(m.id) ?? 0,
        image_url: getImageUrl((m as any).image_path),
        category: (m as any).category ?? "maquina",
      })));
    }
    setLoading(false);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("id, name").eq("approved", true);
    setProfiles(data ?? []);
  };

  const fetchCatalogItems = async () => {
    const { data } = await supabase.from("dimension_equipment").select("id, name, image_url, category").order("created_at", { ascending: false });
    setCatalogItems(data ?? []);
  };

  useEffect(() => {
    fetchMachines();
    if (isAdmin) { fetchProfiles(); fetchCatalogItems(); }
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormImageFile(file);
      setFormImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAddMachine = async () => {
    if (!formModel || !formSerial || !formOwner) {
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

    const { error } = await supabase.from("machines").insert({
      name: formName,
      model: formModel,
      serial_number: formSerial,
      owner_id: formOwner,
      install_date: formInstallDate,
      accessories,
      image_path: imagePath,
      category: formCategory,
    } as any);

    if (error) {
      toast.error("Erro ao adicionar máquina: " + error.message);
      return;
    }

    toast.success("Máquina adicionada com sucesso!");
    setShowAddDialog(false);
    resetForm();
    fetchMachines();
  };

  const resetForm = () => {
    setFormName(""); setFormModel(""); setFormSerial(""); setFormOwner("");
    setFormAccessories(""); setFormInstallDate(new Date().toISOString().split("T")[0]);
    setFormImageFile(null); setFormImagePreview(null); setFormCategory("maquina");
  };

  const handleCatalogImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setCatalogImageFile(file); setCatalogImagePreview(URL.createObjectURL(file)); }
  };

  const resetCatalogForm = () => {
    setCatalogName(""); setCatalogCategory("maquina"); setCatalogImageFile(null); setCatalogImagePreview(null); setEditingCatalogItem(null);
  };

  const handleSaveCatalogItem = async () => {
    if (!catalogName.trim()) { toast.error("Informe o nome do equipamento."); return; }

    let imageUrl: string | null = editingCatalogItem?.image_url ?? null;

    if (catalogImageFile) {
      const path = `catalog/${Date.now()}_${catalogImageFile.name}`;
      const { error: upErr } = await supabase.storage.from("machine-files").upload(path, catalogImageFile);
      if (upErr) { toast.error("Erro ao enviar imagem."); return; }
      const { data: pubData } = supabase.storage.from("machine-files").getPublicUrl(path);
      imageUrl = pubData.publicUrl;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (editingCatalogItem) {
      const { error } = await supabase.from("dimension_equipment").update({ name: catalogName.trim(), image_url: imageUrl, category: catalogCategory }).eq("id", editingCatalogItem.id);
      if (error) { toast.error("Erro ao atualizar."); return; }
      toast.success("Equipamento atualizado!");
    } else {
      const { error } = await supabase.from("dimension_equipment").insert({ name: catalogName.trim(), image_url: imageUrl, created_by: session.user.id, category: catalogCategory } as any);
      if (error) { toast.error("Erro ao cadastrar."); return; }
      toast.success("Equipamento cadastrado!");
    }
    setShowCatalogDialog(false); resetCatalogForm(); fetchCatalogItems();
  };

  const handleDeleteCatalogItem = async (id: string) => {
    const { error } = await supabase.from("dimension_equipment").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir."); return; }
    toast.success("Equipamento excluído!"); fetchCatalogItems();
  };

  const openEditCatalog = (item: EquipCatalogItem) => {
    setEditingCatalogItem(item); setCatalogName(item.name); setCatalogCategory(item.category ?? "maquina");
    setCatalogImagePreview(item.image_url); setCatalogImageFile(null);
    setShowCatalogDialog(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Minhas Máquinas</h1>
          <p className="text-sm text-muted-foreground mt-1">{filteredMachines.length} itens registrados</p>
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
          {user?.role === "admin_master" && (
            <Select value={filterOwnerId} onValueChange={setFilterOwnerId}>
              <SelectTrigger className="bg-accent border-border h-9 text-xs w-[200px]">
                <Filter className="w-3.5 h-3.5 mr-1.5" />
                <SelectValue placeholder="Filtrar por usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os usuários</SelectItem>
                {profiles.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {user?.role === "admin_master" && (
            <Button onClick={() => { setFormCategory("maquina"); setShowAddDialog(true); }} className="gap-2">
              <Plus className="w-4 h-4" /> Adicionar Máquina
            </Button>
          )}
          {user?.role === "admin_master" && (
            <Button variant="outline" onClick={() => { setFormCategory("acessorio"); setShowAddDialog(true); }} className="gap-2 border-border">
              <Plus className="w-4 h-4" /> Adicionar Acessório
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredMachines.map(machine => (
          <div
            key={machine.id}
            className="gradient-card rounded-lg border border-border overflow-hidden hover:border-primary/30 transition-colors cursor-pointer"
            onClick={() => navigate(`/maquinas/${machine.id}`)}
          >
            {/* Machine Image */}
            <div className="h-40 bg-accent/50 flex items-center justify-center overflow-hidden">
              {machine.image_url ? (
                <img src={machine.image_url} alt={machine.name || machine.model} className="w-full h-full object-cover" />
              ) : (
                <Cpu className="w-12 h-12 text-muted-foreground/30" />
              )}
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{machine.name || machine.model}</h3>
                    {machine.category === "acessorio" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground font-medium uppercase tracking-wider">Acessório</span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">{machine.serial_number}</p>
                </div>
                <StatusBadge status={machine.status} />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-3.5 h-3.5" />
                  <span>Proprietário: {machine.owner_name}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Instalação: {new Date(machine.install_date).toLocaleDateString("pt-BR")}</span>
                </div>
                {machine.accessories.length > 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Acessórios: {machine.accessories.join(", ")}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-2 border-t border-border">
                <div className="text-center flex-1">
                  <p className="text-lg font-bold text-foreground">{machine.ticket_count}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Chamados</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-lg font-bold text-foreground">{machine.maintenance_count}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Manutenções</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Machine Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Adicionar Máquina</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Image upload */}
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
                <SelectTrigger className="bg-accent border-border"><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
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
              <Select value={formModel} onValueChange={setFormModel}>
                <SelectTrigger className="bg-accent border-border"><SelectValue placeholder="Selecione o modelo" /></SelectTrigger>
                <SelectContent>
                  {catalogItems.map(item => (
                    <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Número de Série *</Label>
              <Input value={formSerial} onChange={e => setFormSerial(e.target.value)} placeholder="Ex: SN-2024-001" className="bg-accent border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Data de Instalação</Label>
              <Input type="date" value={formInstallDate} onChange={e => setFormInstallDate(e.target.value)} className="bg-accent border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Proprietário *</Label>
              <Select value={formOwner} onValueChange={setFormOwner}>
                <SelectTrigger className="bg-accent border-border"><SelectValue placeholder="Selecione o usuário" /></SelectTrigger>
                <SelectContent>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button onClick={handleAddMachine}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Catalog Section - Admin Master Only */}
      {isAdminMaster && (
        <>
          <div className="border-t border-border pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Cadastro de Equipamentos e Acessórios</h2>
              </div>
              <Button size="sm" className="gap-1" onClick={() => { resetCatalogForm(); setShowCatalogDialog(true); }}>
                <Plus className="w-4 h-4" /> Cadastrar
              </Button>
            </div>
            {catalogItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum equipamento cadastrado.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {catalogItems.map(item => (
                  <div key={item.id} className="gradient-card rounded-lg border border-border overflow-hidden group">
                    <div className="h-32 bg-accent/50 flex items-center justify-center overflow-hidden">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-10 h-10 text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" onClick={() => openEditCatalog(item)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteCatalogItem(item.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground font-medium uppercase tracking-wider">
                        {item.category === "acessorio" ? "Acessório" : "Máquina"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Catalog Dialog */}
          <Dialog open={showCatalogDialog} onOpenChange={v => { setShowCatalogDialog(v); if (!v) resetCatalogForm(); }}>
            <DialogContent className="bg-card border-border max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-foreground">{editingCatalogItem ? "Editar Equipamento" : "Cadastrar Equipamento"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label className="text-foreground">Foto</Label>
                  <div
                    className="relative h-32 rounded-lg border-2 border-dashed border-border bg-accent/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
                    onClick={() => catalogImageRef.current?.click()}
                  >
                    {catalogImagePreview ? (
                      <img src={catalogImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <ImagePlus className="w-6 h-6" />
                        <span className="text-xs">Clique para selecionar</span>
                      </div>
                    )}
                  </div>
                  <input ref={catalogImageRef} type="file" accept="image/*" className="hidden" onChange={handleCatalogImageSelect} />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Categoria *</Label>
                  <Select value={catalogCategory} onValueChange={setCatalogCategory}>
                    <SelectTrigger className="bg-accent border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maquina">Máquina</SelectItem>
                      <SelectItem value="acessorio">Acessório</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Nome do Equipamento *</Label>
                  <Input value={catalogName} onChange={e => setCatalogName(e.target.value)} placeholder="Ex: Spindle 3.5kW" className="bg-accent border-border" />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" className="border-border">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleSaveCatalogItem}>{editingCatalogItem ? "Atualizar" : "Cadastrar"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default Machines;
