import { useState } from "react";
import { Settings2, GripVertical, Save, X, RotateCcw, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ALL_WIDGETS, WidgetLayoutItem } from "@/hooks/useDashboardLayout";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  layout: WidgetLayoutItem[];
  isWidgetAvailable: (key: string) => boolean;
  isSaving: boolean;
  onSave: (layout: WidgetLayoutItem[]) => Promise<void>;
  onReset: () => Promise<void>;
}

function SortableItem({
  item,
  available,
  onToggle,
}: {
  item: WidgetLayoutItem;
  available: boolean;
  onToggle: (key: string) => void;
}) {
  const label = ALL_WIDGETS.find(w => w.key === item.key)?.label ?? item.key;
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${
        !available
          ? "bg-muted/50 border-border/50 opacity-60"
          : item.visible
          ? "bg-primary/5 border-primary/20"
          : "bg-card border-border"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{label}</p>
        {!available && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock className="w-3 h-3" /> Indisponível para seu perfil
          </p>
        )}
      </div>
      <Switch
        checked={item.visible && available}
        disabled={!available}
        onCheckedChange={() => onToggle(item.key)}
      />
    </div>
  );
}

export function DashboardCustomizer({ layout, isWidgetAvailable, isSaving, onSave, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<WidgetLayoutItem[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleOpen = () => {
    setDraft([...layout]);
    setOpen(true);
  };

  const handleToggle = (key: string) => {
    setDraft(prev => prev.map(item =>
      item.key === key ? { ...item, visible: !item.visible } : item
    ));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setDraft(prev => {
        const oldIndex = prev.findIndex(i => i.key === active.id);
        const newIndex = prev.findIndex(i => i.key === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    await onSave(draft);
    setOpen(false);
  };

  const handleReset = async () => {
    await onReset();
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={handleOpen}
      >
        <Settings2 className="w-3.5 h-3.5" />
        Personalizar dashboard
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              Personalizar Dashboard
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground -mt-2">
            Arraste para reordenar e use os toggles para mostrar/ocultar widgets.
          </p>

          <div className="flex-1 overflow-y-auto space-y-2 py-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={draft.map(d => d.key)} strategy={verticalListSortingStrategy}>
                {draft.map(item => (
                  <SortableItem
                    key={item.key}
                    item={item}
                    available={isWidgetAvailable(item.key)}
                    onToggle={handleToggle}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleReset}
              disabled={isSaving}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar padrão
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isSaving}>
                <X className="w-3.5 h-3.5 mr-1" /> Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                <Save className="w-3.5 h-3.5 mr-1" /> Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
