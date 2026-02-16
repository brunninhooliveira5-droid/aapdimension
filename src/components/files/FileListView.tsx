import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FileCategory, CustomerFile } from "@/pages/FilesPage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Pencil, Trash2, Search, FileIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  category: FileCategory;
  isAdmin: boolean;
  onEditFile: (f: CustomerFile) => void;
  onDeleteFile: (f: CustomerFile) => void;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function FileListView({ category, isAdmin, onEditFile, onDeleteFile }: Props) {
  const [files, setFiles] = useState<CustomerFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  const fetchFiles = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("customer_files")
      .select("*")
      .eq("category_id", category.id)
      .order("created_at", { ascending: false });

    setFiles((data as CustomerFile[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchFiles(); }, [category.id]);

  // Listen for refresh triggers
  useEffect(() => {
    const channel = supabase
      .channel("customer_files_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "customer_files", filter: `category_id=eq.${category.id}` }, () => fetchFiles())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [category.id]);

  const filtered = files
    .filter((f) => f.display_name.toLowerCase().includes(search.toLowerCase()) || f.description.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "name") return a.display_name.localeCompare(b.display_name);
      if (sortBy === "version") return (a.version || "").localeCompare(b.version || "");
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const handleDownload = async (file: CustomerFile) => {
    // Extract path from file_url for signed URL
    const pathMatch = file.file_url.match(/dimension-files\/(.+)/);
    if (!pathMatch) {
      toast.error("URL de arquivo inválida");
      return;
    }
    const { data, error } = await supabase.storage.from("dimension-files").createSignedUrl(pathMatch[1], 60);
    if (error || !data?.signedUrl) {
      toast.error("Erro ao gerar link de download");
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = file.file_name_original;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Mais recente</SelectItem>
            <SelectItem value="name">Nome</SelectItem>
            <SelectItem value="version">Versão</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileIcon className="h-12 w-12 mb-3 opacity-40" />
          <p>Nenhum arquivo encontrado</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Versão</TableHead>
                <TableHead className="hidden md:table-cell">Tamanho</TableHead>
                <TableHead className="hidden sm:table-cell">Data</TableHead>
                {isAdmin && <TableHead className="hidden lg:table-cell">Status</TableHead>}
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((file) => (
                <TableRow key={file.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{file.display_name}</p>
                      {file.description && <p className="text-xs text-muted-foreground line-clamp-1">{file.description}</p>}
                      {file.tags?.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {file.tags.map((t) => <Badge key={t} variant="outline" className="text-[10px] px-1">{t}</Badge>)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{file.version || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{formatBytes(file.file_size)}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{format(new Date(file.created_at), "dd/MM/yyyy")}</TableCell>
                  {isAdmin && (
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant={file.published ? "default" : "secondary"} className="text-[10px]">
                        {file.published ? "Publicado" : "Rascunho"}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(file)} title="Baixar">
                        <Download className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditFile(file)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDeleteFile(file)} title="Excluir">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
