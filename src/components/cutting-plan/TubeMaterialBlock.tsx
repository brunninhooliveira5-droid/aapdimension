import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Package, Layers, Plus, Trash2, Copy, Upload, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPieceColor } from "@/lib/cutting-plan-engine";

export interface TubePieceRow {
  id: string;
  length: string;
  quantity: string;
}

export interface TubeMaterialGroupData {
  id: string;
  source: string;
  selectedItemId: string;
  materialName: string;
  materialLength: string;
  materialPrice: string;
  availableQty: number | null;
  reserveStock: boolean;
  pieces: TubePieceRow[];
}

interface Props {
  group: TubeMaterialGroupData;
  index: number;
  total: number;
  onChange: (group: TubeMaterialGroupData) => void;
  onRemove: () => void;
  invalidPieceIds?: string[];
}

export function TubeMaterialBlock({ group, index, total, onChange, onRemove, invalidPieceIds = [] }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [catalogMaterials, setCatalogMaterials] = useState<any[]>([]);
  const [scraps, setScraps] = useState<any[]>([]);

  useEffect(() => {
    if (group.source === "estoque") {
      supabase.from("inventory_items").select("id, name, current_quantity, unit_cost, avg_cost, last_cost, internal_code").eq("is_active", true).order("name").then(({ data }) => setInventoryItems(data || []));
    }
  }, [group.source]);

  useEffect(() => {
    if (group.source === "cadastro") {
      supabase.from("cutting_plan_materials" as any).select("*").eq("is_active", true).in("category", ["tubo", "perfil"]).order("name").then(({ data }: any) => setCatalogMaterials(data || []));
    }
  }, [group.source]);

  useEffect(() => {
    if (group.source === "retalho") {
      supabase.from("cutting_scraps" as any).select("*").eq("status", "disponível").eq("scrap_type", "tubo").order("created_at", { ascending: false }).then(({ data }: any) => setScraps(data || []));
    }
  }, [group.source]);

  const update = (partial: Partial<TubeMaterialGroupData>) => onChange({ ...group, ...partial });

  const handleSourceChange = (val: string) => {
    update({ source: val, selectedItemId: "", materialName: "", materialLength: "", materialPrice: "", availableQty: null, reserveStock: false });
  };

  const handleInventorySelect = (id: string) => {
    const item = inventoryItems.find((i) => i.id === id);
    if (item) update({ selectedItemId: id, materialName: item.name, materialPrice: String(item.unit_cost || item.avg_cost || item.last_cost || 0), availableQty: item.current_quantity, materialLength: "" });
  };

  const handleCatalogSelect = (id: string) => {
    const mat = catalogMaterials.find((m: any) => m.id === id);
    if (mat) update({ selectedItemId: id, materialName: mat.name, materialLength: String(mat.length), materialPrice: String(mat.unit_price), availableQty: null });
  };

  const handleScrapSelect = (id: string) => {
    const scrap = scraps.find((s: any) => s.id === id);
    if (scrap) update({ selectedItemId: id, materialName: `Retalho: ${scrap.material_name}`, materialLength: String(scrap.length), materialPrice: "0", availableQty: 1 });
  };

  const addPiece = () => {
    const newId = String(Date.now());
    update({ pieces: [...group.pieces, { id: newId, length: "", quantity: "1" }] });
    setTimeout(() => {
      const el = document.querySelector(`[data-piece-id="${newId}"][data-field="length"]`) as HTMLInputElement;
      el?.focus();
    }, 50);
  };

  const updatePiece = (id: string, field: keyof TubePieceRow, value: string) => {
    update({ pieces: group.pieces.map((p) => (p.id === id ? { ...p, [field]: value } : p)) });
  };

  const removePiece = (id: string) => {
    if (group.pieces.length <= 1) return;
    update({ pieces: group.pieces.filter((p) => p.id !== id) });
  };

  const duplicatePiece = (id: string) => {
    const p = group.pieces.find(x => x.id === id);
    if (p) update({ pieces: [...group.pieces, { ...p, id: String(Date.now()) }] });
  };

  const clearPieces = () => update({ pieces: [{ id: String(Date.now()), length: "", quantity: "1" }] });

  const handlePieceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number, field: keyof TubePieceRow) => {
    if (e.key === "Enter") { e.preventDefault(); addPiece(); }
    if (e.key === " " && (e.target as HTMLInputElement).value === "") {
      e.preventDefault();
      if (idx > 0) {
        const prev = group.pieces[idx - 1];
        const val = String(prev[field] ?? "");
        if (val) updatePiece(group.pieces[idx].id, field, val);
      }
    }
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      const newPieces: TubePieceRow[] = [];
      for (const line of lines) {
        const parts = line.split(/[,;\t]/).map(s => s.trim());
        if (parts.length >= 1 && parseFloat(parts[0]) > 0) {
          newPieces.push({ id: String(Date.now() + Math.random()), length: parts[0], quantity: parts[1] || "1" });
        }
      }
      if (newPieces.length > 0) update({ pieces: [...group.pieces.filter(p => p.length), ...newPieces] });
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const pieceSummary = group.pieces.filter(p => p.length).length;
  const totalQty = group.pieces.reduce((s, p) => s + (parseInt(p.quantity) || 0), 0);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="p-0 overflow-hidden border-2 border-border">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <Package className="h-4 w-4 text-primary" />
              <span className="font-semibold text-foreground">
                Material {index + 1}{group.materialName ? `: ${group.materialName}` : ""}
              </span>
              {!isOpen && pieceSummary > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({pieceSummary} peça(s), {totalQty} unid.)
                </span>
              )}
            </div>
            {total > 1 && (
              <Button variant="ghost" size="sm" className="h-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover
              </Button>
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
            {/* Source */}
            <RadioGroup value={group.source} onValueChange={handleSourceChange} className="flex flex-wrap gap-4">
              {[{ value: "estoque", label: "Estoque" }, { value: "cadastro", label: "Cadastro" }, { value: "retalho", label: "Retalho" }, { value: "manual", label: "Manual" }].map(s => (
                <div key={s.value} className="flex items-center gap-2">
                  <RadioGroupItem value={s.value} id={`tube-${group.id}-${s.value}`} />
                  <Label htmlFor={`tube-${group.id}-${s.value}`} className="cursor-pointer">{s.label}</Label>
                </div>
              ))}
            </RadioGroup>

            {group.source === "estoque" && (
              <>
                <Select value={group.selectedItemId} onValueChange={handleInventorySelect}>
                  <SelectTrigger><SelectValue placeholder="Selecione do estoque..." /></SelectTrigger>
                  <SelectContent>{inventoryItems.map((item) => (<SelectItem key={item.id} value={item.id}>{item.internal_code ? `[${item.internal_code}] ` : ""}{item.name} — Qtd: {item.current_quantity}</SelectItem>))}</SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Checkbox id={`tube-reserve-${group.id}`} checked={group.reserveStock} onCheckedChange={(v) => update({ reserveStock: !!v })} />
                  <Label htmlFor={`tube-reserve-${group.id}`} className="cursor-pointer text-sm">Reservar material ao salvar</Label>
                </div>
              </>
            )}
            {group.source === "cadastro" && (
              <Select value={group.selectedItemId} onValueChange={handleCatalogSelect}>
                <SelectTrigger><SelectValue placeholder="Selecione do cadastro..." /></SelectTrigger>
                <SelectContent>{catalogMaterials.map((mat: any) => (<SelectItem key={mat.id} value={mat.id}>{mat.name} — {mat.length} mm — R$ {Number(mat.unit_price).toFixed(2)}</SelectItem>))}</SelectContent>
              </Select>
            )}
            {group.source === "retalho" && (
              <Select value={group.selectedItemId} onValueChange={handleScrapSelect}>
                <SelectTrigger><SelectValue placeholder="Selecione um retalho..." /></SelectTrigger>
                <SelectContent>{scraps.length === 0 ? <SelectItem value="_none" disabled>Nenhum retalho</SelectItem> : scraps.map((s: any) => (<SelectItem key={s.id} value={s.id}>{s.material_name} — {Number(s.length).toFixed(0)} mm</SelectItem>))}</SelectContent>
              </Select>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><Label className="text-xs">Nome</Label><Input value={group.materialName} onChange={(e) => update({ materialName: e.target.value })} readOnly={group.source !== "manual"} placeholder="Ex: Tubo 50x50" /></div>
              <div><Label className="text-xs">Comprimento (mm)</Label><Input type="number" value={group.materialLength} onChange={(e) => update({ materialLength: e.target.value })} placeholder="6000" /></div>
              <div><Label className="text-xs">Valor unitário (R$)</Label><Input type="text" inputMode="decimal" value={group.materialPrice} onChange={(e) => { let v = e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."); const parts = v.split("."); if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join(""); if (parts.length === 2 && parts[1].length > 2) v = parts[0] + "." + parts[1].slice(0, 2); update({ materialPrice: v }); }} placeholder="0.00" /></div>
              {group.availableQty !== null && <div className="flex items-end"><p className="text-xs text-muted-foreground pb-2">Disponível: <span className="font-semibold text-foreground">{group.availableQty}</span></p></div>}
            </div>

            {/* Pieces */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground"><Layers className="h-3.5 w-3.5 text-primary" /> Peças</h4>
                <div className="flex gap-1 flex-wrap">
                  <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCsvImport} />
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => fileInputRef.current?.click()}><Upload className="h-3.5 w-3.5 mr-1" /> CSV</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={clearPieces}><XCircle className="h-3.5 w-3.5 mr-1" /> Limpar</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addPiece}><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar</Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead className="w-20">#</TableHead><TableHead>Comprimento (mm)</TableHead><TableHead className="w-20">Qtd</TableHead><TableHead className="w-20" /></TableRow></TableHeader>
                  <TableBody>
                    {group.pieces.map((piece, pi) => {
                      const isInvalid = invalidPieceIds.includes(piece.id);
                      return (
                        <TableRow key={piece.id} className={isInvalid ? "bg-destructive/10" : ""}>
                          <TableCell><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: getPieceColor(pi) }} /><span className="text-sm font-medium">P{pi + 1}</span></div></TableCell>
                          <TableCell><Input type="number" value={piece.length} onChange={(e) => updatePiece(piece.id, "length", e.target.value)} onKeyDown={(e) => handlePieceKeyDown(e, pi, "length")} data-piece-id={piece.id} data-field="length" className={`h-8 ${isInvalid ? "border-destructive" : ""}`} placeholder="0" /></TableCell>
                          <TableCell><Input type="number" value={piece.quantity} onChange={(e) => updatePiece(piece.id, "quantity", e.target.value)} onKeyDown={(e) => handlePieceKeyDown(e, pi, "quantity")} data-piece-id={piece.id} data-field="quantity" className="h-8 w-20" min="1" placeholder="1" /></TableCell>
                          <TableCell>
                            <div className="flex gap-0.5">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => duplicatePiece(piece.id)} title="Duplicar"><Copy className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removePiece(piece.id)} disabled={group.pieces.length <= 1}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
