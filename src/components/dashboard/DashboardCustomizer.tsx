import { useState, useMemo } from "react";
import {
  Settings2, GripVertical, Save, X, RotateCcw, Lock, Plus, Search,
  Trash2, Eye, EyeOff, Move, LockOpen, ExternalLink, LayoutTemplate,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ALL_WIDGETS, DashboardCardItem } from "@/hooks/useDashboardLayout";
import { MENU_REGISTRY, flattenRegistry, type MenuRegistryItem } from "@/data/menuRegistry";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardTemplatePicker } from "./DashboardTemplatePicker";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  cards: DashboardCardItem[];
  isCardAvailable: (card: DashboardCardItem) => boolean;
  isSaving: boolean;
  dashboardLocked: boolean;
  appliedTemplateId: string | null;
  onSave: (cards: DashboardCardItem[]) => Promise<void>;
  onReset: () => Promise<void>;
  onApplyTemplate: (layout: DashboardCardItem[], templateId: string, locked: boolean) => Promise<void>;
}

function SortableItem({
  item, available, dragEnabled, onToggle, onRemove,
}: {
  item: DashboardCardItem; available: boolean; dragEnabled: boolean;
  onToggle: (key: string) => void; onRemove: (key: string) => void;
}) {
  const label = item.title;
  const isShortcut = item.type === "shortcut";
  const isFixed = item.type === "widget" && ALL_WIDGETS.find(w => w.key === item.key)?.fixed;
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.key, disabled: !dragEnabled,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style}
      className={`flex items-center gap-2 p-2.5 rounded-md border transition-colors text-sm ${
        !available ? "bg-muted/50 border-border/50 opacity-60"
        : item.visible ? "bg-primary/5 border-primary/20" : "bg-card border-border"
      }`}
    >
      <button {...attributes} {...listeners}
        className={`shrink-0 ${dragEnabled ? "cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground" : "cursor-default text-muted-foreground/30"}`}
        tabIndex={dragEnabled ? 0 : -1}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{label}</p>
        <p className="text-[10px] text-muted-foreground">
          {!available ? <span className="flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Indisponível</span>
           : isShortcut ? "Atalho" : "Widget"}
        </p>
      </div>
      {isFixed ? (
        <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
          <Lock className="w-3 h-3" /> Fixo
        </span>
      ) : (
        <>
          <Switch checked={item.visible && available} disabled={!available} onCheckedChange={() => onToggle(item.key)} className="scale-90" />
          {isShortcut && (
            <button onClick={() => onRemove(item.key)} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function DashboardCustomizer({
  cards, isCardAvailable, isSaving, dashboardLocked, appliedTemplateId,
  onSave, onReset, onApplyTemplate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DashboardCardItem[]>([]);
  const [dragEnabled, setDragEnabled] = useState(false);
  const [search, setSearch] = useState("");
  const [mainTab, setMainTab] = useState("cards");
  const [libTab, setLibTab] = useState("widgets");
  const { hasAccess, hasProAccess } = useAuth();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleOpen = () => {
    setDraft([...cards]);
    setSearch("");
    setDragEnabled(false);
    setMainTab(dashboardLocked ? "templates" : "cards");
    setOpen(true);
  };

  const handleToggle = (key: string) => {
    const isFixed = ALL_WIDGETS.find(w => w.key === key)?.fixed;
    if (isFixed) return;
    setDraft(prev => prev.map(item => (item.key === key ? { ...item, visible: !item.visible } : item)));
  };

  const handleRemove = (key: string) => setDraft(prev => prev.filter(c => c.key !== key));

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

  const handleSave = async () => { await onSave(draft); setOpen(false); };
  const handleReset = async () => { await onReset(); setOpen(false); };
  const handleApplyTemplate = async (layout: DashboardCardItem[], templateId: string, locked: boolean) => {
    await onApplyTemplate(layout, templateId, locked);
    setDraft([...layout]);
    if (locked) setMainTab("templates");
  };

  // Library helpers
  const unusedWidgets = useMemo(() => {
    const draftKeys = new Set(draft.map(d => d.key));
    return ALL_WIDGETS.filter(w => !draftKeys.has(w.key)).filter(w => {
      if (!w.requiredAccess || w.requiredAccess.length === 0) return true;
      return w.requiredAccess.some(s => hasAccess(s));
    });
  }, [draft, hasAccess]);

  const addWidget = (key: string) => {
    const def = ALL_WIDGETS.find(w => w.key === key);
    if (!def) return;
    setDraft(prev => [...prev, { id: `w_${key}`, type: "widget" as const, key, title: def.label, visible: true, order: prev.length }]);
  };

  const availableShortcuts = useMemo(() => {
    const draftKeys = new Set(draft.map(d => d.key));
    const checkItem = (item: MenuRegistryItem): boolean => {
      if (!hasAccess(item.section)) return false;
      if (item.proFeature && !hasProAccess(item.proFeature)) return false;
      return true;
    };
    const result: { parent: MenuRegistryItem; children: MenuRegistryItem[] }[] = [];
    for (const item of MENU_REGISTRY) {
      if (item.id === "nav_home") continue;
      if (!checkItem(item)) continue;
      const availableChildren = (item.children ?? []).filter(c => checkItem(c) && !draftKeys.has(c.id));
      if (!draftKeys.has(item.id) || availableChildren.length > 0) {
        result.push({ parent: item, children: availableChildren });
      }
    }
    return result;
  }, [draft, hasAccess, hasProAccess]);

  const addShortcutFromRegistry = (entry: MenuRegistryItem) => {
    if (draft.some(c => c.key === entry.id)) return;
    setDraft(prev => [...prev, { id: `s_${entry.id}`, type: "shortcut" as const, key: entry.id, title: entry.label, visible: true, order: prev.length, targetRoute: entry.route }]);
  };

  const filteredDraft = search ? draft.filter(c => c.title.toLowerCase().includes(search.toLowerCase())) : draft;
  const filteredWidgets = search ? unusedWidgets.filter(w => w.label.toLowerCase().includes(search.toLowerCase())) : unusedWidgets;
  const filteredShortcuts = search
    ? availableShortcuts.map(g => ({ parent: g.parent, children: g.children.filter(c => c.label.toLowerCase().includes(search.toLowerCase())) }))
        .filter(g => g.parent.label.toLowerCase().includes(search.toLowerCase()) || g.children.length > 0)
    : availableShortcuts;

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleOpen}>
        <Settings2 className="w-3.5 h-3.5" />
        Personalizar dashboard
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Settings2 className="w-4.5 h-4.5 text-primary" />
              Personalizar Dashboard
            </DialogTitle>
          </DialogHeader>

          {/* Main tabs: Cards / Templates */}
          <div className="px-5 pb-2">
            <Tabs value={mainTab} onValueChange={setMainTab}>
              <TabsList>
                <TabsTrigger value="cards" className="text-xs h-7 px-3 gap-1">
                  <Settings2 className="w-3 h-3" /> Meus Cards
                </TabsTrigger>
                <TabsTrigger value="templates" className="text-xs h-7 px-3 gap-1">
                  <LayoutTemplate className="w-3 h-3" /> Templates
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {mainTab === "templates" ? (
            <div className="flex-1 overflow-y-auto px-5 py-3">
              <DashboardTemplatePicker
                currentTemplateId={appliedTemplateId}
                onApply={handleApplyTemplate}
              />
            </div>
          ) : (
            <>
              {/* Locked banner */}
              {dashboardLocked && (
                <div className="mx-5 mb-2 p-2.5 rounded-md bg-warning/10 border border-warning/30 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-warning shrink-0" />
                  <p className="text-xs text-warning">Layout bloqueado pelo administrador. Para personalizar, aplique outro template ou restaure o padrão.</p>
                </div>
              )}

              {/* Top controls */}
              <div className="px-5 pb-3 space-y-2.5 border-b border-border">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                    <Switch checked={dragEnabled} onCheckedChange={setDragEnabled} disabled={dashboardLocked} className="scale-75" />
                    {dragEnabled
                      ? <span className="flex items-center gap-1"><Move className="w-3 h-3" /> Modo arrastar ON</span>
                      : <span className="flex items-center gap-1"><LockOpen className="w-3 h-3" /> Modo arrastar OFF</span>
                    }
                  </label>
                  <Button variant="ghost" size="sm" className="gap-1 text-[11px] h-7" onClick={handleReset} disabled={isSaving}>
                    <RotateCcw className="w-3 h-3" /> Restaurar
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder="Buscar cards..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Cards na minha Home ({filteredDraft.length})
                  </h4>
                  <div className="space-y-1.5">
                    {filteredDraft.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">Nenhum card encontrado.</p>
                    ) : (
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={filteredDraft.map(d => d.key)} strategy={verticalListSortingStrategy}>
                          {filteredDraft.map(item => (
                            <SortableItem key={item.key} item={item} available={isCardAvailable(item)}
                              dragEnabled={dragEnabled && !dashboardLocked}
                              onToggle={dashboardLocked ? () => {} : handleToggle}
                              onRemove={dashboardLocked ? () => {} : handleRemove}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                </div>

                {!dashboardLocked && (
                  <div>
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Adicionar Cards</h4>
                    <Tabs value={libTab} onValueChange={setLibTab}>
                      <TabsList className="mb-2">
                        <TabsTrigger value="widgets" className="text-xs h-7 px-3">Widgets</TabsTrigger>
                        <TabsTrigger value="shortcuts" className="text-xs h-7 px-3">Atalhos (Menu)</TabsTrigger>
                      </TabsList>
                      <TabsContent value="widgets">
                        {filteredWidgets.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">Todos os widgets já foram adicionados.</p>
                        ) : (
                          <div className="space-y-1">
                            {filteredWidgets.map(w => (
                              <button key={w.key} onClick={() => addWidget(w.key)}
                                className="flex items-center gap-2 w-full p-2 rounded-md border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
                              >
                                <Plus className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span className="text-xs text-foreground">{w.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                      <TabsContent value="shortcuts">
                        {filteredShortcuts.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">Nenhum atalho disponível.</p>
                        ) : (
                          <div className="space-y-2">
                            {filteredShortcuts.map(group => {
                              const parentAdded = draft.some(c => c.key === group.parent.id);
                              const ParentIcon = group.parent.icon;
                              return (
                                <div key={group.parent.id}>
                                  {!parentAdded && (
                                    <button onClick={() => addShortcutFromRegistry(group.parent)}
                                      className="flex items-center gap-2 w-full p-2 rounded-md border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
                                    >
                                      <Plus className="w-3.5 h-3.5 text-primary shrink-0" />
                                      <ParentIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                      <span className="text-xs font-medium text-foreground">{group.parent.label}</span>
                                    </button>
                                  )}
                                  {group.children.length > 0 && (
                                    <div className="ml-5 mt-1 space-y-1">
                                      {group.children.map(child => {
                                        const ChildIcon = child.icon;
                                        return (
                                          <button key={child.id} onClick={() => addShortcutFromRegistry(child)}
                                            className="flex items-center gap-2 w-full p-1.5 rounded-md border border-dashed border-border/60 hover:border-primary/30 hover:bg-primary/5 transition-colors text-left"
                                          >
                                            <Plus className="w-3 h-3 text-primary shrink-0" />
                                            <ChildIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                                            <span className="text-[11px] text-foreground">{child.label}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </div>
            </>
          )}

          <DialogFooter className="px-5 py-3 border-t border-border gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isSaving}>
              <X className="w-3.5 h-3.5 mr-1" /> Sair
            </Button>
            {mainTab === "cards" && !dashboardLocked && (
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                <Save className="w-3.5 h-3.5 mr-1" /> Salvar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
