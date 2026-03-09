import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Save, FileDown, Upload, X, Camera, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { generateTechnicalReportPdf } from "@/lib/technical-report-pdf";

const DEFAULT_CHECKLIST = [
  { label: "Máquina testada", checked: false },
  { label: "Spindle testado", checked: false },
  { label: "Inversor testado", checked: false },
  { label: "Sensores verificados", checked: false },
  { label: "Lubrificação verificada", checked: false },
  { label: "Alinhamento conferido", checked: false },
  { label: "Elétrica revisada", checked: false },
  { label: "Software/configuração revisada", checked: false },
];

interface Props {
  reportId: string | null;
  onClose: () => void;
}

export function TechnicalReportForm({ reportId, onClose }: Props) {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    attendance_date: format(new Date(), "yyyy-MM-dd"),
    time_start: "",
    time_end: "",
    technician_name: user?.name || "",
    client_name: "",
    client_company: "",
    client_city: "",
    equipment_name: "",
    machine_model: "",
    serial_number: "",
    related_ticket: "",
    problem_reported: "",
    technical_diagnosis: "",
    service_performed: "",
    parts_replaced: "",
    tests_performed: "",
    recommendations: "",
    final_observations: "",
    checklist: DEFAULT_CHECKLIST,
    technician_signature: "",
    client_signature: "",
    status: "rascunho",
  });

  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [newCheckItem, setNewCheckItem] = useState("");

  // Load existing report
  const { data: existingReport } = useQuery({
    queryKey: ["technical-report", reportId],
    queryFn: async () => {
      if (!reportId) return null;
      const { data, error } = await supabase.from("technical_reports").select("*").eq("id", reportId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!reportId,
  });

  // Load files
  const { data: existingFiles = [] } = useQuery({
    queryKey: ["technical-report-files", reportId],
    queryFn: async () => {
      if (!reportId) return [];
      const { data, error } = await supabase
        .from("technical_report_files")
        .select("*")
        .eq("report_id", reportId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!reportId,
  });

  useEffect(() => {
    if (existingReport) {
      setForm({
        attendance_date: existingReport.attendance_date || format(new Date(), "yyyy-MM-dd"),
        time_start: existingReport.time_start || "",
        time_end: existingReport.time_end || "",
        technician_name: existingReport.technician_name || "",
        client_name: existingReport.client_name || "",
        client_company: existingReport.client_company || "",
        client_city: existingReport.client_city || "",
        equipment_name: existingReport.equipment_name || "",
        machine_model: existingReport.machine_model || "",
        serial_number: existingReport.serial_number || "",
        related_ticket: existingReport.related_ticket || "",
        problem_reported: existingReport.problem_reported || "",
        technical_diagnosis: existingReport.technical_diagnosis || "",
        service_performed: existingReport.service_performed || "",
        parts_replaced: existingReport.parts_replaced || "",
        tests_performed: existingReport.tests_performed || "",
        recommendations: existingReport.recommendations || "",
        final_observations: existingReport.final_observations || "",
        checklist: Array.isArray(existingReport.checklist) ? existingReport.checklist as any[] : DEFAULT_CHECKLIST,
        technician_signature: existingReport.technician_signature || "",
        client_signature: existingReport.client_signature || "",
        status: existingReport.status || "rascunho",
      });
    }
  }, [existingReport]);

  useEffect(() => {
    if (existingFiles.length > 0) setFiles(existingFiles);
  }, [existingFiles]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const payload = {
        ...data,
        checklist: data.checklist as any,
        created_by: session?.user?.id,
      };

      if (reportId) {
        const { created_by, ...updatePayload } = payload;
        const { error } = await supabase.from("technical_reports").update(updatePayload).eq("id", reportId);
        if (error) throw error;
        return reportId;
      } else {
        const { data: inserted, error } = await supabase.from("technical_reports").insert(payload).select("id").single();
        if (error) throw error;
        return inserted.id;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technical-reports"] });
      toast.success("Relatório salvo com sucesso!");
      onClose();
    },
    onError: (err: any) => toast.error("Erro ao salvar: " + err.message),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || !reportId) {
      toast.error("Salve o relatório antes de enviar arquivos");
      return;
    }

    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} excede 10MB`);
          continue;
        }
        const ext = file.name.split(".").pop();
        const path = `${reportId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage.from("technical-report-files").upload(path, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from("technical-report-files").getPublicUrl(path);

        const fileType = file.type.startsWith("image/") ? "photo" : "document";
        await supabase.from("technical_report_files").insert({
          report_id: reportId,
          file_name: file.name,
          file_path: publicUrl,
          file_size: file.size,
          mime_type: file.type,
          file_type: fileType,
          sort_order: files.length,
          uploaded_by: session?.user?.id!,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["technical-report-files", reportId] });
      toast.success("Arquivos enviados!");
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deleteFile = async (fileId: string) => {
    await supabase.from("technical_report_files").delete().eq("id", fileId);
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    queryClient.invalidateQueries({ queryKey: ["technical-report-files", reportId] });
  };

  const updateField = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleChecklist = (index: number) => {
    setForm((prev) => {
      const updated = [...prev.checklist];
      updated[index] = { ...updated[index], checked: !updated[index].checked };
      return { ...prev, checklist: updated };
    });
  };

  const addCheckItem = () => {
    if (!newCheckItem.trim()) return;
    setForm((prev) => ({
      ...prev,
      checklist: [...prev.checklist, { label: newCheckItem.trim(), checked: false }],
    }));
    setNewCheckItem("");
  };

  const removeCheckItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      checklist: prev.checklist.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <h2 className="text-lg font-semibold">{reportId ? "Editar Relatório" : "Novo Relatório Técnico"}</h2>
        <div className="flex-1" />
        <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="finalizado">Finalizado</SelectItem>
            <SelectItem value="enviado">Enviado</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-1" /> Salvar
        </Button>
        {reportId && (
          <Button variant="outline" onClick={() => generateTechnicalReportPdf({ ...existingReport, ...form }, files)}>
            <FileDown className="h-4 w-4 mr-1" /> PDF
          </Button>
        )}
      </div>

      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="space-y-6 pr-4">
          {/* Dados do Atendimento */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dados do Atendimento</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Data do Atendimento</Label>
                <Input type="date" value={form.attendance_date} onChange={(e) => updateField("attendance_date", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Horário Inicial</Label>
                <Input type="time" value={form.time_start} onChange={(e) => updateField("time_start", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Horário Final</Label>
                <Input type="time" value={form.time_end} onChange={(e) => updateField("time_end", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Técnico Responsável</Label>
                <Input value={form.technician_name} onChange={(e) => updateField("technician_name", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Dados do Cliente */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dados do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Cliente</Label>
                <Input value={form.client_name} onChange={(e) => updateField("client_name", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Empresa</Label>
                <Input value={form.client_company} onChange={(e) => updateField("client_company", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Cidade / Local</Label>
                <Input value={form.client_city} onChange={(e) => updateField("client_city", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Dados do Equipamento */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dados do Equipamento</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Equipamento</Label>
                <Input value={form.equipment_name} onChange={(e) => updateField("equipment_name", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Modelo da Máquina</Label>
                <Input value={form.machine_model} onChange={(e) => updateField("machine_model", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Nº de Série</Label>
                <Input value={form.serial_number} onChange={(e) => updateField("serial_number", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Chamado Relacionado</Label>
                <Input value={form.related_ticket} onChange={(e) => updateField("related_ticket", e.target.value)} placeholder="Opcional" />
              </div>
            </CardContent>
          </Card>

          {/* Descrição do Atendimento */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Descrição do Atendimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: "problem_reported", label: "Problema Relatado pelo Cliente" },
                { key: "technical_diagnosis", label: "Diagnóstico Técnico" },
                { key: "service_performed", label: "Serviço Executado" },
                { key: "parts_replaced", label: "Peças Substituídas" },
                { key: "tests_performed", label: "Testes Realizados" },
                { key: "recommendations", label: "Recomendações ao Cliente" },
                { key: "final_observations", label: "Observações Finais" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <Label className="text-xs">{label}</Label>
                  <Textarea
                    value={(form as any)[key]}
                    onChange={(e) => updateField(key, e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Checklist */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Checklist Técnico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {form.checklist.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Checkbox
                    checked={item.checked}
                    onCheckedChange={() => toggleChecklist(i)}
                  />
                  <span className="text-sm flex-1">{item.label}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeCheckItem(i)}>
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Novo item do checklist..."
                  value={newCheckItem}
                  onChange={(e) => setNewCheckItem(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCheckItem()}
                  className="h-8 text-sm"
                />
                <Button size="sm" variant="outline" onClick={addCheckItem}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Fotos e Arquivos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Fotos e Arquivos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!reportId && (
                <p className="text-xs text-muted-foreground">Salve o relatório primeiro para enviar arquivos.</p>
              )}
              {reportId && (
                <>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                      Enviar Arquivos
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                      onChange={handleUpload}
                      className="hidden"
                    />
                  </div>
                  {files.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {files.map((f: any) => (
                        <div key={f.id} className="relative border rounded-lg overflow-hidden group flex gap-3 p-2">
                          {f.mime_type?.startsWith("image/") ? (
                            <img src={f.file_path} alt={f.file_name} className="h-20 w-20 rounded object-cover shrink-0" />
                          ) : (
                            <div className="h-20 w-20 rounded flex items-center justify-center bg-muted shrink-0">
                              <FileDown className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-[10px] truncate font-medium">{f.file_name}</p>
                            <Input
                              placeholder="Descrição da foto/arquivo..."
                              value={f.description || ""}
                              onChange={(e) => updateFileDescription(f.id, e.target.value)}
                              className="h-7 text-xs"
                            />
                          </div>
                          <button
                            onClick={() => deleteFile(f.id)}
                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Assinaturas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Assinaturas</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Assinatura do Técnico (nome)</Label>
                <Input
                  value={form.technician_signature}
                  onChange={(e) => updateField("technician_signature", e.target.value)}
                  placeholder="Nome completo do técnico"
                />
              </div>
              <div>
                <Label className="text-xs">Assinatura do Cliente (nome)</Label>
                <Input
                  value={form.client_signature}
                  onChange={(e) => updateField("client_signature", e.target.value)}
                  placeholder="Nome completo do cliente"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
