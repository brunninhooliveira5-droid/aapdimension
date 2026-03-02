import { ReactNode, useCallback, useMemo, useRef } from "react";
// @ts-ignore - react-grid-layout CJS exports
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { GripVertical } from "lucide-react";
import { DashboardCardItem } from "@/hooks/useDashboardLayout";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface LayoutItem {
  i: string; x: number; y: number; w: number; h: number;
  minW?: number; minH?: number;
}

const COLS = { lg: 4, md: 3, sm: 2, xs: 1 };
const ROW_HEIGHT = 120;
const MARGIN: [number, number] = [16, 16];

/** Default height for different widget types */
function defaultH(card: DashboardCardItem): number {
  const key = card.key;
  if (
    key === "support_tickets_card" ||
    key === "maintenance_card" ||
    key === "bulletins_card" ||
    key === "recent_files_card"
  ) return 3;
  if (key === "financial_status_card") return 2;
  return 1;
}

/** Build layout from cards, auto-placing if no grid positions stored */
function buildLayout(cards: DashboardCardItem[]): LayoutItem[] {
  const hasPositions = cards.some(c => c.gridX != null && c.gridY != null);

  if (hasPositions) {
    return cards.map(card => ({
      i: card.key,
      x: card.gridX ?? 0,
      y: card.gridY ?? 0,
      w: card.gridW ?? card.colSpan ?? 1,
      h: card.gridH ?? defaultH(card),
      minW: 1,
      minH: 1,
    }));
  }

  // Auto-place cards in a simple top-to-bottom flow (4 cols)
  const layout: LayoutItem[] = [];
  let col = 0;
  let row = 0;
  let rowMaxH = 0;

  for (const card of cards) {
    const w = card.colSpan ?? 1;
    const h = defaultH(card);
    if (col + w > 4) {
      col = 0;
      row += rowMaxH;
      rowMaxH = 0;
    }
    layout.push({ i: card.key, x: col, y: row, w, h, minW: 1, minH: 1 });
    col += w;
    rowMaxH = Math.max(rowMaxH, h);
  }

  return layout;
}

interface Props {
  cards: DashboardCardItem[];
  editMode: boolean;
  onLayoutChange: (cards: DashboardCardItem[]) => void;
  renderCard: (card: DashboardCardItem) => ReactNode;
}

export function DraggableDashboardGrid({ cards, editMode, onLayoutChange, renderCard }: Props) {
  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  const layouts = useMemo(() => {
    const lg = buildLayout(cards);
    return { lg };
  }, [cards]);

  const handleLayoutChange = useCallback((layout: LayoutItem[]) => {
    if (!editMode) return;
    const currentCards = cardsRef.current;
    const updated = currentCards.map(card => {
      const item = layout.find(l => l.i === card.key);
      if (!item) return card;
      return {
        ...card,
        gridX: item.x,
        gridY: item.y,
        gridW: item.w,
        gridH: item.h,
        colSpan: item.w,
        order: item.y * 100 + item.x,
      };
    });
    onLayoutChange(updated);
  }, [editMode, onLayoutChange]);

  return (
    <div className="dashboard-grid-container">
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 0 }}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
        margin={MARGIN}
        isDraggable={editMode}
        isResizable={editMode}
        draggableHandle=".grid-drag-handle"
        onLayoutChange={handleLayoutChange}
        useCSSTransforms
        compactType="vertical"
      >
        {cards.map(card => (
          <div key={card.key} className="relative group h-full">
            {editMode && (
              <div className="grid-drag-handle absolute -top-2 -left-2 z-10 p-1 rounded-md bg-primary text-primary-foreground shadow-md cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="h-full overflow-hidden">
              {renderCard(card)}
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
