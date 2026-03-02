import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useModule } from "@/contexts/ModuleContext";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, isSameDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const eventTypeLabels: Record<string, string> = { entrega: "Entrega", manutencao: "Manutenção", reuniao: "Reunião", cobranca: "Cobrança", followup: "Follow-up", outro: "Outro" };
const eventTypeColors: Record<string, string> = { entrega: "bg-green-500", manutencao: "bg-amber-500", reuniao: "bg-blue-500", cobranca: "bg-destructive", followup: "bg-purple-500", outro: "bg-muted-foreground" };

const emptyForm = { title: "", description: "", event_type: "reuniao", event_date: "", event_time: "", responsible: "" };

export function DimensionSchedule() {
  const { tables } = useModule();
  const { session, isReadOnly } = useAuth();
  const readOnly = isReadOnly();
  const [events, setEvents] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const fetchEvents = async () => {
    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
    const { data } = await supabase.from(tables.scheduleEvents as any).select("*").gte("event_date", start).lte("event_date", end).order("event_date");
    setEvents(data ?? []);
  };

  useEffect(() => { fetchEvents(); }, [currentMonth]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const openCreate = (date?: Date) => { setEditing(null); setForm({ ...emptyForm, event_date: date ? format(date, "yyyy-MM-dd") : "" }); setDialogOpen(true); };
  const openEdit = (ev: any) => { setEditing(ev); setForm({ title: ev.title, description: ev.description, event_type: ev.event_type, event_date: ev.event_date, event_time: ev.event_time ?? "", responsible: ev.responsible }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.title.trim() || !form.event_date) return;
    setSaving(true);
    const payload: any = { ...form, event_time: form.event_time || null };
    if (editing) {
      await supabase.from(tables.scheduleEvents as any).update(payload).eq("id", editing.id);
      toast.success("Evento atualizado!");
    } else {
      payload.created_by = session?.user?.id;
      await supabase.from(tables.scheduleEvents as any).insert(payload);
      toast.success("Evento criado!");
    }
    setDialogOpen(false); setSaving(false); fetchEvents();
  };

  const handleDelete = async (id: string) => {
    await supabase.from(tables.scheduleEvents as any).delete().eq("id", id);
    toast.success("Excluído!"); fetchEvents();
  };

  const dayEvents = selectedDay ? events.filter((e) => isSameDay(new Date(e.event_date + "T00:00:00"), selectedDay)) : [];

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <h3 className="text-lg font-semibold capitalize">{format(currentMonth, "MMMM yyyy", { locale: ptBR })}</h3>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        {!readOnly && <Button size="sm" className="gap-1.5" onClick={() => openCreate()}><Plus className="h-3.5 w-3.5" />Novo Evento</Button>}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(eventTypeLabels).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`w-2.5 h-2.5 rounded-full ${eventTypeColors[k]}`} />
            {v}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          <div key={d} className="bg-muted p-2 text-center text-[10px] font-semibold text-muted-foreground">{d}</div>
        ))}
        {days.map((day) => {
          const dayEvs = events.filter((e) => isSameDay(new Date(e.event_date + "T00:00:00"), day));
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const selected = selectedDay && isSameDay(day, selectedDay);
          return (
            <div
              key={day.toISOString()}
              className={`bg-card p-1.5 min-h-[70px] cursor-pointer transition-colors ${!inMonth ? "opacity-30" : ""} ${today ? "ring-1 ring-primary" : ""} ${selected ? "bg-primary/5" : "hover:bg-muted/50"}`}
              onClick={() => setSelectedDay(day)}
              onDoubleClick={() => openCreate(day)}
            >
              <span className={`text-[11px] font-medium ${today ? "text-primary" : ""}`}>{format(day, "d")}</span>
              <div className="space-y-0.5 mt-0.5">
                {dayEvs.slice(0, 3).map((ev) => (
                  <div key={ev.id} className="flex items-center gap-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); openEdit(ev); }}>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${eventTypeColors[ev.event_type]}`} />
                    <span className="text-[9px] truncate">{ev.title}</span>
                  </div>
                ))}
                {dayEvs.length > 3 && <span className="text-[9px] text-muted-foreground">+{dayEvs.length - 3}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day detail */}
      {selectedDay && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{format(selectedDay, "dd 'de' MMMM, EEEE", { locale: ptBR })}</CardTitle>
          </CardHeader>
          <CardContent>
            {dayEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum evento neste dia.</p>
            ) : (
              <div className="space-y-2">
                {dayEvents.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-2 p-2 rounded border">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${eventTypeColors[ev.event_type]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ev.title}</p>
                      <p className="text-[10px] text-muted-foreground">{eventTypeLabels[ev.event_type]} {ev.event_time ? `• ${ev.event_time.slice(0, 5)}` : ""} {ev.responsible ? `• ${ev.responsible}` : ""}</p>
                    </div>
                    {!readOnly && (
                      <>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(ev)}><Pencil className="h-3 w-3" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"><Trash2 className="h-3 w-3" /></Button></AlertDialogTrigger>
                          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir evento?</AlertDialogTitle><AlertDialogDescription>Ação irreversível.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(ev.id)}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar Evento" : "Novo Evento"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Textarea placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(eventTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Responsável" value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
              <Input type="time" value={form.event_time} onChange={(e) => setForm({ ...form, event_time: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
