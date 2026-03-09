import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Download, Code } from "lucide-react";
import type { ToolpathProject, PostProcessor, CustomGcodeConfig } from "@/lib/toolpath-engine";
import { generateGcode, FILE_EXTENSIONS } from "@/lib/toolpath-engine";

interface GcodePanelProps {
  project: ToolpathProject;
  customGcode?: CustomGcodeConfig;
}

export function GcodePanel({ project, customGcode }: GcodePanelProps) {
  const [postProcessor, setPostProcessor] = useState<PostProcessor>("grbl");
  const [gcode, setGcode] = useState("");
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    const code = generateGcode(project, postProcessor, customGcode);
    setGcode(code);
    setGenerated(true);
  };

  const handleDownload = () => {
    const blob = new Blob([gcode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name || "toolpath"}${FILE_EXTENSIONS[postProcessor]}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Label className="text-xs">Pós-processador</Label>
          <Select value={postProcessor} onValueChange={(v: PostProcessor) => { setPostProcessor(v); setGenerated(false); }}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="grbl">GRBL</SelectItem>
              <SelectItem value="mach3">Mach3</SelectItem>
              <SelectItem value="ddcs">DDCS</SelectItem>
              <SelectItem value="linuxcnc">LinuxCNC</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" className="h-8 gap-1.5 mt-4" onClick={handleGenerate} disabled={project.operations.filter((o) => o.enabled).length === 0}>
          <Code className="h-3.5 w-3.5" /> Gerar G-code
        </Button>
        {generated && (
          <Button variant="outline" size="sm" className="h-8 gap-1.5 mt-4" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5" /> Baixar {FILE_EXTENSIONS[postProcessor]}
          </Button>
        )}
      </div>

      {generated && (
        <Textarea
          value={gcode}
          readOnly
          className="font-mono text-[10px] min-h-[120px] max-h-[200px] bg-muted/30"
          rows={8}
        />
      )}
    </div>
  );
}
