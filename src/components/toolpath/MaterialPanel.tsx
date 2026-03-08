import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MaterialConfig, Unit, ZeroOrigin, ZZero } from "@/lib/toolpath-engine";
import { Package } from "lucide-react";

interface MaterialPanelProps {
  material: MaterialConfig;
  onChange: (m: MaterialConfig) => void;
}

export function MaterialPanel({ material, onChange }: MaterialPanelProps) {
  const set = (key: keyof MaterialConfig, value: any) => onChange({ ...material, [key]: value });

  return (
    <Card className="border-border">
      <CardHeader className="pb-3 pt-4 px-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5 text-primary" /> Material / Peça
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-xs">Largura</Label><Input type="number" min={1} value={material.width} onChange={(e) => set("width", +e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Altura</Label><Input type="number" min={1} value={material.height} onChange={(e) => set("height", +e.target.value)} className="h-8 text-xs" /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-xs">Espessura</Label><Input type="number" min={0.1} step={0.1} value={material.thickness} onChange={(e) => set("thickness", +e.target.value)} className="h-8 text-xs" /></div>
          <div>
            <Label className="text-xs">Unidade</Label>
            <Select value={material.unit} onValueChange={(v: Unit) => set("unit", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="mm">mm</SelectItem><SelectItem value="in">pol</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs">Ponto Zero</Label>
          <Select value={material.zeroOrigin} onValueChange={(v: ZeroOrigin) => set("zeroOrigin", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bottom-left">Inferior Esquerdo</SelectItem>
              <SelectItem value="center">Centro</SelectItem>
              <SelectItem value="top-left">Superior Esquerdo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Z Zero</Label>
          <Select value={material.zZero} onValueChange={(v: ZZero) => set("zZero", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="top">Topo do Material</SelectItem>
              <SelectItem value="bed">Mesa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
