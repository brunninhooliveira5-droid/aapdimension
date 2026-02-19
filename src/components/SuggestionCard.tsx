import { useState } from "react";
import { MessageSquarePlus, Send, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "orcamento_corte", label: "Orçamento de Corte" },
  { value: "financeiro", label: "Financeiro" },
  { value: "maquinas", label: "Máquinas" },
  { value: "treinamentos", label: "Treinamentos" },
  { value: "app_interface", label: "App / Interface" },
  { value: "outro", label: "Outro" },
];

export function SuggestionCard() {
  const { user, session } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() || message.trim().length < 10) {
      toast.error("A sugestão deve ter pelo menos 10 caracteres.");
      return;
    }
    if (!session?.user?.id) return;

    setSending(true);
    try {
      // Check daily limit (3 per day)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count } = await (supabase as any)
        .from("user_suggestions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .gte("created_at", todayStart.toISOString());

      if ((count ?? 0) >= 3) {
        toast.error("Limite de 3 sugestões por dia atingido. Tente novamente amanhã.");
        setSending(false);
        return;
      }

      const { error } = await (supabase as any).from("user_suggestions").insert({
        user_id: session.user.id,
        user_name: user?.name || null,
        user_email: user?.email || null,
        category: category || null,
        message: message.trim(),
      });

      if (error) throw error;

      setSuccess(true);
      setMessage("");
      setCategory("");
      setTimeout(() => {
        setSuccess(false);
        setOpen(false);
      }, 2000);
    } catch (err: any) {
      toast.error("Erro ao enviar sugestão: " + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow border-primary/20 hover:border-primary/40"
        onClick={() => setOpen(true)}
      >
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <MessageSquarePlus className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Nos ajude a melhorar</p>
            <p className="text-xs text-muted-foreground">Envie sua sugestão</p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquarePlus className="w-5 h-5 text-primary" />
              Enviar Sugestão
            </DialogTitle>
            <DialogDescription>
              Sua opinião é muito importante para nós. Compartilhe ideias, melhorias ou problemas.
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 className="w-12 h-12 text-success" />
              <p className="text-sm font-medium text-foreground">Sugestão enviada! Obrigado.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Categoria (opcional)</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">
                  Sugestão <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  className="mt-1 min-h-[120px]"
                  placeholder="Descreva sua sugestão, ideia ou melhoria..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {message.length}/2000 {message.length > 0 && message.length < 10 && "(mínimo 10 caracteres)"}
                </p>
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleSubmit}
                disabled={sending || message.trim().length < 10}
              >
                {sending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                ) : (
                  <><Send className="w-4 h-4" /> Enviar sugestão</>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
