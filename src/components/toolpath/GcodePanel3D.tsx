import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Download, Copy, FileCode, Clock, Ruler, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  generateGcode3D,
  validateProject3D,
  type Project3D,
  type PostProcessor,
  type TimeEstimate3D,
} from "@/lib/toolpath-3d-engine";

interface GcodePanel3DProps {
  project: Project3D;
  timeEstimate: TimeEstimate3D | null;
}

const POST_PROCESSORS: { value: PostProcessor; label: string }[] = [
  { value: "grbl", label: "GRBL" },
  { value: "mach3", label: "Mach3" },
  { value: "linuxcnc", label: "LinuxCNC" },
  { value: "ddcs", label: "DDCS" },
];

export function GcodePanel3D({ project, timeEstimate }: GcodePanel3DProps) {
  const [postProcessor, setPostProcessor] = useState<PostProcessor>("grbl");
  
  const issues = useMemo(() => validateProject3D(project), [project]);
  
  const gcode = useMemo(() => {
    if (project.toolpaths.length === 0) return "";
    return generateGcode3D(project.toolpaths, project.operations, project.tools, postProcessor);
  }, [project, postProcessor]);
  
  const lineCount = useMemo(() => gcode.split("\n").length, [gcode]);
  
  const totalPathLength = useMemo(() => 
    project.toolpaths.reduce((sum, tp) => sum + tp.pathLength, 0),
    [project.toolpaths]
  );
  
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(gcode);
    toast.success("G-Code copiado!");
  }, [gcode]);
  
  const handleDownload = useCallback(() => {
    const blob = new Blob([gcode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name || "projeto"}_3d.nc`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("G-Code baixado!");
  }, [gcode, project.name]);
  
  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    const s = Math.floor((minutes % 1) * 60);
    
    if (h > 0) return `${h}h ${m}min`;
    if (m > 0) return `${m}min ${s}s`;
    return `${s}s`;
  };
  
  return (
    <div className="h-full flex flex-col gap-2 p-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">G-Code 3D</span>
          {gcode && (
            <Badge variant="outline" className="text-[9px] h-5">
              {lineCount.toLocaleString()} linhas
            </Badge>
          )}
        </div>
        
        <Select value={postProcessor} onValueChange={(v) => setPostProcessor(v as PostProcessor)}>
          <SelectTrigger className="w-28 h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {POST_PROCESSORS.map((pp) => (
              <SelectItem key={pp.value} value={pp.value}>
                {pp.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Issues */}
      {issues.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-md p-2">
        <div className="flex items-center gap-1.5 text-warning mb-1">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Atenção</span>
        </div>
        <ul className="text-[10px] text-muted-foreground space-y-0.5">
          {issues.map((issue, i) => (
            <li key={i}>• {issue}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Stats */}
      {timeEstimate && (
        <div className="grid grid-cols-3 gap-2">
          <Card className="border-border">
            <CardContent className="p-2 text-center">
              <Clock className="h-3 w-3 mx-auto text-primary mb-1" />
              <div className="text-xs font-medium">{formatTime(timeEstimate.totalTime)}</div>
              <div className="text-[9px] text-muted-foreground">Tempo Total</div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-2 text-center">
              <div className="text-xs font-medium">{formatTime(timeEstimate.roughingTime)}</div>
              <div className="text-[9px] text-muted-foreground">Desbaste</div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-2 text-center">
              <div className="text-xs font-medium">{formatTime(timeEstimate.finishingTime)}</div>
              <div className="text-[9px] text-muted-foreground">Acabamento</div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <Ruler className="h-3 w-3" />
        <span>Comprimento total: {(totalPathLength / 1000).toFixed(2)} m</span>
      </div>
      
      <Separator />
      
      {/* G-Code preview */}
      <div className="flex-1 min-h-0">
        {gcode ? (
          <ScrollArea className="h-full rounded-md border border-border bg-muted/30">
            <pre className="p-2 text-[10px] font-mono leading-relaxed">
              {gcode}
            </pre>
          </ScrollArea>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            <div className="text-center">
              <FileCode className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Gere os percursos primeiro</p>
              <p className="text-[10px] mt-1">Clique em "Auto CAM 3D" ou adicione operações manualmente</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Actions */}
      {gcode && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1.5" onClick={handleCopy}>
            <Copy className="h-3.5 w-3.5" />
            Copiar
          </Button>
          <Button size="sm" className="flex-1 h-8 text-xs gap-1.5" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5" />
            Baixar .NC
          </Button>
        </div>
      )}
    </div>
  );
}
