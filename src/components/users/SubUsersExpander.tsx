import { useState } from "react";
import { ChevronDown, ChevronRight, Eye, Pencil, Users, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableCell, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AccountInfo {
  accountId: string;
  maxMembers: number;
  subUsers: SubUser[];
}

export interface SubUser {
  userId: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  client_admin: "Administrador",
  operator: "Operador",
  client_finance: "Financeiro",
  viewer: "Visualizador",
};

interface SubUsersCellProps {
  userId: string;
  accountInfo: AccountInfo | undefined;
  expanded: boolean;
  onToggle: () => void;
  onEditLimit: () => void;
}

export const SubUsersCell = ({ accountInfo, expanded, onToggle, onEditLimit }: SubUsersCellProps) => {
  if (!accountInfo) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const count = accountInfo.subUsers.length;
  const max = accountInfo.maxMembers;

  return (
    <div className="flex items-center gap-1.5">
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggle}>
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </Button>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border cursor-pointer ${
              count >= max ? "bg-warning/15 text-warning border-warning/30" : "bg-info/15 text-info border-info/30"
            }`} onClick={onEditLimit}>
              <Users className="w-3 h-3" />
              {count} / {max}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {count} sub-usuário(s) de {max} permitidos. Clique para editar o limite.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={onEditLimit} title="Editar limite">
        <Pencil className="w-3 h-3" />
      </Button>
    </div>
  );
};

interface SubUsersRowsProps {
  accountInfo: AccountInfo;
  onImpersonate: (userId: string, name: string) => void;
  colSpan: number;
}

export const SubUsersRows = ({ accountInfo, onImpersonate, colSpan }: SubUsersRowsProps) => {
  if (accountInfo.subUsers.length === 0) {
    return (
      <TableRow className="border-border bg-muted/30">
        <TableCell colSpan={colSpan} className="text-center text-xs text-muted-foreground py-3 pl-12">
          Nenhum sub-usuário cadastrado.
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {accountInfo.subUsers.map(sub => (
        <TableRow key={sub.userId} className="border-border bg-muted/30">
          <TableCell />
          <TableCell className="text-sm pl-8">
            <div className="flex items-center gap-1.5">
              <Users className="w-3 h-3 text-muted-foreground" />
              {sub.name || "Sem nome"}
            </div>
          </TableCell>
          <TableCell className="text-muted-foreground text-sm">{sub.email}</TableCell>
          <TableCell className="text-muted-foreground text-sm">—</TableCell>
          <TableCell>
            <Badge variant="outline" className="text-[10px]">
              {ROLE_LABELS[sub.role] ?? sub.role}
            </Badge>
          </TableCell>
          <TableCell colSpan={3}>
            <Badge className={`text-[10px] ${sub.isActive ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" : "bg-muted text-muted-foreground"}`}>
              {sub.isActive ? "Ativo" : "Inativo"}
            </Badge>
          </TableCell>
          <TableCell className="text-right">
            {sub.isActive && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-success"
                title="Entrar como este sub-usuário"
                onClick={() => onImpersonate(sub.userId, sub.name)}
              >
                <UserCheck className="w-3.5 h-3.5" />
              </Button>
            )}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
};

interface EditMaxMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  ownerName: string;
  currentMax: number;
  onSaved: () => void;
}

export const EditMaxMembersDialog = ({ open, onOpenChange, accountId, ownerName, currentMax, onSaved }: EditMaxMembersDialogProps) => {
  const [value, setValue] = useState(currentMax);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from("accounts").update({ max_members: value }).eq("id", accountId);
    toast.success(`Limite de sub-usuários de "${ownerName}" atualizado para ${value}.`);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Limite de Sub-Usuários</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Defina o número máximo de sub-usuários para <strong>{ownerName}</strong>.
        </p>
        <div className="space-y-2">
          <Label className="text-foreground">Máximo de sub-usuários</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={value}
            onChange={e => setValue(parseInt(e.target.value) || 0)}
            className="bg-accent border-border"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
