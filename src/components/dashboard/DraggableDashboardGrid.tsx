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
import { GripVertical } from "lucide-react";
import { DashboardCardItem } from "@/hooks/useDashboardLayout";

interface SortableCardProps {
  id: string;
  children: ReactNode;
  editMode: boolean;
}

function SortableCard({ id, children, editMode }: SortableCardProps) {
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
    <div ref={setNodeRef} style={style} className="relative group">
      {editMode && (
        <button
          {...attributes}
          {...listeners}
          className="absolute -top-2 -left-2 z-10 p-1 rounded-md bg-primary text-primary-foreground shadow-md cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      )}
      {children}
    </div>
  );
}

interface Props {
  cards: DashboardCardItem[];
  editMode: boolean;
  onReorder: (cards: DashboardCardItem[]) => void;
  renderCard: (card: DashboardCardItem) => ReactNode;
}

export function DraggableDashboardGrid({ cards, editMode, onReorder, renderCard }: Props) {
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

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={cards.map(c => c.key)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cards.map(card => (
            <SortableCard key={card.key} id={card.key} editMode={editMode}>
              {renderCard(card)}
            </SortableCard>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
