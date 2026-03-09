import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Square, RotateCcw } from "lucide-react";
import type { CustomGcodeConfig, PostProcessor } from "@/lib/toolpath-engine";
import { DEFAULT_START_GCODE, DEFAULT_END_GCODE } from "@/lib/toolpath-engine";

type ConfigLevel = "project" | "global";

interface StartEndGcodePanelProps {
  config: CustomGcodeConfig;
  onChange: (config: CustomGcodeConfig) => void;
  postProcessor: PostProcessor;
}

const PP_LABELS: Record<PostProcessor, string> = {
  grbl: "GRBL",
  mach3: "Mach3",
  ddcs: "DDCS",
  linuxcnc: "LinuxCNC",
};

const STORAGE_KEY = "dimension-gcode-start-end-global";

function loadGlobalConfig(): CustomGcodeConfig | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function saveGlobalConfig(config: CustomGcodeConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function StartEndGcodePanel({ config, onChange, postProcessor }: StartEndGcodePanelProps) {
  const [configLevel, setConfigLevel] = useState<ConfigLevel>("project");

  // Load global config on mount if project config is empty
  useEffect(() => {
    if (!config.startGcode && !config.endGcode) {
      const global = loadGlobalConfig();
      if (global) {
        onChange(global);
      }
    }
  }, []);

  const handleLoadPreset = (pp: PostProcessor) => {
    onChange({
      ...config,
      useCustomStartEnd: true,
      startGcode: DEFAULT_START_GCODE[pp],
      endGcode: DEFAULT_END_GCODE[pp],
    });
  };

  const handleReset = () => {
    onChange({
      useCustomStartEnd: false,
      startGcode: "",
      endGcode: "",
    });
  };

  const handleSaveGlobal = () => {
    saveGlobalConfig(config);
  };

  return (
    <div className="flex gap-3 h-full p-2 overflow-auto">
      {/* Left: Controls */}
      <div className="w-48 shrink-0 space-y-3">
        {/* Toggle */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="use-custom"
            checked={config.useCustomStartEnd}
            onCheckedChange={(checked) => onChange({ ...config, useCustomStartEnd: !!checked })}
          />
          <Label htmlFor="use-custom" className="text-xs cursor-pointer">
            Usar comandos personalizados
          </Label>
        </div>

        {/* Level */}
        <div>
          <Label className="text-[10px] text-muted-foreground">Nível</Label>
          <Select value={configLevel} onValueChange={(v: ConfigLevel) => setConfigLevel(v)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="project">Projeto Atual</SelectItem>
              <SelectItem value="global">Global</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Presets */}
        <Card className="border-border">
          <CardHeader className="px-2 py-1.5 pb-1">
            <CardTitle className="text-[10px] text-muted-foreground">Presets Rápidos</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2 space-y-1">
            {(Object.keys(PP_LABELS) as PostProcessor[]).map((pp) => (
              <Button
                key={pp}
                variant={pp === postProcessor ? "default" : "outline"}
                size="sm"
                className="w-full h-6 text-[10px] justify-start gap-1"
                onClick={() => handleLoadPreset(pp)}
              >
                {PP_LABELS[pp]}
                {pp === postProcessor && <Badge variant="secondary" className="text-[8px] h-3.5 px-1 ml-auto">Atual</Badge>}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-1">
          {configLevel === "global" && (
            <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1" onClick={handleSaveGlobal}>
              Salvar como Global
            </Button>
          )}
          <Button variant="ghost" size="sm" className="w-full h-7 text-xs gap-1 text-muted-foreground" onClick={handleReset}>
            <RotateCcw className="h-3 w-3" /> Resetar
          </Button>
        </div>
      </div>

      {/* Right: Text areas */}
      <div className="flex-1 flex gap-3 min-w-0">
        {/* Start G-code */}
        <div className="flex-1 flex flex-col min-w-0">
          <Label className="text-xs flex items-center gap-1.5 mb-1">
            <Play className="h-3 w-3 text-emerald-500" />
            Start G-code
          </Label>
          <Textarea
            value={config.startGcode}
            onChange={(e) => onChange({ ...config, startGcode: e.target.value })}
            placeholder={DEFAULT_START_GCODE[postProcessor]}
            className="flex-1 font-mono text-[10px] min-h-[80px] bg-muted/30 resize-none"
            disabled={!config.useCustomStartEnd}
          />
          <span className="text-[9px] text-muted-foreground mt-0.5">
            Executado antes do primeiro percurso (unidade, modo, spindle...)
          </span>
        </div>

        {/* End G-code */}
        <div className="flex-1 flex flex-col min-w-0">
          <Label className="text-xs flex items-center gap-1.5 mb-1">
            <Square className="h-3 w-3 text-red-500" />
            End G-code
          </Label>
          <Textarea
            value={config.endGcode}
            onChange={(e) => onChange({ ...config, endGcode: e.target.value })}
            placeholder={DEFAULT_END_GCODE[postProcessor]}
            className="flex-1 font-mono text-[10px] min-h-[80px] bg-muted/30 resize-none"
            disabled={!config.useCustomStartEnd}
          />
          <span className="text-[9px] text-muted-foreground mt-0.5">
            Executado após o último percurso (desligar spindle, retornar...)
          </span>
        </div>
      </div>
    </div>
  );
}
