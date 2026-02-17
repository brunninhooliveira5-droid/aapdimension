import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, ChevronLeft, Layers, Save, Zap, RotateCcw, HelpCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DIMENSION_PRESETS } from "@/lib/cutting-calculations";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

// Sugere fator padrão baseado na espessura (fallback para novas espessuras)
function getDefaultSpeedFactor(thicknessMM: number): number {
  if (thicknessMM <= 1) return 1;
  if (thicknessMM <= 3) return 0.7;
  if (thicknessMM <= 6) return 0.45;
  if (thicknessMM <= 10) return 0.3;
  if (thicknessMM <= 15) return 0.2;
  return 0.12;
}

interface Thickness {
  id: string;
  value: string;
  label: string;
  sheet_width: number;
  sheet_height: number;
  unit_price: number;
  speed_factor: number;
  is_dimension_preset: boolean;
  dimension_default_factor: number | null;
}

interface MaterialsManagementProps {
  useDimensionMaterials?: boolean;
  isAdminMaster?: boolean;
  useMasterPricing?: boolean;
}

export function MaterialsManagement({ useDimensionMaterials = false, isAdminMaster = false, useMasterPricing = false }: MaterialsManagementProps) {
  const { session } = useAuth();
  const [customMaterials, setCustomMaterials] = useState<{ id: string; name: string; price_adjustment: number }[]>([]);
  const [newMaterial, setNewMaterial] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState<{ id: string; name: string; price_adjustment: number } | null>(null);
  const [materialAdjustment, setMaterialAdjustment] = useState(0);
  const [materialThicknesses, setMaterialThicknesses] = useState<Thickness[]>([]);
  const [newThickness, setNewThickness] = useState("");
  const [seedingPresets, setSeedingPresets] = useState(false);

  // Determine which table to use
  const materialsTable = (useDimensionMaterials && isAdminMaster) ? "dimension_cutting_materials" : useDimensionMaterials ? "dimension_cutting_materials" : "cutting_materials";
  const thicknessesTable = (useDimensionMaterials && isAdminMaster) ? "dimension_cutting_material_thicknesses" : useDimensionMaterials ? "dimension_cutting_material_thicknesses" : "cutting_material_thicknesses";
  const isReadOnly = (useDimensionMaterials && !isAdminMaster) || (useMasterPricing && !isAdminMaster);

  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from(materialsTable as any)
      .select("id, name, price_adjustment")
      .order("name")
      .then(({ data }) => {
        if (data) setCustomMaterials(data as any);
      });
  }, [session, materialsTable]);

  const addMaterial = async () => {
    if (!newMaterial.trim() || !session?.user || isReadOnly) return;
    const insertData = materialsTable === "dimension_cutting_materials"
      ? { name: newMaterial.trim() }
      : { user_id: session.user.id, name: newMaterial.trim() };
    const { data, error } = await supabase
      .from(materialsTable as any)
      .insert(insertData as any)
      .select("id, name, price_adjustment")
      .single();
    if (!error && data) {
      setCustomMaterials((prev) => [...prev, data as any].sort((a, b) => a.name.localeCompare(b.name)));
      setNewMaterial("");
      toast.success("Material adicionado!");
    }
  };

  const deleteMaterial = async (id: string) => {
    if (isReadOnly) return;
    const { error } = await supabase.from(materialsTable as any).delete().eq("id", id);
    if (!error) {
      setCustomMaterials((prev) => prev.filter((m) => m.id !== id));
      toast.success("Material removido.");
    }
  };

  const openMaterialDashboard = async (mat: { id: string; name: string; price_adjustment: number }) => {
    setSelectedMaterial(mat);
    setMaterialAdjustment(mat.price_adjustment || 0);
    const { data } = await supabase
      .from(thicknessesTable as any)
      .select("id, value, label, sheet_width, sheet_height, unit_price, speed_factor, is_dimension_preset, dimension_default_factor")
      .eq("material_id", mat.id)
      .order("value");
    if (data) {
      const mapped = (data as any[]).map((d: any) => ({
        ...d,
        is_dimension_preset: d.is_dimension_preset ?? false,
        dimension_default_factor: d.dimension_default_factor ?? null,
      }));
      setMaterialThicknesses(mapped);
    }
  };

  const addThickness = async () => {
    if (!newThickness.trim() || !selectedMaterial || isReadOnly) return;
    const val = newThickness.trim();
    const { data, error } = await supabase
      .from(thicknessesTable as any)
      .insert({ material_id: selectedMaterial.id, value: val, label: `${val} mm`, speed_factor: getDefaultSpeedFactor(parseFloat(val)) } as any)
      .select("id, value, label, sheet_width, sheet_height, unit_price, speed_factor, is_dimension_preset, dimension_default_factor")
      .single();
    if (!error && data) {
      const mapped = { ...(data as any), is_dimension_preset: (data as any).is_dimension_preset ?? false, dimension_default_factor: (data as any).dimension_default_factor ?? null };
      setMaterialThicknesses((prev) => [...prev, mapped].sort((a, b) => parseFloat(a.value) - parseFloat(b.value)));
      setNewThickness("");
      toast.success("Espessura adicionada!");
    }
  };

  const deleteThickness = async (id: string) => {
    if (isReadOnly) return;
    const { error } = await supabase.from(thicknessesTable as any).delete().eq("id", id);
    if (!error) {
      setMaterialThicknesses((prev) => prev.filter((t) => t.id !== id));
      toast.success("Espessura removida.");
    }
  };

  const updateThicknessField = (id: string, field: keyof Thickness, value: number | boolean) => {
    if (isReadOnly) return;
    setMaterialThicknesses((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const saveThickness = async (t: Thickness) => {
    if (isReadOnly) return;
    if (t.speed_factor < 0.05 || t.speed_factor > 1) {
      toast.error("Fator de velocidade deve estar entre 0.05 e 1.00.");
      return;
    }
    const { error } = await supabase
      .from(thicknessesTable as any)
      .update({
        sheet_width: t.sheet_width,
        sheet_height: t.sheet_height,
        unit_price: t.unit_price,
        speed_factor: t.speed_factor,
      } as any)
      .eq("id", t.id);
    if (!error) {
      toast.success(`Espessura ${t.label} salva!`);
    } else {
      toast.error("Erro ao salvar espessura.");
    }
  };

  const restoreDimensionFactor = async (t: Thickness) => {
    if (t.dimension_default_factor === null || isReadOnly) return;
    const newFactor = t.dimension_default_factor;
    const { error } = await supabase
      .from(thicknessesTable as any)
      .update({ speed_factor: newFactor } as any)
      .eq("id", t.id);
    if (!error) {
      setMaterialThicknesses((prev) =>
        prev.map((th) => (th.id === t.id ? { ...th, speed_factor: newFactor } : th))
      );
      toast.success(`Fator restaurado para ${newFactor} (Recomendado Dimension).`);
    }
  };

  const saveMaterialAdjustment = async () => {
    if (!selectedMaterial || isReadOnly) return;
    const { error } = await supabase
      .from(materialsTable as any)
      .update({ price_adjustment: materialAdjustment } as any)
      .eq("id", selectedMaterial.id);
    if (!error) {
      setCustomMaterials((prev) => prev.map((m) => m.id === selectedMaterial.id ? { ...m, price_adjustment: materialAdjustment } : m));
      setSelectedMaterial({ ...selectedMaterial, price_adjustment: materialAdjustment });
      toast.success("Ajuste de preço salvo!");
    }
  };

  // Seed Dimension presets for the current user
  const seedDimensionPresets = async () => {
    if (!session?.user) return;
    setSeedingPresets(true);
    try {
      for (const [matName, preset] of Object.entries(DIMENSION_PRESETS)) {
        // Check if material already exists
        let matId: string;
        const existing = customMaterials.find((m) => m.name.toLowerCase() === matName.toLowerCase());
        if (existing) {
          matId = existing.id;
        } else {
          const { data: newMat, error: matErr } = await supabase
            .from("cutting_materials")
            .insert({ user_id: session.user.id, name: matName } as any)
            .select("id, name, price_adjustment")
            .single();
          if (matErr || !newMat) continue;
          matId = (newMat as any).id;
          setCustomMaterials((prev) => [...prev, newMat as any].sort((a, b) => a.name.localeCompare(b.name)));
        }

        // Add thicknesses that don't exist yet
        const { data: existingThicknesses } = await supabase
          .from("cutting_material_thicknesses")
          .select("value")
          .eq("material_id", matId);
        const existingValues = new Set((existingThicknesses || []).map((t: any) => t.value));

        for (const t of preset.thicknesses) {
          if (existingValues.has(t.value)) {
            // Update existing to mark as preset
            await supabase
              .from("cutting_material_thicknesses")
              .update({
                is_dimension_preset: true,
                dimension_default_factor: t.speedFactor,
                speed_factor: t.speedFactor,
              } as any)
              .eq("material_id", matId)
              .eq("value", t.value);
          } else {
            await supabase
              .from("cutting_material_thicknesses")
              .insert({
                material_id: matId,
                value: t.value,
                label: t.label,
                speed_factor: t.speedFactor,
                is_dimension_preset: true,
                dimension_default_factor: t.speedFactor,
              } as any);
          }
        }
      }
      toast.success("Presets Dimension aplicados com sucesso!");
    } catch {
      toast.error("Erro ao aplicar presets.");
    } finally {
      setSeedingPresets(false);
    }
  };

  const calcM2 = (width: number, height: number) => {
    if (width <= 0 || height <= 0) return 0;
    return (width * height) / 1_000_000;
  };

  const calcPricePerM2 = (unitPrice: number, width: number, height: number) => {
    const m2 = calcM2(width, height);
    if (m2 <= 0 || unitPrice <= 0) return 0;
    return unitPrice / m2;
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Card>
      <CardHeader className="pb-3">
        {selectedMaterial ? (
          <>
            <CardTitle className="text-base flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedMaterial(null); setMaterialThicknesses([]); }}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Layers className="w-4 h-4 text-primary" />
              {selectedMaterial.name}
              {useDimensionMaterials && (
                <Badge variant="outline" className="text-[9px] gap-0.5 h-5 border-primary/30 text-primary ml-2">
                  Catálogo Dimension
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {isReadOnly ? "Visualize espessuras e valores do catálogo oficial" : "Gerencie espessuras, tamanho da chapa, valor unitário e fator de velocidade"}
            </CardDescription>
          </>
        ) : (
          <>
            <CardTitle className="text-base flex items-center gap-2">
              {useDimensionMaterials ? <Layers className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
              {useDimensionMaterials ? "Materiais da Dimension" : "Cadastrar Materiais"}
            </CardTitle>
            <CardDescription>
              {isReadOnly
                ? "Catálogo oficial de materiais da Dimension CNC (somente leitura)"
                : useDimensionMaterials && isAdminMaster
                ? "Gerencie o catálogo oficial de materiais da Dimension"
                : "Clique em um material para gerenciar espessuras e ajuste de preço"}
            </CardDescription>
          </>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedMaterial ? (
          <>
            {!isReadOnly && (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Ajuste de Preço sobre Sugerido (%)</Label>
                  <Input
                    type="number"
                    value={materialAdjustment || ""}
                    onChange={(e) => setMaterialAdjustment(Number(e.target.value))}
                    placeholder="0"
                    className="mt-1"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Ex: 20 = adiciona 20% ao preço sugerido para este material
                  </p>
                </div>
                <Button onClick={saveMaterialAdjustment} size="sm" className="shrink-0 gap-1 mb-5">
                  <Save className="w-3.5 h-3.5" /> Salvar
                </Button>
              </div>
            )}
            {isReadOnly && materialAdjustment > 0 && (
              <p className="text-xs text-muted-foreground">Ajuste de preço: +{materialAdjustment}%</p>
            )}

            <Separator />

            {/* Explanatory text */}
            <div className="flex items-start gap-2 p-2.5 rounded-md bg-secondary/50 border border-border text-xs">
              <HelpCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Fator de Velocidade</p>
                <p>Multiplicador da velocidade base configurada no Simulador. Ex: 0.30 = 30% da velocidade configurada.</p>
                <p>Valores com <span className="inline-flex items-center gap-0.5 text-primary"><Zap className="w-3 h-3" /> Preset Dimension</span> são recomendações padrão da Dimension CNC.</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Espessura (ex: 2.5)"
                value={newThickness}
                onChange={(e) => setNewThickness(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addThickness()}
                type="number"
                min={0.1}
                step={0.1}
              />
              <Button onClick={addThickness} disabled={!newThickness.trim()} size="sm" className="shrink-0 gap-1">
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </Button>
            </div>

            {materialThicknesses.length > 0 ? (
              <div className="space-y-3">
                {materialThicknesses.map((t) => {
                  const m2 = calcM2(t.sheet_width, t.sheet_height);
                  const priceM2 = calcPricePerM2(t.unit_price, t.sheet_width, t.sheet_height);
                  const isModifiedPreset = t.is_dimension_preset && t.dimension_default_factor !== null && t.speed_factor !== t.dimension_default_factor;
                  return (
                    <Card key={t.id} className="bg-secondary/30 border-border">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{t.label}</span>
                            {t.is_dimension_preset && !isModifiedPreset && (
                              <Badge variant="outline" className="text-[9px] gap-0.5 h-5 border-primary/30 text-primary">
                                <Zap className="w-2.5 h-2.5" /> Preset Dimension
                              </Badge>
                            )}
                            {isModifiedPreset && (
                              <Badge variant="outline" className="text-[9px] gap-0.5 h-5 border-muted-foreground/30 text-muted-foreground">
                                Personalizado (Preset: {t.dimension_default_factor})
                              </Badge>
                            )}
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteThickness(t.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Largura Chapa (mm)</Label>
                            <Input
                              type="number"
                              min={0}
                              value={t.sheet_width || ""}
                              onChange={(e) => updateThicknessField(t.id, "sheet_width", Number(e.target.value))}
                              className="h-8 text-xs"
                              placeholder="1000"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Comprimento Chapa (mm)</Label>
                            <Input
                              type="number"
                              min={0}
                              value={t.sheet_height || ""}
                              onChange={(e) => updateThicknessField(t.id, "sheet_height", Number(e.target.value))}
                              className="h-8 text-xs"
                              placeholder="2000"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Valor Unitário (R$)</Label>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={t.unit_price > 0 ? t.unit_price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}
                              onChange={(e) => updateThicknessField(t.id, "unit_price", Number(e.target.value.replace(/[^\d]/g, "")) / 100)}
                              className="h-8 text-xs"
                              placeholder="0,00"
                            />
                          </div>
                          <div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Label className="text-[10px] text-muted-foreground flex items-center gap-0.5 cursor-help">
                                    Fator Velocidade <HelpCircle className="w-2.5 h-2.5" />
                                  </Label>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[220px] text-xs">
                                  Multiplicador da velocidade base. Ex: 0.30 = 30% da velocidade configurada no Simulador.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Input
                              type="number"
                              min={0.05}
                              max={1}
                              step={0.01}
                              value={t.speed_factor || ""}
                              onChange={(e) => updateThicknessField(t.id, "speed_factor", Number(e.target.value))}
                              className="h-8 text-xs"
                              placeholder="1.00"
                            />
                            <p className="text-[9px] text-muted-foreground mt-0.5">
                              0.05–1.00 (1 = vel. total)
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex gap-4 text-[10px] text-muted-foreground">
                            {m2 > 0 && (
                              <span>
                                Área: <span className="text-foreground font-medium">{m2.toFixed(2)} m²</span>
                              </span>
                            )}
                            {priceM2 > 0 && (
                              <span>
                                Valor/m²: <span className="text-primary font-medium">{fmt(priceM2)}</span>
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {isModifiedPreset && (
                              <Button onClick={() => restoreDimensionFactor(t)} size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground">
                                <RotateCcw className="w-3 h-3" /> Restaurar
                              </Button>
                            )}
                            <Button onClick={() => saveThickness(t)} size="sm" variant="outline" className="h-7 text-xs gap-1">
                              <Save className="w-3 h-3" /> Salvar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">Nenhuma espessura cadastrada para este material.</p>
            )}
          </>
        ) : (
          <>
            {/* Seed Dimension Presets Button - only for non-readonly */}
            {!isReadOnly && (
              <div className="p-3 rounded-md bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-medium text-foreground">Presets Dimension CNC</p>
                    <p className="text-muted-foreground">
                      Carregue materiais e fatores de velocidade recomendados pela Dimension (MDF, PVC, Acrílico) com espessuras pré-configuradas.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={seedDimensionPresets}
                  disabled={seedingPresets}
                  size="sm"
                  variant="outline"
                  className="w-full gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Zap className="w-3.5 h-3.5" />
                  {seedingPresets ? "Aplicando presets..." : "Carregar Presets Dimension"}
                </Button>
              </div>
            )}

            {isReadOnly && (
              <div className="p-3 rounded-md bg-primary/5 border border-primary/20 text-xs flex items-start gap-2">
                <Layers className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">
                    {useDimensionMaterials ? "Catálogo Oficial Dimension CNC" : "Materiais Herdados"}
                  </p>
                  <p>
                    {useDimensionMaterials
                      ? "Estes são os materiais oficiais configurados pelo administrador. Você pode visualizar, mas não editar."
                      : "As configurações de materiais são gerenciadas pelo administrador. Você pode visualizar, mas não editar ou cadastrar novos materiais."}
                  </p>
                </div>
              </div>
            )}

            {!isReadOnly && (
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do material"
                  value={newMaterial}
                  onChange={(e) => setNewMaterial(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addMaterial()}
                />
                <Button onClick={addMaterial} disabled={!newMaterial.trim()} size="sm" className="shrink-0 gap-1">
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </Button>
              </div>
            )}

            {customMaterials.length > 0 ? (
              <div className="space-y-1">
                {customMaterials.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-secondary/50 text-sm cursor-pointer hover:bg-secondary transition-colors"
                    onClick={() => openMaterialDashboard(m)}
                  >
                    <span className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                      {m.name}
                      {m.price_adjustment > 0 && (
                        <span className="text-[10px] text-primary">+{m.price_adjustment}%</span>
                      )}
                    </span>
                    {!isReadOnly && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteMaterial(m.id); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">
                {isReadOnly
                  ? "Nenhum material configurado no catálogo. Entre em contato com o administrador."
                  : "Nenhum material personalizado cadastrado."}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
