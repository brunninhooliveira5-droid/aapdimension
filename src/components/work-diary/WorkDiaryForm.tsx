import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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
];

interface Props {
  entryId: string | null;
  onSaved: () => void;
  onCancel: () => void;
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
};

export function WorkDiaryForm({ entryId, onSaved, onCancel }: Props) {
  const { effectiveUserId, user } = useEffectiveUser();
  const [form, setForm] = useState({ ...emptyForm });
  const [files, setFiles] = useState<any[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (entryId) loadEntry();
    else {
      setForm({ ...emptyForm, responsible: user?.name || "" });
      setFiles([]);
    }
  }, [entryId]);

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
      });
    }
    const { data: existingFiles } = await supabase.from("work_diary_files").select("*").eq("entry_id", entryId);
    setFiles(existingFiles || []);
  };

  const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setNewFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
  };

  const removeNewFile = (idx: number) => setNewFiles((prev) => prev.filter((_, i) => i !== idx));

  const removeExistingFile = async (file: any) => {
    await supabase.from("work_diary_files").delete().eq("id", file.id);
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
    toast.success("Arquivo removido");
  };

  const uploadFiles = async (entryId: string) => {
    if (!effectiveUserId || newFiles.length === 0) return;
    setUploading(true);
    for (const file of newFiles) {
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
      if (entryId) {
        const { error } = await supabase.from("work_diary_entries").update(form).eq("id", entryId);
        if (error) throw error;
        await uploadFiles(entryId);
        toast.success("Registro atualizado!");
      } else {
        const { data, error } = await supabase.from("work_diary_entries").insert({ ...form, user_id: effectiveUserId }).select("id").single();
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Descrição</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Descrição da atividade executada</Label><Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={4} /></div>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Fotos e Arquivos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {files.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {files.map((f) => (
                <div key={f.id} className="relative border border-border rounded-lg overflow-hidden group">
                  {f.mime_type?.startsWith("image/") ? (
                    <img src={f.file_url} alt={f.file_name} className="w-full h-24 object-cover" />
                  ) : (
                    <div className="h-24 flex items-center justify-center bg-muted text-xs text-muted-foreground p-2 text-center">{f.file_name}</div>
                  )}
                  <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeExistingFile(f)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {newFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {newFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-1 bg-muted rounded px-2 py-1 text-xs">
                  {f.name}
                  <button onClick={() => removeNewFile(i)} className="text-destructive ml-1"><X className="h-3 w-3" /></button>
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
