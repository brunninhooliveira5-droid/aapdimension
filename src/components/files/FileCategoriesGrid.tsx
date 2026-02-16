import type { FileCategory } from "@/pages/FilesPage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, FolderOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Props {
  categories: FileCategory[];
  loading: boolean;
  isAdmin: boolean;
  getDefaultImage: (name: string) => string;
  onSelect: (cat: FileCategory) => void;
  onEdit: (cat: FileCategory) => void;
  onDelete: (cat: FileCategory) => void;
}

export function FileCategoriesGrid({ categories, loading, isAdmin, getDefaultImage, onSelect, onEdit, onDelete }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-64 rounded-lg" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <FolderOpen className="h-16 w-16 mb-4 opacity-40" />
        <p className="text-lg">Nenhuma categoria encontrada</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {categories.map((cat) => (
        <Card
          key={cat.id}
          className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all group relative"
          onClick={() => onSelect(cat)}
        >
          <div className="aspect-[16/10] overflow-hidden bg-muted">
            <img
              src={cat.image_url || getDefaultImage(cat.name)}
              alt={cat.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground truncate">{cat.name}</h3>
              {!cat.is_active && <Badge variant="secondary" className="text-[10px]">Inativa</Badge>}
            </div>
            {cat.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{cat.description}</p>
            )}
            <p className="text-xs text-muted-foreground pt-1">{cat.file_count ?? 0} arquivo(s)</p>
          </CardContent>
          {isAdmin && (
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); onEdit(cat); }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); onDelete(cat); }}
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
