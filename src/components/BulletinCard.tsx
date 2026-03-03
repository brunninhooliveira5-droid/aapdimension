import { useState, useEffect } from "react";
import { Newspaper, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Bulletin {
  id: string;
  title: string;
  content: string;
  details: string;
  valid_until: string | null;
  target_models: string[];
  target_roles: string[];
}

interface BulletinCardProps {
  filterByRole?: string;
}

export function BulletinCard({ filterByRole }: BulletinCardProps = {}) {
  const { user } = useAuth();
  const [bulletin, setBulletin] = useState<Bulletin | null>(null);
  const [isRead, setIsRead] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBulletins = async () => {
      if (!user) return;
      const today = new Date().toISOString().split("T")[0];

      try {
        // Fetch active bulletins within validity
        const { data: bulletins, error: bulletinErr } = await supabase
          .from("technical_bulletins")
          .select("*")
          .eq("active", true)
          .lte("valid_from", today)
          .order("created_at", { ascending: false });

        if (bulletinErr || !bulletins || bulletins.length === 0) { setLoading(false); return; }

        // Get user machines (optional, may fail for some users)
        let userModels = new Set<string>();
        try {
          const { data: userMachines } = await supabase
            .from("machines")
            .select("model");
          if (userMachines) {
            userModels = new Set(userMachines.map(m => m.model.toLowerCase()));
          }
        } catch { /* ignore - user may not have machines access */ }

        // Get read bulletins for current user
        const { data: reads } = await supabase
          .from("bulletin_reads")
          .select("bulletin_id");
        const readIds = new Set(reads?.map(r => r.bulletin_id) ?? []);

        // Check if bulletin is relevant to user
        const isRelevant = (b: any): boolean => {
          if (b.valid_until && b.valid_until < today) return false;
          // Filter by target_roles if filterByRole is specified
          const targetRoles: string[] = b.target_roles ?? [];
          if (filterByRole && targetRoles.length > 0 && !targetRoles.includes(filterByRole)) return false;
          // If no target_models, show to everyone
          const targets: string[] = b.target_models ?? [];
          if (targets.length === 0) return true;
          return targets.some((t: string) => userModels.has(t.toLowerCase()));
        };

        // Find first unread relevant bulletin
        const activeBulletin = bulletins.find(b => isRelevant(b) && !readIds.has(b.id));

        if (activeBulletin) {
          setBulletin(activeBulletin as Bulletin);
          setIsRead(false);
        } else {
          // Show most recent read one
          const anyValid = bulletins.find(b => isRelevant(b));
          if (anyValid) {
            setBulletin(anyValid as Bulletin);
            setIsRead(true);
          }
        }
      } catch (err) {
        console.error("Error fetching bulletins:", err);
      }
      setLoading(false);
    };
    fetchBulletins();
  }, [user, filterByRole]);

  const handleMarkRead = async () => {
    if (!bulletin || !user) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("bulletin_reads").insert({
      bulletin_id: bulletin.id,
      user_id: session.user.id,
    });
    setIsRead(true);
  };

  if (loading || !bulletin) return null;

  return (
    <>
      <div className="gradient-card rounded-lg border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Newspaper className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Boletim Técnico Dimension
            </h3>
          </div>
          {isRead && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Lido
            </span>
          )}
        </div>
        <h4 className="text-sm font-medium text-foreground mb-1">{bulletin.title}</h4>
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{bulletin.content}</p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowDetails(true)}>
            Ver detalhes
          </Button>
          {!isRead && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={handleMarkRead}>
              Marcar como lido
            </Button>
          )}
        </div>
      </div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{bulletin.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-foreground">{bulletin.content}</p>
            {bulletin.details && (
              <div className="text-sm text-muted-foreground whitespace-pre-wrap border-t border-border pt-3">
                {bulletin.details}
              </div>
            )}
            {bulletin.target_models && bulletin.target_models.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2">
                {bulletin.target_models.map(m => (
                  <span key={m} className="text-[10px] bg-accent text-accent-foreground px-2 py-0.5 rounded-full">{m}</span>
                ))}
              </div>
            )}
          </div>
          {!isRead && (
            <div className="pt-2">
              <Button size="sm" onClick={() => { handleMarkRead(); setShowDetails(false); }}>
                Marcar como lido
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
