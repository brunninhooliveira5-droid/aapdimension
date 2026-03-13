import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

export interface PdfNomenclatureConfig {
  piecePrefix: string;
  showDimensions: boolean;
  showDescription: boolean;
  dimensionFormat: "WxH" | "HxW" | "LxAxP";
  labelSeparator: string;
}

export const defaultNomenclatureConfig: PdfNomenclatureConfig = {
  piecePrefix: "P",
  showDimensions: true,
  showDescription: true,
  dimensionFormat: "WxH",
  labelSeparator: " - ",
};

interface Props {
  config: PdfNomenclatureConfig;
  onChange: (config: PdfNomenclatureConfig) => void;
}

export function CuttingPlanPdfConfig({ config, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const update = (partial: Partial<PdfNomenclatureConfig>) => {
    onChange({ ...config, ...partial });
  };

  const exampleLabel = buildExampleLabel(config);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground h-8">
          <Settings2 className="h-3.5 w-3.5" />
          Nomenclatura PDF
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="p-4 mt-2 space-y-4">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            Configuração de Nomenclatura do PDF
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Prefixo da peça</Label>
              <Input
                value={config.piecePrefix}
                onChange={(e) => update({ piecePrefix: e.target.value })}
                placeholder="P"
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Separador</Label>
              <Input
                value={config.labelSeparator}
                onChange={(e) => update({ labelSeparator: e.target.value })}
                placeholder=" - "
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Formato de dimensão</Label>
              <Select value={config.dimensionFormat} onValueChange={(v) => update({ dimensionFormat: v as PdfNomenclatureConfig["dimensionFormat"] })}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WxH">Larg x Alt (ex: 200x100)</SelectItem>
                  <SelectItem value="HxW">Alt x Larg (ex: 100x200)</SelectItem>
                  <SelectItem value="LxAxP">L x A x P</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="pdf-show-dims"
                checked={config.showDimensions}
                onCheckedChange={(v) => update({ showDimensions: v })}
              />
              <Label htmlFor="pdf-show-dims" className="text-sm cursor-pointer">Mostrar dimensões</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="pdf-show-desc"
                checked={config.showDescription}
                onCheckedChange={(v) => update({ showDescription: v })}
              />
              <Label htmlFor="pdf-show-desc" className="text-sm cursor-pointer">Mostrar descrição</Label>
            </div>
          </div>

          <div className="bg-muted/50 rounded-md p-3 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Pré-visualização do rótulo:</p>
            <p className="text-sm font-medium text-foreground">{exampleLabel}</p>
          </div>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}

function buildExampleLabel(config: PdfNomenclatureConfig): string {
  const parts: string[] = [];
  parts.push(`${config.piecePrefix}1`);

  if (config.showDescription) {
    parts.push("Base lateral");
  }

  if (config.showDimensions) {
    switch (config.dimensionFormat) {
      case "WxH": parts.push("200x100"); break;
      case "HxW": parts.push("100x200"); break;
      case "LxAxP": parts.push("200 x 100 x 3"); break;
    }
  }

  return parts.join(config.labelSeparator);
}

export function formatPieceLabel(
  config: PdfNomenclatureConfig,
  index: number,
  width: number,
  height: number,
  description?: string
): { mainLabel: string; subLabel: string } {
  const mainParts: string[] = [];
  mainParts.push(`${config.piecePrefix}${index + 1}`);

  if (config.showDescription && description) {
    mainParts.push(description);
  }

  let subLabel = "";
  if (config.showDimensions) {
    switch (config.dimensionFormat) {
      case "WxH": subLabel = `${width}x${height}`; break;
      case "HxW": subLabel = `${height}x${width}`; break;
      case "LxAxP": subLabel = `${width} x ${height}`; break;
    }
  }

  return {
    mainLabel: mainParts.join(config.labelSeparator),
    subLabel,
  };
}
