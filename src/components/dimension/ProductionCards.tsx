import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Camera, Plus, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface ProductionCard {
  id: string;
  key: string;
  title: string;
  image_url: string | null;
}

interface ProductionCardsProps {
  onCardClick?: (card: ProductionCard) => void;
}

export function ProductionCards({ onCardClick }: ProductionCardsProps) {
  const { user } = useAuth();
  const [cards, setCards] = useState<ProductionCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === "admin_master";

  const fetchCards = async () => {
    const { data } = await supabase
      .from("dimension_production_cards")
      .select("*")
      .order("key");
    setCards((data as ProductionCard[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleImageClick = (key: string) => {
    if (!isAdmin) return;
    setEditingKey(key);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingKey) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB");
      return;
    }

    setUploading(editingKey);
    const ext = file.name.split(".").pop();
    const path = `${editingKey}.${ext}`;

    await supabase.storage.from("dimension-production-images").remove([path]);

    const { error: uploadError } = await supabase.storage
      .from("dimension-production-images")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Erro ao enviar imagem");
      setUploading(null);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("dimension-production-images")
      .getPublicUrl(path);

    const imageUrl = urlData.publicUrl + "?t=" + Date.now();

    await supabase
      .from("dimension_production_cards")
      .update({ image_url: imageUrl, updated_at: new Date().toISOString() } as any)
      .eq("key", editingKey);

    toast.success("Imagem atualizada!");
    setUploading(null);
    setEditingKey(null);
    e.target.value = "";
    fetchCards();
  };

  const handleAddCard = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    const key = newTitle.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const exists = cards.some((c) => c.key === key);
    if (exists) {
      toast.error("Já existe um setor com esse nome");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("dimension_production_cards").insert({
      key,
      title: newTitle.trim(),
    } as any);
    if (error) {
      toast.error("Erro ao criar setor");
    } else {
      toast.success("Setor criado!");
      setNewTitle("");
      setAddOpen(false);
      fetchCards();
    }
    setSaving(false);
  };

  const handleDeleteCard = async (card: ProductionCard) => {
    const { error } = await supabase.from("dimension_production_cards").delete().eq("id", card.id);
    if (error) toast.error("Erro ao excluir setor");
    else { toast.success("Setor excluído!"); fetchCards(); }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((card) => (
          <Tooltip key={card.id}>
            <TooltipTrigger asChild>
              <div
                className="relative h-28 rounded-xl overflow-hidden group transition-all duration-300 hover:ring-2 hover:ring-primary/40 hover:shadow-lg cursor-pointer"
                onClick={() => onCardClick?.(card)}
              >
                {card.image_url ? (
                  <img
                    src={card.image_url}
                    alt={card.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20" />
                )}

                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />

                <div className="absolute inset-0 flex items-end p-3">
                  <h3 className="text-white font-semibold text-sm drop-shadow-md">
                    {card.title}
                  </h3>
                </div>

                {isAdmin && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div
                      className="bg-black/60 rounded-full p-1.5 hover:bg-black/80 transition-colors"
                      onClick={(e) => { e.stopPropagation(); handleImageClick(card.key); }}
                    >
                      <Camera className="h-3.5 w-3.5 text-white" />
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <div
                          className="bg-black/60 rounded-full p-1.5 hover:bg-destructive/80 transition-colors cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-white" />
                        </div>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir setor "{card.title}"?</AlertDialogTitle>
                          <AlertDialogDescription>As tarefas vinculadas a este setor não serão excluídas.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteCard(card)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}

                {uploading === card.key && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <span className="text-white text-xs animate-pulse">Enviando...</span>
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Área de produção: {card.title}</p>
            </TooltipContent>
          </Tooltip>
        ))}

        {/* Add card button - admin only */}
        {isAdmin && (
          <div
            className="relative h-28 rounded-xl overflow-hidden flex items-end justify-end p-2 cursor-pointer group"
            onClick={() => setAddOpen(true)}
          >
            <div className="bg-muted/60 hover:bg-primary/20 rounded-full p-1.5 transition-colors opacity-60 group-hover:opacity-100">
              <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Add sector dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo Setor de Produção</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nome do setor (ex: Soldagem)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddCard()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddCard} disabled={saving || !newTitle.trim()}>
              {saving ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
