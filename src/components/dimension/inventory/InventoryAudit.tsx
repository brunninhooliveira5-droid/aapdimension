import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useModule } from "@/contexts/ModuleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export function InventoryAudit() {
  const { session: authSession } = useAuth();
  const { tables } = useModule();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const { data: sessions = [] } = useQuery({
    queryKey: [tables.inventorySessions],
    queryFn: async () => {
      const { data, error } = await supabase.from(tables.inventorySessions as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: sessionItems = [] } = useQuery({
    queryKey: [tables.inventorySessionItems, selectedSession],
    enabled: !!selectedSession,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tables.inventorySessionItems as any)
        .select(`*, ${tables.inventoryItems}(name, internal_code)`)
        .eq("session_id", selectedSession!);
      if (error) throw error;
      return data || [];
    },
  });

  const createSession = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Título obrigatório");

      const { data: session, error: sessErr } = await supabase
        .from(tables.inventorySessions as any)
        .insert({ title: title.trim(), started_by: authSession?.user.id! })
        .select()
        .single();
      if (sessErr) throw sessErr;

      const { data: items } = await supabase.from(tables.inventoryItems as any).select("id, current_quantity").eq("is_active", true);
      if (items && (items as any[]).length > 0) {
        const rows = (items as any[]).map((i: any) => ({
          session_id: (session as any).id,
          item_id: i.id,
          expected_quantity: Number(i.current_quantity),
        }));
        await supabase.from(tables.inventorySessionItems as any).insert(rows);
      }

      return (session as any).id;
    },
    onSuccess: (id) => {
      toast.success("Inventário iniciado!");
      qc.invalidateQueries({ queryKey: [tables.inventorySessions] });
      setSelectedSession(id);
      setOpen(false);
      setTitle("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateActual = useMutation({
    mutationFn: async ({ id, actual }: { id: string; actual: number }) => {
      await supabase.from(tables.inventorySessionItems as any).update({
        actual_quantity: actual,
        checked_by: authSession?.user.id!,
        checked_at: new Date().toISOString(),
      }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [tables.inventorySessionItems] }),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><ClipboardCheck className="h-4 w-4" />Inventário</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo Inventário</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Iniciar Inventário</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Título *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Inventário Março 2026" /></div>
                <Button onClick={() => createSession.mutate()} disabled={createSession.isPending} className="w-full">
                  {createSession.isPending ? "Criando..." : "Iniciar Inventário"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {(sessions as any[]).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(sessions as any[]).map((s) => (
              <Badge
                key={s.id}
                variant={selectedSession === s.id ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedSession(s.id)}
              >
                {s.title} ({format(new Date(s.created_at), "dd/MM/yy")})
                {s.status === "em_andamento" && " 🔄"}
              </Badge>
            ))}
          </div>
        )}

        {selectedSession && (sessionItems as any[]).length > 0 && (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Esperado</TableHead>
                  <TableHead className="text-right">Real</TableHead>
                  <TableHead className="text-right">Diferença</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(sessionItems as any[]).map((si) => (
                  <TableRow key={si.id}>
                    <TableCell className="font-medium">{si[tables.inventoryItems]?.name}</TableCell>
                    <TableCell className="text-right">{Number(si.expected_quantity)}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        className="w-20 h-8 text-right inline-block"
                        defaultValue={si.actual_quantity ?? ""}
                        onBlur={(e) => {
                          const val = Number(e.target.value);
                          if (!isNaN(val)) updateActual.mutate({ id: si.id, actual: val });
                        }}
                      />
                    </TableCell>
                    <TableCell className={`text-right font-medium ${Number(si.difference) > 0 ? "text-emerald-500" : Number(si.difference) < 0 ? "text-destructive" : ""}`}>
                      {si.actual_quantity != null ? Number(si.difference) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!selectedSession && (sessions as any[]).length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum inventário realizado.</p>
        )}
      </CardContent>
    </Card>
  );
}
