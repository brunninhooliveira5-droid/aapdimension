import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Upload, FileText, Clock, DollarSign, TrendingUp, Download, Save, Ruler, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { PricingData } from "./PricingSimulator";
import type { Tables } from "@/integrations/supabase/types";
import jsPDF from "jspdf";
import "jspdf-autotable";

const MATERIALS = [
  { value: "aço_carbono", label: "Aço Carbono" },
  { value: "aço_inox", label: "Aço Inoxidável" },
  { value: "alumínio", label: "Alumínio" },
  { value: "latão", label: "Latão" },
  { value: "cobre", label: "Cobre" },
  { value: "acrílico", label: "Acrílico" },
  { value: "mdf", label: "MDF" },
  { value: "compensado", label: "Compensado" },
];

const THICKNESSES = [
  { value: "0.5", label: "0,5 mm" },
  { value: "1", label: "1 mm" },
  { value: "1.5", label: "1,5 mm" },
  { value: "2", label: "2 mm" },
  { value: "3", label: "3 mm" },
  { value: "4", label: "4 mm" },
  { value: "5", label: "5 mm" },
  { value: "6", label: "6 mm" },
  { value: "8", label: "8 mm" },
  { value: "10", label: "10 mm" },
  { value: "12", label: "12 mm" },
  { value: "15", label: "15 mm" },
  { value: "20", label: "20 mm" },
  { value: "25", label: "25 mm" },
];

// Speed factor: thicker material = slower cut
const getSpeedFactor = (thickness: number): number => {
  if (thickness <= 1) return 1;
  if (thickness <= 3) return 0.7;
  if (thickness <= 6) return 0.45;
  if (thickness <= 10) return 0.3;
  if (thickness <= 15) return 0.2;
  return 0.12;
};

function parseSVGPathLength(svgText: string): number {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  let totalLength = 0;

  // Get all path elements
  const paths = doc.querySelectorAll("path");
  paths.forEach((path) => {
    try {
      totalLength += path.getTotalLength();
    } catch {
      // fallback: estimate from d attribute
    }
  });

  // Lines
  doc.querySelectorAll("line").forEach((line) => {
    const x1 = parseFloat(line.getAttribute("x1") || "0");
    const y1 = parseFloat(line.getAttribute("y1") || "0");
    const x2 = parseFloat(line.getAttribute("x2") || "0");
    const y2 = parseFloat(line.getAttribute("y2") || "0");
    totalLength += Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  });

  // Circles
  doc.querySelectorAll("circle").forEach((circle) => {
    const r = parseFloat(circle.getAttribute("r") || "0");
    totalLength += 2 * Math.PI * r;
  });

  // Rects
  doc.querySelectorAll("rect").forEach((rect) => {
    const w = parseFloat(rect.getAttribute("width") || "0");
    const h = parseFloat(rect.getAttribute("height") || "0");
    totalLength += 2 * (w + h);
  });

  // Polylines & polygons
  doc.querySelectorAll("polyline, polygon").forEach((el) => {
    const points = (el.getAttribute("points") || "").trim().split(/[\s,]+/).map(Number);
    for (let i = 0; i < points.length - 2; i += 2) {
      const dx = points[i + 2] - points[i];
      const dy = points[i + 3] - points[i + 1];
      totalLength += Math.sqrt(dx * dx + dy * dy);
    }
    if (el.tagName === "polygon" && points.length >= 4) {
      const dx = points[0] - points[points.length - 2];
      const dy = points[1] - points[points.length - 1];
      totalLength += Math.sqrt(dx * dx + dy * dy);
    }
  });

  // Ellipses
  doc.querySelectorAll("ellipse").forEach((ellipse) => {
    const rx = parseFloat(ellipse.getAttribute("rx") || "0");
    const ry = parseFloat(ellipse.getAttribute("ry") || "0");
    // Approximation
    totalLength += Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  });

  return totalLength;
}

async function parseDXFPathLength(text: string): Promise<number> {
  const DxfParser = (await import("dxf-parser")).default;
  const parser = new DxfParser();
  let dxf: any;
  try {
    dxf = parser.parseSync(text);
  } catch {
    throw new Error("Arquivo DXF inválido.");
  }

  let totalLength = 0;
  if (!dxf?.entities) return 0;

  for (const entity of dxf.entities) {
    switch (entity.type) {
      case "LINE": {
        const dx = entity.vertices[1].x - entity.vertices[0].x;
        const dy = entity.vertices[1].y - entity.vertices[0].y;
        totalLength += Math.sqrt(dx * dx + dy * dy);
        break;
      }
      case "CIRCLE":
        totalLength += 2 * Math.PI * entity.radius;
        break;
      case "ARC": {
        const startAngle = (entity.startAngle * Math.PI) / 180;
        const endAngle = (entity.endAngle * Math.PI) / 180;
        let angle = endAngle - startAngle;
        if (angle < 0) angle += 2 * Math.PI;
        totalLength += entity.radius * angle;
        break;
      }
      case "LWPOLYLINE":
      case "POLYLINE": {
        const verts = entity.vertices || [];
        for (let i = 0; i < verts.length - 1; i++) {
          const dx = verts[i + 1].x - verts[i].x;
          const dy = verts[i + 1].y - verts[i].y;
          totalLength += Math.sqrt(dx * dx + dy * dy);
        }
        if (entity.shape) {
          const dx = verts[0].x - verts[verts.length - 1].x;
          const dy = verts[0].y - verts[verts.length - 1].y;
          totalLength += Math.sqrt(dx * dx + dy * dy);
        }
        break;
      }
      case "ELLIPSE": {
        const rx = entity.majorAxisEndPoint ? Math.sqrt(entity.majorAxisEndPoint.x ** 2 + entity.majorAxisEndPoint.y ** 2) : 1;
        const ry = rx * (entity.axisRatio || 1);
        totalLength += Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
        break;
      }
      case "SPLINE": {
        const cp = entity.controlPoints || [];
        for (let i = 0; i < cp.length - 1; i++) {
          const dx = cp[i + 1].x - cp[i].x;
          const dy = cp[i + 1].y - cp[i].y;
          totalLength += Math.sqrt(dx * dx + dy * dy);
        }
        break;
      }
    }
  }

  return totalLength;
}

interface FileQuoteProps {
  pricing: PricingData;
  machines: Tables<"machines">[];
}

interface QuoteResult {
  fileName: string;
  pathLengthMM: number;
  pathLengthM: number;
  material: string;
  thickness: string;
  machineName: string;
  estimatedTimeMin: number;
  estimatedCost: number;
  minRecommended: number;
  suggestedSale: number;
}

export function FileQuote({ pricing, machines }: FileQuoteProps) {
  const { user, session } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [material, setMaterial] = useState("");
  const [thickness, setThickness] = useState("");
  const [machineId, setMachineId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuoteResult | null>(null);

  const generateDxfSvgPreview = useCallback(async (text: string) => {
    try {
      const DxfParser = (await import("dxf-parser")).default;
      const parser = new DxfParser();
      const dxf: any = parser.parseSync(text);
      if (!dxf?.entities?.length) return null;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const pathStrings: string[] = [];

      for (const entity of dxf.entities) {
        switch (entity.type) {
          case "LINE": {
            const [v0, v1] = entity.vertices;
            pathStrings.push(`<line x1="${v0.x}" y1="${-v0.y}" x2="${v1.x}" y2="${-v1.y}" />`);
            [v0, v1].forEach(v => { minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, -v.y); maxY = Math.max(maxY, -v.y); });
            break;
          }
          case "CIRCLE": {
            const cx = entity.center.x, cy = -entity.center.y, r = entity.radius;
            pathStrings.push(`<circle cx="${cx}" cy="${cy}" r="${r}" />`);
            minX = Math.min(minX, cx - r); maxX = Math.max(maxX, cx + r);
            minY = Math.min(minY, cy - r); maxY = Math.max(maxY, cy + r);
            break;
          }
          case "ARC": {
            const cx2 = entity.center.x, cy2 = -entity.center.y, r2 = entity.radius;
            const sa = (-entity.startAngle * Math.PI) / 180;
            const ea = (-entity.endAngle * Math.PI) / 180;
            const x1 = cx2 + r2 * Math.cos(sa), y1 = cy2 + r2 * Math.sin(sa);
            const x2 = cx2 + r2 * Math.cos(ea), y2 = cy2 + r2 * Math.sin(ea);
            let sweep = ea - sa; if (sweep < 0) sweep += 2 * Math.PI;
            const largeArc = sweep > Math.PI ? 1 : 0;
            pathStrings.push(`<path d="M ${x1} ${y1} A ${r2} ${r2} 0 ${largeArc} 0 ${x2} ${y2}" />`);
            [x1, x2].forEach(x => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); });
            [y1, y2].forEach(y => { minY = Math.min(minY, y); maxY = Math.max(maxY, y); });
            break;
          }
          case "LWPOLYLINE":
          case "POLYLINE": {
            const verts = entity.vertices || [];
            if (verts.length < 2) break;
            let d = `M ${verts[0].x} ${-verts[0].y}`;
            verts.forEach((v: any) => { minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, -v.y); maxY = Math.max(maxY, -v.y); });
            for (let i = 1; i < verts.length; i++) d += ` L ${verts[i].x} ${-verts[i].y}`;
            if (entity.shape) d += " Z";
            pathStrings.push(`<path d="${d}" />`);
            break;
          }
          case "ELLIPSE": {
            const ecx = entity.center.x, ecy = -entity.center.y;
            const rx = Math.sqrt(entity.majorAxisEndPoint.x ** 2 + entity.majorAxisEndPoint.y ** 2);
            const ry = rx * (entity.axisRatio || 1);
            const angle = Math.atan2(entity.majorAxisEndPoint.y, entity.majorAxisEndPoint.x) * (180 / Math.PI);
            pathStrings.push(`<ellipse cx="${ecx}" cy="${ecy}" rx="${rx}" ry="${ry}" transform="rotate(${-angle} ${ecx} ${ecy})" />`);
            minX = Math.min(minX, ecx - rx); maxX = Math.max(maxX, ecx + rx);
            minY = Math.min(minY, ecy - ry); maxY = Math.max(maxY, ecy + ry);
            break;
          }
          case "SPLINE": {
            const cp = entity.controlPoints || [];
            if (cp.length < 2) break;
            let d = `M ${cp[0].x} ${-cp[0].y}`;
            cp.forEach((p: any) => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, -p.y); maxY = Math.max(maxY, -p.y); });
            for (let i = 1; i < cp.length; i++) d += ` L ${cp[i].x} ${-cp[i].y}`;
            pathStrings.push(`<path d="${d}" />`);
            break;
          }
        }
      }

      const pad = Math.max((maxX - minX), (maxY - minY)) * 0.05 || 10;
      const vbX = minX - pad, vbY = minY - pad;
      const vbW = (maxX - minX) + pad * 2, vbH = (maxY - minY) + pad * 2;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" style="width:100%;height:100%">
        <g fill="none" stroke="hsl(38, 92%, 55%)" stroke-width="${Math.max(vbW, vbH) * 0.003}">
          ${pathStrings.join("\n")}
        </g>
      </svg>`;
    } catch {
      return null;
    }
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext !== "dxf" && ext !== "svg") {
      toast.error("Apenas arquivos DXF ou SVG são aceitos.");
      return;
    }
    setFile(f);
    setResult(null);

    // Generate preview
    const text = await f.text();
    if (ext === "svg") {
      setFilePreview(text);
    } else {
      const svgPreview = await generateDxfSvgPreview(text);
      setFilePreview(svgPreview);
    }
  };

  const calculate = async () => {
    if (!file || !material || !thickness || !machineId) {
      toast.error("Preencha todos os campos antes de calcular.");
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();
      const ext = file.name.split(".").pop()?.toLowerCase();

      let pathLengthUnits = 0;
      if (ext === "svg") {
        pathLengthUnits = parseSVGPathLength(text);
      } else {
        pathLengthUnits = await parseDXFPathLength(text);
      }

      // Assume units are mm for DXF, px for SVG (≈ 0.2646 mm/px at 96dpi)
      const pathLengthMM = ext === "svg" ? pathLengthUnits * 0.2646 : pathLengthUnits;
      const pathLengthM = pathLengthMM / 1000;

      const thicknessNum = parseFloat(thickness);
      const speedFactor = getSpeedFactor(thicknessNum);
      const baseCutSpeed = 2; // m/min baseline
      const effectiveSpeed = baseCutSpeed * speedFactor;
      const estimatedTimeMin = effectiveSpeed > 0 ? (pathLengthM / effectiveSpeed) * quantity : 0;

      const estimatedCost = estimatedTimeMin * pricing.costPerMinute;
      const minRecommended = estimatedTimeMin * pricing.minPrice;
      const suggestedSale = estimatedTimeMin * pricing.suggestedPrice;

      const machine = machines.find((m) => m.id === machineId);
      const materialLabel = MATERIALS.find((m) => m.value === material)?.label || material;

      setResult({
        fileName: file.name,
        pathLengthMM,
        pathLengthM,
        material: materialLabel,
        thickness: `${thickness} mm`,
        machineName: machine?.model || "—",
        estimatedTimeMin: Math.round(estimatedTimeMin * 100) / 100,
        estimatedCost: Math.round(estimatedCost * 100) / 100,
        minRecommended: Math.round(minRecommended * 100) / 100,
        suggestedSale: Math.round(suggestedSale * 100) / 100,
      });
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar o arquivo.");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const exportPDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Orçamento de Corte CNC", 14, 22);
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 14, 30);

    (doc as any).autoTable({
      startY: 38,
      head: [["Item", "Valor"]],
      body: [
        ["Arquivo", result.fileName],
        ["Material", result.material],
        ["Espessura", result.thickness],
        ["Máquina", result.machineName],
        ["Comprimento de Corte", `${result.pathLengthM.toFixed(2)} m`],
        ["Quantidade", `${quantity}`],
        ["Tempo Estimado", `${result.estimatedTimeMin.toFixed(2)} min`],
        ["Custo Estimado", fmt(result.estimatedCost)],
        ["Preço Mínimo", fmt(result.minRecommended)],
        ["Preço Sugerido", fmt(result.suggestedSale)],
      ],
      theme: "striped",
      styles: { fontSize: 10 },
    });

    doc.save(`orcamento_${result.fileName.replace(/\.\w+$/, "")}.pdf`);
    toast.success("PDF exportado com sucesso!");
  };

  const saveQuote = async () => {
    if (!result || !session?.user) return;
    const { error } = await supabase.from("cutting_quotes" as any).insert({
      user_id: session.user.id,
      file_name: result.fileName,
      material: result.material,
      thickness: result.thickness,
      machine_id: machineId,
      machine_name: result.machineName,
      path_length_mm: result.pathLengthMM,
      path_length_m: result.pathLengthM,
      quantity,
      estimated_time_min: result.estimatedTimeMin,
      estimated_cost: result.estimatedCost,
      min_recommended: result.minRecommended,
      suggested_sale: result.suggestedSale,
      cost_per_minute: pricing.costPerMinute,
    } as any);
    if (error) {
      toast.error("Erro ao salvar orçamento.");
      console.error(error);
    } else {
      toast.success("Orçamento salvo com sucesso!");
    }
  };

  return (
    <div className="space-y-6">
      {/* File Preview */}
      {filePreview && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Visualização do Arquivo
            </CardTitle>
            <CardDescription>{file?.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="w-full h-[300px] bg-secondary/30 rounded-lg border border-border flex items-center justify-center overflow-hidden p-4"
              dangerouslySetInnerHTML={{ __html: filePreview }}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              Dados do Corte
            </CardTitle>
            <CardDescription>Faça upload do arquivo e configure os parâmetros</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Upload */}
            <div>
              <Label className="text-xs">Arquivo (DXF ou SVG)</Label>
              <div
                className="mt-1 border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept=".dxf,.svg" className="hidden" onChange={handleFile} />
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="text-foreground font-medium">{file.name}</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Clique para enviar arquivo DXF ou SVG</p>
                  </div>
                )}
              </div>
            </div>

            {/* Material */}
            <div>
              <Label className="text-xs">Material</Label>
              <Select value={material} onValueChange={setMaterial}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o material" />
                </SelectTrigger>
                <SelectContent>
                  {MATERIALS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Thickness */}
            <div>
              <Label className="text-xs">Espessura</Label>
              <Select value={thickness} onValueChange={setThickness}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a espessura" />
                </SelectTrigger>
                <SelectContent>
                  {THICKNESSES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Machine */}
            <div>
              <Label className="text-xs">Máquina</Label>
              <Select value={machineId} onValueChange={setMachineId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a máquina" />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.model} — {m.serial_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div>
              <Label className="text-xs">Quantidade de Peças</Label>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))} />
            </div>

            <Button onClick={calculate} disabled={loading} className="w-full">
              {loading ? "Calculando..." : "Calcular Orçamento"}
            </Button>
          </CardContent>
        </Card>

        {/* Results Card */}
        {result && (
          <Card className="gradient-card border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Resultado do Orçamento
              </CardTitle>
              <CardDescription>{result.fileName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Material</p>
                  <p className="text-sm font-medium">{result.material}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Espessura</p>
                  <p className="text-sm font-medium">{result.thickness}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Máquina</p>
                  <p className="text-sm font-medium">{result.machineName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Ruler className="w-3 h-3" /> Comprimento</p>
                  <p className="text-sm font-medium">{result.pathLengthM.toFixed(2)} m</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-secondary/50 border-border">
                  <CardContent className="p-3 text-center">
                    <Clock className="w-5 h-5 text-info mx-auto mb-1" />
                    <p className="text-[10px] text-muted-foreground">Tempo Estimado</p>
                    <p className="text-lg font-bold">{result.estimatedTimeMin.toFixed(1)} min</p>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/50 border-border">
                  <CardContent className="p-3 text-center">
                    <DollarSign className="w-5 h-5 text-warning mx-auto mb-1" />
                    <p className="text-[10px] text-muted-foreground">Custo Estimado</p>
                    <p className="text-lg font-bold text-warning">{fmt(result.estimatedCost)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/50 border-border">
                  <CardContent className="p-3 text-center">
                    <DollarSign className="w-5 h-5 text-destructive mx-auto mb-1" />
                    <p className="text-[10px] text-muted-foreground">Preço Mínimo</p>
                    <p className="text-lg font-bold text-destructive">{fmt(result.minRecommended)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/50 border-border">
                  <CardContent className="p-3 text-center">
                    <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
                    <p className="text-[10px] text-muted-foreground">Preço Sugerido</p>
                    <p className="text-lg font-bold text-primary">{fmt(result.suggestedSale)}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={exportPDF}>
                  <Download className="w-4 h-4" /> Exportar PDF
                </Button>
                <Button className="flex-1 gap-2" onClick={saveQuote}>
                  <Save className="w-4 h-4" /> Salvar Orçamento
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
