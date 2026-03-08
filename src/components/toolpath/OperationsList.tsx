import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff, Copy, Trash2, GripVertical, Clock } from "lucide-react";
import type { ToolpathOperation, CncTool, SvgVector } from "@/lib/toolpath-engine";
import { OPERATION_LABELS, calculateOperation } from "@/lib/toolpath-engine";

interface OperationsListProps {
  operations: ToolpathOperation[];
  tools: CncTool[];
  vectors: SvgVector[];
  activeOperationId: string | null;
  showToolpath: Record<string, boolean>;
  onSetActive: (id: string | null) => void;
  onChangeOperations: (ops: ToolpathOperation[]) => void;
  onToggleToolpath: (id: string) => void;
}

export function OperationsList({ operations, tools, vectors, activeOperationId, showToolpath, onSetActive, onChangeOperations, onToggleToolpath }: OperationsListProps) {
  const duplicate = (op: ToolpathOperation) => {
    const dup: ToolpathOperation = {
      ...op,
      id: `op-${Date.now()}`,
      name: `${op.name} (cópia)`,
      order: operations.length + 1,
    };
    onChangeOperations([...operations, dup]);
  };

  const remove = (id: string) => {
    onChangeOperations(operations.filter((o) => o.id !== id));
    if (activeOperationId === id) onSetActive(null);
  };

  const toggleEnabled = (id: string) => {
    onChangeOperations(operations.map((o) => (o.id === id ? { ...o, enabled: !o.enabled } : o)));
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const arr = [...operations];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    arr.forEach((o, i) => (o.order = i + 1));
    onChangeOperations(arr);
  };

  // totals
  let totalTime = 0;
  operations.filter((o) => o.enabled).forEach((op) => {
    const tool = tools.find((t) => t.id === op.toolId);
    const calc = calculateOperation(op, tool, vectors);
    totalTime += calc.estimatedTime;
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold text-foreground">Operações ({operations.length})</h3>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" /> Total: {totalTime.toFixed(1)} min
        </span>
      </div>

      {operations.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">Nenhuma operação criada.</p>
      ) : (
        <div className="space-y-1">
          {operations.map((op, idx) => {
            const tool = tools.find((t) => t.id === op.toolId);
            const calc = calculateOperation(op, tool, vectors);
            const isActive = op.id === activeOperationId;

            return (
              <div
                key={op.id}
                onClick={() => onSetActive(op.id)}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs cursor-pointer transition-colors ${isActive ? "bg-primary/10 border border-primary/30" : "hover:bg-accent/50"} ${!op.enabled ? "opacity-50" : ""}`}
              >
                <button onClick={(e) => { e.stopPropagation(); moveUp(idx); }} className="cursor-grab"><GripVertical className="h-3 w-3 text-muted-foreground" /></button>
                <span className="font-medium truncate flex-1">{op.name}</span>
                <span className="text-muted-foreground shrink-0">{OPERATION_LABELS[op.type]}</span>
                <span className="text-muted-foreground shrink-0">{tool?.name || "—"}</span>
                <span className="text-muted-foreground shrink-0">{op.finalDepth}mm</span>
                <span className="text-muted-foreground shrink-0">{calc.estimatedTime.toFixed(1)}m</span>
                <button onClick={(e) => { e.stopPropagation(); onToggleToolpath(op.id); }}>
                  {showToolpath[op.id] !== false ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); toggleEnabled(op.id); }}>
                  <Switch checked={op.enabled} className="scale-75" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); duplicate(op); }} className="hover:text-primary"><Copy className="h-3 w-3" /></button>
                <button onClick={(e) => { e.stopPropagation(); remove(op.id); }} className="hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
