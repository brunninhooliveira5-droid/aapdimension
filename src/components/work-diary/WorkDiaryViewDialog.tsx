import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const typeLabels: Record<string, string> = {
  obra: "Obra", servico: "Serviço", atividade_interna: "Ativ. Interna",
  inspecao: "Inspeção", visita_tecnica: "Visita Técnica", outro: "Outro",
};
const statusLabels: Record<string, string> = {
  concluido: "Concluído", parcialmente_concluido: "Parcial", nao_concluido: "Não Concluído",
  impedimento: "Impedimento",
};

interface Props { entry: any; open: boolean; onClose: () => void; }

export function WorkDiaryViewDialog({ entry, open, onClose }: Props) {
  const [files, setFiles] = useState<any[]>([]);

  useEffect(() => {
    if (entry?.id) {
      supabase.from("work_diary_files").select("*").eq("entry_id", entry.id).then(({ data }) => setFiles(data || []));
    }
  }, [entry?.id]);

  const photos = files.filter(f => f.mime_type?.startsWith("image/"));
  const services: { name: string }[] = Array.isArray(entry.contracted_services) ? entry.contracted_services : [];
  const materials: { name: string; quantity: string; has: string; missing: string }[] = Array.isArray(entry.required_materials) ? entry.required_materials : [];
  const deadlineStr = entry.execution_deadline
    ? format(new Date(entry.execution_deadline), "dd/MM/yyyy")
    : "Prazo não definido";

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Registro #{entry.entry_number} — {entry.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data" value={entry.entry_date ? format(new Date(entry.entry_date), "dd/MM/yyyy") : "-"} />
            <Field label="Horário" value={`${entry.time_start || "--:--"} às ${entry.time_end || "--:--"}`} />
            <Field label="Tipo" value={typeLabels[entry.activity_type] || entry.activity_type} />
            <Field label="Local" value={entry.location} />
            <Field label="Responsável" value={entry.responsible} />
            <Field label="Prazo de Execução" value={deadlineStr} />
            <Field label="Status" value={<Badge variant="outline">{statusLabels[entry.status] || entry.status}</Badge>} />
            {entry.unit_value && <Field label="Unitário" value={entry.unit_value} />}
          </div>

          {services.length > 0 && (
            <div>
              <p className="text-muted-foreground text-xs font-medium mb-1">Serviços Contratados</p>
              <ul className="list-disc list-inside text-sm space-y-0.5">
                {services.map((s, i) => <li key={i}>{s.name}</li>)}
              </ul>
            </div>
          )}

          {materials.length > 0 && (
            <div>
              <p className="text-muted-foreground text-xs font-medium mb-1">Materiais Necessários</p>
              <div className="grid grid-cols-[1fr_60px_60px_60px] gap-1 text-xs">
                <span className="font-medium text-muted-foreground">Material</span>
                <span className="font-medium text-muted-foreground">Qtd</span>
                <span className="font-medium text-muted-foreground">Tem</span>
                <span className="font-medium text-muted-foreground">Falta</span>
                {materials.map((m, i) => (
                  <> 
                    <span key={`n${i}`}>{m.name}</span>
                    <span key={`q${i}`}>{m.quantity || "-"}</span>
                    <span key={`h${i}`}>{m.has || "-"}</span>
                    <span key={`m${i}`}>{m.missing || "-"}</span>
                  </>
                ))}
              </div>
            </div>
          )}

          {entry.description && <Field label="Descrição" value={entry.description} full />}
          {entry.execution_process && <Field label="Processo de Execução" value={entry.execution_process} full />}
          {entry.materials_used && <Field label="Materiais Utilizados" value={entry.materials_used} full />}
          {entry.team && <Field label="Equipe" value={entry.team} full />}
          {entry.pending_reason && <Field label="Motivo/Pendência" value={entry.pending_reason} full />}
          {entry.impediment_reason && <Field label="Motivo do Impedimento" value={entry.impediment_reason} full />}
          {entry.observations && <Field label="Observações" value={entry.observations} full />}
          {photos.length > 0 && (
            <div>
              <p className="font-medium text-muted-foreground mb-2">Fotos</p>
              <div className="grid grid-cols-3 gap-2">
                {photos.map(p => (
                  <div key={p.id} className="rounded-lg overflow-hidden border border-border">
                    <img src={p.file_url} alt={p.caption || p.file_name} className="w-full h-24 object-cover" />
                    {p.caption && <p className="text-xs p-1 text-muted-foreground">{p.caption}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, full }: { label: string; value: any; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <div className="mt-0.5">{value || "-"}</div>
    </div>
  );
}
