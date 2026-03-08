import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { AcmFlatPiece } from "@/lib/acm-engine";

interface Props {
  pieces: AcmFlatPiece[];
  material: string;
  thickness: number;
}

export function AcmPartsList({ pieces, material, thickness }: Props) {
  return (
    <div className="space-y-3">
      {pieces.map((piece) => (
        <div key={piece.id} className="space-y-2">
          <h3 className="font-medium text-sm text-foreground">{piece.label}</h3>
          <p className="text-xs text-muted-foreground">
            Dimensão total: {piece.totalWidth.toFixed(0)} × {piece.totalHeight.toFixed(0)} mm
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Painel</TableHead>
                <TableHead className="text-right">Largura</TableHead>
                <TableHead className="text-right">Altura</TableHead>
                <TableHead className="text-right">Espessura</TableHead>
                <TableHead>Material</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {piece.panels.map((panel, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                  <TableCell className="font-medium">{panel.label}</TableCell>
                  <TableCell className="text-right">{panel.width.toFixed(1)} mm</TableCell>
                  <TableCell className="text-right">{panel.height.toFixed(1)} mm</TableCell>
                  <TableCell className="text-right">{thickness.toFixed(1)} mm</TableCell>
                  <TableCell className="text-muted-foreground">{material}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="text-xs text-muted-foreground text-right space-x-4">
            <span>Linhas de corte: {piece.cutLines.length}</span>
            <span>Linhas de usinagem: {piece.machiningLines.length}</span>
            <span>Linhas de dobra: {piece.bendLines.length}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
