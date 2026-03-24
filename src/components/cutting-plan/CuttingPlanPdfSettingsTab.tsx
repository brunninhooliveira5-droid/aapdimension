import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2, FileText, Type, Eye, MonitorSmartphone } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export interface CuttingPlanPdfSettings {
  piecePrefix: string;
  labelSeparator: string;
  dimensionFormat: "WxH" | "HxW" | "LxAxP";
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
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Left column: controls */}
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
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
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

      {/* Right column: live preview */}
      <div className="xl:sticky xl:top-4 xl:self-start">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MonitorSmartphone className="h-4 w-4 text-primary" />
              Pré-visualização em tempo real
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PdfPreview settings={settings} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Live PDF Preview ───────────────────────────────────────

const PIECE_COLORS = ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ec4899"];

function PdfPreview({ settings: s }: { settings: CuttingPlanPdfSettings }) {
  const ptScale = 1; // 1pt ≈ 1px for preview
  const dimLabel = s.dimensionFormat === "WxH" ? "200x100" : s.dimensionFormat === "HxW" ? "100x200" : "200 x 100 x 3";

  const buildPieceLabel = (idx: number) => {
    const parts: string[] = [];
    if (s.showPieceIndex) parts.push(`${s.piecePrefix}${idx}`);
    if (s.showPieceDescription) parts.push(idx === 1 ? "Base lateral" : "Reforço");
    return parts.join(s.labelSeparator) || "";
  };

  const buildPieceDim = (idx: number) => {
    if (!s.showPieceDimensions) return "";
    if (idx === 1) return dimLabel;
    return s.dimensionFormat === "LxAxP" ? "150 x 80 x 3" : s.dimensionFormat === "HxW" ? "80x150" : "150x80";
  };

  // Mock data for pieces in the sheet layout
  const mockPieces = [
    { x: 0, y: 0, w: 52, h: 36, idx: 1 },
    { x: 54, y: 0, w: 38, h: 36, idx: 2 },
    { x: 0, y: 38, w: 38, h: 28, idx: 1 },
    { x: 40, y: 38, w: 52, h: 28, idx: 2 },
  ];

  // Mock bars for tube layout
  const mockBars = [
    { segments: [{ pos: 0, len: 40, idx: 1 }, { pos: 42, len: 30, idx: 2 }], waste: 18, util: 78.0 },
    { segments: [{ pos: 0, len: 55, idx: 1 }, { pos: 57, len: 20, idx: 2 }], waste: 13, util: 83.3 },
  ];

  return (
    <div className="bg-white rounded-lg border-2 border-border shadow-inner overflow-hidden" style={{ aspectRatio: "210 / 297" }}>
      <div className="p-3 sm:p-4 h-full flex flex-col overflow-hidden" style={{ fontFamily: "Helvetica, Arial, sans-serif" }}>
        {/* Title */}
        <div className="text-center mb-1">
          <p className="font-bold text-gray-900 leading-tight" style={{ fontSize: s.titleFontSize * ptScale }}>
            Plano de Corte
          </p>
          <p className="text-gray-600" style={{ fontSize: s.subtitleFontSize * ptScale }}>
            Projeto Exemplo
          </p>
        </div>

        {/* Info lines */}
        <div className="mt-1 space-y-0.5 text-gray-700" style={{ fontSize: s.infoFontSize * ptScale }}>
          <InfoLine label="Tipo" value="Corte de Chapa" />
          <InfoLine label="Material" value="Aço 1020" />
          {s.showMaterialDimensions && <InfoLine label="Dimensões" value="1000 x 700 mm" />}
          {s.showClientName && <InfoLine label="Cliente" value="Empresa ABC" />}
          {s.showProjectName && <InfoLine label="Projeto" value="Estrutura metálica" />}
          {s.showDate && <InfoLine label="Data" value={new Date().toLocaleDateString("pt-BR")} />}
          {s.showUtilizationPercent && <InfoLine label="Aproveitamento" value="87.5%" />}
          {s.showWasteArea && <InfoLine label="Sobra total" value="0.0875 m²" />}
          {s.showEstimatedCost && <InfoLine label="Custo estimado" value="R$ 245,00" />}
        </div>

        {/* Pieces table */}
        {s.showPiecesTable && (
          <div className="mt-2 border border-gray-300 rounded overflow-hidden text-[7px]">
            <div className="grid grid-cols-5 bg-blue-500 text-white font-bold">
              <span className="px-1 py-0.5">Peça</span>
              <span className="px-1 py-0.5">Descrição</span>
              <span className="px-1 py-0.5">Larg</span>
              <span className="px-1 py-0.5">Alt</span>
              <span className="px-1 py-0.5">Qtd</span>
            </div>
            <div className="grid grid-cols-5 text-gray-700 bg-gray-50">
              <span className="px-1 py-0.5">{s.piecePrefix}1</span>
              <span className="px-1 py-0.5">Base</span>
              <span className="px-1 py-0.5">200</span>
              <span className="px-1 py-0.5">100</span>
              <span className="px-1 py-0.5">2</span>
            </div>
            <div className="grid grid-cols-5 text-gray-700">
              <span className="px-1 py-0.5">{s.piecePrefix}2</span>
              <span className="px-1 py-0.5">Reforço</span>
              <span className="px-1 py-0.5">150</span>
              <span className="px-1 py-0.5">80</span>
              <span className="px-1 py-0.5">2</span>
            </div>
          </div>
        )}

        {/* Breakdown table */}
        {s.showBreakdownTable && (
          <div className="mt-1.5 border border-gray-300 rounded overflow-hidden text-[7px]">
            <div className="grid grid-cols-3 bg-green-500 text-white font-bold">
              <span className="px-1 py-0.5">Chapa</span>
              <span className="px-1 py-0.5">Peças</span>
              <span className="px-1 py-0.5">Aproveit.</span>
            </div>
            <div className="grid grid-cols-3 text-gray-700 bg-gray-50">
              <span className="px-1 py-0.5">Chapa 1</span>
              <span className="px-1 py-0.5">4</span>
              <span className="px-1 py-0.5">87.5%</span>
            </div>
          </div>
        )}

        {/* Layout drawing */}
        {s.showLayoutDrawings && (
          <div className="mt-2 flex-1 min-h-0">
            <p className="text-[8px] font-bold text-gray-700 text-center mb-1">Chapa 1 — Aproveitamento: 87.5%</p>
            <div className="relative bg-gray-100 border border-gray-400 rounded-sm mx-auto" style={{ width: "95%", aspectRatio: "10 / 7" }}>
              {/* Material dimension labels */}
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[6px] text-gray-500">1000 mm</span>
              <span className="absolute top-1/2 -left-1 -translate-y-1/2 -rotate-90 text-[6px] text-gray-500">700 mm</span>

              {/* Pieces */}
              {mockPieces.map((p, i) => (
                <div
                  key={i}
                  className="absolute flex flex-col items-center justify-center overflow-hidden"
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width: `${p.w}%`,
                    height: `${p.h}%`,
                    backgroundColor: PIECE_COLORS[(p.idx - 1) % PIECE_COLORS.length],
                    border: "1px solid rgba(255,255,255,0.6)",
                  }}
                >
                  <span className="text-white font-bold leading-none" style={{ fontSize: Math.max(6, s.pieceMainLabelSize * 0.8) }}>
                    {buildPieceLabel(p.idx)}
                  </span>
                  {s.showPieceDimensions && (
                    <span className="text-white/90 leading-none mt-0.5" style={{ fontSize: Math.max(5, s.pieceSubLabelSize * 0.8) }}>
                      {buildPieceDim(p.idx)}
                    </span>
                  )}
                </div>
              ))}

              {/* Waste area */}
              {s.showWasteArea && (
                <div
                  className="absolute border border-dashed border-orange-400 flex items-center justify-center"
                  style={{ left: "94%", top: "0%", width: "6%", height: "100%" }}
                >
                  <span className="text-[5px] text-orange-500 rotate-90 whitespace-nowrap">Sobra</span>
                </div>
              )}
            </div>

            {/* Legend */}
            {s.showLegend && (
              <div className="flex items-center gap-3 mt-1.5 justify-center" style={{ fontSize: s.legendFontSize * 0.9 }}>
                <span className="font-bold text-gray-700">Legenda:</span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2 bg-gray-200 border border-gray-400 rounded-sm" />
                  <span className="text-gray-600">Material</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2 bg-blue-500 rounded-sm" />
                  <span className="text-gray-600">Peça</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2 border border-dashed border-orange-400 rounded-sm" />
                  <span className="text-gray-600">Sobra</span>
                </span>
              </div>
            )}

            {/* Tube bar preview below the sheet */}
            <p className="text-[8px] font-bold text-gray-700 text-center mt-3 mb-1">Visualização de Barras (Tubos)</p>
            <div className="flex gap-3 justify-center">
              {mockBars.map((bar, bi) => (
                <div key={bi} className="flex flex-col items-center">
                  <span className="font-bold text-gray-700 mb-0.5" style={{ fontSize: s.barTitleFontSize * 0.9 }}>
                    Barra {bi + 1}
                  </span>
                  {s.showUtilizationPercent && (
                    <span className="text-gray-500 mb-0.5" style={{ fontSize: Math.max(5, s.barTitleFontSize * 0.8) }}>
                      {bar.util.toFixed(1)}%
                    </span>
                  )}
                  <div className="relative bg-gray-100 border border-gray-400 rounded-sm" style={{ width: 22, height: 90 }}>
                    {bar.segments.map((seg, si) => (
                      <div
                        key={si}
                        className="absolute left-0 w-full flex flex-col items-center justify-center"
                        style={{
                          top: `${seg.pos}%`,
                          height: `${seg.len}%`,
                          backgroundColor: PIECE_COLORS[(seg.idx - 1) % PIECE_COLORS.length],
                        }}
                      >
                        {s.showPieceIndex && (
                          <span className="text-white font-bold leading-none" style={{ fontSize: Math.max(5, s.pieceMainLabelSize * 0.6) }}>
                            {s.piecePrefix}{seg.idx}
                          </span>
                        )}
                        {s.showPieceDimensions && (
                          <span className="text-white/90 leading-none" style={{ fontSize: Math.max(4, s.pieceSubLabelSize * 0.6) }}>
                            500mm
                          </span>
                        )}
                      </div>
                    ))}
                    {/* Kerf lines */}
                    {s.showKerfLines && bar.segments.length > 1 && (
                      <div className="absolute left-0 w-full border-t-2 border-red-500" style={{ top: `${bar.segments[0].len + 1}%` }} />
                    )}
                    {/* Waste */}
                    {s.showWasteArea && bar.waste > 0 && (
                      <div
                        className="absolute left-0 w-full border-t border-dashed border-orange-400 flex items-center justify-center"
                        style={{ top: `${100 - bar.waste}%`, height: `${bar.waste}%` }}
                      >
                        <span className="text-[4px] text-orange-500">Sobra</span>
                      </div>
                    )}
                  </div>
                  {s.showBarTotalLength && (
                    <span className="text-gray-500 mt-0.5" style={{ fontSize: 5 }}>6000 mm</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="leading-tight">
      <span className="font-bold">{label}:</span> {value}
    </p>
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
