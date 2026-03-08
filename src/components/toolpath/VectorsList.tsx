import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Layers, Upload, CheckSquare, Square } from "lucide-react";
import type { SvgVector } from "@/lib/toolpath-engine";
import { useRef } from "react";

interface VectorsListProps {
  vectors: SvgVector[];
  selectedVectorIds: string[];
  onSelectVector: (id: string, multi: boolean) => void;
  onImportSvg: (content: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export function VectorsList({ vectors, selectedVectorIds, onSelectVector, onImportSvg, onSelectAll, onDeselectAll }: VectorsListProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onImportSvg(reader.result);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Group by layer
  const layers = new Map<string, SvgVector[]>();
  vectors.forEach((v) => {
    if (!layers.has(v.layer)) layers.set(v.layer, []);
    layers.get(v.layer)!.push(v);
  });

  return (
    <Card className="border-border">
      <CardHeader className="pb-2 pt-4 px-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-primary" /> Vetores
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        <input ref={fileRef} type="file" accept=".svg" className="hidden" onChange={handleFile} />
        <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5" onClick={() => fileRef.current?.click()}>
          <Upload className="h-3.5 w-3.5" /> Importar SVG
        </Button>

        {vectors.length > 0 && (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-6 text-[10px] flex-1" onClick={onSelectAll}><CheckSquare className="h-3 w-3 mr-1" />Todos</Button>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] flex-1" onClick={onDeselectAll}><Square className="h-3 w-3 mr-1" />Nenhum</Button>
          </div>
        )}

        <ScrollArea className="max-h-[300px]">
          {vectors.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Importe um arquivo SVG para começar.</p>
          ) : (
            <div className="space-y-2">
              {Array.from(layers.entries()).map(([layerName, layerVectors]) => (
                <div key={layerName}>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{layerName}</p>
                  <div className="space-y-0.5">
                    {layerVectors.map((v) => {
                      const isSel = selectedVectorIds.includes(v.id);
                      return (
                        <div
                          key={v.id}
                          onClick={(e) => onSelectVector(v.id, e.ctrlKey || e.metaKey)}
                          className={`flex items-center gap-2 rounded px-2 py-1 text-xs cursor-pointer transition-colors ${isSel ? "bg-primary/10 border border-primary/30" : "hover:bg-accent/50"}`}
                        >
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: v.color }} />
                          <span className="truncate flex-1">{v.label}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{v.boundingBox.w.toFixed(0)}×{v.boundingBox.h.toFixed(0)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
