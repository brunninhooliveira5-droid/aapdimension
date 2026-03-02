import { Scissors } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

export function CuttingQuoteShortcutWidget() {
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-primary/20 hover:border-primary/40"
      onClick={() => navigate("/orcamento")}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Scissors className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Orçamento de Corte</p>
          <p className="text-xs text-muted-foreground">Acessar ferramenta de orçamento</p>
        </div>
      </CardContent>
    </Card>
  );
}
