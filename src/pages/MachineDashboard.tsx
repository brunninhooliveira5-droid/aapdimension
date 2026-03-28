import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Cpu, Upload, FileText, Trash2, CalendarDays, Wrench, User, AlertTriangle, Pencil, ImagePlus, ClipboardList, Download, Plus, CheckCircle, Clock, BookOpen, GraduationCap, Video, History, PiggyBank } from "lucide-react";
import { EquipmentTrainingsSection } from "@/components/equipment/EquipmentTrainingsSection";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MachinePaybackPanel } from "@/components/machines/MachinePaybackPanel";

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
  equipment_id: string | null;
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
  const isAdmin = user?.role === "admin_master";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);

  const [machine, setMachine] = useState<MachineDetail | null>(null);
  const [registeredEquipmentId, setRegisteredEquipmentId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [maintenances, setMaintenances] = useState<MaintenanceRow[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showPaybackSheet, setShowPaybackSheet] = useState(false);
  const [allExecutedReports, setAllExecutedReports] = useState<(ReportRow & { maintenance_type?: string; maintenance_notes?: string })[]>([]);
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  const [estimatedUsageMinutes, setEstimatedUsageMinutes] = useState(0);

  // Report state
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceRow | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [newReportText, setNewReportText] = useState("");
  const [newReportDate, setNewReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [editingReport, setEditingReport] = useState<ReportRow | null>(null);
  const [editReportText, setEditReportText] = useState("");
  const [editReportDate, setEditReportDate] = useState("");

  // Specs state
  const [showSpecsDialog, setShowSpecsDialog] = useState(false);
  const [specsData, setSpecsData] = useState<Record<string, string>>({});
  const [specsId, setSpecsId] = useState<string | null>(null);
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecValue, setNewSpecValue] = useState("");
  const [savingSpecs, setSavingSpecs] = useState(false);
  const [editingSpecKey, setEditingSpecKey] = useState<string | null>(null);
  const [editSpecKey, setEditSpecKey] = useState("");
  const [editSpecValue, setEditSpecValue] = useState("");

  // Training state
  interface TrainingRow {
    id: string;
    machine_id: string;
    title: string;
    description: string;
    video_url: string | null;
    file_path: string | null;
    file_name: string | null;
    created_at: string;
  }
  const [showTrainingDialog, setShowTrainingDialog] = useState(false);
  const [trainings, setTrainings] = useState<TrainingRow[]>([]);
  const [newTrainingTitle, setNewTrainingTitle] = useState("");
  const [newTrainingDesc, setNewTrainingDesc] = useState("");
  const [newTrainingVideo, setNewTrainingVideo] = useState("");
  const [newTrainingFile, setNewTrainingFile] = useState<File | null>(null);
  const [uploadingTraining, setUploadingTraining] = useState(false);
  const trainingFileRef = useRef<HTMLInputElement>(null);
  const editTrainingFileRef = useRef<HTMLInputElement>(null);

  // Edit training state
  const [editingTraining, setEditingTraining] = useState<TrainingRow | null>(null);
  const [editTrainingTitle, setEditTrainingTitle] = useState("");
  const [editTrainingDesc, setEditTrainingDesc] = useState("");
  const [editTrainingVideo, setEditTrainingVideo] = useState("");
  const [editTrainingFile, setEditTrainingFile] = useState<File | null>(null);
  const [savingTrainingEdit, setSavingTrainingEdit] = useState(false);

  // New ticket state
  const [showNewTicketDialog, setShowNewTicketDialog] = useState(false);
  const [newTicketType, setNewTicketType] = useState("");
  const [newTicketDesc, setNewTicketDesc] = useState("");
  const [savingTicket, setSavingTicket] = useState(false);

  // New maintenance state
  const [showNewMaintenanceDialog, setShowNewMaintenanceDialog] = useState(false);
  const [newMaintType, setNewMaintType] = useState("");
  const [newMaintDate, setNewMaintDate] = useState(new Date().toISOString().split("T")[0]);
  const [newMaintNotes, setNewMaintNotes] = useState("");
  const [savingMaint, setSavingMaint] = useState(false);

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
          equipment_id: (m as any).equipment_id ?? null,
        });

        // Lookup registered_equipment_id for training
        if ((m as any).equipment_id) {
          const { data: regEq } = await (supabase as any)
            .from("registered_equipment")
            .select("id")
            .eq("dimension_equipment_id", (m as any).equipment_id)
            .single();
          if (regEq) {
            setRegisteredEquipmentId(regEq.id);
          }
        }
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

      const { data: trainingsData } = await supabase
        .from("machine_trainings")
        .select("*")
        .eq("machine_id", machineId)
        .order("created_at", { ascending: false });
      setTrainings((trainingsData as TrainingRow[] | null) ?? []);

      // Fetch all executed reports for history
      const maintIds = (maintData ?? []).map(m => m.id);
      if (maintIds.length > 0) {
        const { data: execReports } = await supabase
          .from("maintenance_reports")
          .select("*")
          .in("maintenance_id", maintIds)
          .eq("status", "executado")
          .order("report_date", { ascending: false });
        const reportsWithMaint = (execReports ?? []).map(r => {
          const maint = (maintData ?? []).find(m => m.id === r.maintenance_id);
          return { ...r, maintenance_type: maint?.type, maintenance_notes: maint?.notes ?? "" } as ReportRow & { maintenance_type?: string; maintenance_notes?: string };
        });
        setAllExecutedReports(reportsWithMaint);
      }

      // Fetch estimated usage time from cnc_services via investment
      const { data: invData } = await supabase
        .from("cnc_investments" as any)
        .select("id")
        .eq("machine_id", machineId)
        .maybeSingle();
      if (invData) {
        const { data: svcData } = await supabase
          .from("cnc_services" as any)
          .select("notes")
          .eq("investment_id", (invData as any).id);
        const totalMin = (svcData ?? []).reduce((sum: number, s: any) => {
          const match = s.notes?.match(/Tempo:\s*([\d.,]+)\s*min/);
          return sum + (match ? parseFloat(match[1].replace(",", ".")) : 0);
        }, 0);
        setEstimatedUsageMinutes(totalMin);
      }
    };

    fetchAll();
  }, [machineId]);

  const [catalogItems, setCatalogItems] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (isAdmin) {
      supabase.from("profiles").select("id, name").eq("approved", true).then(({ data }) => {
        setProfiles(data ?? []);
      });
      supabase.from("dimension_equipment").select("id, name").order("name").then(({ data }) => {
        setCatalogItems(data ?? []);
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
    // Fetch all reports for this maintenance
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

  const handleChangeMaintenanceStatus = async (maintenanceId: string, newStatus: string) => {
    const { error } = await supabase
      .from("maintenances")
      .update({ status: newStatus } as any)
      .eq("id", maintenanceId);
    if (error) {
      toast.error("Erro ao atualizar status: " + error.message);
      return;
    }
    setMaintenances(prev => prev.map(m => m.id === maintenanceId ? { ...m, status: newStatus } : m));
    toast.success("Status da manutenção atualizado!");
  };

  const handleChangeReportStatus = async (report: ReportRow, newStatus: string) => {
    const { error } = await supabase
      .from("maintenance_reports")
      .update({ status: newStatus } as any)
      .eq("id", report.id);
    if (error) {
      toast.error("Erro ao atualizar status: " + error.message);
      return;
    }
    if (newStatus === "executado") {
      // Add to history and update in reports list
      const maint = maintenances.find(m => m.id === report.maintenance_id);
      setAllExecutedReports(prev => [{ ...report, status: "executado", maintenance_type: maint?.type, maintenance_notes: maint?.notes ?? "" }, ...prev]);
      const updatedReports = reports.map(r => r.id === report.id ? { ...r, status: "executado" } : r);
      setReports(updatedReports);
      
      // Check if ALL reports for this maintenance are now executado
      const allDone = updatedReports.every(r => r.status === "executado");
      if (allDone && maint) {
        await supabase.from("maintenances").update({ status: "realizada" } as any).eq("id", maint.id);
        setMaintenances(prev => prev.map(m => m.id === maint.id ? { ...m, status: "realizada" } : m));
      }
      toast.success("Relatório movido para o histórico!");
    } else {
      // If changing back from executado, remove from history
      setAllExecutedReports(prev => prev.filter(r => r.id !== report.id));
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: newStatus } : r));
      // If maintenance was "realizada", revert it since not all reports are done anymore
      const maint = maintenances.find(m => m.id === report.maintenance_id);
      if (maint?.status === "realizada") {
        await supabase.from("maintenances").update({ status: "pendente" } as any).eq("id", maint.id);
        setMaintenances(prev => prev.map(m => m.id === maint.id ? { ...m, status: "pendente" } : m));
      }
      toast.success("Status do relatório atualizado!");
    }
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

  const openSpecsDialog = async () => {
    if (!machineId) return;
    setShowSpecsDialog(true);
    const { data } = await supabase
      .from("machine_specs")
      .select("*")
      .eq("machine_id", machineId)
      .maybeSingle();
    if (data) {
      setSpecsId(data.id);
      setSpecsData((data as any).spec_data ?? {});
    } else {
      setSpecsId(null);
      setSpecsData({});
    }
  };

  const handleAddSpec = async () => {
    if (!newSpecKey.trim() || !machineId) return;
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
    if (editingSpecKey !== editSpecKey.trim()) {
      delete copy[editingSpecKey];
    }
    copy[editSpecKey.trim()] = editSpecValue.trim();
    setSpecsData(copy);
    setEditingSpecKey(null);
    await saveSpecsToDb(copy);
  };

  const saveSpecsToDb = async (data: Record<string, string>) => {
    if (!machineId) return;
    setSavingSpecs(true);
    if (specsId) {
      const { error } = await supabase
        .from("machine_specs")
        .update({ spec_data: data } as any)
        .eq("id", specsId);
      if (error) { toast.error("Erro ao salvar: " + error.message); setSavingSpecs(false); return; }
    } else {
      const { data: inserted, error } = await supabase
        .from("machine_specs")
        .insert({ machine_id: machineId, spec_data: data } as any)
        .select()
        .single();
      if (error) { toast.error("Erro ao salvar: " + error.message); setSavingSpecs(false); return; }
      if (inserted) setSpecsId((inserted as any).id);
    }
    toast.success("Ficha técnica salva!");
    setSavingSpecs(false);
  };

  const handleSaveSpecs = async () => {
    await saveSpecsToDb(specsData);
  };

  const handleDeleteMaintenance = async (maintenanceId: string) => {
    // Delete related reports first, then the maintenance
    await supabase.from("maintenance_reports").delete().eq("maintenance_id", maintenanceId);
    const { error } = await supabase.from("maintenances").delete().eq("id", maintenanceId);
    if (error) {
      toast.error("Erro ao excluir manutenção: " + error.message);
      return;
    }
    setMaintenances(prev => prev.filter(m => m.id !== maintenanceId));
    setAllExecutedReports(prev => prev.filter(r => r.maintenance_id !== maintenanceId));
    toast.success("Manutenção excluída!");
  };

  const openTrainingDialog = () => {
    if (machine?.equipment_id) return;
    setShowTrainingDialog(true);
  };

  const handleAddTraining = async () => {
    if (!machineId || !newTrainingTitle.trim()) {
      toast.error("Preencha o título do treinamento.");
      return;
    }
    setUploadingTraining(true);
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) { setUploadingTraining(false); return; }

    let filePath: string | null = null;
    let fileName: string | null = null;
    if (newTrainingFile) {
      const path = `trainings/${machineId}/${Date.now()}_${newTrainingFile.name}`;
      const { error: uploadErr } = await supabase.storage.from("machine-files").upload(path, newTrainingFile);
      if (uploadErr) {
        toast.error("Erro ao enviar arquivo: " + uploadErr.message);
        setUploadingTraining(false);
        return;
      }
      filePath = path;
      fileName = newTrainingFile.name;
    }

    const { data, error } = await supabase
      .from("machine_trainings")
      .insert({
        machine_id: machineId,
        title: newTrainingTitle,
        description: newTrainingDesc,
        video_url: newTrainingVideo || null,
        file_path: filePath,
        file_name: fileName,
        created_by: userId,
      } as any)
      .select()
      .single();

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      setUploadingTraining(false);
      return;
    }
    toast.success("Treinamento adicionado!");
    setTrainings(prev => [data as TrainingRow, ...prev]);
    setNewTrainingTitle("");
    setNewTrainingDesc("");
    setNewTrainingVideo("");
    setNewTrainingFile(null);
    if (trainingFileRef.current) trainingFileRef.current.value = "";
    setUploadingTraining(false);
  };

  const handleDeleteTraining = async (training: TrainingRow) => {
    if (training.file_path) {
      await supabase.storage.from("machine-files").remove([training.file_path]);
    }
    const { error } = await supabase
      .from("machine_trainings")
      .delete()
      .eq("id", training.id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }
    setTrainings(prev => prev.filter(t => t.id !== training.id));
    toast.success("Treinamento excluído!");
  };

  const handleEditTraining = async () => {
    if (!editingTraining || !editTrainingTitle.trim()) {
      toast.error("Preencha o título.");
      return;
    }
    setSavingTrainingEdit(true);

    let filePath = editingTraining.file_path;
    let fileName = editingTraining.file_name;

    if (editTrainingFile) {
      // Remove old file if exists
      if (editingTraining.file_path) {
        await supabase.storage.from("machine-files").remove([editingTraining.file_path]);
      }
      const path = `trainings/${machineId}/${Date.now()}_${editTrainingFile.name}`;
      const { error: uploadErr } = await supabase.storage.from("machine-files").upload(path, editTrainingFile);
      if (uploadErr) {
        toast.error("Erro ao enviar arquivo: " + uploadErr.message);
        setSavingTrainingEdit(false);
        return;
      }
      filePath = path;
      fileName = editTrainingFile.name;
    }

    const { error } = await supabase
      .from("machine_trainings")
      .update({
        title: editTrainingTitle,
        description: editTrainingDesc,
        video_url: editTrainingVideo || null,
        file_path: filePath,
        file_name: fileName,
      } as any)
      .eq("id", editingTraining.id);

    if (error) {
      toast.error("Erro ao atualizar: " + error.message);
      setSavingTrainingEdit(false);
      return;
    }

    setTrainings(prev => prev.map(t => t.id === editingTraining.id ? {
      ...t,
      title: editTrainingTitle,
      description: editTrainingDesc,
      video_url: editTrainingVideo || null,
      file_path: filePath,
      file_name: fileName,
    } : t));
    setEditingTraining(null);
    setEditTrainingFile(null);
    setSavingTrainingEdit(false);
    toast.success("Treinamento atualizado!");
  };

  const handleCreateTicket = async () => {
    if (!machineId || !newTicketType.trim() || !newTicketDesc.trim()) {
      toast.error("Preencha todos os campos.");
      return;
    }
    setSavingTicket(true);
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { data, error } = await supabase
      .from("tickets")
      .insert({
        machine_id: machineId,
        user_id: userId,
        type: newTicketType,
        description: newTicketDesc,
      } as any)
      .select()
      .single();
    if (error) {
      toast.error("Erro ao criar chamado: " + error.message);
      setSavingTicket(false);
      return;
    }
    toast.success("Chamado criado com sucesso!");
    setTickets(prev => [data as TicketRow, ...prev]);
    setNewTicketType("");
    setNewTicketDesc("");
    setShowNewTicketDialog(false);
    setSavingTicket(false);
  };

  const handleCreateMaintenance = async () => {
    if (!machineId || !newMaintType.trim() || !newMaintDate) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }
    setSavingMaint(true);
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { data, error } = await supabase
      .from("maintenances")
      .insert({
        machine_id: machineId,
        user_id: userId,
        type: newMaintType,
        scheduled_date: newMaintDate,
        notes: newMaintNotes || null,
      } as any)
      .select()
      .single();
    if (error) {
      toast.error("Erro ao criar manutenção: " + error.message);
      setSavingMaint(false);
      return;
    }
    toast.success("Manutenção criada com sucesso!");
    setMaintenances(prev => [data as MaintenanceRow, ...prev]);
    setNewMaintType("");
    setNewMaintDate(new Date().toISOString().split("T")[0]);
    setNewMaintNotes("");
    setShowNewMaintenanceDialog(false);
    setSavingMaint(false);
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
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
            onClick={() => setShowPaybackSheet(true)}
          >
            <PiggyBank className="w-3.5 h-3.5" /> Payback
          </Button>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
          <Clock className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground uppercase">Tempo de Uso</p>
            {(() => {
              const installDate = new Date(machine.install_date);
              const now = new Date();
              const diffMs = now.getTime() - installDate.getTime();
              const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
              const years = Math.floor(totalDays / 365);
              const months = Math.floor((totalDays % 365) / 30);
              const label = years > 0
                ? `${years} ano${years > 1 ? "s" : ""}${months > 0 ? ` e ${months} m${months > 1 ? "eses" : "ês"}` : ""}`
                : months > 0
                  ? `${months} m${months > 1 ? "eses" : "ês"}`
                  : `${totalDays} dia${totalDays !== 1 ? "s" : ""}`;
              return <p className="text-sm font-medium text-foreground">{label}</p>;
            })()}
          </div>
        </div>
        <div className="gradient-card rounded-lg border border-border p-4 flex items-center gap-3">
          <Wrench className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground uppercase">Acessórios</p>
            <p className="text-sm font-medium text-foreground">{machine.accessories.length > 0 ? machine.accessories.join(", ") : "Nenhum"}</p>
          </div>
        </div>
        <div className="gradient-card rounded-lg border border-primary/20 p-4 flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-1.5">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">Tempo Est. de Uso</p>
            <p className="text-sm font-bold text-primary">
              {estimatedUsageMinutes > 0
                ? estimatedUsageMinutes >= 60
                  ? `${(estimatedUsageMinutes / 60).toFixed(1)} horas`
                  : `${estimatedUsageMinutes.toFixed(1)} min`
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Ficha Técnica Card */}
      <div
        className="gradient-card rounded-lg border border-border p-5 cursor-pointer hover:border-primary/50 transition-colors"
        onClick={openSpecsDialog}
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

      {/* Treinamento Card */}
      {machine.equipment_id ? (
        <EquipmentTrainingsSection equipmentId={machine.equipment_id} />
      ) : (
      <div
        className="gradient-card rounded-lg border border-border p-5 cursor-pointer hover:border-primary/50 transition-colors"
        onClick={openTrainingDialog}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Treinamento</h3>
            <p className="text-xs text-muted-foreground">Clique para ver materiais de treinamento ({trainings.length})</p>
          </div>
        </div>
      </div>
      )}

      {/* Tickets & Maintenances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(() => {
          const activeTickets = tickets.filter(t => t.status !== "resolvido");
          return (
            <div className="gradient-card rounded-lg border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Chamados ({activeTickets.length})</h3>
                </div>
                <Button size="sm" className="gap-1.5" onClick={() => setShowNewTicketDialog(true)}>
                  <Plus className="w-3.5 h-3.5" /> Novo
                </Button>
              </div>
              <div className="space-y-3">
                {activeTickets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum chamado em aberto.</p>
                ) : (
                  activeTickets.map(t => (
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
          );
        })()}

        {(() => {
          const activeMaintenances = maintenances.filter(m => m.status !== "realizada");
          return (
            <div className="gradient-card rounded-lg border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Manutenções ({activeMaintenances.length})</h3>
                </div>
                {isAdmin && (
                  <Button size="sm" className="gap-1.5" onClick={() => setShowNewMaintenanceDialog(true)}>
                    <Plus className="w-3.5 h-3.5" /> Nova
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {activeMaintenances.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma manutenção em andamento.</p>
                ) : (
                  activeMaintenances.map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-md bg-accent/50 hover:bg-accent/80 transition-colors">
                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => openReportDialog(m)}>
                        <p className="text-sm font-medium text-foreground">{m.type}</p>
                        {m.notes && <p className="text-xs text-muted-foreground truncate">{m.notes}</p>}
                        <p className="text-xs text-muted-foreground">{new Date(m.scheduled_date).toLocaleDateString("pt-BR")}</p>
                        <p className="text-xs text-primary mt-1">📋 Clique para ver relatórios</p>
                      </div>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        <StatusBadge status={m.status} />
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={e => e.stopPropagation()}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-border">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-foreground">Excluir Manutenção</AlertDialogTitle>
                                <AlertDialogDescription>Tem certeza que deseja excluir esta manutenção e todos os seus relatórios?</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteMaintenance(m.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Histórico de Manutenção Card */}
      {(() => {
        const resolvedTickets = tickets.filter(t => t.status === "resolvido");
        const executedReportsCount = allExecutedReports.length;
        const totalHistory = resolvedTickets.length + executedReportsCount;

        return (
          <div
            className="gradient-card rounded-lg border border-border p-5 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setShowHistoryDialog(true)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <History className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">Histórico de Manutenção</h3>
                <p className="text-xs text-muted-foreground">
                  {totalHistory} registro{totalHistory !== 1 ? "s" : ""} finalizado{totalHistory !== 1 ? "s" : ""} — Clique para ver detalhes
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{resolvedTickets.length}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Chamados</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{executedReportsCount}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Relatórios</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      <div className="gradient-card rounded-lg border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Arquivos ({files.length})</h3>
          </div>
          {isAdmin && (
            <div>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
              <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
                <Upload className="w-3.5 h-3.5" />
                {uploading ? "Enviando..." : "Enviar Arquivo"}
              </Button>
            </div>
          )}
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
              <Select value={editModel} onValueChange={setEditModel}>
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
                    <div key={r.id} className={`p-3 rounded-lg border space-y-2 ${r.status === "executado" ? "border-primary/30 bg-primary/5 opacity-70" : "border-border bg-accent/30"}`}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs text-muted-foreground">{new Date(r.report_date).toLocaleDateString("pt-BR")}</span>
                        <div className="flex items-center gap-2">
                          {isAdmin ? (
                            <Select value={r.status} onValueChange={(val) => handleChangeReportStatus(r, val)}>
                              <SelectTrigger className="h-7 text-xs bg-accent border-border w-auto min-w-[180px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pendente">Pendente</SelectItem>
                                <SelectItem value="aguardando_aprovacao">Aguardando Aprovação</SelectItem>
                                <SelectItem value="aguardando_agendamento">Aguardando Agendamento</SelectItem>
                                <SelectItem value="executado">Executado</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <StatusBadge status={r.status} />
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
                          <p className={`text-sm whitespace-pre-wrap rounded p-1 -m-1 transition-colors ${r.status === "executado" ? "text-muted-foreground" : "text-foreground cursor-pointer hover:bg-accent/50"}`} onClick={() => {
                            if (r.status !== "executado") {
                              setEditingReport(r);
                              setEditReportText(r.report);
                              setEditReportDate(r.report_date);
                            }
                          }}>
                            {r.status === "executado" && <span className="text-xs text-primary font-medium">✓ No histórico — </span>}
                            {r.report}
                          </p>
                          {r.status !== "executado" && (
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
                          )}
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

      {/* Specs Dialog */}
      <Dialog open={showSpecsDialog} onOpenChange={setShowSpecsDialog}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Ficha Técnica do Fabricante</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Add new spec (admin only) */}
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

            {/* Specs list */}
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

      {/* Training Dialog */}
      {!machine?.equipment_id && (
        <Dialog open={showTrainingDialog} onOpenChange={setShowTrainingDialog}>
          <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">Treinamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Add training (admin only) */}
              {isAdmin && (
                <div className="space-y-3 p-4 rounded-lg border border-border bg-accent/30">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Adicionar Treinamento
                  </h4>
                  <div className="space-y-2">
                    <Label className="text-foreground text-xs">Título</Label>
                    <Input value={newTrainingTitle} onChange={e => setNewTrainingTitle(e.target.value)} placeholder="Ex: Operação Básica, Manutenção Preventiva..." className="bg-accent border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground text-xs">Descrição</Label>
                    <Textarea value={newTrainingDesc} onChange={e => setNewTrainingDesc(e.target.value)} placeholder="Descreva o conteúdo do treinamento..." className="bg-accent border-border min-h-[80px]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground text-xs flex items-center gap-1"><Video className="w-3.5 h-3.5" /> URL do Vídeo (YouTube, Vimeo, etc.)</Label>
                    <Input value={newTrainingVideo} onChange={e => setNewTrainingVideo(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="bg-accent border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground text-xs flex items-center gap-1"><Upload className="w-3.5 h-3.5" /> Arquivo (PDF, documento, etc.)</Label>
                    <input ref={trainingFileRef} type="file" className="text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-accent file:text-foreground hover:file:bg-accent/80" onChange={e => setNewTrainingFile(e.target.files?.[0] ?? null)} />
                  </div>
                  <Button size="sm" className="gap-1.5" onClick={handleAddTraining} disabled={uploadingTraining}>
                    <Plus className="w-3.5 h-3.5" /> {uploadingTraining ? "Enviando..." : "Adicionar"}
                  </Button>
                </div>
              )}

              {/* Training list */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Materiais ({trainings.length})</h4>
                {trainings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum treinamento cadastrado.</p>
                ) : (
                  trainings.map(t => (
                    <div key={t.id} className="p-4 rounded-lg border border-border bg-accent/30 space-y-3">
                      {editingTraining?.id === t.id ? (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label className="text-foreground text-xs">Título</Label>
                            <Input value={editTrainingTitle} onChange={e => setEditTrainingTitle(e.target.value)} className="bg-accent border-border" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-foreground text-xs">Descrição</Label>
                            <Textarea value={editTrainingDesc} onChange={e => setEditTrainingDesc(e.target.value)} className="bg-accent border-border min-h-[80px]" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-foreground text-xs flex items-center gap-1"><Video className="w-3.5 h-3.5" /> URL do Vídeo</Label>
                            <Input value={editTrainingVideo} onChange={e => setEditTrainingVideo(e.target.value)} className="bg-accent border-border" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-foreground text-xs flex items-center gap-1"><Upload className="w-3.5 h-3.5" /> Substituir Arquivo</Label>
                            <input ref={editTrainingFileRef} type="file" className="text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-accent file:text-foreground hover:file:bg-accent/80" onChange={e => setEditTrainingFile(e.target.files?.[0] ?? null)} />
                            {t.file_name && !editTrainingFile && (
                              <p className="text-xs text-muted-foreground">Arquivo atual: {t.file_name}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleEditTraining} disabled={savingTrainingEdit}>
                              {savingTrainingEdit ? "Salvando..." : "Salvar"}
                            </Button>
                            <Button size="sm" variant="outline" className="border-border" onClick={() => { setEditingTraining(null); setEditTrainingFile(null); }}>Cancelar</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground">{t.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{new Date(t.created_at).toLocaleDateString("pt-BR")}</p>
                            </div>
                            {isAdmin && (
                              <div className="flex items-center gap-1 shrink-0">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => {
                                  setEditingTraining(t);
                                  setEditTrainingTitle(t.title);
                                  setEditTrainingDesc(t.description);
                                  setEditTrainingVideo(t.video_url ?? "");
                                  setEditTrainingFile(null);
                                }}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-card border-border">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="text-foreground">Excluir Treinamento</AlertDialogTitle>
                                      <AlertDialogDescription>Tem certeza que deseja excluir este treinamento?</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteTraining(t)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            )}
                          </div>
                          {t.description && (
                            <p className="text-sm text-foreground whitespace-pre-wrap">{t.description}</p>
                          )}
                          {t.video_url && (
                            <a href={t.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                              <Video className="w-3.5 h-3.5" /> Assistir Vídeo
                            </a>
                          )}
                          {t.file_path && t.file_name && (
                            <a href={getFileUrl(t.file_path)} download={t.file_name} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                              <Download className="w-3.5 h-3.5" /> {t.file_name}
                            </a>
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
      )}

      {/* New Ticket Dialog */}
      <Dialog open={showNewTicketDialog} onOpenChange={setShowNewTicketDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Novo Chamado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-foreground">Tipo *</Label>
              <Select value={newTicketType} onValueChange={setNewTicketType}>
                <SelectTrigger className="bg-accent border-border"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Erro de operação">Erro de operação</SelectItem>
                  <SelectItem value="Defeito mecânico">Defeito mecânico</SelectItem>
                  <SelectItem value="Defeito elétrico">Defeito elétrico</SelectItem>
                  <SelectItem value="Software/CNC">Software/CNC</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Descrição *</Label>
              <Textarea value={newTicketDesc} onChange={e => setNewTicketDesc(e.target.value)} placeholder="Descreva o problema..." className="bg-accent border-border" rows={4} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-border">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleCreateTicket} disabled={savingTicket}>
              {savingTicket ? "Salvando..." : "Criar Chamado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Maintenance Dialog */}
      <Dialog open={showNewMaintenanceDialog} onOpenChange={setShowNewMaintenanceDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Nova Manutenção</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-foreground">Tipo *</Label>
              <Select value={newMaintType} onValueChange={setNewMaintType}>
                <SelectTrigger className="bg-accent border-border"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Preventiva">Preventiva</SelectItem>
                  <SelectItem value="Corretiva">Corretiva</SelectItem>
                  <SelectItem value="Preditiva">Preditiva</SelectItem>
                  <SelectItem value="Calibração">Calibração</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Data Agendada *</Label>
              <Input type="date" value={newMaintDate} onChange={e => setNewMaintDate(e.target.value)} className="bg-accent border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Observações</Label>
              <Textarea value={newMaintNotes} onChange={e => setNewMaintNotes(e.target.value)} placeholder="Observações opcionais..." className="bg-accent border-border" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-border">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleCreateMaintenance} disabled={savingMaint}>
              {savingMaint ? "Salvando..." : "Criar Manutenção"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Histórico de Manutenção</DialogTitle>
          </DialogHeader>
          {(() => {
            const resolvedTickets = tickets.filter(t => t.status === "resolvido");
            const allItems = [
              ...resolvedTickets.map(t => ({
                id: t.id,
                type: "chamado" as const,
                label: t.type,
                description: t.description,
                date: t.created_at,
              })),
              ...allExecutedReports.map(r => ({
                id: r.id,
                type: "relatorio" as const,
                label: r.maintenance_type ?? "Manutenção",
                description: r.report,
                date: r.report_date,
              })),
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            const historyItems = allItems.filter(item => {
              const itemDate = new Date(item.date).getTime();
              if (historyStartDate) {
                const start = new Date(historyStartDate).getTime();
                if (itemDate < start) return false;
              }
              if (historyEndDate) {
                const end = new Date(historyEndDate);
                end.setHours(23, 59, 59, 999);
                if (itemDate > end.getTime()) return false;
              }
              return true;
            });

            return (
              <div className="space-y-4 py-2">
                {/* Date Filters */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Data Início</Label>
                    <Input type="date" value={historyStartDate} onChange={e => setHistoryStartDate(e.target.value)} className="bg-accent border-border h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Data Fim</Label>
                    <Input type="date" value={historyEndDate} onChange={e => setHistoryEndDate(e.target.value)} className="bg-accent border-border h-9 text-sm" />
                  </div>
                </div>
                {(historyStartDate || historyEndDate) && (
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={() => { setHistoryStartDate(""); setHistoryEndDate(""); }}>
                    Limpar filtros
                  </Button>
                )}

                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg border border-border bg-accent/30 text-center">
                    <p className="text-xl font-bold text-foreground">{historyItems.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-accent/30 text-center">
                    <p className="text-xl font-bold text-foreground">{historyItems.filter(i => i.type === "chamado").length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Chamados</p>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-accent/30 text-center">
                    <p className="text-xl font-bold text-foreground">{historyItems.filter(i => i.type === "relatorio").length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Relatórios</p>
                  </div>
                </div>

                {/* List */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Registros ({historyItems.length})</h4>
                  {historyItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum registro encontrado{(historyStartDate || historyEndDate) ? " no período selecionado" : ""}.</p>
                  ) : (
                    historyItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-accent/30">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${item.type === "chamado" ? "bg-primary/10 text-primary" : "bg-accent text-muted-foreground"}`}>
                              {item.type === "chamado" ? "Chamado" : "Relatório"}
                            </span>
                            <p className="text-sm font-medium text-foreground">{item.label}</p>
                          </div>
                          {item.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
                          <p className="text-xs text-muted-foreground mt-0.5">{new Date(item.date).toLocaleDateString("pt-BR")}</p>
                        </div>
                        <CheckCircle className="w-4 h-4 text-primary ml-3 shrink-0" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-border">Fechar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payback Sheet */}
      <Sheet open={showPaybackSheet} onOpenChange={setShowPaybackSheet}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <PiggyBank className="w-5 h-5" /> Payback — {machine.name || machine.model}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <MachinePaybackPanel machineId={machine.id} machineName={machine.name || machine.model} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MachineDashboard;
