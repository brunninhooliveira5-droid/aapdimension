import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SliceContour } from "@/lib/slicer3d-engine";

interface PartsListTableProps {
  contours: SliceContour[];
  materialName: string;
}

export function PartsListTable({ contours, materialName }: PartsListTableProps) {
  if (contours.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">Nenhuma peça gerada ainda.</p>;
  }

  return (
    <div className="rounded-lg border border-border overflow-auto max-h-[400px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">#</TableHead>
            <TableHead>Peça</TableHead>
            <TableHead className="text-right">Largura (mm)</TableHead>
            <TableHead className="text-right">Altura (mm)</TableHead>
            <TableHead className="text-right">Espessura (mm)</TableHead>
            <TableHead className="text-right">Área (mm²)</TableHead>
            <TableHead>Qtd</TableHead>
            <TableHead>Material</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contours.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-mono text-xs">{c.id + 1}</TableCell>
              <TableCell className="font-medium">{c.label}</TableCell>
              <TableCell className="text-right">{c.width.toFixed(1)}</TableCell>
              <TableCell className="text-right">{c.height.toFixed(1)}</TableCell>
              <TableCell className="text-right">{c.thickness.toFixed(1)}</TableCell>
              <TableCell className="text-right">{c.area.toFixed(1)}</TableCell>
              <TableCell>1</TableCell>
              <TableCell className="text-muted-foreground">{materialName || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
