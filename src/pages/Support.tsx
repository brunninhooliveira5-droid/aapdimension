import { useState } from "react";
import { tickets, machines } from "@/data/mockData";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const problemTypes = ["Erro de Software", "Mecânico", "Elétrico", "Calibração", "Outro"];

const Support = () => {
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Chamado aberto com sucesso!");
    setOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Suporte</h1>
          <p className="text-sm text-muted-foreground mt-1">{tickets.length} chamados</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Chamado
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Abrir Chamado</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Máquina</Label>
                <Select required>
                  <SelectTrigger className="bg-accent border-border"><SelectValue placeholder="Selecione a máquina" /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {machines.map(m => <SelectItem key={m.id} value={m.id}>{m.model} — {m.serialNumber}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Tipo de Problema</Label>
                <Select required>
                  <SelectTrigger className="bg-accent border-border"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {problemTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Descrição</Label>
                <Textarea placeholder="Descreva o problema detalhadamente..." className="bg-accent border-border min-h-[100px]" required />
              </div>
              <Button type="submit" className="w-full">Enviar Chamado</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {tickets.map(ticket => (
          <div key={ticket.id} className="gradient-card rounded-lg border border-border p-4 flex items-center gap-4 hover:border-primary/20 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">{ticket.id}</span>
                <StatusBadge status={ticket.status} />
              </div>
              <p className="text-sm font-medium text-foreground mt-1">{ticket.machineName} — {ticket.type}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{ticket.description}</p>
            </div>
            <p className="text-xs text-muted-foreground shrink-0">{new Date(ticket.createdAt).toLocaleDateString("pt-BR")}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Support;
