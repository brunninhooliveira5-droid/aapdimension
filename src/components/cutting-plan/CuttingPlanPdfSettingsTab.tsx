import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2, FileText, Type, Eye, Ruler } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export interface CuttingPlanPdfSettings {
  // Nomenclature
  piecePrefix: string;
  labelSeparator: string;
  dimensionFormat: "WxH" | "HxW" | "LxAxP";

  // Visibility toggles
  showPieceDimensions: boolean;
  showPieceDescription: boolean;
  showPieceIndex: boolean;
  showMaterialDimensions: boolean;
  showUtilizationPercent: boolean;
  showWasteArea: boolean;
  showEstimatedCost: boolean;
  showClientName: boolean;
  showProjectName: boolean;
  showDate: boolean;
  showPiecesTable: boolean;
  showBreakdownTable: boolean;
  showLayoutDrawings: boolean;
  showLegend: boolean;
  showBarTotalLength: boolean;
  showKerfLines: boolean;

  // Font sizes (pt)
  titleFontSize: number;
  subtitleFontSize: number;
  infoFontSize: number;
  pieceMainLabelSize: number;
  pieceSubLabelSize: number;
  barTitleFontSize: number;
  legendFontSize: number;
}

export const defaultPdfSettings: CuttingPlanPdfSettings = {
  piecePrefix: "P",
  labelSeparator: " - ",
  dimensionFormat: "WxH",

  showPieceDimensions: true,
  showPieceDescription: true,
  showPieceIndex: true,
  showMaterialDimensions: true,
  showUtilizationPercent: true,
  showWasteArea: true,
  showEstimatedCost: true,
  showClientName: true,
  showProjectName: true,
  showDate: true,
  showPiecesTable: true,
  showBreakdownTable: true,
  showLayoutDrawings: true,
  showLegend: true,
  showBarTotalLength: true,
  showKerfLines: true,

  titleFontSize: 18,
  subtitleFontSize: 13,
  infoFontSize: 10,
  pieceMainLabelSize: 8,
  pieceSubLabelSize: 6,
  barTitleFontSize: 7,
  legendFontSize: 7,
};

const STORAGE_KEY = "cutting-plan-pdf-settings";

export function usePdfSettings() {
  const [settings, setSettings] = useState<CuttingPlanPdfSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...defaultPdfSettings, ...JSON.parse(saved) };
    } catch {}
    return defaultPdfSettings;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  return [settings, setSettings] as const;
}

export function CuttingPlanPdfSettingsTab() {
  const [settings, setSettings] = usePdfSettings();

  const update = (partial: Partial<CuttingPlanPdfSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const exampleLabel = buildExample(settings);

  return (
    <div className="space-y-6">
      {/* Nomenclature */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Nomenclatura das Peças
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Prefixo da peça</Label>
              <Input value={settings.piecePrefix} onChange={(e) => update({ piecePrefix: e.target.value })} placeholder="P" className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Separador</Label>
              <Input value={settings.labelSeparator} onChange={(e) => update({ labelSeparator: e.target.value })} placeholder=" - " className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Formato de dimensão</Label>
              <Select value={settings.dimensionFormat} onValueChange={(v) => update({ dimensionFormat: v as CuttingPlanPdfSettings["dimensionFormat"] })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WxH">Larg x Alt (200x100)</SelectItem>
                  <SelectItem value="HxW">Alt x Larg (100x200)</SelectItem>
                  <SelectItem value="LxAxP">L x A x P</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-muted/50 rounded-md p-3 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Pré-visualização do rótulo:</p>
            <p className="text-sm font-medium text-foreground">{exampleLabel}</p>
          </div>
        </CardContent>
      </Card>

      {/* Visibility */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            Informações Visíveis no PDF
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Escolha quais informações devem aparecer no PDF exportado.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            <SwitchRow label="Índice da peça (P1, P2...)" checked={settings.showPieceIndex} onChange={(v) => update({ showPieceIndex: v })} />
            <SwitchRow label="Dimensões da peça" checked={settings.showPieceDimensions} onChange={(v) => update({ showPieceDimensions: v })} />
            <SwitchRow label="Descrição da peça" checked={settings.showPieceDescription} onChange={(v) => update({ showPieceDescription: v })} />
            <SwitchRow label="Dimensões do material" checked={settings.showMaterialDimensions} onChange={(v) => update({ showMaterialDimensions: v })} />
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            <SwitchRow label="Aproveitamento (%)" checked={settings.showUtilizationPercent} onChange={(v) => update({ showUtilizationPercent: v })} />
            <SwitchRow label="Área de sobra" checked={settings.showWasteArea} onChange={(v) => update({ showWasteArea: v })} />
            <SwitchRow label="Custo estimado" checked={settings.showEstimatedCost} onChange={(v) => update({ showEstimatedCost: v })} />
            <SwitchRow label="Nome do cliente" checked={settings.showClientName} onChange={(v) => update({ showClientName: v })} />
            <SwitchRow label="Nome do projeto" checked={settings.showProjectName} onChange={(v) => update({ showProjectName: v })} />
            <SwitchRow label="Data de geração" checked={settings.showDate} onChange={(v) => update({ showDate: v })} />
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            <SwitchRow label="Tabela de peças" checked={settings.showPiecesTable} onChange={(v) => update({ showPiecesTable: v })} />
            <SwitchRow label="Tabela de detalhamento" checked={settings.showBreakdownTable} onChange={(v) => update({ showBreakdownTable: v })} />
            <SwitchRow label="Desenho do layout" checked={settings.showLayoutDrawings} onChange={(v) => update({ showLayoutDrawings: v })} />
            <SwitchRow label="Legenda" checked={settings.showLegend} onChange={(v) => update({ showLegend: v })} />
            <SwitchRow label="Comprimento total da barra" checked={settings.showBarTotalLength} onChange={(v) => update({ showBarTotalLength: v })} />
            <SwitchRow label="Linhas de serra (kerf)" checked={settings.showKerfLines} onChange={(v) => update({ showKerfLines: v })} />
          </div>
        </CardContent>
      </Card>

      {/* Font sizes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Type className="h-4 w-4 text-primary" />
            Tamanho das Fontes (pt)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-xs text-muted-foreground">Ajuste o tamanho dos textos que aparecem no PDF. Valores em pontos tipográficos.</p>

          <FontSlider label="Título principal" value={settings.titleFontSize} onChange={(v) => update({ titleFontSize: v })} min={10} max={28} />
          <FontSlider label="Subtítulo" value={settings.subtitleFontSize} onChange={(v) => update({ subtitleFontSize: v })} min={8} max={20} />
          <FontSlider label="Informações gerais" value={settings.infoFontSize} onChange={(v) => update({ infoFontSize: v })} min={6} max={16} />
          <FontSlider label="Rótulo da peça (principal)" value={settings.pieceMainLabelSize} onChange={(v) => update({ pieceMainLabelSize: v })} min={3} max={16} />
          <FontSlider label="Rótulo da peça (dimensão)" value={settings.pieceSubLabelSize} onChange={(v) => update({ pieceSubLabelSize: v })} min={3} max={14} />
          <FontSlider label="Título da barra" value={settings.barTitleFontSize} onChange={(v) => update({ barTitleFontSize: v })} min={4} max={14} />
          <FontSlider label="Legenda" value={settings.legendFontSize} onChange={(v) => update({ legendFontSize: v })} min={4} max={12} />
        </CardContent>
      </Card>

      <div className="bg-muted/50 rounded-md p-4 border border-border">
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Settings2 className="h-3.5 w-3.5" />
          As configurações são salvas automaticamente e aplicadas a todas as exportações de PDF do plano de corte.
        </p>
      </div>
    </div>
  );
}

function SwitchRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-sm cursor-pointer">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function FontSlider({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs font-mono text-muted-foreground">{value} pt</span>
      </div>
      <Slider value={[value]} onValueChange={(v) => onChange(v[0])} min={min} max={max} step={1} className="w-full" />
    </div>
  );
}

function buildExample(s: CuttingPlanPdfSettings): string {
  const parts: string[] = [];
  if (s.showPieceIndex) parts.push(`${s.piecePrefix}1`);
  if (s.showPieceDescription) parts.push("Base lateral");
  if (s.showPieceDimensions) {
    switch (s.dimensionFormat) {
      case "WxH": parts.push("200x100"); break;
      case "HxW": parts.push("100x200"); break;
      case "LxAxP": parts.push("200 x 100 x 3"); break;
    }
  }
  return parts.join(s.labelSeparator) || "(vazio)";
}
