import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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

interface Props {
  permissions: Record<string, boolean>;
  onChange: (permissions: Record<string, boolean>) => void;
  disabled?: boolean;
}

export function MemberPermissionsEditor({ permissions, onChange, disabled }: Props) {
  const togglePermission = (key: string) => {
    onChange({ ...permissions, [key]: !permissions[key] });
  };

  return (
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
  );
}
