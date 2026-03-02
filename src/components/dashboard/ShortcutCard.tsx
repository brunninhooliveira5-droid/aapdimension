import { useNavigate } from "react-router-dom";
import { flattenRegistry } from "@/data/menuRegistry";
import { ExternalLink, type LucideIcon } from "lucide-react";

interface Props {
  id: string;
  title: string;
  targetRoute: string;
}

export function ShortcutCard({ id, title, targetRoute }: Props) {
  const navigate = useNavigate();
  const entry = flattenRegistry().find(m => m.id === id);
  const Icon: LucideIcon | null = entry?.icon ?? ExternalLink;

  return (
    <button
      onClick={() => navigate(targetRoute)}
      className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md hover:bg-primary/5 active:scale-[0.98]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        <p className="text-[11px] text-muted-foreground truncate">Atalho</p>
      </div>
    </button>
  );
}
