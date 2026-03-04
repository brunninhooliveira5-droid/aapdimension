import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Factory } from "lucide-react";

const PERMISSION_LABELS: Record<string, string> = {
  maquinas: "Máquinas",
  suporte: "Suporte",
  manutencao: "Manutenção",
  equipamentos: "Equipamentos",
  pecas: "Peças e Acessórios",
  financeiro: "Faturas / Financeiro",
  orcamento: "Orçamento de Corte",
  configuracoes: "Configurações",
  arquivos: "Arquivos",
  controle_producao: "Controle de Produção",
  gestao_financeira: "Gerenciador Financeiro",
  can_manage_users: "Gerenciar Usuários da Empresa",
};

const PC_SUB_PERMISSION_LABELS: Record<string, string> = {
  pc_tarefas: "Tarefas",
  pc_pendencias: "Pendências",
  pc_cronograma: "Cronograma",
  pc_producao: "Produção",
  pc_rotinas: "Rotinas",
  pc_metas: "Metas",
  pc_estoque: "Estoque/Produção",
};

interface Props {
  permissions: Record<string, boolean>;
  onChange: (permissions: Record<string, boolean>) => void;
  disabled?: boolean;
}

export function MemberPermissionsEditor({ permissions, onChange, disabled }: Props) {
  const togglePermission = (key: string) => {
    onChange({ ...permissions, [key]: !permissions[key] });
  };

  const hasProductionAccess = permissions["controle_producao"] !== false;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border bg-muted/30">
            <Label htmlFor={`perm-${key}`} className="text-xs cursor-pointer flex-1">{label}</Label>
            <Switch
              id={`perm-${key}`}
              checked={permissions[key] ?? false}
              onCheckedChange={() => togglePermission(key)}
              disabled={disabled}
            />
          </div>
        ))}
      </div>

      {hasProductionAccess && (
        <div className="space-y-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Factory className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-semibold text-foreground">Funções do Controle de Produção</h4>
          </div>
          <p className="text-[10px] text-muted-foreground -mt-1">
            Desative as funções que este usuário não deve acessar. Visão Geral está sempre disponível.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(PC_SUB_PERMISSION_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border bg-muted/30">
                <Label htmlFor={`perm-${key}`} className="text-xs cursor-pointer flex-1">{label}</Label>
                <Switch
                  id={`perm-${key}`}
                  checked={permissions[key] ?? true}
                  onCheckedChange={() => togglePermission(key)}
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
