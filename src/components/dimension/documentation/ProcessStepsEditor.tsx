import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useModule } from "@/contexts/ModuleContext";
import { toast } from "sonner";

const setorLabels: Record<string, string> = {
  cnc: "CNC", laser: "Laser", torno: "Torno", "3d": "3D", montagem: "Montagem", eletrica: "Elétrica", adm: "Administrativo"
};
const stepStatusLabels: Record<string, string> = {
  todo: "A Fazer", doing: "Fazendo", waiting: "Aguardando", done: "Concluído"
};

interface ProcessStep {
  id?: string;
  ficha_id: string;
  etapa_nome: string;
  setor_responsavel: string;
  tempo_estimado_horas: number | null;
  prazo_dias: number | null;
  data_inicio: string | null;
  data_alvo: string | null;
  status: string;
  ordem: number;
  observacao: string;
}

export function ProcessStepsEditor({ fichaId }: { fichaId: string }) {
  const { tables } = useModule();
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSteps = async () => {
    const { data } = await supabase.from(tables.productionProcessSteps as any).select("*").eq("ficha_id", fichaId).order("ordem");
    setSteps((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchSteps(); }, [fichaId, tables]);

  const addStep = () => {
    setSteps([...steps, {
      ficha_id: fichaId, etapa_nome: "", setor_responsavel: "montagem",
      tempo_estimado_horas: null, prazo_dias: null, data_inicio: null, data_alvo: null,
      status: "todo", ordem: steps.length, observacao: ""
    }]);
  };

  const updateStep = (index: number, field: string, value: any) => {
    const updated = [...steps];
    (updated[index] as any)[field] = value;
    setSteps(updated);
  };

  const removeStep = async (index: number) => {
    const step = steps[index];
    if (step.id) await supabase.from(tables.productionProcessSteps as any).delete().eq("id", step.id);
    setSteps(steps.filter((_, i) => i !== index));
    toast.success("Etapa removida");
  };

  const moveStep = (index: number, dir: -1 | 1) => {
    const newIdx = index + dir;
    if (newIdx < 0 || newIdx >= steps.length) return;
    const updated = [...steps];
    [updated[index], updated[newIdx]] = [updated[newIdx], updated[index]];
    updated.forEach((s, i) => s.ordem = i);
    setSteps(updated);
  };

  const saveAll = async () => {
    const toInsert = steps.filter(s => !s.id).map(({ id, ...rest }) => rest);
    const toUpdate = steps.filter(s => s.id);

    if (toInsert.length > 0) {
      const { error } = await supabase.from(tables.productionProcessSteps as any).insert(toInsert as any);
      if (error) { toast.error("Erro ao inserir etapas"); return; }
    }
    for (const step of toUpdate) {
      const { id, ...rest } = step;
      await supabase.from(tables.productionProcessSteps as any).update(rest as any).eq("id", id!);
    }
    toast.success("Processos salvos com sucesso");
    fetchSteps();
  };

  const totalPrazoDias = steps.reduce((sum, s) => sum + (s.prazo_dias || 0), 0);
  const atrasadas = steps.filter(s => s.data_alvo && new Date(s.data_alvo) < new Date() && s.status !== "done");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-sm">Mapeamento de Processos</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Prazo total estimado: <span className="font-semibold">{totalPrazoDias} dias</span>
              {atrasadas.length > 0 && <span className="text-destructive ml-2">• {atrasadas.length} atrasada(s)</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={addStep}><Plus className="h-3.5 w-3.5 mr-1" />Etapa</Button>
            <Button size="sm" onClick={saveAll}><Save className="h-3.5 w-3.5 mr-1" />Salvar</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-center text-muted-foreground py-4">Carregando...</p> : steps.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">Nenhuma etapa cadastrada</p>
        ) : (
          <div className="space-y-2">
            {steps.map((step, idx) => {
              const isLate = step.data_alvo && new Date(step.data_alvo) < new Date() && step.status !== "done";
              return (
                <div key={idx} className={`border rounded-lg p-3 space-y-2 ${isLate ? "border-destructive/50 bg-destructive/5" : ""}`}>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveStep(idx, -1)} disabled={idx === 0}><ArrowUp className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground w-6">{idx + 1}.</span>
                    <Input className="h-8 text-xs flex-1" value={step.etapa_nome} onChange={e => updateStep(idx, "etapa_nome", e.target.value)} placeholder="Nome da etapa (ex: Corte, Solda, Pintura)" />
                    <Select value={step.setor_responsavel} onValueChange={v => updateStep(idx, "setor_responsavel", v)}>
                      <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(setorLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={step.status} onValueChange={v => updateStep(idx, "status", v)}>
                      <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(stepStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeStep(idx)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex gap-2 pl-10 flex-wrap">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Horas:</span>
                      <Input className="h-7 w-16 text-xs" type="number" value={step.tempo_estimado_horas || ""} onChange={e => updateStep(idx, "tempo_estimado_horas", parseFloat(e.target.value) || null)} />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Prazo (dias):</span>
                      <Input className="h-7 w-16 text-xs" type="number" value={step.prazo_dias || ""} onChange={e => updateStep(idx, "prazo_dias", parseInt(e.target.value) || null)} />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Início:</span>
                      <Input className="h-7 text-xs" type="date" value={step.data_inicio || ""} onChange={e => updateStep(idx, "data_inicio", e.target.value || null)} />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Fim/Alvo:</span>
                      <Input className="h-7 text-xs" type="date" value={step.data_alvo || ""} onChange={e => updateStep(idx, "data_alvo", e.target.value || null)} />
                    </div>
                    {isLate && <Badge className="bg-destructive/10 text-destructive text-xs">Atrasada</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
