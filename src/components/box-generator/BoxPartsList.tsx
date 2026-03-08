import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BoxPiece } from "@/lib/box-generator-engine";

interface Props {
  pieces: BoxPiece[];
  materialName: string;
  thickness: number;
  unit: string;
}

export function BoxPartsList({ pieces, materialName, thickness, unit }: Props) {
  const totalArea = pieces.reduce((s, p) => s + p.width * p.height * p.quantity, 0);

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Peça</TableHead>
            <TableHead className="text-right">Largura</TableHead>
            <TableHead className="text-right">Altura</TableHead>
            <TableHead className="text-right">Espessura</TableHead>
            <TableHead className="text-right">Qtd</TableHead>
            <TableHead>Material</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pieces.map((p, i) => (
            <TableRow key={p.id}>
              <TableCell className="font-mono text-xs">{i + 1}</TableCell>
              <TableCell className="font-medium">{p.label}</TableCell>
              <TableCell className="text-right">{p.width.toFixed(1)} {unit}</TableCell>
              <TableCell className="text-right">{p.height.toFixed(1)} {unit}</TableCell>
              <TableCell className="text-right">{thickness.toFixed(1)} {unit}</TableCell>
              <TableCell className="text-right">{p.quantity}</TableCell>
              <TableCell className="text-muted-foreground">{materialName}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-xs text-muted-foreground text-right">
        Área total: {totalArea.toFixed(0)} {unit}² | {pieces.length} tipos | {pieces.reduce((s, p) => s + p.quantity, 0)} peças
      </p>
    </div>
  );
}
