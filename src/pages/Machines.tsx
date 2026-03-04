import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Cpu, CalendarDays, Wrench, User, ImagePlus, Filter, Trash2, Pencil, Package, FileText, Upload, CircleDot, PiggyBank, LayoutGrid, List, Search, ChevronLeft, ChevronRight, Factory, Settings2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EquipmentRegistration from "@/pages/EquipmentRegistration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MachinePaybackPanel } from "@/components/machines/MachinePaybackPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EquipCatalogItem {
  id: string;
  name: string;
  image_url: string | null;
  category: string;
  description: string;
  pdf_url: string | null;
  pdf_admin_url: string | null;
  status: string;
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
  origin_type: string;
  operational_status: string;
}

interface ProfileOption {
  id: string;
  name: string;
}

const operationalStatusConfig: Record<string, { label: string; className: string }> = {
  livre: { label: "Livre", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  em_producao: { label: "Em Produção", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  parada: { label: "Parada", className: "bg-red-500/15 text-red-400 border-red-500/30" },
  manutencao: { label: "Manutenção", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  setup: { label: "Setup", className: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
};

const OperationalStatusBadge = ({ status }: { status: string }) => {
  const config = operationalStatusConfig[status] ?? operationalStatusConfig.livre;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
};

const Machines = () => {
  const { user } = useAuth();
  const { isImpersonating, targetUserId } = useImpersonation();
  const navigate = useNavigate();
  const isAdminMaster = user?.role === "admin_master" && !isImpersonating;
  const isAdmin = isAdminMaster || (user?.role === "admin" && !isImpersonating);
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
  const [filterOwnerSearch, setFilterOwnerSearch] = useState("");
  const [formCategory, setFormCategory] = useState<string>("maquina");
  const [filterCategory, setFilterCategory] = useState<string>("todos");
  const [formRegisteredEquipId, setFormRegisteredEquipId] = useState<string>("");
  const [registeredEquipments, setRegisteredEquipments] = useState<{ id: string; name: string; model: string; image_path: string | null; accessories: string[]; category: string }[]>([]);
  const [formOriginType, setFormOriginType] = useState<string>("client");

  // Catalog state (admin master only)
  const [catalogItems, setCatalogItems] = useState<EquipCatalogItem[]>([]);
  const [showCatalogDialog, setShowCatalogDialog] = useState(false);
  const [catalogName, setCatalogName] = useState("");
  const [catalogCategory, setCatalogCategory] = useState<string>("maquina");
  const [catalogImageFile, setCatalogImageFile] = useState<File | null>(null);
  const [catalogImagePreview, setCatalogImagePreview] = useState<string | null>(null);
  const [catalogDescription, setCatalogDescription] = useState("");
  const [catalogPdfFile, setCatalogPdfFile] = useState<File | null>(null);
  const [catalogPdfName, setCatalogPdfName] = useState<string | null>(null);
  const catalogPdfRef = useRef<HTMLInputElement>(null);
  const [catalogAdminPdfFile, setCatalogAdminPdfFile] = useState<File | null>(null);
  const [catalogAdminPdfName, setCatalogAdminPdfName] = useState<string | null>(null);
  const catalogAdminPdfRef = useRef<HTMLInputElement>(null);
  const [editingCatalogItem, setEditingCatalogItem] = useState<EquipCatalogItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [paybackMachine, setPaybackMachine] = useState<{ id: string; name: string } | null>(null);

  // View mode & table filters
  const [viewMode, setViewMode] = useState<"cards" | "table">(isAdminMaster ? "table" : "cards");
  const [searchClient, setSearchClient] = useState("");
  const [searchSerial, setSearchSerial] = useState("");
  const [searchModel, setSearchModel] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const filteredMachines = machines.filter(m => {
    if (m.origin_type !== "client") return false;
    if (filterOwnerId !== "todos" && m.owner_id !== filterOwnerId) return false;
    if (filterCategory !== "todos" && m.category !== filterCategory) return false;
    if (filterOwnerSearch.trim() && !m.owner_name.toLowerCase().includes(filterOwnerSearch.trim().toLowerCase())) return false;
    if (searchClient.trim() && !m.owner_name.toLowerCase().includes(searchClient.trim().toLowerCase())) return false;
    if (searchSerial.trim() && !m.serial_number.toLowerCase().includes(searchSerial.trim().toLowerCase())) return false;
    if (searchModel.trim() && !(m.name || m.model).toLowerCase().includes(searchModel.trim().toLowerCase())) return false;
    if (filterStatus !== "todos" && m.status !== filterStatus) return false;
    return true;
  });

  const dimensionMachines = machines.filter(m => m.origin_type === "dimension");

  const totalPages = Math.ceil(filteredMachines.length / ITEMS_PER_PAGE);
  const paginatedMachines = viewMode === "table"
    ? filteredMachines.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
    : filteredMachines;

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [searchClient, searchSerial, searchModel, filterStatus, filterOwnerId, filterCategory, filterOwnerSearch]);

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    const { data } = supabase.storage.from("machine-files").getPublicUrl(imagePath);
    return data.publicUrl;
  };

  const fetchMachines = async () => {
    setLoading(true);
    let query = supabase.from("machines").select("*");
    
    // When impersonating, show target user's machines; non-admin sees only own machines
    if (isImpersonating && targetUserId) {
      query = query.eq("owner_id", targetUserId);
    } else if (!isAdminMaster) {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession?.user?.id) {
        query = query.eq("owner_id", currentSession.user.id);
      }
    }
    const { data: machinesData } = await query;

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
        origin_type: (m as any).origin_type ?? "client",
        operational_status: (m as any).operational_status ?? "livre",
      })));
    }
    setLoading(false);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("id, name").eq("approved", true);
    setProfiles(data ?? []);
  };

  const fetchCatalogItems = async () => {
    const { data } = await (supabase as any).from("dimension_equipment").select("id, name, image_url, category, description, pdf_url, pdf_admin_url, status").order("created_at", { ascending: false });
    setCatalogItems(data ?? []);
  };

  const fetchRegisteredEquipments = async () => {
    const { data } = await (supabase as any)
      .from("registered_equipment")
      .select("id, name, model, image_path, accessories, category")
      .order("name", { ascending: true });
    setRegisteredEquipments(data ?? []);
  };

  useEffect(() => {
    fetchMachines();
    if (isAdmin) { fetchProfiles(); fetchCatalogItems(); fetchRegisteredEquipments(); }
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

    // If a registered equipment is selected and no custom image, use its image
    const selectedEquip = registeredEquipments.find(e => e.id === formRegisteredEquipId);
    if (selectedEquip?.image_path && !formImageFile) {
      imagePath = selectedEquip.image_path;
    }

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

    const { data: insertedMachine, error } = await supabase.from("machines").insert({
      name: formName,
      model: formModel,
      serial_number: formSerial,
      owner_id: formOwner,
      install_date: formInstallDate,
      accessories,
      image_path: imagePath,
      category: formCategory,
      origin_type: formOriginType,
    } as any).select().single();

    if (error) {
      toast.error("Erro ao adicionar máquina: " + error.message);
      return;
    }

    // Auto-copy specs and trainings from registered equipment
    if (formRegisteredEquipId && insertedMachine) {
      const machineId = (insertedMachine as any).id;

      // Copy specs
      const { data: specsData } = await (supabase as any)
        .from("registered_equipment_specs")
        .select("spec_data")
        .eq("equipment_id", formRegisteredEquipId)
        .maybeSingle();

      if (specsData?.spec_data && Object.keys(specsData.spec_data).length > 0) {
        await supabase.from("machine_specs").insert({
          machine_id: machineId,
          spec_data: specsData.spec_data,
        } as any);
      }

      // Copy trainings
      const { data: trainingsData } = await (supabase as any)
        .from("registered_equipment_trainings")
        .select("title, description, video_url, file_path, file_name")
        .eq("equipment_id", formRegisteredEquipId);

      if (trainingsData && trainingsData.length > 0) {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        for (const t of trainingsData) {
          await supabase.from("machine_trainings").insert({
            machine_id: machineId,
            title: t.title,
            description: t.description,
            video_url: t.video_url,
            file_path: t.file_path,
            file_name: t.file_name,
            created_by: userId,
          } as any);
        }
      }
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
    setFormRegisteredEquipId(""); setFormOriginType("client");
  };

  const handleCatalogImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setCatalogImageFile(file); setCatalogImagePreview(URL.createObjectURL(file)); }
  };

  const resetCatalogForm = () => {
    setCatalogName(""); setCatalogCategory("maquina"); setCatalogDescription(""); setCatalogImageFile(null); setCatalogImagePreview(null); setCatalogPdfFile(null); setCatalogPdfName(null); setCatalogAdminPdfFile(null); setCatalogAdminPdfName(null); setEditingCatalogItem(null);
  };

  const handleSaveCatalogItem = async () => {
    if (!catalogName.trim()) { toast.error("Informe o nome do equipamento."); return; }

    let imageUrl: string | null = editingCatalogItem?.image_url ?? null;
    let pdfUrl: string | null = editingCatalogItem?.pdf_url ?? null;
    let pdfAdminUrl: string | null = editingCatalogItem?.pdf_admin_url ?? null;

    if (catalogImageFile) {
      const path = `catalog/${Date.now()}_${catalogImageFile.name}`;
      const { error: upErr } = await supabase.storage.from("machine-files").upload(path, catalogImageFile);
      if (upErr) { toast.error("Erro ao enviar imagem."); return; }
      const { data: pubData } = supabase.storage.from("machine-files").getPublicUrl(path);
      imageUrl = pubData.publicUrl;
    }

    if (catalogPdfFile) {
      const path = `catalog/pdf/${Date.now()}_${catalogPdfFile.name}`;
      const { error: upErr } = await supabase.storage.from("machine-files").upload(path, catalogPdfFile);
      if (upErr) { toast.error("Erro ao enviar PDF."); return; }
      const { data: pubData } = supabase.storage.from("machine-files").getPublicUrl(path);
      pdfUrl = pubData.publicUrl;
    }

    if (catalogAdminPdfFile) {
      const path = `catalog/pdf-admin/${Date.now()}_${catalogAdminPdfFile.name}`;
      const { error: upErr } = await supabase.storage.from("machine-files").upload(path, catalogAdminPdfFile);
      if (upErr) { toast.error("Erro ao enviar PDF Admin."); return; }
      const { data: pubData } = supabase.storage.from("machine-files").getPublicUrl(path);
      pdfAdminUrl = pubData.publicUrl;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (editingCatalogItem) {
      const { error } = await (supabase as any).from("dimension_equipment").update({ name: catalogName.trim(), image_url: imageUrl, category: catalogCategory, description: catalogDescription.trim(), pdf_url: pdfUrl, pdf_admin_url: pdfAdminUrl }).eq("id", editingCatalogItem.id);
      if (error) { toast.error("Erro ao atualizar."); return; }
      toast.success("Equipamento atualizado!");
    } else {
      const { error } = await (supabase as any).from("dimension_equipment").insert({ name: catalogName.trim(), image_url: imageUrl, created_by: session.user.id, category: catalogCategory, description: catalogDescription.trim(), pdf_url: pdfUrl, pdf_admin_url: pdfAdminUrl });
      if (error) { toast.error("Erro ao cadastrar."); return; }
      toast.success("Equipamento cadastrado!");
    }
    setShowCatalogDialog(false); resetCatalogForm(); fetchCatalogItems();
  };

  const handleDeleteCatalogItem = async (id: string) => {
    const { error } = await supabase.from("dimension_equipment").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir."); return; }
    toast.success("Equipamento excluído!"); setDeleteConfirmId(null); fetchCatalogItems();
  };

  const handleToggleCatalogStatus = async (item: EquipCatalogItem) => {
    const newStatus = item.status === "ativo" ? "fora_de_linha" : "ativo";
    const { error } = await (supabase as any).from("dimension_equipment").update({ status: newStatus }).eq("id", item.id);
    if (error) { toast.error("Erro ao alterar status."); return; }
    toast.success(newStatus === "ativo" ? "Equipamento ativado!" : "Equipamento marcado como fora de linha!");
    fetchCatalogItems();
  };

  const openEditCatalog = (item: EquipCatalogItem) => {
    setEditingCatalogItem(item); setCatalogName(item.name); setCatalogCategory(item.category ?? "maquina");
    setCatalogDescription(item.description ?? ""); setCatalogPdfName(item.pdf_url ? "PDF anexado" : null); setCatalogPdfFile(null);
    setCatalogAdminPdfName(item.pdf_admin_url ? "PDF Admin anexado" : null); setCatalogAdminPdfFile(null);
    setCatalogImagePreview(item.image_url); setCatalogImageFile(null);
    setShowCatalogDialog(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs defaultValue="maquinas" className="w-full">
        <TabsList className={`grid w-full max-w-lg ${isAdminMaster ? "grid-cols-3" : "grid-cols-2"}`}>
          <TabsTrigger value="maquinas">Minhas Máquinas</TabsTrigger>
          {isAdminMaster && <TabsTrigger value="dimension" className="gap-1.5"><Factory className="w-3.5 h-3.5" /> Parque Dimension</TabsTrigger>}
          <TabsTrigger value="cadastro">Cadastro de Equipamento</TabsTrigger>
        </TabsList>

        <TabsContent value="maquinas" className="space-y-6 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-bold text-foreground">Minhas Máquinas</h1>
              <p className="text-sm text-muted-foreground mt-1">{filteredMachines.length} itens registrados</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {isAdminMaster && (
                <div className="flex items-center border border-border rounded-md overflow-hidden">
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-none h-9 gap-1.5 text-xs"
                    onClick={() => setViewMode("table")}
                  >
                    <List className="w-3.5 h-3.5" /> Tabela
                  </Button>
                  <Button
                    variant={viewMode === "cards" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-none h-9 gap-1.5 text-xs"
                    onClick={() => setViewMode("cards")}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" /> Cards
                  </Button>
                </div>
              )}
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
                <Input
                  placeholder="Buscar proprietário..."
                  value={filterOwnerSearch}
                  onChange={e => setFilterOwnerSearch(e.target.value)}
                  className="bg-accent border-border h-9 text-xs w-[200px]"
                />
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

          {/* Table filters - visible in table mode */}
          {viewMode === "table" && isAdminMaster && (
            <div className="flex items-center gap-3 flex-wrap p-3 rounded-lg border border-border bg-accent/30">
              <div className="flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Filtros:</span>
              </div>
              <Input
                placeholder="Cliente..."
                value={searchClient}
                onChange={e => setSearchClient(e.target.value)}
                className="bg-background border-border h-8 text-xs w-[160px]"
              />
              <Input
                placeholder="Nº de série..."
                value={searchSerial}
                onChange={e => setSearchSerial(e.target.value)}
                className="bg-background border-border h-8 text-xs w-[160px]"
              />
              <Input
                placeholder="Modelo..."
                value={searchModel}
                onChange={e => setSearchModel(e.target.value)}
                className="bg-background border-border h-8 text-xs w-[160px]"
              />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-background border-border h-8 text-xs w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos status</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                </SelectContent>
              </Select>
              {(searchClient || searchSerial || searchModel || filterStatus !== "todos") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => { setSearchClient(""); setSearchSerial(""); setSearchModel(""); setFilterStatus("todos"); }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          )}

          {/* Table view */}
          {viewMode === "table" ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-accent/50">
                      <TableHead className="w-[60px]">Img</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Nº Série</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Chamados</TableHead>
                      <TableHead className="text-center">Manutenções</TableHead>
                      <TableHead className="text-center">Payback</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMachines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          Nenhuma máquina encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedMachines.map(machine => (
                        <TableRow
                          key={machine.id}
                          className="cursor-pointer hover:bg-accent/30"
                          onClick={() => navigate(`/maquinas/${machine.id}`)}
                        >
                          <TableCell className="p-2">
                            <div className="w-10 h-10 rounded bg-accent/50 flex items-center justify-center overflow-hidden">
                              {machine.image_url ? (
                                <img src={machine.image_url} alt={machine.name || machine.model} className="w-full h-full object-cover" />
                              ) : (
                                <Cpu className="w-4 h-4 text-muted-foreground/40" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium text-foreground">{machine.name || machine.model}</p>
                              {machine.category === "acessorio" && (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-accent text-muted-foreground font-medium uppercase tracking-wider">Acessório</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{machine.serial_number}</TableCell>
                          <TableCell className="text-sm">{machine.owner_name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(machine.install_date).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell><StatusBadge status={machine.status} /></TableCell>
                          <TableCell className="text-center font-semibold">{machine.ticket_count}</TableCell>
                          <TableCell className="text-center font-semibold">{machine.maintenance_count}</TableCell>
                          <TableCell className="text-center">
                            {machine.category === "maquina" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 gap-1 text-[11px] border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPaybackMachine({ id: machine.id, name: machine.name || machine.model });
                                }}
                              >
                                <PiggyBank className="w-3 h-3" />
                                Payback
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px]"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/maquinas/${machine.id}`);
                              }}
                            >
                              Detalhes
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredMachines.length)} de {filteredMachines.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 7) {
                        page = i + 1;
                      } else if (currentPage <= 4) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 3) {
                        page = totalPages - 6 + i;
                      } else {
                        page = currentPage - 3 + i;
                      }
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          className="h-8 w-8 p-0 text-xs"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(p => p + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Card view */
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredMachines.map(machine => (
                <div
                  key={machine.id}
                  className="gradient-card rounded-lg border border-border overflow-hidden hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/maquinas/${machine.id}`)}
                >
                  <div className="h-28 bg-accent/50 flex items-center justify-center overflow-hidden">
                    {machine.image_url ? (
                      <img src={machine.image_url} alt={machine.name || machine.model} className="w-full h-full object-cover" />
                    ) : (
                      <Cpu className="w-10 h-10 text-muted-foreground/30" />
                    )}
                  </div>

                  <div className="p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-sm text-foreground truncate">{machine.name || machine.model}</h3>
                          {machine.category === "acessorio" && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-accent text-muted-foreground font-medium uppercase tracking-wider shrink-0">Acessório</span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-muted-foreground truncate">{machine.serial_number}</p>
                      </div>
                      <StatusBadge status={machine.status} />
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="w-3 h-3 shrink-0" />
                        <span className="truncate">{machine.owner_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <CalendarDays className="w-3 h-3 shrink-0" />
                        <span>{new Date(machine.install_date).toLocaleDateString("pt-BR")}</span>
                      </div>
                      {machine.accessories.length > 0 && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Wrench className="w-3 h-3 shrink-0" />
                          <span className="truncate">{machine.accessories.join(", ")}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-1.5 border-t border-border">
                      <div className="text-center flex-1">
                        <p className="text-sm font-bold text-foreground">{machine.ticket_count}</p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Chamados</p>
                      </div>
                      <div className="text-center flex-1">
                        <p className="text-sm font-bold text-foreground">{machine.maintenance_count}</p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Manutenções</p>
                      </div>
                      {machine.category === "maquina" && (
                        <div className="text-center flex-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 gap-1.5 text-xs font-medium border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaybackMachine({ id: machine.id, name: machine.name || machine.model });
                            }}
                          >
                            <PiggyBank className="w-3.5 h-3.5" />
                            Payback
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </TabsContent>

        {/* Dimension Park Tab */}
        {isAdminMaster && (
          <TabsContent value="dimension" className="space-y-6 mt-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Factory className="w-5 h-5" /> Parque de Máquinas Dimension
                </h1>
                <p className="text-sm text-muted-foreground mt-1">{dimensionMachines.length} máquinas internas</p>
              </div>
              <Button onClick={() => { setFormOriginType("dimension"); setFormCategory("maquina"); setShowAddDialog(true); }} className="gap-2">
                <Plus className="w-4 h-4" /> Adicionar Máquina Interna
              </Button>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-accent/50">
                    <TableHead className="w-[60px]">Foto</TableHead>
                    <TableHead>Nome / Modelo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status Operacional</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Manutenções</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dimensionMachines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma máquina interna cadastrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    dimensionMachines.map(machine => (
                      <TableRow
                        key={machine.id}
                        className="cursor-pointer hover:bg-accent/30"
                        onClick={() => navigate(`/maquinas/${machine.id}`)}
                      >
                        <TableCell className="p-2">
                          <div className="w-10 h-10 rounded bg-accent/50 flex items-center justify-center overflow-hidden">
                            {machine.image_url ? (
                              <img src={machine.image_url} alt={machine.name || machine.model} className="w-full h-full object-cover" />
                            ) : (
                              <Cpu className="w-4 h-4 text-muted-foreground/40" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium text-foreground">{machine.name || machine.model}</p>
                          <p className="text-[11px] font-mono text-muted-foreground">{machine.serial_number}</p>
                        </TableCell>
                        <TableCell className="text-sm capitalize">{machine.category === "maquina" ? "Máquina" : "Acessório"}</TableCell>
                        <TableCell>
                          <OperationalStatusBadge status={machine.operational_status} />
                        </TableCell>
                        <TableCell><StatusBadge status={machine.status} /></TableCell>
                        <TableCell className="text-center font-semibold">{machine.maintenance_count}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/maquinas/${machine.id}`);
                            }}
                          >
                            Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        )}

        <TabsContent value="cadastro" className="mt-4">
          <EquipmentRegistration />
        </TabsContent>
      </Tabs>

      {/* Add Machine Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Adicionar Máquina</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-foreground">Equipamento Cadastrado (preenche automaticamente)</Label>
              <Select value={formRegisteredEquipId} onValueChange={(val) => {
                setFormRegisteredEquipId(val);
                const equip = registeredEquipments.find(e => e.id === val);
                if (equip) {
                  setFormName(equip.name);
                  setFormModel(equip.model);
                  setFormCategory(equip.category);
                  setFormAccessories(equip.accessories?.join(", ") ?? "");
                  if (equip.image_path) {
                    const { data: pubData } = supabase.storage.from("machine-files").getPublicUrl(equip.image_path);
                    setFormImagePreview(pubData.publicUrl);
                  }
                }
              }}>
                <SelectTrigger className="bg-accent border-border"><SelectValue placeholder="Selecione um equipamento cadastrado (opcional)" /></SelectTrigger>
                <SelectContent>
                  {registeredEquipments.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name || e.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Ficha técnica, treinamentos e foto serão copiados automaticamente.</p>
            </div>
            {isAdminMaster && (
              <div className="space-y-2">
                <Label className="text-foreground">Origem do Equipamento</Label>
                <Select value={formOriginType} onValueChange={setFormOriginType}>
                  <SelectTrigger className="bg-accent border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Cliente</SelectItem>
                    <SelectItem value="dimension">Dimension (Interno)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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
                  {registeredEquipments.map(e => (
                    <SelectItem key={e.id} value={e.name || e.model}>{e.name || e.model}</SelectItem>
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

      <Sheet open={!!paybackMachine} onOpenChange={(open) => { if (!open) setPaybackMachine(null); }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <PiggyBank className="w-5 h-5" /> Payback — {paybackMachine?.name}
            </SheetTitle>
          </SheetHeader>
          {paybackMachine && (
            <div className="mt-4">
              <MachinePaybackPanel machineId={paybackMachine.id} machineName={paybackMachine.name} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Machines;
