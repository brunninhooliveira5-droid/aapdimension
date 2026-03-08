import { useState, useCallback, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Save, FolderOpen } from "lucide-react";
import { toast } from "sonner";

import { SvgCanvas } from "@/components/toolpath/SvgCanvas";
import { VectorsList } from "@/components/toolpath/VectorsList";
import { MaterialPanel } from "@/components/toolpath/MaterialPanel";
import { ToolLibrary } from "@/components/toolpath/ToolLibrary";
import { OperationPanel } from "@/components/toolpath/OperationPanel";
import { OperationsList } from "@/components/toolpath/OperationsList";
import { GcodePanel } from "@/components/toolpath/GcodePanel";
import { Simulation3D } from "@/components/toolpath/Simulation3D";

import {
  parseSvgContent,
  DEFAULT_TOOLS,
  DEFAULT_MATERIAL,
  type SvgVector,
  type MaterialConfig,
  type CncTool,
  type ToolpathOperation,
  type ToolpathProject,
} from "@/lib/toolpath-engine";

export default function ToolpathGeneratorPage() {
  const [projectName, setProjectName] = useState("Novo Projeto");
  const [svgContent, setSvgContent] = useState("");
  const [viewBox, setViewBox] = useState("0 0 500 500");
  const [vectors, setVectors] = useState<SvgVector[]>([]);
  const [selectedVectorIds, setSelectedVectorIds] = useState<string[]>([]);
  const [material, setMaterial] = useState<MaterialConfig>({ ...DEFAULT_MATERIAL });
  const [tools, setTools] = useState<CncTool[]>([...DEFAULT_TOOLS]);
  const [selectedToolId, setSelectedToolId] = useState(DEFAULT_TOOLS[0]?.id || "");
  const [operations, setOperations] = useState<ToolpathOperation[]>([]);
  const [activeOperationId, setActiveOperationId] = useState<string | null>(null);
  const [showToolpath, setShowToolpath] = useState<Record<string, boolean>>({});
  const [bottomTab, setBottomTab] = useState("operations");

  const handleImportSvg = useCallback((content: string) => {
    const { vectors: parsed, viewBox: vb } = parseSvgContent(content);
    setSvgContent(content);
    setViewBox(vb);
    setVectors(parsed);
    setSelectedVectorIds([]);
    setOperations([]);
    setActiveOperationId(null);
    toast.success(`${parsed.length} vetores importados`);
  }, []);

  const handleSelectVector = useCallback((id: string, multi: boolean) => {
    if (!id) {
      if (!multi) setSelectedVectorIds([]);
      return;
    }
    setSelectedVectorIds((prev) => {
      if (multi) {
        return prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id];
      }
      return [id];
    });
  }, []);

  const toggleToolpath = useCallback((id: string) => {
    setShowToolpath((prev) => ({ ...prev, [id]: prev[id] === false ? true : false }));
  }, []);

  const buildProject = (): ToolpathProject => ({
    id: `proj-${Date.now()}`,
    name: projectName,
    svgContent,
    material,
    tools,
    operations,
    vectors,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const handleSave = () => {
    const project = buildProject();
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName}.dtp`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Projeto salvo!");
  };

  const handleLoad = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".dtp,.json";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const project: ToolpathProject = JSON.parse(reader.result as string);
          setProjectName(project.name);
          setSvgContent(project.svgContent);
          setVectors(project.vectors);
          setMaterial(project.material);
          setTools(project.tools);
          setOperations(project.operations);
          setSelectedVectorIds([]);
          setActiveOperationId(null);

          const parser = new DOMParser();
          const doc = parser.parseFromString(project.svgContent, "image/svg+xml");
          const svg = doc.querySelector("svg");
          setViewBox(svg?.getAttribute("viewBox") || "0 0 500 500");

          toast.success("Projeto carregado!");
        } catch {
          toast.error("Arquivo inválido");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight">Gerador de Percurso</h1>
          <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="h-7 w-48 text-xs" />
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleLoad}><FolderOpen className="h-3.5 w-3.5" /> Abrir</Button>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave}><Save className="h-3.5 w-3.5" /> Salvar</Button>
        </div>
      </div>

      {/* Main layout */}
      <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-lg border border-border">
        {/* Left panel */}
        <ResizablePanel defaultSize={18} minSize={14} maxSize={25}>
          <div className="h-full overflow-auto p-2 space-y-2">
            <VectorsList
              vectors={vectors}
              selectedVectorIds={selectedVectorIds}
              onSelectVector={handleSelectVector}
              onImportSvg={handleImportSvg}
              onSelectAll={() => setSelectedVectorIds(vectors.map((v) => v.id))}
              onDeselectAll={() => setSelectedVectorIds([])}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Center */}
        <ResizablePanel defaultSize={50}>
          <ResizablePanelGroup direction="vertical">
            {/* Canvas */}
            <ResizablePanel defaultSize={60} minSize={35}>
              <SvgCanvas
                vectors={vectors}
                material={material}
                operations={operations}
                tools={tools}
                selectedVectorIds={selectedVectorIds}
                activeOperationId={activeOperationId}
                showToolpath={showToolpath}
                onSelectVector={handleSelectVector}
                viewBox={viewBox}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Bottom panel */}
            <ResizablePanel defaultSize={40} minSize={20}>
              <div className="h-full overflow-hidden flex flex-col">
                <Tabs value={bottomTab} onValueChange={setBottomTab} className="flex flex-col h-full">
                  <TabsList className="h-8 mx-2 mt-1 shrink-0">
                    <TabsTrigger value="operations" className="text-xs h-6">Operações</TabsTrigger>
                    <TabsTrigger value="simulation" className="text-xs h-6">Simulação 3D</TabsTrigger>
                    <TabsTrigger value="gcode" className="text-xs h-6">G-Code</TabsTrigger>
                  </TabsList>
                  <TabsContent value="operations" className="flex-1 overflow-auto px-2 pb-2">
                    <OperationsList
                      operations={operations}
                      tools={tools}
                      vectors={vectors}
                      activeOperationId={activeOperationId}
                      showToolpath={showToolpath}
                      onSetActive={setActiveOperationId}
                      onChangeOperations={setOperations}
                      onToggleToolpath={toggleToolpath}
                    />
                  </TabsContent>
                  <TabsContent value="simulation" className="flex-1 min-h-0">
                    <Simulation3D
                      material={material}
                      operations={operations}
                      tools={tools}
                      vectors={vectors}
                    />
                  </TabsContent>
                  <TabsContent value="gcode" className="flex-1 overflow-auto px-2 pb-2">
                    <GcodePanel project={buildProject()} />
                  </TabsContent>
                </Tabs>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right panel */}
        <ResizablePanel defaultSize={22} minSize={16} maxSize={30}>
          <div className="h-full overflow-auto p-2 space-y-2">
            <MaterialPanel material={material} onChange={setMaterial} />
            <ToolLibrary tools={tools} onChange={setTools} selectedToolId={selectedToolId} onSelectTool={setSelectedToolId} />
            <OperationPanel
              operations={operations}
              tools={tools}
              vectors={vectors}
              selectedVectorIds={selectedVectorIds}
              activeOperationId={activeOperationId}
              onChangeOperations={setOperations}
              onSetActive={setActiveOperationId}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
