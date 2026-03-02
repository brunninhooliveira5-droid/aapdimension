import { ReactNode, useCallback } from "react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates,
  useSortable, rectSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Maximize2, Minimize2 } from "lucide-react";
import { DashboardCardItem } from "@/hooks/useDashboardLayout";

const SPAN_OPTIONS = [1, 2, 3, 4] as const;
const SPAN_LABELS: Record<number, string> = { 1: "1col", 2: "2col", 3: "3col", 4: "4col" };
const COL_SPAN_CLASS: Record<number, string> = {
  1: "",
  2: "sm:col-span-2",
  3: "sm:col-span-2 lg:col-span-3",
  4: "sm:col-span-2 lg:col-span-3 xl:col-span-4",
};

interface SortableCardProps {
  id: string;
  children: ReactNode;
  editMode: boolean;
  colSpan: number;
  onCycleSize?: () => void;
}

function SortableCard({ id, children, editMode, colSpan, onCycleSize }: SortableCardProps) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id, disabled: !editMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${COL_SPAN_CLASS[colSpan] ?? ""}`}
    >
      {editMode && (
        <div className="absolute -top-2 -left-2 z-10 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            {...attributes}
            {...listeners}
            className="p-1 rounded-md bg-primary text-primary-foreground shadow-md cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onCycleSize?.(); }}
            className="p-1 rounded-md bg-secondary text-secondary-foreground shadow-md hover:bg-accent transition-colors"
            title={`Tamanho: ${SPAN_LABELS[colSpan]} → ${SPAN_LABELS[colSpan >= 4 ? 1 : colSpan + 1]}`}
          >
            {colSpan >= 2 ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <span className="text-[9px] font-medium bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded shadow-md">
            {SPAN_LABELS[colSpan]}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

interface Props {
  cards: DashboardCardItem[];
  editMode: boolean;
  onReorder: (cards: DashboardCardItem[]) => void;
  onResizeCard: (key: string, colSpan: number) => void;
  renderCard: (card: DashboardCardItem) => ReactNode;
}

export function DraggableDashboardGrid({ cards, editMode, onReorder, onResizeCard, renderCard }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = cards.findIndex(c => c.key === active.id);
      const newIndex = cards.findIndex(c => c.key === over.id);
      onReorder(arrayMove(cards, oldIndex, newIndex));
    }
  }, [cards, onReorder]);

  const cycleSize = useCallback((key: string, currentSpan: number) => {
    const nextSpan = currentSpan >= 4 ? 1 : currentSpan + 1;
    onResizeCard(key, nextSpan);
  }, [onResizeCard]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={cards.map(c => c.key)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cards.map(card => {
            const span = card.colSpan ?? 1;
            return (
              <SortableCard
                key={card.key}
                id={card.key}
                editMode={editMode}
                colSpan={span}
                onCycleSize={() => cycleSize(card.key, span)}
              >
                {renderCard(card)}
              </SortableCard>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
