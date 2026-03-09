import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Package, Sparkles, Plus, Pencil, Copy, Trash2, Info, Droplets, Zap, AlertTriangle } from "lucide-react";
import type { MaterialConfig, Unit, ZeroOrigin, ZZero, MaterialPreset, MaterialCategory, CncTool, PocketStrategy, EntryMode } from "@/lib/toolpath-engine";
import {
  DEFAULT_MATERIAL_PRESETS,
  MATERIAL_CATEGORY_LABELS,
  isMetal,
  getPresetById,
  suggestToolParamsFromPreset,
} from "@/lib/toolpath-engine";

interface MaterialPanelProps {
  material: MaterialConfig;
  onChange: (m: MaterialConfig) => void;
  customPresets: MaterialPreset[];
  onChangeCustomPresets: (presets: MaterialPreset[]) => void;
  tools: CncTool[];
  onToolsSuggestion?: (tools: CncTool[]) => void;
}

export function MaterialPanel({ material, onChange, customPresets, onChangeCustomPresets, tools, onToolsSuggestion }: MaterialPanelProps) {
  const set = (key: keyof MaterialConfig, value: any) => onChange({ ...material, [key]: value });
  const [showLibrary, setShowLibrary] = useState(false);
  const [editPreset, setEditPreset] = useState<MaterialPreset | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const allPresets = [...DEFAULT_MATERIAL_PRESETS, ...customPresets];
  const activePreset = getPresetById(material.presetId, customPresets);

  const handleSelectPreset = (presetId: string) => {
    set("presetId", presetId);
    const preset = getPresetById(presetId, customPresets);
    if (preset && onToolsSuggestion && tools.length > 0) {
      const updatedTools = tools.map((t) => {
        const suggestion = suggestToolParamsFromPreset(preset, t);
        return { ...t, ...suggestion };
      });
      onToolsSuggestion(updatedTools);
    }
  };

  const handleSaveCustomPreset = () => {
    if (!editPreset) return;
    if (editPreset.id.startsWith("custom-")) {
      onChangeCustomPresets(customPresets.map((p) => (p.id === editPreset.id ? editPreset : p)));
    } else {
      const newP = { ...editPreset, id: `custom-${Date.now()}` };
      onChangeCustomPresets([...customPresets, newP]);
    }
    setShowEditDialog(false);
    setEditPreset(null);
  };

  const handleDuplicatePreset = (p: MaterialPreset) => {
    const dup: MaterialPreset = { ...p, id: `custom-${Date.now()}`, name: `${p.name} (cópia)` };
    onChangeCustomPresets([...customPresets, dup]);
  };

  const handleDeletePreset = (id: string) => {
    onChangeCustomPresets(customPresets.filter((p) => p.id !== id));
  };

  const openEditPreset = (p?: MaterialPreset) => {
    setEditPreset(p || {
      id: `custom-${Date.now()}`, name: "", category: "wood" as MaterialCategory, hardness: "",
      feedXY: 1500, feedZ: 400, spindleRpm: 16000, stepDown: 2, stepOver: 40,
      entryMode: "ramp-linear" as EntryMode, pocketStrategy: "standard" as PocketStrategy, notes: "",
      coolantRequired: false, chipload: 0.05,
    });
    setShowEditDialog(true);
  };

  const categoryColors: Record<MaterialCategory, string> = {
    wood: "hsl(var(--chart-4))",
    composite: "hsl(var(--chart-5))",
    plastic: "hsl(var(--chart-3))",
    "soft-metal": "hsl(var(--chart-1))",
    "hard-metal": "hsl(var(--destructive))",
  };

  return (
    <>
      <Card className="border-border">
        <CardHeader className="pb-3 pt-4 px-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-primary" /> Material V4.2
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-2.5">
          {/* Material Preset Selector */}
          <div>
            <Label className="text-xs flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> Material
            </Label>
            <div className="flex gap-1">
              <Select value={material.presetId} onValueChange={handleSelectPreset}>
                <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Selecionar material..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MATERIAL_CATEGORY_LABELS).map(([cat, label]) => {
                    const catPresets = allPresets.filter((p) => p.category === cat);
                    if (catPresets.length === 0) return null;
                    return (
                      <div key={cat}>
                        <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">{label}</div>
                        {catPresets.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <div className="flex items-center gap-1">
                              {p.name}
                              {isMetal(p.category) && <Zap className="h-3 w-3 text-amber-500" />}
                              {p.coolantRequired && <Droplets className="h-3 w-3 text-blue-500" />}
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setShowLibrary(true)}>
                <Info className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Active preset info */}
          {activePreset && (
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-[9px] h-5 px-1.5" style={{ borderColor: categoryColors[activePreset.category] }}>
                {MATERIAL_CATEGORY_LABELS[activePreset.category]}
              </Badge>
              <Badge variant="outline" className="text-[9px] h-5 px-1.5 text-muted-foreground">
                {activePreset.hardness}
              </Badge>
              {isMetal(activePreset.category) && (
                <Badge variant="outline" className="text-[9px] h-5 px-1.5 border-amber-500 text-amber-600">
                  ⚡ Helicoidal
                </Badge>
              )}
              {activePreset.coolantRequired && (
                <Badge variant="outline" className="text-[9px] h-5 px-1.5 border-blue-500 text-blue-600">
                  💧 Refrigeração
                </Badge>
              )}
              {activePreset.pocketStrategy === "trochoidal" && (
                <Badge variant="outline" className="text-[9px] h-5 px-1.5 border-purple-500 text-purple-600">
                  Trocoidal
                </Badge>
              )}
              <Badge variant="outline" className="text-[9px] h-5 px-1.5 text-muted-foreground">
                F{activePreset.feedXY} Z{activePreset.feedZ} S{activePreset.spindleRpm}
              </Badge>
            </div>
          )}

          {activePreset?.notes && (
            <p className="text-[10px] text-muted-foreground bg-muted/50 rounded p-1.5">{activePreset.notes}</p>
          )}

          {/* Metal safety warning */}
          {activePreset && isMetal(activePreset.category) && (
            <div className="flex items-start gap-1.5 p-1.5 rounded bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
              <span className="text-[9px] text-amber-700 dark:text-amber-400">
                Material metálico: estratégias avançadas (helicoidal, trocoidal, adaptativo) serão aplicadas automaticamente.
              </span>
            </div>
          )}

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

      {/* Material Library Dialog */}
      <Dialog open={showLibrary} onOpenChange={setShowLibrary}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Biblioteca de Materiais V4.2</DialogTitle></DialogHeader>
          <div className="flex justify-end">
            <Button size="sm" className="h-7 text-xs gap-1" onClick={() => { setShowLibrary(false); openEditPreset(); }}>
              <Plus className="h-3 w-3" /> Novo Material
            </Button>
          </div>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-1">
              {allPresets.map((p) => (
                <div key={p.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 text-xs">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: categoryColors[p.category] }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium flex items-center gap-1">
                      {p.name}
                      {isMetal(p.category) && <Zap className="h-3 w-3 text-amber-500" />}
                      {p.coolantRequired && <Droplets className="h-3 w-3 text-blue-500" />}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      F{p.feedXY} Z{p.feedZ} S{p.spindleRpm} | SD:{p.stepDown}mm SO:{p.stepOver}% | {p.entryMode} | {p.pocketStrategy}
                      {p.chipload ? ` | CL:${p.chipload}mm` : ""}
                    </div>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    {p.id.startsWith("custom-") && (
                      <button onClick={() => { setShowLibrary(false); openEditPreset(p); }} className="p-1 hover:text-primary"><Pencil className="h-3 w-3" /></button>
                    )}
                    <button onClick={() => handleDuplicatePreset(p)} className="p-1 hover:text-primary"><Copy className="h-3 w-3" /></button>
                    {p.id.startsWith("custom-") && (
                      <button onClick={() => handleDeletePreset(p.id)} className="p-1 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit/Create Preset Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editPreset?.id.startsWith("custom-") ? "Editar Material" : "Novo Material"}</DialogTitle></DialogHeader>
          {editPreset && (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Nome</Label><Input value={editPreset.name} onChange={(e) => setEditPreset({ ...editPreset, name: e.target.value })} className="h-8 text-xs" /></div>
                <div>
                  <Label className="text-xs">Categoria</Label>
                  <Select value={editPreset.category} onValueChange={(v: MaterialCategory) => setEditPreset({ ...editPreset, category: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(MATERIAL_CATEGORY_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Dureza</Label><Input value={editPreset.hardness} onChange={(e) => setEditPreset({ ...editPreset, hardness: e.target.value })} className="h-8 text-xs" placeholder="Ex: média, alta..." /></div>
                <div><Label className="text-xs">Chipload (mm)</Label><Input type="number" step={0.001} value={editPreset.chipload || 0} onChange={(e) => setEditPreset({ ...editPreset, chipload: +e.target.value })} className="h-8 text-xs" /></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Avanço XY</Label><Input type="number" value={editPreset.feedXY} onChange={(e) => setEditPreset({ ...editPreset, feedXY: +e.target.value })} className="h-8 text-xs" /></div>
                <div><Label className="text-xs">Avanço Z</Label><Input type="number" value={editPreset.feedZ} onChange={(e) => setEditPreset({ ...editPreset, feedZ: +e.target.value })} className="h-8 text-xs" /></div>
                <div><Label className="text-xs">RPM</Label><Input type="number" value={editPreset.spindleRpm} onChange={(e) => setEditPreset({ ...editPreset, spindleRpm: +e.target.value })} className="h-8 text-xs" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Step-Down (mm)</Label><Input type="number" step={0.1} value={editPreset.stepDown} onChange={(e) => setEditPreset({ ...editPreset, stepDown: +e.target.value })} className="h-8 text-xs" /></div>
                <div><Label className="text-xs">Step-Over (%)</Label><Input type="number" min={1} max={100} value={editPreset.stepOver} onChange={(e) => setEditPreset({ ...editPreset, stepOver: +e.target.value })} className="h-8 text-xs" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Estratégia de Entrada</Label>
                  <Select value={editPreset.entryMode} onValueChange={(v: any) => setEditPreset({ ...editPreset, entryMode: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plunge">Plunge</SelectItem>
                      <SelectItem value="ramp-linear">Rampa</SelectItem>
                      <SelectItem value="ramp-helicoidal">Helicoidal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Pocket</Label>
                  <Select value={editPreset.pocketStrategy} onValueChange={(v: any) => setEditPreset({ ...editPreset, pocketStrategy: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Padrão</SelectItem>
                      <SelectItem value="spiral">Espiral</SelectItem>
                      <SelectItem value="helical">Helicoidal</SelectItem>
                      <SelectItem value="adaptive">Adaptativo</SelectItem>
                      <SelectItem value="trochoidal">Trocoidal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={editPreset.coolantRequired || false} onChange={(e) => setEditPreset({ ...editPreset, coolantRequired: e.target.checked })} />
                  Refrigeração necessária
                </label>
              </div>
              <div><Label className="text-xs">Observações</Label><Textarea value={editPreset.notes} onChange={(e) => setEditPreset({ ...editPreset, notes: e.target.value })} className="text-xs min-h-[60px]" /></div>
            </div>
          )}
          <DialogFooter><Button size="sm" onClick={handleSaveCustomPreset} disabled={!editPreset?.name}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
