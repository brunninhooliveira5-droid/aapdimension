import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Upload, FileText, Clock, DollarSign, TrendingUp, Download, Save, Ruler, Eye, X, Package, CalendarClock, Gauge, Zap, HelpCircle, AlertTriangle, Wrench, RotateCcw, ShieldAlert, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { PricingData } from "./PricingSimulator";
import type { Tables } from "@/integrations/supabase/types";
import type { PdfSettings } from "./PdfConfiguration";
import { calculateQuote, calculateMaterialCost, calculateTotalPrice, applyMinimumCutPrice, MINIMUM_CUT_PRICE, type QuoteCalculationResult } from "@/lib/cutting-calculations";
import { generateQuotePDF } from "@/lib/cutting-pdf";
import { PriceAssistant } from "./PriceAssistant";

// MATERIALS and THICKNESSES are no longer used as defaults
// (custom materials from DB are used instead)
// Kept as empty arrays for backward compat

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
  useMasterPricing?: boolean;
  useDimensionMaterials?: boolean;
  isAdminMaster?: boolean;
  pricingLoaded?: boolean;
  masterPricingError?: boolean;
}

export function FileQuote({ pricing, machines, useMasterPricing = false, useDimensionMaterials = false, isAdminMaster = false, pricingLoaded = true, masterPricingError = false }: FileQuoteProps) {
  const { user, session, getSectionVisibility } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [material, setMaterial] = useState("");
  const [thickness, setThickness] = useState("");
  const [machineId, setMachineId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuoteCalculationResult | null>(null);
  const [editablePrice, setEditablePrice] = useState(0);
  const [editableMaterialPriceM2, setEditableMaterialPriceM2] = useState(0);
  const [editableMaterialM2, setEditableMaterialM2] = useState(0);
  const [editableMaterialCost, setEditableMaterialCost] = useState(0);
  const [materialOwner, setMaterialOwner] = useState<"cliente" | "usuario">("cliente");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryDeadline, setDeliveryDeadline] = useState("");
  const [serviceValue, setServiceValue] = useState(0);
  const [serviceValueIncluded, setServiceValueIncluded] = useState(false);
  // Override states
  const [overridePasses, setOverridePasses] = useState(1);
  const [passesOverridden, setPassesOverridden] = useState(false);
  const [overrideBaseSpeed, setOverrideBaseSpeed] = useState(0);
  const [speedOverridden, setSpeedOverridden] = useState(false);
  const [sheetMargin, setSheetMargin] = useState(10);
  const [customMaterials, setCustomMaterials] = useState<{ id: string; name: string; price_adjustment: number }[]>([]);
  const [pdfSettings, setPdfSettings] = useState<PdfSettings | null>(null);
  const [priceAssistantOpen, setPriceAssistantOpen] = useState(false);
  // Admin master always uses dimension materials (they manage those tables directly)
  const effectiveDimensionMaterials = useDimensionMaterials || isAdminMaster;

  // Load custom materials (or dimension materials)
  useEffect(() => {
    if (!session?.user) return;
    if (effectiveDimensionMaterials) {
      // Load from dimension catalog
      supabase
        .from("dimension_cutting_materials" as any)
        .select("id, name, price_adjustment")
        .eq("is_active", true)
        .order("name")
        .then(({ data }) => {
          if (data) setCustomMaterials(data as any);
        });
    } else {
      supabase
        .from("cutting_materials")
        .select("id, name, price_adjustment")
        .order("name")
        .then(({ data }) => {
          if (data) setCustomMaterials(data as any);
        });
    }
  }, [session, effectiveDimensionMaterials]);

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
            company_cep: d.company_cep || "",
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
            show_service_value: d.show_service_value ?? true,
            label_service_value: d.label_service_value || "Valor de Serviço",
          });
        }
      });
  }, [session]);

  // Load thicknesses for selected material in the quote form
  const [availableThicknesses, setAvailableThicknesses] = useState<{ value: string; label: string; sheet_width: number; sheet_height: number; unit_price: number; speed_factor: number; is_dimension_preset: boolean; dimension_default_factor: number | null }[]>([]);
  // Reset thickness when material changes
  useEffect(() => {
    setThickness("");
  }, [material]);

  useEffect(() => {
    if (!material) { setAvailableThicknesses([]); return; }
    const matId = material.replace("custom_", "");
    const table = effectiveDimensionMaterials ? "dimension_cutting_material_thicknesses" : "cutting_material_thicknesses";
    const selectCols = effectiveDimensionMaterials
      ? "value, label, sheet_width, sheet_height, unit_price, speed_factor"
      : "value, label, sheet_width, sheet_height, unit_price, speed_factor, is_dimension_preset, dimension_default_factor";
    supabase
      .from(table as any)
      .select(selectCols)
      .eq("material_id", matId)
      .then(({ data }) => {
        if (data) {
          // dimension thicknesses don't have preset fields, set defaults
          const mapped = (data as any[]).map((d: any) => ({
            ...d,
            is_dimension_preset: d.is_dimension_preset ?? false,
            dimension_default_factor: d.dimension_default_factor ?? null,
          }));
          // Sort numerically by value
          mapped.sort((a, b) => parseFloat(a.value) - parseFloat(b.value));
          setAvailableThicknesses(mapped);
        }
      });
  }, [material, effectiveDimensionMaterials]);

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
    if (ext !== "svg") {
      toast.error("Apenas arquivos SVG são aceitos.");
      return;
    }
    setFile(f);
    setResult(null);

    // Generate preview
    const text = await f.text();
    if (ext === "svg") {
      // Sanitize SVG to prevent XSS
      const DOMPurify = (await import("dompurify")).default;
      const sanitized = DOMPurify.sanitize(text, {
        USE_PROFILES: { svg: true, svgFilters: true },
        ADD_TAGS: ['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'g', 'defs', 'clipPath', 'use', 'symbol', 'marker'],
        FORBID_TAGS: ['script', 'iframe', 'embed', 'object', 'foreignObject'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur'],
      });

      // Parse sanitized SVG, recalculate viewBox from actual content, apply visible colors
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(sanitized, "image/svg+xml");
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
    const isServiceUser = user?.role === "servico";
    const skipMachine = true;
    const requiredFields = skipMachine
      ? (!file || !material || !thickness)
      : (!file || !material || !thickness || !machineId);
    if (requiredFields) {
      toast.error("Preencha todos os campos antes de calcular.");
      return;
    }

    // Pricing resolver: validate against the RESOLVED config (master or own)
    if (!pricingLoaded) {
      toast.error("Aguarde o carregamento das configurações de precificação.");
      return;
    }

    if (masterPricingError && useMasterPricing) {
      if (isAdminMaster) {
        toast.error("Configuração de precificação master não encontrada. Configure o Simulador de Precificação.");
      } else {
        toast.error("Configuração Dimension indisponível no momento. Contate o suporte.");
      }
      return;
    }

    if (pricing.avgCutSpeed <= 0) {
      if (useMasterPricing && !isAdminMaster) {
        toast.error("Configuração Dimension indisponível no momento. Contate o suporte.");
      } else {
        toast.error("Configure a velocidade de corte no Simulador de Precificação.");
      }
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();
      const ext = file.name.split(".").pop()?.toLowerCase();

      let pathLengthUnits = 0;
      let bboxWidthMM = 0;
      let bboxHeightMM = 0;
      let svgDiagnosis: string | undefined;

      if (ext === "svg") {
        pathLengthUnits = parseSVGPathLength(text);
        const svgBBox = parseSVGBBoxMM(text);
        bboxWidthMM = svgBBox.widthMM;
        bboxHeightMM = svgBBox.heightMM;
        svgDiagnosis = svgBBox.diagnosis;
      } else {
        pathLengthUnits = await parseDXFPathLength(text);
        const DxfParser = (await import("dxf-parser")).default;
        const dxfParser = new DxfParser();
        try {
          const dxf = dxfParser.parseSync(text);
          const bbox = parseDXFBBoxArea(dxf);
          bboxWidthMM = bbox.width;
          bboxHeightMM = bbox.height;
        } catch { /* ignore */ }
      }

      // SVG: convert viewBox units → mm
      let pathLengthMM: number;
      if (ext === "svg") {
        const tempParser = new DOMParser();
        const tempDoc = tempParser.parseFromString(text, "image/svg+xml");
        const tempSvg = tempDoc.querySelector("svg");
        let svgScale = 25.4 / 96;
        if (tempSvg) {
          const wA = tempSvg.getAttribute("width");
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
        pathLengthMM = pathLengthUnits;
      }

      const machine = null;
      const materialLabel = allMaterials.find((m) => m.value === material)?.label || material;
      const matId = material.replace("custom_", "");
      const currentMat = customMaterials.find((m) => m.id === matId);
      const adjustment = currentMat?.price_adjustment || 0;

      const selectedThickness = availableThicknesses.find((t: any) => t.value === thickness) as any;
      const sheetW = selectedThickness?.sheet_width || 0;
      const sheetH = selectedThickness?.sheet_height || 0;
      const unitPrice = selectedThickness?.unit_price || 0;
      const speedFactor = selectedThickness?.speed_factor ?? 0;
      const isDimensionPreset = selectedThickness?.is_dimension_preset ?? false;
      const dimensionDefaultFactor = selectedThickness?.dimension_default_factor ?? null;
      const hasDbFactor = speedFactor > 0;
      const sheetM2 = sheetW > 0 && sheetH > 0 ? (sheetW * sheetH) / 1_000_000 : 0;
      const pricePerM2 = sheetM2 > 0 && unitPrice > 0 ? unitPrice / sheetM2 : 0;

      // ── CÁLCULO CENTRALIZADO (todas as etapas) ──
      const calcResult = calculateQuote({
        pathLengthMM,
        bboxWidthMM,
        bboxHeightMM,
        svgDiagnosis,
        fileName: file.name,
        material: materialLabel,
        thickness: `${thickness} mm`,
        thicknessValue: parseFloat(thickness),
        machineName: machine?.model || "—",
        quantity,
        baseSpeedMMmin: pricing.avgCutSpeed,
        costPerMinute: pricing.costPerMinute,
        profitMarginPercent: pricing.profitMarginPercent,
        sheetM2,
        pricePerM2,
        unitPrice,
        materialAdjustmentPercent: adjustment,
        speedFactor,
        isDimensionPreset,
        dimensionDefaultFactor,
        hasDbFactor,
      });

      setResult(calcResult);
      const { finalCutCost: initialCutCost } = applyMinimumCutPrice(calcResult.cutCost);
      setEditablePrice(initialCutCost);
      const calcPriceM2 = Math.round(pricePerM2 * 100) / 100;
      setEditableMaterialPriceM2(calcPriceM2);
      setEditableMaterialM2(calcResult.fileAreaM2);
      setEditableMaterialCost(Math.round(calcPriceM2 * calcResult.fileAreaM2 * 100) / 100);
      setMaterialOwner("cliente");
      // Initialize overrides from calculated result
      setOverridePasses(quantity);
      setPassesOverridden(false);
      setOverrideBaseSpeed(pricing.avgCutSpeed);
      setSpeedOverridden(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar o arquivo.");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // ── RECÁLCULO COM OVERRIDES ──
  const currentBaseSpeed = speedOverridden ? overrideBaseSpeed : (result?.baseSpeedMMmin || 0);
  const currentPasses = passesOverridden ? overridePasses : quantity;
  const currentSpeedFactor = result?.speedFactor || 1;
  const currentEffectiveSpeedMMmin = currentBaseSpeed * currentSpeedFactor;
  const currentEffectiveSpeedMmin = currentEffectiveSpeedMMmin / 1000;
  const currentEffectiveCutLengthM = (result?.pathLengthM || 0) * currentPasses;
  const currentEstimatedTimeMin = currentEffectiveSpeedMmin > 0 ? currentEffectiveCutLengthM / currentEffectiveSpeedMmin : 0;

  // Recalculate cut cost with overridden time
  const recalcSuggestedPricePerMin = result?.suggestedPricePerMinute || 0;
  const recalcCutCostRaw = Math.round(currentEstimatedTimeMin * recalcSuggestedPricePerMin * 100) / 100;

  // Apply minimum cut price lock
  const { finalCutCost: recalcCutCost, minimumApplied: minCutPriceApplied } = applyMinimumCutPrice(recalcCutCostRaw);

  // Auto-update editable price when overrides change
  useEffect(() => {
    if (result && (passesOverridden || speedOverridden)) {
      setEditablePrice(recalcCutCost);
    }
  }, [recalcCutCost, passesOverridden, speedOverridden]);

  // ── ETAPA 7: Custo do material (insumo separado) ──
  const { totalMaterial: materialCost } = calculateMaterialCost(
    materialOwner === "usuario" && !!result,
    editableMaterialPriceM2,
    editableMaterialM2,
    quantity,
    result?.materialAdjustmentPercent || 0
  );

  // Apply minimum cut price on editable price
  const effectiveCutPrice = Math.max(editablePrice, MINIMUM_CUT_PRICE);
  const editableMinApplied = result ? editablePrice < MINIMUM_CUT_PRICE : false;

  // ── ETAPA 8: Total final (inclui serviço se ativo) ──
  const serviceAmount = serviceValueIncluded ? serviceValue : 0;
  const totalPrice = calculateTotalPrice(effectiveCutPrice, materialCost) + serviceAmount;

  // Override origin labels
  const passesOrigin = passesOverridden ? "manual_override" : "default";
  const baseSpeedOrigin = speedOverridden ? "manual_override" : "simulator";

  const canExportPdf = getSectionVisibility("orcamento_pdf") === "visible";

  const exportPDF = async () => {
    if (!result) return;
    if (!canExportPdf) {
      toast.info("Para exportar PDFs de orçamento, entre em contato com o administrador para ativar essa funcionalidade no seu plano.", { duration: 6000 });
      return;
    }
    try {
      await generateQuotePDF(
        {
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          date: new Date().toLocaleDateString("pt-BR"),
          machineName: result.machineName,
          material: result.material,
          thickness: result.thickness,
          quantity: result.quantity,
          fileName: result.fileName,
          useDimensionMaterials,
          useMasterPricing,
          pathLengthM: result.pathLengthM,
          baseSpeedMMmin: currentBaseSpeed,
          baseSpeedOrigin,
          speedFactor: currentSpeedFactor,
          speedFactorOrigin: result.speedFactorOrigin,
          effectiveSpeedMMmin: currentEffectiveSpeedMMmin,
          estimatedTimeMin: Math.round(currentEstimatedTimeMin * 100) / 100,
          passesFinal: currentPasses,
          passesOrigin,
          effectiveCutLengthM: Math.round(currentEffectiveCutLengthM * 100) / 100,
          cutPrice: effectiveCutPrice,
          materialCost,
          serviceValue: serviceValueIncluded ? serviceValue : 0,
          serviceValueIncluded,
          totalPrice,
          deliveryDeadline: deliveryDeadline.trim(),
        },
        pdfSettings
      );
      toast.success("PDF exportado com sucesso!");
    } catch (err: any) {
      console.error("Erro ao gerar PDF:", err?.message, err?.stack, err);
      toast.error(`Erro ao gerar PDF: ${err?.message || "erro desconhecido"}`);
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

    // Enforce: if use_master_pricing and not admin_master, always use recalculated price (ignore editablePrice)
    const enforcedCutPrice = (useMasterPricing && !isAdminMaster) ? recalcCutCost : effectiveCutPrice;
    const enforcedTotal = calculateTotalPrice(enforcedCutPrice, materialCost) + serviceAmount;

    const { error } = await supabase.from("cutting_quotes" as any).insert({
      user_id: session.user.id,
      client_name: customerName.trim(),
      client_phone: customerPhone.trim(),
      file_name: result.fileName,
      material: result.material,
      thickness: result.thickness,
      machine_id: machineId,
      machine_name: result.machineName,
      path_length_mm: result.pathLengthMM,
      path_length_m: result.pathLengthM,
      quantity,
      estimated_time_min: Math.round(currentEstimatedTimeMin * 100) / 100,
      estimated_cost: recalcCutCost,
      min_recommended: result.minCutCost,
      suggested_sale: enforcedCutPrice,
      cost_per_minute: pricing.costPerMinute,
      file_path: filePath,
      material_cost: materialCost,
      material_owner: materialOwner,
      total_price: enforcedTotal,
      service_value: serviceValue,
      service_value_included: serviceValueIncluded,
      passes_final: currentPasses,
      passes_origin: passesOrigin,
      base_speed_final_mmmin: currentBaseSpeed,
      base_speed_origin: baseSpeedOrigin,
      speed_factor_used: currentSpeedFactor,
      effective_speed_mmmin: Math.round(currentEffectiveSpeedMMmin * 100) / 100,
      effective_cut_length_m: Math.round(currentEffectiveCutLengthM * 100) / 100,
      use_master_pricing: useMasterPricing,
      use_dimension_materials: useDimensionMaterials,
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
              <Label className="text-xs">Arquivo SVG</Label>
              <div
                className="mt-1 border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept=".svg" className="hidden" onChange={handleFile} />
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
                    <p className="text-sm text-muted-foreground">Clique para enviar arquivo SVG</p>
                  </div>
                )}
              </div>
            </div>

            {/* Material */}
            <div>
              <Label className="text-xs">Material</Label>
              {allMaterials.length === 0 && useDimensionMaterials ? (
                <div className="p-3 rounded-md bg-primary/5 border border-primary/20 text-xs text-muted-foreground mt-1">
                  <p className="font-medium text-foreground mb-1">Nenhum material Dimension disponível</p>
                  <p>O catálogo de materiais da Dimension ainda não foi configurado pelo administrador. Entre em contato com o administrador para solicitar a configuração.</p>
                </div>
              ) : (
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
              )}
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

            {/* Machine selector removed - no longer required for any profile */}

            {/* Quantity - hidden for servico users and inherited pricing users */}
            {!useMasterPricing && user?.role !== "servico" && (
              <div>
                <Label className="text-xs">Quantidade</Label>
                <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))} />
              </div>
            )}

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
              {/* Customer Name, Phone & Delivery */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  <Label className="text-xs">Contato / Telefone</Label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
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

              {/* Speed Factor Origin Alert */}
              {result.speedFactorOrigin === "Fallback padrão 1.0" && (
                <div className="flex items-start gap-2 p-2 rounded-md bg-warning/10 border border-warning/30 text-xs">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">
                    Fator não cadastrado para esta espessura. Usando 1.0 (sem redução). Configure o fator na aba Materiais.
                  </span>
                </div>
              )}

              {/* Overrides: Passadas e Velocidade - hidden for servico and inherited pricing users */}
              {!useMasterPricing && user?.role !== "servico" && (
              <Card className="bg-secondary/50 border-border">
                <CardContent className="p-3 space-y-3">
                  <p className="text-xs font-medium flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-primary" /> Ajustes do Cálculo
                  </p>

                  {/* Passes Override */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] text-muted-foreground">Passadas</Label>
                      {passesOverridden && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-primary/40 text-primary">Override manual</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={pricing.maxPassesOverride}
                        value={currentPasses}
                        onChange={(e) => {
                          if (!pricing.allowUserOverridePasses) return;
                          const val = Math.max(1, Math.min(pricing.maxPassesOverride, Number(e.target.value)));
                          setOverridePasses(val);
                          setPassesOverridden(true);
                        }}
                        disabled={!pricing.allowUserOverridePasses}
                        className="h-7 w-20 text-xs"
                      />
                      {passesOverridden && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] gap-1 px-2"
                          onClick={() => { setPassesOverridden(false); setOverridePasses(quantity); }}
                        >
                          <RotateCcw className="w-3 h-3" /> Restaurar
                        </Button>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Speed Override */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] text-muted-foreground">Velocidade Base (mm/min)</Label>
                      {speedOverridden && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-primary/40 text-primary">Override manual</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={pricing.minSpeedOverrideMMmin}
                        max={pricing.maxSpeedOverrideMMmin}
                        step={10}
                        value={currentBaseSpeed || ""}
                        onChange={(e) => {
                          if (!pricing.allowUserOverrideSpeed) return;
                          const val = Math.max(pricing.minSpeedOverrideMMmin, Math.min(pricing.maxSpeedOverrideMMmin, Number(e.target.value)));
                          setOverrideBaseSpeed(val);
                          setSpeedOverridden(true);
                        }}
                        disabled={!pricing.allowUserOverrideSpeed}
                        className="h-7 w-28 text-xs"
                      />
                      {speedOverridden && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] gap-1 px-2"
                          onClick={() => { setSpeedOverridden(false); setOverrideBaseSpeed(pricing.avgCutSpeed); }}
                        >
                          <RotateCcw className="w-3 h-3" /> Simulador
                        </Button>
                      )}
                    </div>
                    <p className="text-[9px] text-muted-foreground">
                      Fator: {currentSpeedFactor.toFixed(2)} ({result.speedFactorOrigin}) → Efetiva: {currentEffectiveSpeedMMmin.toFixed(0)} mm/min
                    </p>
                  </div>
                </CardContent>
              </Card>
              )}

              {/* Technical Summary */}
              <div className="grid grid-cols-3 gap-2">
                <Card className="bg-secondary/50 border-border">
                  <CardContent className="p-3 text-center">
                    <Ruler className="w-4 h-4 text-primary mx-auto mb-1" />
                    <p className="text-[10px] text-muted-foreground">Comprimento</p>
                    <p className="text-sm font-bold">{result.pathLengthM.toFixed(2)} m</p>
                    {currentPasses > 1 && (
                      <p className="text-[9px] text-muted-foreground">Efetivo: {currentEffectiveCutLengthM.toFixed(2)} m</p>
                    )}
                  </CardContent>
                </Card>
                <Card className="bg-secondary/50 border-border">
                  <CardContent className="p-3 text-center">
                    <Gauge className="w-4 h-4 text-primary mx-auto mb-1" />
                    <p className="text-[10px] text-muted-foreground">Vel. Efetiva</p>
                    <p className="text-sm font-bold">{currentEffectiveSpeedMMmin.toFixed(0)} mm/min</p>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/50 border-border">
                  <CardContent className="p-3 text-center">
                    <Clock className="w-4 h-4 text-primary mx-auto mb-1" />
                    <p className="text-[10px] text-muted-foreground">Tempo Estimado</p>
                    <p className="text-sm font-bold">{currentEstimatedTimeMin.toFixed(1)} min</p>
                  </CardContent>
                </Card>
              </div>

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
                    {useDimensionMaterials ? "Material da Dimension" : "Meu Material"}
                  </Button>
                </div>
              </div>

              {/* Material cost section when user provides material */}
              {materialOwner === "usuario" && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-3 space-y-2">
                    <p className="text-xs font-medium text-primary">Custo do Material</p>
                    {(() => {
                      const materialReadOnly = useDimensionMaterials && !isAdminMaster;
                      return (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px] text-muted-foreground">{materialReadOnly ? "Valor/m² (Dimension)" : "Valor/m² (editável)"}</Label>
                            <div className="relative mt-1">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={editableMaterialPriceM2 || ""}
                                onChange={(e) => { if (!materialReadOnly) setEditableMaterialPriceM2(Number(e.target.value)); }}
                                readOnly={materialReadOnly}
                                className={`h-8 pl-8 text-sm ${materialReadOnly ? "opacity-70 cursor-not-allowed" : ""}`}
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">{materialReadOnly ? "m² do arquivo" : "m² do arquivo (editável)"}</Label>
                            <Input
                              type="number"
                              min={0}
                              step={0.0001}
                              value={editableMaterialM2 || ""}
                              onChange={(e) => { if (!materialReadOnly) setEditableMaterialM2(Number(e.target.value)); }}
                              readOnly={materialReadOnly}
                              className={`h-8 text-sm mt-1 ${materialReadOnly ? "opacity-70 cursor-not-allowed" : ""}`}
                            />
                          </div>
                        </div>
                      );
                    })()}
                    <div className="flex justify-between text-xs pt-1">
                      <span className="text-muted-foreground">
                        {fmt(editableMaterialPriceM2)}/m² × {editableMaterialM2.toFixed(4)} m² × {quantity}
                      </span>
                      <span className="font-medium text-primary">{fmt(materialCost)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Minimum Cut Price Alert */}
              {(editableMinApplied || minCutPriceApplied) && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-warning/10 border border-warning/30 text-xs">
                  <ShieldAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <span className="text-foreground">
                    Valor mínimo de corte aplicado: <strong>{fmt(MINIMUM_CUT_PRICE)}</strong>. O valor calculado era inferior ao mínimo operacional.
                  </span>
                </div>
              )}

              {/* Price Assistant Button */}
              {!(useMasterPricing && !isAdminMaster) && (isAdminMaster || getSectionVisibility("assistente_preco") === "visible") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => setPriceAssistantOpen(true)}
                >
                  <Sparkles className="w-4 h-4" />
                  Assistente de Preço
                </Button>
              )}

              {/* Editable Cutting Price */}
              <div>
                <Label className="text-xs">
                  {(useMasterPricing && !isAdminMaster) ? "Valor do Corte (bloqueado)" : "Valor do Corte (editável)"}
                </Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <Input
                    type="number"
                    min={MINIMUM_CUT_PRICE}
                    step={0.01}
                    value={editablePrice || ""}
                    onChange={(e) => {
                      if (useMasterPricing && !isAdminMaster) return;
                      setEditablePrice(Number(e.target.value));
                    }}
                    disabled={useMasterPricing && !isAdminMaster}
                    className={`pl-10 text-lg font-bold ${useMasterPricing && !isAdminMaster ? "opacity-70 cursor-not-allowed" : ""}`}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Sugerido: {fmt(result.cutCost)} | Mínimo operacional: {fmt(MINIMUM_CUT_PRICE)}
                  {useMasterPricing && !isAdminMaster && " | 🔒 Valor definido pela configuração Dimension"}
                </p>
              </div>

              {/* Service Value */}
              <Card className="bg-secondary/50 border-border">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs flex items-center gap-1">
                      <Wrench className="w-3 h-3" /> Valor de Serviço
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">Incluir no total</span>
                      <Switch
                        checked={serviceValueIncluded}
                        onCheckedChange={setServiceValueIncluded}
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={serviceValue > 0 ? serviceValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}
                      onChange={(e) => setServiceValue(Number(e.target.value.replace(/[^\d]/g, "")) / 100)}
                      className="pl-10 text-sm"
                      placeholder="0,00"
                    />
                  </div>
                  {serviceValueIncluded && serviceValue === 0 && (
                    <p className="text-[10px] text-warning">Valor de serviço igual a zero</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {serviceValueIncluded ? "✅ Valor de Serviço incluído no total" : "Valor de Serviço não incluído"}
                  </p>
                </CardContent>
              </Card>

              {/* Total */}
              <Card className="bg-primary/10 border-primary/30">
                <CardContent className="p-3 flex justify-between items-center">
                  <span className="text-sm font-medium">TOTAL</span>
                  <span className="text-xl font-bold text-primary">{fmt(totalPrice)}</span>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={exportPDF}>
                  <Download className="w-4 h-4" />
                  {canExportPdf ? "Exportar PDF" : "Exportar PDF 🔒"}
                </Button>
                <Button className="flex-1 gap-2" onClick={saveQuote}>
                  <Save className="w-4 h-4" /> Salvar Orçamento
                </Button>
              </div>

              <Button variant="outline" className="w-full gap-2 mt-2" onClick={removeFile}>
                <RotateCcw className="w-4 h-4" /> Fazer um Novo Orçamento
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Price Assistant Dialog */}
      {result && (
        <PriceAssistant
          open={priceAssistantOpen}
          onOpenChange={setPriceAssistantOpen}
          cutCost={recalcCutCost}
          minCutCost={result.minCutCost}
          suggestedCutCost={result.cutCost}
          costPerMinute={pricing.costPerMinute}
          estimatedTimeMin={currentEstimatedTimeMin}
          material={result.material}
          profitMarginPercent={pricing.profitMarginPercent}
          materialCost={editableMaterialCost}
          serviceValue={serviceValue}
          serviceValueIncluded={serviceValueIncluded}
          onApplyPrice={(price) => setEditablePrice(price)}
        />
      )}
    </div>
  );
}
