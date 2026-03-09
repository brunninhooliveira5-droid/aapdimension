import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Layers, Upload, CheckSquare, Square, Circle, Box, Minus, Trash2, Group, Ungroup, Route } from "lucide-react";
import type { SvgVector, GeometryClass } from "@/lib/toolpath-engine";
import { GEOMETRY_CLASS_LABELS, GEOMETRY_CLASS_COLORS } from "@/lib/toolpath-engine";
import { useRef } from "react";

interface VectorsListProps {
  vectors: SvgVector[];
  selectedVectorIds: string[];
  onSelectVector: (id: string, multi: boolean) => void;
  onImportSvg: (content: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDeleteVectors?: (ids: string[]) => void;
  onGroupVectors?: (ids: string[]) => void;
  onUngroupVectors?: (ids: string[]) => void;
  onCreateToolpathFromSelection?: (ids: string[]) => void;
}

const GEO_ICONS: Record<GeometryClass, typeof Circle> = {
  hole: Circle,
  pocket: Box,
  island: Box,
  "contour-inner": Circle,
  "contour-outer": Circle,
  groove: Minus,
  "open-path": Minus,
};

export function VectorsList({
  vectors, selectedVectorIds, onSelectVector, onImportSvg,
  onSelectAll, onDeselectAll,
  onDeleteVectors, onGroupVectors, onUngroupVectors, onCreateToolpathFromSelection,
}: VectorsListProps) {
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

  const layers = new Map<string, SvgVector[]>();
  vectors.forEach((v) => {
    if (!layers.has(v.layer)) layers.set(v.layer, []);
    layers.get(v.layer)!.push(v);
  });

  const summary = vectors.reduce((acc, v) => {
    acc[v.geometryClass] = (acc[v.geometryClass] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const hasSelection = selectedVectorIds.length > 0;

  return (
    <Card className="border-border">
      <CardHeader className="pb-2 pt-4 px-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-primary" /> Vetores
          {vectors.length > 0 && (
            <Badge variant="outline" className="text-[9px] h-4 ml-auto">{vectors.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        <input ref={fileRef} type="file" accept=".svg" className="hidden" onChange={handleFile} />
        <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5" onClick={() => fileRef.current?.click()}>
          <Upload className="h-3.5 w-3.5" /> Importar SVG
        </Button>

        {vectors.length > 0 && (
          <>
            {/* Geometry summary */}
            <div className="flex flex-wrap gap-1">
              {Object.entries(summary).map(([cls, count]) => (
                <Badge
                  key={cls}
                  variant="outline"
                  className="text-[9px] h-5 px-1.5 gap-0.5"
                  style={{ borderColor: GEOMETRY_CLASS_COLORS[cls as GeometryClass], color: GEOMETRY_CLASS_COLORS[cls as GeometryClass] }}
                >
                  {count} {GEOMETRY_CLASS_LABELS[cls as GeometryClass]}
                </Badge>
              ))}
            </div>

            {/* Select all / none */}
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-6 text-[10px] flex-1" onClick={onSelectAll}><CheckSquare className="h-3 w-3 mr-1" />Todos</Button>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] flex-1" onClick={onDeselectAll}><Square className="h-3 w-3 mr-1" />Nenhum</Button>
            </div>

            {/* Action buttons for selection */}
            {hasSelection && (
              <div className="flex flex-wrap gap-1 p-1.5 bg-primary/5 rounded-md border border-primary/20">
                <span className="text-[9px] text-primary font-medium w-full mb-0.5">{selectedVectorIds.length} selecionado(s)</span>
                {onDeleteVectors && (
                  <Button variant="destructive" size="sm" className="h-6 text-[10px] gap-1 flex-1"
                    onClick={() => onDeleteVectors(selectedVectorIds)}>
                    <Trash2 className="h-3 w-3" /> Excluir
                  </Button>
                )}
                {onGroupVectors && selectedVectorIds.length > 1 && (
                  <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 flex-1"
                    onClick={() => onGroupVectors(selectedVectorIds)}>
                    <Group className="h-3 w-3" /> Agrupar
                  </Button>
                )}
                {onUngroupVectors && (
                  <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 flex-1"
                    onClick={() => onUngroupVectors(selectedVectorIds)}>
                    <Ungroup className="h-3 w-3" /> Desagrupar
                  </Button>
                )}
                {onCreateToolpathFromSelection && (
                  <Button variant="default" size="sm" className="h-6 text-[10px] gap-1 w-full"
                    onClick={() => onCreateToolpathFromSelection(selectedVectorIds)}>
                    <Route className="h-3 w-3" /> Criar Percurso
                  </Button>
                )}
              </div>
            )}
          </>
        )}

        <ScrollArea className="max-h-[350px]">
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
                      const GeoIcon = GEO_ICONS[v.geometryClass] || Circle;
                      return (
                        <div
                          key={v.id}
                          onClick={(e) => onSelectVector(v.id, e.ctrlKey || e.metaKey)}
                          className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs cursor-pointer transition-colors ${isSel ? "bg-primary/10 border border-primary/30" : "hover:bg-accent/50"}`}
                        >
                          <GeoIcon className="h-2.5 w-2.5 shrink-0" style={{ color: GEOMETRY_CLASS_COLORS[v.geometryClass] }} />
                          <span className="truncate flex-1">{v.label}</span>
                          <span
                            className="text-[9px] shrink-0 px-1 rounded"
                            style={{ color: GEOMETRY_CLASS_COLORS[v.geometryClass], background: `${GEOMETRY_CLASS_COLORS[v.geometryClass]}15` }}
                          >
                            {GEOMETRY_CLASS_LABELS[v.geometryClass]}
                          </span>
                          <span className="text-[9px] text-muted-foreground shrink-0">{v.boundingBox.w.toFixed(0)}×{v.boundingBox.h.toFixed(0)}</span>
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
