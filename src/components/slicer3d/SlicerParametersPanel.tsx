import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import type { SlicerParams, InterlockParams, RadialParams, UnfoldParams } from "@/lib/slicer3d-engine";

interface StackedPanelProps {
  params: SlicerParams;
  onChange: (p: SlicerParams) => void;
}

export function StackedParamsPanel({ params, onChange }: StackedPanelProps) {
  const set = (key: keyof SlicerParams, val: any) => onChange({ ...params, [key]: val });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Espessura do Material (mm)</Label>
          <Input type="number" step="0.1" value={params.materialThickness} onChange={(e) => set("materialThickness", +e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Direção de Corte</Label>
          <Select value={params.direction} onValueChange={(v) => set("direction", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="x">Eixo X</SelectItem>
              <SelectItem value="y">Eixo Y</SelectItem>
              <SelectItem value="z">Eixo Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Espaçamento (mm)</Label>
          <Input type="number" step="0.1" value={params.spacing} onChange={(e) => set("spacing", +e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Compensação Ferramenta (mm)</Label>
          <Input type="number" step="0.01" value={params.toolCompensation} onChange={(e) => set("toolCompensation", +e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Kerf (mm)</Label>
          <Input type="number" step="0.01" value={params.kerfWidth} onChange={(e) => set("kerfWidth", +e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Offset do Corte</Label>
          <Select value={params.offsetMode} onValueChange={(v) => set("offsetMode", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="internal">Interno</SelectItem>
              <SelectItem value="external">Externo</SelectItem>
              <SelectItem value="center">Centro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-t border-border pt-3 mt-3">
        <Label className="text-xs font-semibold">Encaixes Automáticos</Label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={params.jointType} onValueChange={(v) => set("jointType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                <SelectItem value="slot">Rasgo</SelectItem>
                <SelectItem value="tab">Tab</SelectItem>
                <SelectItem value="dogbone">Dogbone</SelectItem>
                <SelectItem value="malefemale">Macho/Fêmea</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Folga Encaixe (mm)</Label>
            <Input type="number" step="0.01" value={params.jointClearance} onChange={(e) => set("jointClearance", +e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Largura (mm)</Label>
            <Input type="number" step="0.1" value={params.jointWidth} onChange={(e) => set("jointWidth", +e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Profundidade (mm)</Label>
            <Input type="number" step="0.1" value={params.jointDepth} onChange={(e) => set("jointDepth", +e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
}

interface InterlockPanelProps {
  params: InterlockParams;
  onChange: (p: InterlockParams) => void;
}

export function InterlockParamsPanel({ params, onChange }: InterlockPanelProps) {
  const set = (key: keyof InterlockParams, val: any) => onChange({ ...params, [key]: val });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Espessura do Material (mm)</Label>
          <Input type="number" step="0.1" value={params.materialThickness} onChange={(e) => set("materialThickness", +e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Fatias Eixo X</Label>
          <Input type="number" step="1" min="1" value={params.slicesX} onChange={(e) => set("slicesX", +e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Fatias Eixo Y</Label>
          <Input type="number" step="1" min="1" value={params.slicesY} onChange={(e) => set("slicesY", +e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Folga de Encaixe (mm)</Label>
          <Input type="number" step="0.01" value={params.slotClearance} onChange={(e) => set("slotClearance", +e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Profundidade Rasgo (mm)</Label>
          <Input type="number" step="0.1" value={params.slotDepth} onChange={(e) => set("slotDepth", +e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Compensação Ferramenta (mm)</Label>
          <Input type="number" step="0.01" value={params.toolCompensation} onChange={(e) => set("toolCompensation", +e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Kerf (mm)</Label>
          <Input type="number" step="0.01" value={params.kerfWidth} onChange={(e) => set("kerfWidth", +e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Offset do Corte</Label>
          <Select value={params.offsetMode} onValueChange={(v: any) => set("offsetMode", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="internal">Interno</SelectItem>
              <SelectItem value="external">Externo</SelectItem>
              <SelectItem value="center">Centro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

interface RadialPanelProps {
  params: RadialParams;
  onChange: (p: RadialParams) => void;
}

export function RadialParamsPanel({ params, onChange }: RadialPanelProps) {
  const set = (key: keyof RadialParams, val: any) => onChange({ ...params, [key]: val });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Espessura do Material (mm)</Label>
          <Input type="number" step="0.1" value={params.materialThickness} onChange={(e) => set("materialThickness", +e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Nº Divisões</Label>
          <Input type="number" step="1" min="2" value={params.divisions} onChange={(e) => set("divisions", +e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Ângulo Total (°)</Label>
          <Input type="number" step="1" value={params.angle} onChange={(e) => set("angle", +e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Folga (mm)</Label>
          <Input type="number" step="0.01" value={params.clearance} onChange={(e) => set("clearance", +e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Compensação Ferramenta (mm)</Label>
          <Input type="number" step="0.01" value={params.toolCompensation} onChange={(e) => set("toolCompensation", +e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Kerf (mm)</Label>
          <Input type="number" step="0.01" value={params.kerfWidth} onChange={(e) => set("kerfWidth", +e.target.value)} />
        </div>
      </div>
    </div>
  );
}

interface UnfoldPanelProps {
  params: UnfoldParams;
  onChange: (p: UnfoldParams) => void;
}

export function UnfoldParamsPanel({ params, onChange }: UnfoldPanelProps) {
  const set = (key: keyof UnfoldParams, val: any) => onChange({ ...params, [key]: val });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Espessura do Material (mm)</Label>
          <Input type="number" step="0.1" value={params.materialThickness} onChange={(e) => set("materialThickness", +e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Ângulo Máx entre Faces (°)</Label>
          <Input type="number" step="1" value={params.maxAngle} onChange={(e) => set("maxAngle", +e.target.value)} />
        </div>
      </div>
      <div className="flex flex-col gap-2 mt-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Divisão Automática</Label>
          <Switch checked={params.autoSplit} onCheckedChange={(v) => set("autoSplit", v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Gerar Abas</Label>
          <Switch checked={params.generateTabs} onCheckedChange={(v) => set("generateTabs", v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Linhas de Dobra</Label>
          <Switch checked={params.generateFoldLines} onCheckedChange={(v) => set("generateFoldLines", v)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Compensação Ferramenta (mm)</Label>
          <Input type="number" step="0.01" value={params.toolCompensation} onChange={(e) => set("toolCompensation", +e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Kerf (mm)</Label>
          <Input type="number" step="0.01" value={params.kerfWidth} onChange={(e) => set("kerfWidth", +e.target.value)} />
        </div>
      </div>
    </div>
  );
}
