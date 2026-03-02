import { useState, useEffect } from "react";
import { FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface RecentFile {
  id: string;
  display_name: string;
  updated_at: string;
}

export function RecentFilesWidget() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<RecentFile[]>([]);

  useEffect(() => {
    supabase
      .from("customer_files")
      .select("id, display_name, updated_at")
      .eq("published", true)
      .order("updated_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) setFiles(data);
      });
  }, []);

  return (
    <div className="gradient-card rounded-lg border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Arquivos Recentes</h3>
      <div className="space-y-2">
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum arquivo recente.</p>
        ) : files.map(f => (
          <div key={f.id}
            className="flex items-center gap-3 p-2.5 rounded-md bg-accent/50 cursor-pointer hover:bg-accent/80 transition-colors"
            onClick={() => navigate("/arquivos")}>
            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground truncate">{f.display_name}</p>
              <p className="text-xs text-muted-foreground">{new Date(f.updated_at).toLocaleDateString("pt-BR")}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
