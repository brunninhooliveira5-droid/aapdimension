import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TrainingSector } from "./SectorCardsGrid";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  open: boolean;
  sector: TrainingSector | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function SectorDeleteDialog({ open, sector, onClose, onDeleted }: Props) {
  const [confirmName, setConfirmName] = useState("");
  const [fileCount, setFileCount] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setConfirmName("");
    if (open && sector) {
      supabase
        .from("customer_files")
        .select("id", { count: "exact", head: true })
        .eq("training_sector_id", sector.id)
        .then(({ count }) => setFileCount(count ?? 0));
    } else {
      setFileCount(null);
    }
  }, [open, sector]);

  const canDelete = fileCount === 0 && confirmName.toUpperCase() === sector?.name.toUpperCase();

  const handleDelete = async () => {
    if (!sector || !canDelete) return;
    setDeleting(true);
    const { error } = await supabase.from("training_sectors").delete().eq("id", sector.id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
    } else {
      toast.success("Setor excluído!");
      onDeleted();
    }
    setDeleting(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>TEM CERTEZA que deseja excluir este setor?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>Esta ação removerá o setor e não pode ser desfeita.</p>
              {fileCount !== null && fileCount > 0 && (
                <p className="text-destructive font-medium">
                  Este setor possui {fileCount} arquivo(s). Remova ou mova os arquivos antes de excluir.
                </p>
              )}
              {fileCount === 0 && (
                <div className="space-y-1">
                  <p className="text-sm">
                    Digite <strong>"{sector?.name}"</strong> para confirmar:
                  </p>
                  <Input
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    placeholder={sector?.name}
                  />
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || deleting}
          >
            {deleting ? "Excluindo..." : "Excluir"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
