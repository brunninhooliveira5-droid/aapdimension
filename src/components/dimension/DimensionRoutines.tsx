import { Card, CardContent } from "@/components/ui/card";
import { RotateCcw } from "lucide-react";

export function DimensionRoutines() {
  return (
    <div className="mt-4">
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <RotateCcw className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">Rotinas Recorrentes</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Em breve você poderá cadastrar tarefas recorrentes internas (diárias, semanais, mensais) para automatizar o acompanhamento de atividades repetitivas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
