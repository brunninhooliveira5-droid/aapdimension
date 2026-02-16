import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, FolderOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export interface TrainingSector {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  file_count?: number;
}

interface Props {
  sectors: TrainingSector[];
  loading: boolean;
  isAdmin: boolean;
  onSelect: (sector: TrainingSector) => void;
  onEdit: (sector: TrainingSector) => void;
  onDelete: (sector: TrainingSector) => void;
}

export function SectorCardsGrid({ sectors, loading, isAdmin, onSelect, onEdit, onDelete }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-64 rounded-lg" />
        ))}
      </div>
    );
  }

  if (sectors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <FolderOpen className="h-16 w-16 mb-4 opacity-40" />
        <p className="text-lg">Nenhum setor encontrado</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {sectors.map((sector) => (
        <Card
          key={sector.id}
          className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all group relative"
          onClick={() => onSelect(sector)}
        >
          <div className="aspect-[16/10] overflow-hidden bg-muted">
            {sector.image_url ? (
              <img
                src={sector.image_url}
                alt={sector.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground/40" />
              </div>
            )}
          </div>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground truncate">{sector.name}</h3>
              {!sector.is_active && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
            </div>
            {sector.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{sector.description}</p>
            )}
            <p className="text-xs text-muted-foreground pt-1">{sector.file_count ?? 0} arquivo(s)</p>
          </CardContent>
          {isAdmin && (
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); onEdit(sector); }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); onDelete(sector); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
