import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Trash2, Save, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { applyPhoneMask } from "@/lib/phone-mask";

const activityTypes = [
  { value: "obra", label: "Obra" },
  { value: "servico", label: "Serviço" },
  { value: "atividade_interna", label: "Atividade Interna" },
  { value: "inspecao", label: "Inspeção" },
  { value: "visita_tecnica", label: "Visita Técnica" },
  { value: "outro", label: "Outro" },
];

const statusOptions = [
  { value: "concluido", label: "Concluído" },
  { value: "parcialmente_concluido", label: "Parcialmente Concluído" },
  { value: "nao_concluido", label: "Não Concluído" },
  { value: "impedimento", label: "Impedimento" },
];

interface Props {
  entryId: string | null;
  onSaved: () => void;
  onCancel: () => void;
}

interface ContractedService {
  name: string;
}

interface RequiredMaterial {
  name: string;
  quantity: string;
  has: string;
  missing: string;
}

interface FileWithCaption {
  file: File;
  caption: string;
}

interface DiaryClient {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
}

const emptyForm = {
  entry_date: format(new Date(), "yyyy-MM-dd"),
  time_start: "",
  time_end: "",
  title: "",
  activity_type: "servico",
  location: "",
  responsible: "",
  description: "",
  materials_used: "",
  team: "",
  status: "concluido",
  pending_reason: "",
  observations: "",
  contracted_service: "",
  unit_value: "",
  execution_process: "",
  materials_to_use: "",
  impediment_reason: "",
  execution_deadline: "",
  client_id: "",
  client_name: "",
  client_phone: "",
  client_company: "",
};

export function WorkDiaryForm({ entryId, onSaved, onCancel }: Props) {
  const { effectiveUserId, user } = useEffectiveUser();
  const [form, setForm] = useState({ ...emptyForm });
  const [files, setFiles] = useState<any[]>([]);
  const [newFiles, setNewFiles] = useState<FileWithCaption[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [contractedServices, setContractedServices] = useState<ContractedService[]>([]);
  const [requiredMaterials, setRequiredMaterials] = useState<RequiredMaterial[]>([]);
  const [clients, setClients] = useState<DiaryClient[]>([]);

  useEffect(() => {
    if (effectiveUserId) loadClients();
  }, [effectiveUserId]);

  useEffect(() => {
    if (entryId) loadEntry();
    else {
      setForm({ ...emptyForm, responsible: user?.name || "" });
      setFiles([]);
      setContractedServices([]);
      setRequiredMaterials([]);
    }
  }, [entryId]);

  const loadClients = async () => {
    if (!effectiveUserId) return;
    const { data } = await supabase
      .from("work_diary_clients")
      .select("*")
      .eq("user_id", effectiveUserId)
      .order("name");
    setClients((data as any[]) || []);
  };

  const loadEntry = async () => {
    if (!entryId) return;
    const { data } = await supabase.from("work_diary_entries").select("*").eq("id", entryId).single();
    if (data) {
      setForm({
        entry_date: data.entry_date || emptyForm.entry_date,
        time_start: data.time_start || "",
        time_end: data.time_end || "",
        title: data.title || "",
        activity_type: data.activity_type || "servico",
        location: data.location || "",
        responsible: data.responsible || "",
        description: data.description || "",
        materials_used: data.materials_used || "",
        team: data.team || "",
        status: data.status || "concluido",
        pending_reason: data.pending_reason || "",
        observations: data.observations || "",
        contracted_service: (data as any).contracted_service || "",
        unit_value: (data as any).unit_value || "",
        execution_process: (data as any).execution_process || "",
        materials_to_use: (data as any).materials_to_use || "",
        impediment_reason: (data as any).impediment_reason || "",
        execution_deadline: (data as any).execution_deadline || "",
        client_id: (data as any).client_id || "",
        client_name: (data as any).client_name || "",
        client_phone: (data as any).client_phone || "",
        client_company: (data as any).client_company || "",
      });
      try {
        const cs = (data as any).contracted_services;
        setContractedServices(Array.isArray(cs) ? cs : []);
      } catch { setContractedServices([]); }
      try {
        const rm = (data as any).required_materials;
        setRequiredMaterials(Array.isArray(rm) ? rm : []);
      } catch { setRequiredMaterials([]); }
    }
    const { data: existingFiles } = await supabase.from("work_diary_files").select("*").eq("entry_id", entryId);
    setFiles(existingFiles || []);
  };

  const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleClientSelect = (clientId: string) => {
    if (clientId === "none") {
      setForm((p) => ({ ...p, client_id: "", client_name: "", client_phone: "", client_company: "" }));
      return;
    }
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setForm((p) => ({
        ...p,
        client_id: client.id,
        client_name: client.name,
        client_phone: client.phone,
        client_company: client.company,
        location: p.location || `${client.address}${client.city ? `, ${client.city}` : ""}${client.state ? ` - ${client.state}` : ""}`.trim().replace(/^,\s*/, ""),
      }));
    }
  };

  // Contracted services helpers
  const addService = () => setContractedServices((prev) => [...prev, { name: "" }]);
  const updateService = (idx: number, name: string) =>
    setContractedServices((prev) => prev.map((s, i) => (i === idx ? { name } : s)));
  const removeService = (idx: number) =>
    setContractedServices((prev) => prev.filter((_, i) => i !== idx));

  // Required materials helpers
  const addMaterial = () => setRequiredMaterials((prev) => [...prev, { name: "", quantity: "", has: "", missing: "" }]);
  const updateMaterial = (idx: number, field: keyof RequiredMaterial, val: string) =>
    setRequiredMaterials((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: val } : m)));
  const removeMaterial = (idx: number) =>
    setRequiredMaterials((prev) => prev.filter((_, i) => i !== idx));

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const added = Array.from(e.target.files).map((file) => ({ file, caption: "" }));
      setNewFiles((prev) => [...prev, ...added]);
    }
  };

  const removeNewFile = (idx: number) => setNewFiles((prev) => prev.filter((_, i) => i !== idx));

  const updateNewFileCaption = (idx: number, caption: string) => {
    setNewFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, caption } : f)));
  };

  const updateExistingCaption = async (file: any, caption: string) => {
    await supabase.from("work_diary_files").update({ caption }).eq("id", file.id);
    setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, caption } : f)));
  };

  const removeExistingFile = async (file: any) => {
    await supabase.from("work_diary_files").delete().eq("id", file.id);
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
    toast.success("Arquivo removido");
  };

  const uploadFiles = async (entryId: string) => {
    if (!effectiveUserId || newFiles.length === 0) return;
    setUploading(true);
    for (const { file, caption } of newFiles) {
      const path = `${effectiveUserId}/${entryId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("work-diary-files").upload(path, file, { upsert: true });
      if (upErr) { toast.error(`Erro upload: ${file.name}`); continue; }
      const { data: { publicUrl } } = supabase.storage.from("work-diary-files").getPublicUrl(path);
      await supabase.from("work_diary_files").insert({
        entry_id: entryId,
        user_id: effectiveUserId,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        caption: caption || null,
      });
    }
    setNewFiles([]);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!effectiveUserId) return;
    if (!form.title.trim()) { toast.error("Título é obrigatório"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        contracted_services: contractedServices.filter((s) => s.name.trim()),
        required_materials: requiredMaterials.filter((m) => m.name.trim()),
      };

      if (entryId) {
        const { error } = await supabase.from("work_diary_entries").update(payload as any).eq("id", entryId);
        if (error) throw error;
        await uploadFiles(entryId);
        toast.success("Registro atualizado!");
      } else {
        const { data, error } = await supabase.from("work_diary_entries").insert({ ...payload, user_id: effectiveUserId } as any).select("id").single();
        if (error) throw error;
        await uploadFiles(data.id);
        toast.success("Registro criado!");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const showPending = form.status === "nao_concluido" || form.status === "parcialmente_concluido";
  const showImpediment = form.status === "impedimento";

  return (
    <div className="space-y-4 max-w-4xl">
      <Card>
        <CardHeader><CardTitle className="text-base">Dados Gerais</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label>Data</Label>
            <Input type="date" value={form.entry_date} onChange={(e) => update("entry_date", e.target.value)} />
          </div>
          <div>
            <Label>Horário Inicial</Label>
            <Input type="time" value={form.time_start} onChange={(e) => update("time_start", e.target.value)} />
          </div>
          <div>
            <Label>Horário Final</Label>
            <Input type="time" value={form.time_end} onChange={(e) => update("time_end", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Título da Atividade *</Label>
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Ex: Instalação de quadro elétrico" />
          </div>
          <div>
            <Label>Tipo de Atividade</Label>
            <Select value={form.activity_type} onValueChange={(v) => update("activity_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{activityTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Local</Label>
            <Input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="Local da atividade" />
          </div>
          <div>
            <Label>Responsável</Label>
            <Input value={form.responsible} onChange={(e) => update("responsible", e.target.value)} placeholder="Nome do responsável" />
          </div>
          <div>
            <Label>Prazo de Execução</Label>
            <Input type="date" value={form.execution_deadline} onChange={(e) => update("execution_deadline", e.target.value)} />
          </div>
          <div>
            <Label>Unitário</Label>
            <Input value={form.unit_value} onChange={(e) => update("unit_value", e.target.value)} placeholder="Valor unitário ou unidade" />
          </div>
        </CardContent>
      </Card>

      {/* Serviços Contratados */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Serviços Contratados</CardTitle>
          <Button variant="outline" size="sm" onClick={addService}><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Serviço</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {contractedServices.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum serviço adicionado. Clique em "Adicionar Serviço" para começar.</p>
          )}
          {contractedServices.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={s.name}
                onChange={(e) => updateService(i, e.target.value)}
                placeholder={`Nome do serviço ${i + 1}`}
                className="flex-1"
              />
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeService(i)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Materiais Necessários */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Materiais Necessários</CardTitle>
          <Button variant="outline" size="sm" onClick={addMaterial}><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Material</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {requiredMaterials.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum material adicionado. Clique em "Adicionar Material" para começar.</p>
          )}
          {requiredMaterials.length > 0 && (
            <div className="grid grid-cols-[1fr_80px_80px_80px_32px] gap-2 text-xs font-medium text-muted-foreground mb-1">
              <span>Material</span>
              <span>Qtd</span>
              <span>Tem</span>
              <span>Falta</span>
              <span />
            </div>
          )}
          {requiredMaterials.map((m, i) => (
            <div key={i} className="grid grid-cols-[1fr_80px_80px_80px_32px] gap-2 items-center">
              <Input value={m.name} onChange={(e) => updateMaterial(i, "name", e.target.value)} placeholder="Nome do material" className="h-8 text-sm" />
              <Input value={m.quantity} onChange={(e) => updateMaterial(i, "quantity", e.target.value)} placeholder="Qtd" className="h-8 text-sm" />
              <Input value={m.has} onChange={(e) => updateMaterial(i, "has", e.target.value)} placeholder="Tem" className="h-8 text-sm" />
              <Input value={m.missing} onChange={(e) => updateMaterial(i, "missing", e.target.value)} placeholder="Falta" className="h-8 text-sm" />
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeMaterial(i)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Descrição</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Descrição da atividade executada</Label><Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={4} /></div>
          <div><Label>Processo de Execução</Label><Textarea value={form.execution_process} onChange={(e) => update("execution_process", e.target.value)} rows={3} placeholder="Descreva o processo de execução..." /></div>
          <div><Label>Materiais utilizados</Label><Textarea value={form.materials_used} onChange={(e) => update("materials_used", e.target.value)} rows={2} /></div>
          <div><Label>Equipe envolvida</Label><Input value={form.team} onChange={(e) => update("team", e.target.value)} placeholder="Nomes da equipe" /></div>
          <div><Label>Observações gerais</Label><Textarea value={form.observations} onChange={(e) => update("observations", e.target.value)} rows={2} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Status</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Status da atividade</Label>
            <Select value={form.status} onValueChange={(v) => update("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{statusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {showPending && (
            <div>
              <Label>Motivo / Pendência</Label>
              <Textarea value={form.pending_reason} onChange={(e) => update("pending_reason", e.target.value)} rows={2} placeholder="Descreva o motivo ou pendência..." />
            </div>
          )}
          {showImpediment && (
            <div>
              <Label>Motivo do Impedimento</Label>
              <Textarea value={form.impediment_reason} onChange={(e) => update("impediment_reason", e.target.value)} rows={2} placeholder="Descreva o motivo do impedimento..." />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Fotos e Arquivos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {files.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {files.map((f) => (
                <div key={f.id} className="relative border border-border rounded-lg overflow-hidden group">
                  {f.mime_type?.startsWith("image/") ? (
                    <img src={f.file_url} alt={f.file_name} className="w-full h-28 object-cover" />
                  ) : (
                    <div className="h-28 flex items-center justify-center bg-muted text-xs text-muted-foreground p-2 text-center">{f.file_name}</div>
                  )}
                  <div className="p-1.5">
                    <Input value={f.caption || ""} onChange={(e) => updateExistingCaption(f, e.target.value)} placeholder="Descrição da imagem..." className="h-7 text-xs" />
                  </div>
                  <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeExistingFile(f)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {newFiles.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {newFiles.map((f, i) => (
                <div key={i} className="relative border border-border rounded-lg overflow-hidden">
                  {f.file.type.startsWith("image/") ? (
                    <img src={URL.createObjectURL(f.file)} alt={f.file.name} className="w-full h-28 object-cover" />
                  ) : (
                    <div className="h-28 flex items-center justify-center bg-muted text-xs text-muted-foreground p-2 text-center">{f.file.name}</div>
                  )}
                  <div className="p-1.5">
                    <Input value={f.caption} onChange={(e) => updateNewFileCaption(i, e.target.value)} placeholder="Descrição da imagem..." className="h-7 text-xs" />
                  </div>
                  <button onClick={() => removeNewFile(i)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div>
            <Input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={handleFileSelect} className="hidden" id="diary-file-input" />
            <Button variant="outline" size="sm" onClick={() => document.getElementById("diary-file-input")?.click()}>
              <Upload className="h-4 w-4 mr-1" /> Adicionar Arquivos
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving || uploading}>
          <Save className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : entryId ? "Atualizar" : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
