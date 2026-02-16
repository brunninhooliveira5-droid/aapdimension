import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { FileCategoriesGrid } from "@/components/files/FileCategoriesGrid";
import { FileListView } from "@/components/files/FileListView";
import { CategoryManageDialog } from "@/components/files/CategoryManageDialog";
import { FileUploadDialog } from "@/components/files/FileUploadDialog";
import { FileEditDialog } from "@/components/files/FileEditDialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Settings } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import catPrograms from "@/assets/cat-programs.jpg";
import catTraining from "@/assets/cat-training.jpg";
import catManuals from "@/assets/cat-manuals.jpg";
import catMacros from "@/assets/cat-macros.jpg";
import catOthers from "@/assets/cat-others.jpg";

const defaultImages: Record<string, string> = {
  "Arquivos e Programas": catPrograms,
  "Arquivos para Treinamento": catTraining,
  "Manuais": catManuals,
  "Macros e Configurações": catMacros,
  "Outros": catOthers,
};

export interface FileCategory {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  file_count?: number;
}

export interface CustomerFile {
  id: string;
  category_id: string;
  file_url: string;
  file_name_original: string;
  display_name: string;
  description: string;
  version: string | null;
  tags: string[];
  file_size: number;
  mime_type: string;
  published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export default function FilesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin_master";

  const [categories, setCategories] = useState<FileCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<FileCategory | null>(null);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [catDialog, setCatDialog] = useState<{ open: boolean; category?: FileCategory }>({ open: false });
  const [uploadDialog, setUploadDialog] = useState(false);
  const [editFileDialog, setEditFileDialog] = useState<{ open: boolean; file?: CustomerFile }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; type: "category" | "file"; id: string; name: string }>({ open: false, type: "category", id: "", name: "" });

  const fetchCategories = async () => {
    setLoading(true);
    const { data: cats } = await supabase
      .from("file_categories")
      .select("*")
      .order("sort_order");

    if (cats) {
      // Get file counts
      const { data: files } = await supabase
        .from("customer_files")
        .select("category_id");

      const counts: Record<string, number> = {};
      files?.forEach((f: any) => {
        counts[f.category_id] = (counts[f.category_id] || 0) + 1;
      });

      setCategories(cats.map((c: any) => ({ ...c, file_count: counts[c.id] || 0 })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.type === "category") {
      const { error } = await supabase.from("file_categories").delete().eq("id", deleteConfirm.id);
      if (error) { toast.error("Erro ao excluir categoria: " + error.message); }
      else { toast.success("Categoria excluída."); fetchCategories(); }
    } else {
      // Delete file from storage then record
      const file = await supabase.from("customer_files").select("file_url").eq("id", deleteConfirm.id).single();
      if (file.data?.file_url) {
        const path = file.data.file_url.split("/dimension-files/")[1];
        if (path) await supabase.storage.from("dimension-files").remove([path]);
      }
      const { error } = await supabase.from("customer_files").delete().eq("id", deleteConfirm.id);
      if (error) { toast.error("Erro ao excluir arquivo: " + error.message); }
      else { toast.success("Arquivo excluído."); }
    }
    setDeleteConfirm({ open: false, type: "category", id: "", name: "" });
  };

  const getDefaultImage = (name: string) => defaultImages[name] || catOthers;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selectedCategory && (
            <Button variant="ghost" size="icon" onClick={() => setSelectedCategory(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {selectedCategory ? selectedCategory.name : "Arquivos"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {selectedCategory ? selectedCategory.description : "Repositório de arquivos para download"}
            </p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            {!selectedCategory && (
              <Button variant="outline" size="sm" onClick={() => setCatDialog({ open: true })}>
                <Plus className="h-4 w-4 mr-1" /> Nova Categoria
              </Button>
            )}
            {selectedCategory && (
              <>
                <Button variant="outline" size="sm" onClick={() => setCatDialog({ open: true, category: selectedCategory })}>
                  <Settings className="h-4 w-4 mr-1" /> Editar Categoria
                </Button>
                <Button size="sm" onClick={() => setUploadDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Upload Arquivo
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {!selectedCategory ? (
        <FileCategoriesGrid
          categories={categories}
          loading={loading}
          isAdmin={isAdmin}
          getDefaultImage={getDefaultImage}
          onSelect={setSelectedCategory}
          onEdit={(cat) => setCatDialog({ open: true, category: cat })}
          onDelete={(cat) => setDeleteConfirm({ open: true, type: "category", id: cat.id, name: cat.name })}
        />
      ) : (
        <FileListView
          category={selectedCategory}
          isAdmin={isAdmin}
          onEditFile={(f) => setEditFileDialog({ open: true, file: f })}
          onDeleteFile={(f) => setDeleteConfirm({ open: true, type: "file", id: f.id, name: f.display_name })}
        />
      )}

      {/* Dialogs */}
      <CategoryManageDialog
        open={catDialog.open}
        category={catDialog.category}
        onClose={() => setCatDialog({ open: false })}
        onSaved={() => { setCatDialog({ open: false }); fetchCategories(); }}
      />

      {selectedCategory && (
        <FileUploadDialog
          open={uploadDialog}
          categoryId={selectedCategory.id}
          onClose={() => setUploadDialog(false)}
          onUploaded={() => { setUploadDialog(false); }}
        />
      )}

      <FileEditDialog
        open={editFileDialog.open}
        file={editFileDialog.file}
        categories={categories}
        onClose={() => setEditFileDialog({ open: false })}
        onSaved={() => setEditFileDialog({ open: false })}
      />

      <AlertDialog open={deleteConfirm.open} onOpenChange={(o) => !o && setDeleteConfirm({ ...deleteConfirm, open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja excluir "{deleteConfirm.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
