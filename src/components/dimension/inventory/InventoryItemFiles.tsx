import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useModule } from "@/contexts/ModuleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Paperclip, Plus, Trash2, FileText, Image, Download, X, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import { InventoryPasswordPrompt } from "./InventoryPasswordPrompt";

interface InventoryItemFilesProps {
  itemId: string;
}

export function InventoryItemFiles({ itemId }: InventoryItemFilesProps) {
  const { session } = useAuth();
  const { tables, modulePrefix } = useModule();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const { data: files = [], isLoading } = useQuery({
    queryKey: [tables.inventoryItemFiles, itemId],
    queryFn: async () => {
      const { data } = await supabase
        .from(tables.inventoryItemFiles as any)
        .select("*")
        .eq("item_id", itemId)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";

    if (!isImage && !isPdf) {
      toast.error("Apenas imagens e PDFs são permitidos.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo deve ter no máximo 10MB.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `items/${itemId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("inventory-images")
        .upload(path, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("inventory-images")
        .getPublicUrl(path);

      const { error: dbError } = await supabase
        .from(tables.inventoryItemFiles as any)
        .insert({
          item_id: itemId,
          file_name: file.name,
          file_path: publicUrl,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: session?.user.id!,
        });

      if (dbError) throw dbError;

      toast.success("Arquivo enviado!");
      qc.invalidateQueries({ queryKey: [tables.inventoryItemFiles, itemId] });
    } catch (err: any) {
      toast.error("Erro ao enviar: " + err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const deleteFile = useMutation({
    mutationFn: async (fileId: string) => {
      const { error } = await supabase
        .from(tables.inventoryItemFiles as any)
        .delete()
        .eq("id", fileId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Arquivo removido!");
      qc.invalidateQueries({ queryKey: [tables.inventoryItemFiles, itemId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isImage = (mime: string) => mime.startsWith("image/");
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Dados do Item ({files.length})
            </CardTitle>
            <div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={uploadFile}
                className="hidden"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Enviando...</>
                ) : (
                  <><Plus className="h-4 w-4 mr-1" />Anexar</>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-xs text-muted-foreground text-center py-4">Carregando...</p>
          ) : files.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nenhum arquivo anexado. Clique em "Anexar" para adicionar fotos ou PDFs.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {files.map((f: any) => (
                <div
                  key={f.id}
                  className="group relative border border-border rounded-lg overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setPreviewFile(f)}
                >
                  {isImage(f.mime_type) ? (
                    <img
                      src={f.file_path}
                      alt={f.file_name}
                      className="w-full h-24 object-cover"
                    />
                  ) : (
                    <div className="w-full h-24 bg-muted flex flex-col items-center justify-center gap-1">
                      <FileText className="h-8 w-8 text-destructive/70" />
                      <span className="text-[10px] text-muted-foreground">PDF</span>
                    </div>
                  )}
                  <div className="p-1.5">
                    <p className="text-[10px] text-foreground font-medium truncate">{f.file_name}</p>
                    <p className="text-[9px] text-muted-foreground">{formatSize(Number(f.file_size))}</p>
                  </div>
                  {/* Hover overlay with actions */}
                  <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); setPreviewFile(f); }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(f.file_path, "_blank");
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFile.mutate(f.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full-screen preview dialog */}
      <Dialog open={!!previewFile} onOpenChange={(v) => { if (!v) setPreviewFile(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="text-sm flex items-center justify-between pr-6">
              <span className="truncate">{previewFile?.file_name}</span>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(previewFile?.file_path, "_blank")}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Abrir
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-4 overflow-auto max-h-[calc(90vh-80px)]">
            {previewFile && isImage(previewFile.mime_type) ? (
              <img
                src={previewFile.file_path}
                alt={previewFile.file_name}
                className="w-full h-auto rounded-lg"
              />
            ) : previewFile ? (
              <iframe
                src={previewFile.file_path}
                className="w-full h-[70vh] rounded-lg border border-border"
                title={previewFile.file_name}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
