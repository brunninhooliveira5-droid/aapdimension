import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Upload, FileText, Clock, DollarSign, TrendingUp, Download, Save, Ruler, Eye, X, Package, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { PricingData } from "./PricingSimulator";
import type { Tables } from "@/integrations/supabase/types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { PdfSettings } from "./PdfConfiguration";

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

  const paths = doc.querySelectorAll("path");
  paths.forEach((path) => {
    try {
      totalLength += path.getTotalLength();
    } catch { /* fallback */ }
  });

  doc.querySelectorAll("line").forEach((line) => {
    const x1 = parseFloat(line.getAttribute("x1") || "0");
    const y1 = parseFloat(line.getAttribute("y1") || "0");
    const x2 = parseFloat(line.getAttribute("x2") || "0");
    const y2 = parseFloat(line.getAttribute("y2") || "0");
    totalLength += Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  });

  doc.querySelectorAll("circle").forEach((circle) => {
    const r = parseFloat(circle.getAttribute("r") || "0");
    totalLength += 2 * Math.PI * r;
  });

  doc.querySelectorAll("rect").forEach((rect) => {
    const w = parseFloat(rect.getAttribute("width") || "0");
    const h = parseFloat(rect.getAttribute("height") || "0");
    totalLength += 2 * (w + h);
  });

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

  doc.querySelectorAll("ellipse").forEach((ellipse) => {
    const rx = parseFloat(ellipse.getAttribute("rx") || "0");
    const ry = parseFloat(ellipse.getAttribute("ry") || "0");
    totalLength += Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  });

  return totalLength;
}

// Parse SVG unit value, returns { value, unit }
function parseSVGDimension(attr: string | null): { value: number; unit: string } {
  if (!attr) return { value: 0, unit: "" };
  const match = attr.trim().match(/^([\d.]+)\s*(mm|cm|in|px|pt|%)?$/i);
  if (match) return { value: parseFloat(match[1]), unit: (match[2] || "").toLowerCase() };
  const num = parseFloat(attr);
  return { value: isNaN(num) ? 0 : num, unit: "" };
}

// Convert a value in a given unit to mm
function unitToMM(value: number, unit: string): number {
  switch (unit) {
    case "mm": return value;
    case "cm": return value * 10;
    case "in": return value * 25.4;
    case "pt": return value * 25.4 / 72;
    case "px": return value * 25.4 / 96;
    default: return value * 25.4 / 96; // unitless = px at 96dpi
  }
}

// Calculate bounding box of SVG elements in viewBox coordinate system
function computeSVGElementsBBox(svgEl: Element): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let found = false;

  const update = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    found = true;
  };

  svgEl.querySelectorAll("rect").forEach((r) => {
    const x = parseFloat(r.getAttribute("x") || "0");
    const y = parseFloat(r.getAttribute("y") || "0");
    const w = parseFloat(r.getAttribute("width") || "0");
    const h = parseFloat(r.getAttribute("height") || "0");
    update(x, y);
    update(x + w, y + h);
  });

  svgEl.querySelectorAll("circle").forEach((c) => {
    const cx = parseFloat(c.getAttribute("cx") || "0");
    const cy = parseFloat(c.getAttribute("cy") || "0");
    const r = parseFloat(c.getAttribute("r") || "0");
    update(cx - r, cy - r);
    update(cx + r, cy + r);
  });

  svgEl.querySelectorAll("ellipse").forEach((e) => {
    const cx = parseFloat(e.getAttribute("cx") || "0");
    const cy = parseFloat(e.getAttribute("cy") || "0");
    const rx = parseFloat(e.getAttribute("rx") || "0");
    const ry = parseFloat(e.getAttribute("ry") || "0");
    update(cx - rx, cy - ry);
    update(cx + rx, cy + ry);
  });

  svgEl.querySelectorAll("line").forEach((l) => {
    update(parseFloat(l.getAttribute("x1") || "0"), parseFloat(l.getAttribute("y1") || "0"));
    update(parseFloat(l.getAttribute("x2") || "0"), parseFloat(l.getAttribute("y2") || "0"));
  });

  svgEl.querySelectorAll("polyline, polygon").forEach((el) => {
    const pts = (el.getAttribute("points") || "").trim().split(/[\s,]+/).map(Number);
    for (let i = 0; i < pts.length - 1; i += 2) update(pts[i], pts[i + 1]);
  });

  svgEl.querySelectorAll("path").forEach((p) => {
    const d = p.getAttribute("d") || "";
    // Extract numeric coords from path data for rough bbox
    const nums = d.match(/-?[\d.]+/g);
    if (nums) {
      for (let i = 0; i < nums.length - 1; i += 2) {
        update(parseFloat(nums[i]), parseFloat(nums[i + 1]));
      }
    }
  });

  return found ? { minX, minY, maxX, maxY } : null;
}

interface SVGBBoxResult {
  widthMM: number;
  heightMM: number;
  diagnosis: string;
}

// Calculate bounding box area of SVG content in real mm
function parseSVGBBoxMM(svgText: string): SVGBBoxResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  const svgEl = doc.querySelector("svg");
  if (!svgEl) return { widthMM: 0, heightMM: 0, diagnosis: "SVG não encontrado" };

  const widthAttr = svgEl.getAttribute("width");
  const heightAttr = svgEl.getAttribute("height");
  const viewBoxAttr = svgEl.getAttribute("viewBox");

  const wDim = parseSVGDimension(widthAttr);
  const hDim = parseSVGDimension(heightAttr);

  // Determine detected unit
  const detectedUnit = wDim.unit || hDim.unit || "px";
  const isPixelBased = detectedUnit === "px" || detectedUnit === "" || detectedUnit === "pt";

  // Convert document width/height to mm
  const docWidthMM = wDim.value > 0 ? unitToMM(wDim.value, wDim.unit || "px") : 0;
  const docHeightMM = hDim.value > 0 ? unitToMM(hDim.value, hDim.unit || "px") : 0;

  // Parse viewBox
  let vbX = 0, vbY = 0, vbW = 0, vbH = 0;
  let hasViewBox = false;
  if (viewBoxAttr) {
    const parts = viewBoxAttr.split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      [vbX, vbY, vbW, vbH] = parts;
      hasViewBox = true;
    }
  }

  // Determine scale: viewBox units → mm
  let scaleX = 1;
  let scaleY = 1;
  if (hasViewBox && docWidthMM > 0 && docHeightMM > 0) {
    scaleX = docWidthMM / vbW;
    scaleY = docHeightMM / vbH;
  } else if (hasViewBox && (docWidthMM === 0 || docHeightMM === 0)) {
    // No explicit width/height but has viewBox — treat viewBox units as px
    scaleX = 25.4 / 96;
    scaleY = 25.4 / 96;
  } else if (!hasViewBox && docWidthMM > 0) {
    // No viewBox, width/height define the coordinate space directly
    // The coordinate units ARE the document units
    scaleX = docWidthMM / wDim.value;
    scaleY = docHeightMM / hDim.value;
  } else {
    // No viewBox, no width/height → assume px
    scaleX = 25.4 / 96;
    scaleY = 25.4 / 96;
  }

  // Compute element bounding box in viewBox/coordinate units
  const elementsBBox = computeSVGElementsBBox(svgEl);

  let finalWidthMM: number;
  let finalHeightMM: number;

  if (elementsBBox) {
    // Use actual element bounds
    finalWidthMM = (elementsBBox.maxX - elementsBBox.minX) * scaleX;
    finalHeightMM = (elementsBBox.maxY - elementsBBox.minY) * scaleY;
  } else if (hasViewBox) {
    finalWidthMM = vbW * scaleX;
    finalHeightMM = vbH * scaleY;
  } else {
    finalWidthMM = docWidthMM;
    finalHeightMM = docHeightMM;
  }

  const diagnosis = `Unidade detectada: ${detectedUnit}${isPixelBased ? " | DPI assumido: 96" : ""} | width/height: ${widthAttr || "N/A"} × ${heightAttr || "N/A"} | viewBox: ${viewBoxAttr || "N/A"}`;

  return {
    widthMM: Math.abs(finalWidthMM),
    heightMM: Math.abs(finalHeightMM),
    diagnosis,
  };
}

// Calculate bounding box area of DXF content in DXF units (mm)
function parseDXFBBoxArea(dxf: any): { width: number; height: number } {
  if (!dxf?.entities) return { width: 0, height: 0 };

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  const updateBounds = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };

  for (const entity of dxf.entities) {
    switch (entity.type) {
      case "LINE":
        entity.vertices?.forEach((v: any) => updateBounds(v.x, v.y));
        break;
      case "CIRCLE":
        updateBounds(entity.center.x - entity.radius, entity.center.y - entity.radius);
        updateBounds(entity.center.x + entity.radius, entity.center.y + entity.radius);
        break;
      case "ARC":
        updateBounds(entity.center.x - entity.radius, entity.center.y - entity.radius);
        updateBounds(entity.center.x + entity.radius, entity.center.y + entity.radius);
        break;
      case "LWPOLYLINE":
      case "POLYLINE":
        entity.vertices?.forEach((v: any) => updateBounds(v.x, v.y));
        break;
      case "ELLIPSE": {
        const rx = entity.majorAxisEndPoint ? Math.sqrt(entity.majorAxisEndPoint.x ** 2 + entity.majorAxisEndPoint.y ** 2) : 1;
        const ry = rx * (entity.axisRatio || 1);
        updateBounds(entity.center.x - rx, entity.center.y - ry);
        updateBounds(entity.center.x + rx, entity.center.y + ry);
        break;
      }
      case "SPLINE":
        entity.controlPoints?.forEach((v: any) => updateBounds(v.x, v.y));
        break;
    }
  }

  if (minX === Infinity) return { width: 0, height: 0 };
  return { width: maxX - minX, height: maxY - minY };
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
  sheetM2: number;
  pricePerM2: number;
  unitPrice: number;
  fileAreaM2: number;
  bboxWidthMM: number;
  bboxHeightMM: number;
  svgDiagnosis?: string;
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
  const [editablePrice, setEditablePrice] = useState(0);
  const [editableMaterialPriceM2, setEditableMaterialPriceM2] = useState(0);
  const [editableMaterialM2, setEditableMaterialM2] = useState(0);
  const [editableMaterialCost, setEditableMaterialCost] = useState(0);
  const [materialOwner, setMaterialOwner] = useState<"cliente" | "usuario">("cliente");
  const [customerName, setCustomerName] = useState("");
  const [deliveryDeadline, setDeliveryDeadline] = useState("");
  const [sheetMargin, setSheetMargin] = useState(10);
  const [customMaterials, setCustomMaterials] = useState<{ id: string; name: string; price_adjustment: number }[]>([]);
  const [pdfSettings, setPdfSettings] = useState<PdfSettings | null>(null);
  // Load custom materials
  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from("cutting_materials")
      .select("id, name, price_adjustment")
      .order("name")
      .then(({ data }) => {
        if (data) setCustomMaterials(data as any);
      });
  }, [session]);

  // Load PDF settings
  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from("pdf_quote_settings" as any)
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as any;
          setPdfSettings({
            company_name: d.company_name || "",
            company_phone: d.company_phone || "",
            company_email: d.company_email || "",
            company_address: d.company_address || "",
            company_cnpj: d.company_cnpj || "",
            logo_url: d.logo_url || "",
            primary_color: d.primary_color || "#1a1a2e",
            accent_color: d.accent_color || "#e94560",
            show_material: d.show_material ?? true,
            show_thickness: d.show_thickness ?? true,
            show_cutting_value: d.show_cutting_value ?? true,
            show_material_value: d.show_material_value ?? true,
            show_delivery: d.show_delivery ?? true,
            show_date: d.show_date ?? true,
            show_customer: d.show_customer ?? true,
            footer_text: d.footer_text || "",
          });
        }
      });
  }, [session]);

  // Load thicknesses for selected material in the quote form
  const [availableThicknesses, setAvailableThicknesses] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    if (!material) { setAvailableThicknesses([]); return; }
    const matId = material.replace("custom_", "");
    supabase
      .from("cutting_material_thicknesses")
      .select("value, label, sheet_width, sheet_height, unit_price")
      .eq("material_id", matId)
      .order("value")
      .then(({ data }) => {
        if (data) setAvailableThicknesses(data as any);
      });
  }, [material]);

  const allMaterials = customMaterials.map((m) => ({ value: `custom_${m.id}`, label: m.name }));

  const removeFile = () => {
    setFile(null);
    setFilePreview(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

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
      // Parse SVG, recalculate viewBox from actual content, apply visible colors
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(text, "image/svg+xml");
      const svgEl = svgDoc.querySelector("svg");
      if (svgEl) {
        // Remove fixed dimensions so it scales
        svgEl.removeAttribute("width");
        svgEl.removeAttribute("height");
        // Remove inline style that may override sizing
        svgEl.removeAttribute("style");

        // Inject style to force visible strokes on dark backgrounds
        const styleEl = svgDoc.createElementNS("http://www.w3.org/2000/svg", "style");
        styleEl.textContent = `* { stroke: hsl(38, 92%, 55%) !important; fill: none !important; stroke-width: 2 !important; } svg { overflow: visible; }`;
        svgEl.insertBefore(styleEl, svgEl.firstChild);

        // Temporarily render in a hidden container to calculate actual bounding box
        const tempDiv = document.createElement("div");
        tempDiv.style.cssText = "position:absolute;left:-9999px;top:-9999px;width:5000px;height:5000px;visibility:hidden;";
        document.body.appendChild(tempDiv);
        // Clone and render to get real bbox
        const tempSvg = svgEl.cloneNode(true) as SVGSVGElement;
        tempSvg.setAttribute("width", "5000");
        tempSvg.setAttribute("height", "5000");
        tempSvg.setAttribute("viewBox", "-5000 -5000 10000 10000");
        tempDiv.appendChild(tempSvg);

        try {
          // Get bounding box of all content
          const shapes = tempSvg.querySelectorAll("rect, circle, ellipse, line, polyline, polygon, path");
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

          shapes.forEach((shape) => {
            try {
              const bbox = (shape as SVGGraphicsElement).getBBox();
              if (bbox.width > 0 || bbox.height > 0) {
                minX = Math.min(minX, bbox.x);
                minY = Math.min(minY, bbox.y);
                maxX = Math.max(maxX, bbox.x + bbox.width);
                maxY = Math.max(maxY, bbox.y + bbox.height);
              }
            } catch { /* skip */ }
          });

          if (minX !== Infinity) {
            const pad = Math.max(maxX - minX, maxY - minY) * 0.05 || 10;
            svgEl.setAttribute("viewBox", `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`);
          }
        } catch { /* keep original viewBox */ }

        document.body.removeChild(tempDiv);

        // Convert to base64 data URI for <img> rendering
        const svgString = new XMLSerializer().serializeToString(svgEl);
        const encoded = btoa(unescape(encodeURIComponent(svgString)));
        setFilePreview(`data:image/svg+xml;base64,${encoded}`);
      } else {
        const encoded = btoa(unescape(encodeURIComponent(text)));
        setFilePreview(`data:image/svg+xml;base64,${encoded}`);
      }
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
      let fileAreaM2 = 0;
      let bboxWidthMM = 0;
      let bboxHeightMM = 0;

      let svgDiagnosis: string | undefined;

      if (ext === "svg") {
        pathLengthUnits = parseSVGPathLength(text);
        const svgBBox = parseSVGBBoxMM(text);
        bboxWidthMM = svgBBox.widthMM;
        bboxHeightMM = svgBBox.heightMM;
        svgDiagnosis = svgBBox.diagnosis;
        fileAreaM2 = (bboxWidthMM * bboxHeightMM) / 1_000_000;
      } else {
        pathLengthUnits = await parseDXFPathLength(text);
        const DxfParser = (await import("dxf-parser")).default;
        const dxfParser = new DxfParser();
        try {
          const dxf = dxfParser.parseSync(text);
          const bbox = parseDXFBBoxArea(dxf);
          bboxWidthMM = bbox.width;
          bboxHeightMM = bbox.height;
          fileAreaM2 = (bboxWidthMM * bboxHeightMM) / 1_000_000;
        } catch { /* ignore */ }
      }

      // For SVG: use the same scale derived from parseSVGBBoxMM for path length
      // The parseSVGPathLength returns in viewBox units; we need to convert to mm
      let pathLengthMM: number;
      if (ext === "svg") {
        // Determine scale from SVG document
        const tempParser = new DOMParser();
        const tempDoc = tempParser.parseFromString(text, "image/svg+xml");
        const tempSvg = tempDoc.querySelector("svg");
        let svgScale = 25.4 / 96; // default px→mm
        if (tempSvg) {
          const wA = tempSvg.getAttribute("width");
          const hA = tempSvg.getAttribute("height");
          const vbA = tempSvg.getAttribute("viewBox");
          const wD = parseSVGDimension(wA);
          const vbParts = vbA?.split(/[\s,]+/).map(Number);
          if (wD.value > 0 && vbParts && vbParts.length === 4 && vbParts[2] > 0) {
            svgScale = unitToMM(wD.value, wD.unit || "px") / vbParts[2];
          } else if (wD.value > 0 && wD.unit) {
            svgScale = unitToMM(1, wD.unit || "px");
          }
        }
        pathLengthMM = pathLengthUnits * svgScale;
      } else {
        pathLengthMM = pathLengthUnits; // DXF already in mm
      }
      const pathLengthM = pathLengthMM / 1000;

      const thicknessNum = parseFloat(thickness);
      const speedFactor = getSpeedFactor(thicknessNum);
      const baseCutSpeed = 2; // m/min baseline
      const effectiveSpeed = baseCutSpeed * speedFactor;
      const estimatedTimeMin = effectiveSpeed > 0 ? (pathLengthM / effectiveSpeed) * quantity : 0;

      const estimatedCost = estimatedTimeMin * pricing.costPerMinute;
      const minRecommended = estimatedTimeMin * pricing.minPrice;
      // Apply material-specific price adjustment
      const matId = material.replace("custom_", "");
      const currentMat = customMaterials.find((m) => m.id === matId);
      const adjustment = currentMat?.price_adjustment || 0;
      const suggestedSale = estimatedTimeMin * pricing.suggestedPrice * (1 + adjustment / 100);

      const machine = machines.find((m) => m.id === machineId);
      const materialLabel = allMaterials.find((m) => m.value === material)?.label || material;

      // Get sheet/material info from selected thickness
      const selectedThickness = availableThicknesses.find((t: any) => t.value === thickness) as any;
      const sheetW = selectedThickness?.sheet_width || 0;
      const sheetH = selectedThickness?.sheet_height || 0;
      const unitPrice = selectedThickness?.unit_price || 0;
      const sheetM2 = sheetW > 0 && sheetH > 0 ? (sheetW * sheetH) / 1_000_000 : 0;
      const pricePerM2 = sheetM2 > 0 && unitPrice > 0 ? unitPrice / sheetM2 : 0;

      const roundedFileAreaM2 = Math.round(fileAreaM2 * 10000) / 10000;

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
        sheetM2: Math.round(sheetM2 * 10000) / 10000,
        pricePerM2: Math.round(pricePerM2 * 100) / 100,
        unitPrice: Math.round(unitPrice * 100) / 100,
        fileAreaM2: roundedFileAreaM2,
        bboxWidthMM: Math.round(bboxWidthMM * 100) / 100,
        bboxHeightMM: Math.round(bboxHeightMM * 100) / 100,
        svgDiagnosis,
      });
      setEditablePrice(Math.round(suggestedSale * 100) / 100);
      const calcPriceM2 = Math.round(pricePerM2 * 100) / 100;
      setEditableMaterialPriceM2(calcPriceM2);
      setEditableMaterialM2(roundedFileAreaM2);
      setEditableMaterialCost(Math.round(calcPriceM2 * roundedFileAreaM2 * 100) / 100);
      setMaterialOwner("cliente");
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar o arquivo.");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const materialCost = materialOwner === "usuario" && result ? editableMaterialPriceM2 * editableMaterialM2 * quantity : 0;
  const totalPrice = editablePrice + materialCost;

  const exportPDF = async () => {
    if (!result) return;
    try {
    const s = pdfSettings;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    // Parse hex color to RGB
    const hexToRgb = (hex: string): [number, number, number] => {
      const h = hex.replace("#", "");
      return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
    };
    const primaryRgb = hexToRgb(s?.primary_color || "#1a1a2e");
    const accentRgb = hexToRgb(s?.accent_color || "#e94560");

    let yPos = 14;

    // Header with color bar
    doc.setFillColor(...primaryRgb);
    doc.rect(0, 0, pageW, 32, "F");

    // Logo
    if (s?.logo_url) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = s.logo_url;
        });
        if (img.complete && img.naturalWidth > 0) {
          const ratio = img.naturalWidth / img.naturalHeight;
          const logoH = 18;
          const logoW = logoH * ratio;
          doc.addImage(img, "PNG", 14, 7, logoW, logoH);
        }
      } catch { /* skip logo */ }
    }

    // Company name in header
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    const companyName = s?.company_name || "Orçamento de Corte CNC";
    doc.text(companyName, pageW - 14, 16, { align: "right" });

    // Company contact in header
    doc.setFontSize(8);
    const contactParts: string[] = [];
    if (s?.company_phone) contactParts.push(s.company_phone);
    if (s?.company_email) contactParts.push(s.company_email);
    if (contactParts.length > 0) {
      doc.text(contactParts.join(" | "), pageW - 14, 23, { align: "right" });
    }
    if (s?.company_cnpj) {
      doc.text(`CNPJ: ${s.company_cnpj}`, pageW - 14, 28, { align: "right" });
    }

    doc.setTextColor(0, 0, 0);
    yPos = 40;

    // Company address
    if (s?.company_address) {
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(s.company_address, 14, yPos);
      yPos += 6;
    }

    // Date
    if (s?.show_date !== false) {
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 14, yPos);
      yPos += 6;
    }
    // Customer
    if (s?.show_customer !== false && customerName.trim()) {
      doc.setFontSize(10);
      doc.text(`Cliente: ${customerName.trim()}`, 14, yPos);
      yPos += 6;
    }
    // Delivery
    if (s?.show_delivery !== false && deliveryDeadline.trim()) {
      doc.setFontSize(10);
      doc.text(`Prazo de Entrega: ${deliveryDeadline.trim()}`, 14, yPos);
      yPos += 6;
    }

    // Build table body based on visibility settings
    const body: string[][] = [];
    if (s?.show_material !== false) body.push(["Material", result.material]);
    if (s?.show_thickness !== false) body.push(["Espessura", result.thickness]);
    if (s?.show_cutting_value !== false) body.push(["Valor do Corte", fmt(editablePrice)]);
    if (s?.show_material_value !== false && materialOwner === "usuario") {
      body.push(["Valor do Material", fmt(materialCost)]);
    }
    body.push(["", ""]);
    body.push(["TOTAL", fmt(totalPrice)]);

    autoTable(doc, {
      startY: yPos + 4,
      head: [["Item", "Valor"]],
      body,
      theme: "striped",
      styles: { fontSize: 10 },
      headStyles: { fillColor: primaryRgb },
      didParseCell: (data: any) => {
        if (data.row.index === body.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 12;
          if (data.column.index === 1) {
            data.cell.styles.textColor = accentRgb;
          }
        }
      },
    });

    // Footer text
    if (s?.footer_text) {
      const finalY = (doc as any).lastAutoTable?.finalY || yPos + 60;
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      const lines = doc.splitTextToSize(s.footer_text, pageW - 28);
      doc.text(lines, 14, finalY + 12);
    }

    doc.save(`orcamento_${result.fileName.replace(/\.\w+$/, "")}.pdf`);
    toast.success("PDF exportado com sucesso!");
    } catch (err: any) {
      console.error("Erro ao gerar PDF:", err);
      toast.error("Erro ao gerar PDF. Tente novamente.");
    }
  };

  const saveQuote = async () => {
    if (!result || !session?.user || !file) return;

    // Upload original file to storage
    let filePath: string | null = null;
    const fileExt = file.name.split(".").pop();
    const storagePath = `${session.user.id}/${crypto.randomUUID()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from("cutting-files")
      .upload(storagePath, file);
    if (!uploadError) {
      filePath = storagePath;
    }

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
      suggested_sale: editablePrice,
      cost_per_minute: pricing.costPerMinute,
      file_path: filePath,
      material_cost: materialCost,
      material_owner: materialOwner,
      total_price: totalPrice,
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
          <CardHeader className="pb-2 flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                Visualização do Arquivo
              </CardTitle>
              <CardDescription>{file?.name}</CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={removeFile}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[300px] bg-secondary/30 rounded-lg border border-border flex items-center justify-center overflow-hidden p-4">
              {filePreview.startsWith("data:") ? (
                <img src={filePreview} alt="Preview SVG" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: filePreview }} />
              )}
            </div>
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
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); removeFile(); }}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
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
              <Select value={material} onValueChange={(v) => { setMaterial(v); setThickness(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o material" />
                </SelectTrigger>
                <SelectContent>
                  {allMaterials.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Thickness */}
            <div>
              <Label className="text-xs">Espessura</Label>
              <Select value={thickness} onValueChange={setThickness} disabled={!material || availableThicknesses.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={!material ? "Selecione um material primeiro" : availableThicknesses.length === 0 ? "Nenhuma espessura cadastrada" : "Selecione a espessura"} />
                </SelectTrigger>
                <SelectContent>
                  {availableThicknesses.map((t) => (
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
              <Label className="text-xs">Quantidade de Passadas</Label>
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
              {/* Customer Name & Delivery */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nome do Cliente</Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nome do cliente"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <CalendarClock className="w-3 h-3" /> Prazo de Entrega
                  </Label>
                  <Input
                    value={deliveryDeadline}
                    onChange={(e) => setDeliveryDeadline(e.target.value)}
                    placeholder="Ex: 5 dias úteis"
                    className="mt-1"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Material</p>
                  <p className="text-sm font-medium">{result.material}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Espessura</p>
                  <p className="text-sm font-medium">{result.thickness}</p>
                </div>
                {result.sheetM2 > 0 && (
                  <>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Área da Chapa</p>
                      <p className="text-sm font-medium">{result.sheetM2.toFixed(4)} m²</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Valor/m²</p>
                      <p className="text-sm font-medium text-primary">{fmt(result.pricePerM2)}</p>
                    </div>
                  </>
                )}
              </div>

              <Card className="bg-secondary/50 border-border">
                <CardContent className="p-3 text-center">
                  <Clock className="w-5 h-5 text-info mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground">Tempo Estimado de Corte</p>
                  <p className="text-lg font-bold">{result.estimatedTimeMin.toFixed(1)} min</p>
                </CardContent>
              </Card>

              {/* Minimum Sheet Info */}
              {result.bboxWidthMM > 0 && result.bboxHeightMM > 0 && (
                <Card className="bg-secondary/50 border-border">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Ruler className="w-4 h-4 text-muted-foreground" />
                      <p className="text-xs font-medium">Chapa Mínima Necessária</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Margem (mm):</Label>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={sheetMargin}
                        onChange={(e) => setSheetMargin(Math.max(0, Number(e.target.value)))}
                        className="h-7 w-20 text-xs"
                      />
                    </div>
                    {(() => {
                      const finalW = result.bboxWidthMM + 2 * sheetMargin;
                      const finalH = result.bboxHeightMM + 2 * sheetMargin;
                      const areaM2 = (finalW * finalH) / 1_000_000;
                      return (
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {finalW.toFixed(1)} × {finalH.toFixed(1)} mm
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Área ocupada: {areaM2.toFixed(4)} m²
                          </p>
                          {result.svgDiagnosis && (
                            <p className="text-[10px] text-muted-foreground font-mono break-all">
                              {result.svgDiagnosis}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground italic">
                            Dimensão mínima baseada no envelope do arquivo. Não inclui otimização ou nesting.
                          </p>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Material Owner Toggle */}
              <div>
                <Label className="text-xs flex items-center gap-1 mb-2">
                  <Package className="w-3 h-3" /> Material fornecido por:
                </Label>
                <div className="flex gap-2">
                  <Button
                    variant={materialOwner === "cliente" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setMaterialOwner("cliente")}
                  >
                    Cliente
                  </Button>
                  <Button
                    variant={materialOwner === "usuario" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setMaterialOwner("usuario")}
                  >
                    Meu Material
                  </Button>
                </div>
              </div>

              {/* Material cost section when user provides material */}
              {materialOwner === "usuario" && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-3 space-y-2">
                    <p className="text-xs font-medium text-primary">Custo do Material</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Valor/m² (editável)</Label>
                        <div className="relative mt-1">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={editableMaterialPriceM2 || ""}
                            onChange={(e) => setEditableMaterialPriceM2(Number(e.target.value))}
                            className="h-8 pl-8 text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">m² do arquivo (editável)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.0001}
                          value={editableMaterialM2 || ""}
                          onChange={(e) => setEditableMaterialM2(Number(e.target.value))}
                          className="h-8 text-sm mt-1"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-xs pt-1">
                      <span className="text-muted-foreground">
                        {fmt(editableMaterialPriceM2)}/m² × {editableMaterialM2.toFixed(4)} m² × {quantity}
                      </span>
                      <span className="font-medium text-primary">{fmt(materialCost)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Editable Cutting Price */}
              <div>
                <Label className="text-xs">Valor do Corte (editável)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={editablePrice || ""}
                    onChange={(e) => setEditablePrice(Number(e.target.value))}
                    className="pl-10 text-lg font-bold"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Sugerido: {fmt(result.suggestedSale)}
                </p>
              </div>

              {/* Total */}
              <Card className="bg-primary/10 border-primary/30">
                <CardContent className="p-3 flex justify-between items-center">
                  <span className="text-sm font-medium">TOTAL</span>
                  <span className="text-xl font-bold text-primary">{fmt(totalPrice)}</span>
                </CardContent>
              </Card>

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
