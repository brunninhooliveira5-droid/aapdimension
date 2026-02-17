import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface Bonus {
  id: string;
  amount: number;
  description: string;
  type: string;
  created_at: string;
  notes: string | null;
}

export function ServiceBonusCard() {
  const { session, user } = useAuth();
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [loading, setLoading] = useState(true);

  const isServico = user?.role === "servico";

  useEffect(() => {
    if (!session?.user || !isServico) return;
    const load = async () => {
      const { data } = await supabase
        .from("service_bonuses" as any)
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      setBonuses((data as any[]) ?? []);
      setLoading(false);
    };
    load();
  }, [session, isServico]);

  if (!isServico) return null;

  const totalCredits = bonuses.filter(b => b.type === "credito").reduce((s, b) => s + Number(b.amount), 0);
  const totalDebits = bonuses.filter(b => b.type === "debito").reduce((s, b) => s + Number(b.amount), 0);
  const balance = totalCredits - totalDebits;

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (loading) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Gift className="w-4 h-4 text-primary" />
          Meus Bônus
          <Badge variant="outline" className="ml-auto text-xs font-bold">
            Saldo: {fmt(balance)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-primary/5 border border-primary/10 p-2">
            <p className="text-xs text-muted-foreground">Créditos</p>
            <p className="text-sm font-bold text-primary">{fmt(totalCredits)}</p>
          </div>
          <div className="rounded-md bg-destructive/5 border border-destructive/10 p-2">
            <p className="text-xs text-muted-foreground">Débitos</p>
            <p className="text-sm font-bold text-destructive">{fmt(totalDebits)}</p>
          </div>
          <div className={`rounded-md border p-2 ${balance >= 0 ? "bg-primary/5 border-primary/10" : "bg-destructive/5 border-destructive/10"}`}>
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p className={`text-sm font-bold ${balance >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(balance)}</p>
          </div>
        </div>

        {bonuses.length > 0 && (
          <div className="space-y-1 max-h-[200px] overflow-y-auto mt-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Histórico</p>
            {bonuses.map(b => (
              <div key={b.id} className="flex items-center gap-2 p-2 rounded-md bg-accent/50 text-xs">
                {b.type === "credito" ? (
                  <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-destructive shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{b.description || "Bônus"}</p>
                  {b.notes && <p className="text-[10px] text-muted-foreground truncate">{b.notes}</p>}
                </div>
                <span className={`font-bold shrink-0 ${b.type === "credito" ? "text-primary" : "text-destructive"}`}>
                  {b.type === "credito" ? "+" : "−"}{fmt(Number(b.amount))}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {format(new Date(b.created_at), "dd/MM")}
                </span>
              </div>
            ))}
          </div>
        )}

        {bonuses.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">Nenhum bônus registrado ainda.</p>
        )}
      </CardContent>
    </Card>
  );
}
