import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Cpu, Upload, FileText, Trash2, CalendarDays, Wrench, User, AlertTriangle, Pencil, ImagePlus, ClipboardList, Download, Plus, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface MachineDetail {
  id: string;
  name: string;
  model: string;
  serial_number: string;
  status: string;
  install_date: string;
  accessories: string[];
  owner_id: string;
  owner_name: string;
  image_path: string | null;
  image_url: string | null;
}

interface TicketRow {
  id: string;
  type: string;
  description: string;
  status: string;
  created_at: string;
}

interface MaintenanceRow {
  id: string;
  type: string;
  scheduled_date: string;
  status: string;
  notes: string | null;
  report: string | null;
}

interface ReportRow {
  id: string;
  maintenance_id: string;
  report: string;
  report_date: string;
  status: string;
  created_by: string;
  created_at: string;
}

interface FileRow {
  id: string;
  file_name: string;
  file_path: string;
  created_at: string;
}

interface ProfileOption {
  id: string;
  name: string;
}

const MachineDashboard = () => {
  const { machineId } = useParams<{ machineId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin_master" || user?.role === "admin";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);

  const [machine, setMachine] = useState<MachineDetail | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [maintenances, setMaintenances] = useState<MaintenanceRow[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [uploading, setUploading] = useState(false);

  // Report state
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceRow | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [newReportText, setNewReportText] = useState("");
  const [newReportDate, setNewReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [editingReport, setEditingReport] = useState<ReportRow | null>(null);
  const [editReportText, setEditReportText] = useState("");
  const [editReportDate, setEditReportDate] = useState("");

  // Edit state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [editName, setEditName] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editSerial, setEditSerial] = useState("");
  const [editOwner, setEditOwner] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editAccessories, setEditAccessories] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    const { data } = supabase.storage.from("machine-files").getPublicUrl(imagePath);
    return data.publicUrl;
  };

  useEffect(() => {
    if (!machineId) return;

    const fetchAll = async () => {
      const { data: m } = await supabase.from("machines").select("*").eq("id", machineId).single();
      if (m) {
        const { data: owner } = await supabase.from("profiles").select("name").eq("id", m.owner_id).single();
        setMachine({
          id: m.id,
          name: (m as any).name ?? "",
          model: m.model,
          serial_number: m.serial_number,
          status: m.status,
          install_date: m.install_date,
          accessories: m.accessories ?? [],
          owner_id: m.owner_id,
          owner_name: owner?.name ?? "—",
          image_path: (m as any).image_path ?? null,
          image_url: getImageUrl((m as any).image_path),
        });
      }

      const { data: ticketsData } = await supabase
        .from("tickets")
        .select("id, type, description, status, created_at")
        .eq("machine_id", machineId)
        .order("created_at", { ascending: false });
      setTickets(ticketsData ?? []);

      const { data: maintData } = await supabase
        .from("maintenances")
        .select("id, type, scheduled_date, status, notes, report")
        .eq("machine_id", machineId)
        .order("scheduled_date", { ascending: false });
      setMaintenances(maintData ?? []);

      const { data: filesData } = await supabase
        .from("machine_files")
        .select("*")
        .eq("machine_id", machineId)
        .order("created_at", { ascending: false });
      setFiles(filesData ?? []);
    };

    fetchAll();
  }, [machineId]);

  useEffect(() => {
    if (isAdmin) {
      supabase.from("profiles").select("id, name").eq("approved", true).then(({ data }) => {
        setProfiles(data ?? []);
      });
    }
  }, [isAdmin]);

  const openEditDialog = () => {
    if (!machine) return;
    setEditName(machine.name);
    setEditModel(machine.model);
    setEditSerial(machine.serial_number);
    setEditOwner(machine.owner_id);
    setEditStatus(machine.status);
    setEditAccessories(machine.accessories.join(", "));
    setEditImageFile(null);
    setEditImagePreview(machine.image_url);
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!machine || !editModel || !editSerial || !editOwner) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    const accessories = editAccessories.split(",").map(a => a.trim()).filter(Boolean);

    let imagePath = machine.image_path;
    if (editImageFile) {
      const path = `images/${Date.now()}_${editImageFile.name}`;
      const { error: uploadErr } = await supabase.storage.from("machine-files").upload(path, editImageFile);
      if (uploadErr) {
        toast.error("Erro ao enviar imagem: " + uploadErr.message);
        return;
      }
      imagePath = path;
    }

    const { error } = await supabase.from("machines").update({
      name: editName,
      model: editModel,
      serial_number: editSerial,
      owner_id: editOwner,
      status: editStatus,
      accessories,
      image_path: imagePath,
    } as any).eq("id", machine.id);

    if (error) {
      toast.error("Erro ao atualizar: " + error.message);
      return;
    }

    toast.success("Máquina atualizada com sucesso!");
    setShowEditDialog(false);

    // Refresh machine data
    const { data: owner } = await supabase.from("profiles").select("name").eq("id", editOwner).single();
    setMachine({
      ...machine,
      name: editName,
      model: editModel,
      serial_number: editSerial,
      owner_id: editOwner,
      status: editStatus,
      accessories,
      owner_name: owner?.name ?? "—",
      image_path: imagePath,
      image_url: getImageUrl(imagePath),
    });
  };

  const handleDeleteMachine = async () => {
    if (!machine) return;

    const { error } = await supabase.from("machines").delete().eq("id", machine.id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }

    toast.success("Máquina excluída com sucesso!");
    navigate("/maquinas");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !machineId) return;

    setUploading(true);
    const filePath = `${machineId}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("machine-files")
      .upload(filePath, file);

    if (uploadError) {
      toast.error("Erro ao enviar arquivo: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { error: dbError } = await supabase.from("machine_files").insert({
      machine_id: machineId,
      file_name: file.name,
      file_path: filePath,
      uploaded_by: (await supabase.auth.getUser()).data.user?.id,
    } as any);

    if (dbError) {
      toast.error("Erro ao registrar arquivo: " + dbError.message);
    } else {
      toast.success("Arquivo enviado com sucesso!");
      const { data: filesData } = await supabase
        .from("machine_files")
        .select("*")
        .eq("machine_id", machineId)
        .order("created_at", { ascending: false });
      setFiles(filesData ?? []);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteFile = async (fileId: string, filePath: string) => {
    await supabase.storage.from("machine-files").remove([filePath]);
    await supabase.from("machine_files").delete().eq("id", fileId);
    setFiles(prev => prev.filter(f => f.id !== fileId));
    toast.success("Arquivo removido.");
  };

  const openReportDialog = async (m: MaintenanceRow) => {
    setSelectedMaintenance(m);
    setNewReportText("");
    setNewReportDate(new Date().toISOString().split("T")[0]);
    setShowReportDialog(true);
    // Fetch reports for this maintenance
    const { data } = await supabase
      .from("maintenance_reports")
      .select("*")
      .eq("maintenance_id", m.id)
      .order("report_date", { ascending: false });
    setReports(data ?? []);
  };

  const handleAddReport = async () => {
    if (!selectedMaintenance || !newReportText.trim()) {
      toast.error("Preencha o relatório.");
      return;
    }
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { data, error } = await supabase
      .from("maintenance_reports")
      .insert({
        maintenance_id: selectedMaintenance.id,
        report: newReportText,
        report_date: newReportDate,
        created_by: userId,
      } as any)
      .select()
      .single();
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Relatório adicionado!");
    setReports(prev => [data as ReportRow, ...prev]);
    setNewReportText("");
  };

  const handleToggleReportStatus = async (report: ReportRow) => {
    const newStatus = report.status === "executado" ? "pendente" : "executado";
    const { error } = await supabase
      .from("maintenance_reports")
      .update({ status: newStatus } as any)
      .eq("id", report.id);
    if (error) {
      toast.error("Erro ao atualizar status: " + error.message);
      return;
    }
    setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: newStatus } : r));
    toast.success(`Status alterado para ${newStatus}.`);
  };

  const handleEditReport = async () => {
    if (!editingReport || !editReportText.trim()) {
      toast.error("Preencha o relatório.");
      return;
    }
    const { error } = await supabase
      .from("maintenance_reports")
      .update({ report: editReportText, report_date: editReportDate } as any)
      .eq("id", editingReport.id);
    if (error) {
      toast.error("Erro ao atualizar: " + error.message);
      return;
    }
    setReports(prev => prev.map(r => r.id === editingReport.id ? { ...r, report: editReportText, report_date: editReportDate } : r));
    setEditingReport(null);
    toast.success("Relatório atualizado!");
  };

  const handleDeleteReport = async (reportId: string) => {
    const { error } = await supabase
      .from("maintenance_reports")
      .delete()
      .eq("id", reportId);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }
    setReports(prev => prev.filter(r => r.id !== reportId));
    toast.success("Relatório excluído!");
  };

  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage.from("machine-files").getPublicUrl(filePath);
    return data.publicUrl;
  };

  if (!machine) {
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
        <Button variant="ghost" size="icon" onClick={() => navigate("/maquinas")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center overflow-hidden">
            {machine.image_url ? (
              <img src={machine.image_url} alt={machine.name || machine.model} className="w-full h-full object-cover" />
            ) : (
              <Cpu className="w-6 h-6 text-primary" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{machine.name || machine.model}</h1>
            <p className="text-sm text-muted-foreground font-mono">{machine.serial_number}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={machine.status} />
          {isAdmin && (
            <>
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
                    <AlertDialogTitle className="text-foreground">Excluir Máquina</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir <strong>{machine.name || machine.model}</strong>? Esta ação não pode ser desfeita e removerá todos os arquivos associados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteMachine} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="gradient-card rounded-lg border border-border p-4 flex items-center gap-3">
          <User className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground uppercase">Proprietário</p>
            <p className="text-sm font-medium text-foreground">{machine.owner_name}</p>
          </div>
        </div>
        <div className="gradient-card rounded-lg border border-border p-4 flex items-center gap-3">
          <CalendarDays className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground uppercase">Instalação</p>
            <p className="text-sm font-medium text-foreground">{new Date(machine.install_date).toLocaleDateString("pt-BR")}</p>
          </div>
        </div>
        <div className="gradient-card rounded-lg border border-border p-4 flex items-center gap-3">
          <Wrench className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground uppercase">Acessórios</p>
            <p className="text-sm font-medium text-foreground">{machine.accessories.length > 0 ? machine.accessories.join(", ") : "Nenhum"}</p>
          </div>
        </div>
      </div>

      {/* Tickets & Maintenances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="gradient-card rounded-lg border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Chamados ({tickets.length})</h3>
          </div>
          <div className="space-y-3">
            {tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum chamado registrado.</p>
            ) : (
              tickets.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-md bg-accent/50 cursor-pointer hover:bg-accent/80 transition-colors" onClick={() => navigate(`/suporte`)}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{t.type}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.description}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <StatusBadge status={t.status} className="ml-3 shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="gradient-card rounded-lg border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Manutenções ({maintenances.length})</h3>
          </div>
          <div className="space-y-3">
            {maintenances.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma manutenção registrada.</p>
            ) : (
              maintenances.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-md bg-accent/50 cursor-pointer hover:bg-accent/80 transition-colors" onClick={() => openReportDialog(m)}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{m.type}</p>
                    {m.notes && <p className="text-xs text-muted-foreground truncate">{m.notes}</p>}
                    <p className="text-xs text-muted-foreground">{new Date(m.scheduled_date).toLocaleDateString("pt-BR")}</p>
                    <p className="text-xs text-primary mt-1">📋 Clique para ver relatórios</p>
                  </div>
                  <StatusBadge status={m.status} className="ml-3 shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Files */}
      <div className="gradient-card rounded-lg border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Arquivos ({files.length})</h3>
          </div>
          <div>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
              <Upload className="w-3.5 h-3.5" />
              {uploading ? "Enviando..." : "Enviar Arquivo"}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {files.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum arquivo enviado.</p>
          ) : (
            files.map(f => (
              <div key={f.id} className="flex items-center justify-between p-3 rounded-md bg-accent/50">
                <span className="text-sm font-medium text-foreground truncate flex-1">{f.file_name}</span>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <span className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString("pt-BR")}</span>
                  <a href={getFileUrl(f.file_path)} download={f.file_name} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary/80" title="Baixar">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteFile(f.id, f.file_path)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Máquina</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Image upload */}
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
              <input ref={editImageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setEditImageFile(file);
                  setEditImagePreview(URL.createObjectURL(file));
                }
              }} />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Nome da Máquina</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="bg-accent border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Modelo *</Label>
              <Input value={editModel} onChange={e => setEditModel(e.target.value)} className="bg-accent border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Número de Série *</Label>
              <Input value={editSerial} onChange={e => setEditSerial(e.target.value)} className="bg-accent border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Proprietário *</Label>
              <Select value={editOwner} onValueChange={setEditOwner}>
                <SelectTrigger className="bg-accent border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger className="bg-accent border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="maintenance">Em Manutenção</SelectItem>
                  <SelectItem value="inactive">Inativa</SelectItem>
                </SelectContent>
              </Select>
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

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Relatórios de Manutenção</DialogTitle>
          </DialogHeader>
          {selectedMaintenance && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="font-medium text-foreground">{selectedMaintenance.type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Data:</span>
                  <span className="font-medium text-foreground">{new Date(selectedMaintenance.scheduled_date).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>

              {/* Add new report */}
              <div className="space-y-3 p-4 rounded-lg border border-border bg-accent/30">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Novo Relatório
                </h4>
                <div className="space-y-2">
                  <Label className="text-foreground">Data do Relatório</Label>
                  <Input type="date" value={newReportDate} onChange={e => setNewReportDate(e.target.value)} className="bg-accent border-border w-48" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Descrição</Label>
                  <Textarea
                    value={newReportText}
                    onChange={e => setNewReportText(e.target.value)}
                    placeholder="Descreva o serviço realizado, peças trocadas, observações..."
                    className="bg-accent border-border min-h-[100px]"
                  />
                </div>
                <Button size="sm" onClick={handleAddReport} className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Adicionar Relatório
                </Button>
              </div>

              {/* Report list */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Relatórios ({reports.length})</h4>
                {reports.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum relatório registrado.</p>
                ) : (
                  reports.map(r => (
                    <div key={r.id} className="p-3 rounded-lg border border-border bg-accent/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{new Date(r.report_date).toLocaleDateString("pt-BR")}</span>
                        <div className="flex items-center gap-2">
                          {r.status === "executado" ? (
                            <span className="text-xs font-medium text-green-500 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Executado</span>
                          ) : (
                            <span className="text-xs font-medium text-yellow-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Pendente</span>
                          )}
                          {isAdmin && (
                            <Button variant="outline" size="sm" className="h-6 text-xs px-2 border-border" onClick={() => handleToggleReportStatus(r)}>
                              {r.status === "executado" ? "Marcar Pendente" : "Marcar Executado"}
                            </Button>
                          )}
                        </div>
                      </div>
                      {editingReport?.id === r.id ? (
                        <div className="space-y-2">
                          <Input type="date" value={editReportDate} onChange={e => setEditReportDate(e.target.value)} className="bg-accent border-border w-48" />
                          <Textarea value={editReportText} onChange={e => setEditReportText(e.target.value)} className="bg-accent border-border min-h-[80px]" />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleEditReport}>Salvar</Button>
                            <Button size="sm" variant="outline" className="border-border" onClick={() => setEditingReport(null)}>Cancelar</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-foreground whitespace-pre-wrap cursor-pointer hover:bg-accent/50 rounded p-1 -m-1 transition-colors" onClick={() => {
                            setEditingReport(r);
                            setEditReportText(r.report);
                            setEditReportDate(r.report_date);
                          }}>{r.report}</p>
                          <div className="flex gap-2 pt-1">
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={() => {
                              setEditingReport(r);
                              setEditReportText(r.report);
                              setEditReportDate(r.report_date);
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
                                  <AlertDialogTitle className="text-foreground">Excluir Relatório</AlertDialogTitle>
                                  <AlertDialogDescription>Tem certeza que deseja excluir este relatório? Esta ação não pode ser desfeita.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteReport(r.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-border">Fechar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MachineDashboard;
