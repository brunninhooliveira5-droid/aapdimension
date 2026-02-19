import { useNavigate, useParams, Navigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Cpu, DollarSign, Calendar, AlertTriangle, Search, Filter, Plus, Trash2, Scissors, Camera, Video, Image } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import heroWelcome from "@/assets/hero-welcome.png";
import { ProStatusCard } from "@/components/ProStatusCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BulletinCard } from "@/components/BulletinCard";
import { SuggestionCard } from "@/components/SuggestionCard";

interface InvoiceWithUser {
  id: string;
  amount: number;
  due_date: string;
  installment: number;
  total_installments: number;
  status: string;
  user_name: string;
  user_email: string;
}

interface TicketData {
  id: string;
  type: string;
  description: string;
  status: string;
  machine_id: string;
  machine_model: string;
}

interface MaintenanceData {
  id: string;
  type: string;
  scheduled_date: string;
  status: string;
  machine_id: string;
  machine_model: string;
}

const Index = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin_master" || user?.role === "admin";
  const isAdminMaster = user?.role === "admin_master";
  const isServico = user?.role === "servico";
  const { userId: viewUserId } = useParams<{ userId?: string }>();

  const [viewUserName, setViewUserName] = useState<string | null>(null);
  const isViewingUser = !!viewUserId;
  const firstName = isViewingUser ? viewUserName ?? "Usuário" : (user?.name?.split(" ")[0] ?? "Usuário");

  const [totalMachines, setTotalMachines] = useState(0);
  const [openInvoices, setOpenInvoices] = useState<InvoiceWithUser[]>([]);
  const [overdueInvoices, setOverdueInvoices] = useState<InvoiceWithUser[]>([]);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showOverdueDialog, setShowOverdueDialog] = useState(false);
  const [recentTickets, setRecentTickets] = useState<TicketData[]>([]);
  const [upcomingMaintenances, setUpcomingMaintenances] = useState<MaintenanceData[]>([]);
  const [pendingServiceQuotes, setPendingServiceQuotes] = useState(0);
  const [customBannerUrl, setCustomBannerUrl] = useState<string | null>(null);
  const [heroMediaType, setHeroMediaType] = useState<"image" | "video">("image");
  const [heroVideoUrl, setHeroVideoUrl] = useState<string | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  // Filter states
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState("todos");
  const [maintSearch, setMaintSearch] = useState("");
  const [maintStatusFilter, setMaintStatusFilter] = useState("todos");

  const fetchMachineCount = async () => {
    const effectiveOwnerId = viewUserId || (!isAdminMaster ? session?.user?.id : null);
    let machineQuery = supabase.from("machines").select("*", { count: "exact", head: true }).eq("category", "maquina");
    if (effectiveOwnerId) machineQuery = machineQuery.eq("owner_id", effectiveOwnerId);
    const { count: machineCount } = await machineQuery;

    let regEquipQuery = (supabase as any).from("registered_equipment").select("*", { count: "exact", head: true }).eq("category", "maquina");
    if (effectiveOwnerId) regEquipQuery = regEquipQuery.eq("owner_id", effectiveOwnerId);
    const { count: regEquipCount } = await regEquipQuery;

    setTotalMachines((machineCount ?? 0) + (regEquipCount ?? 0));
  };

  useEffect(() => {
    // Redirect handled in render
    if (isServico) return;
    const fetchData = async () => {
      if (viewUserId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", viewUserId)
          .single();
        setViewUserName(profile?.name?.split(" ")[0] ?? "Usuário");
      }

      const effectiveOwnerId = viewUserId || (!isAdminMaster ? session?.user?.id : null);
      await fetchMachineCount();

      // Fetch invoices
      let invoiceQuery = supabase.from("invoices").select("*");
      if (effectiveOwnerId) invoiceQuery = invoiceQuery.eq("user_id", effectiveOwnerId);
      const { data: invoices } = await invoiceQuery;

      if (invoices) {
        const today = new Date().toISOString().split("T")[0];
        const userIds = [...new Set(invoices.map(i => i.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", userIds);
        const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);

        const mapInvoice = (inv: any): InvoiceWithUser => {
          const profile = profileMap.get(inv.user_id);
          return {
            id: inv.id,
            amount: inv.amount,
            due_date: inv.due_date,
            installment: inv.installment,
            total_installments: inv.total_installments,
            status: inv.status,
            user_name: profile?.name ?? "—",
            user_email: profile?.email ?? "—",
          };
        };

        setOpenInvoices(invoices.filter(i => i.status === "em_aberto").map(mapInvoice));
        setOverdueInvoices(
          invoices.filter(i => i.status === "em_aberto" && i.due_date < today).map(mapInvoice)
        );
      }

      // Fetch recent tickets
      let ticketQuery = supabase
        .from("tickets")
        .select("id, type, description, status, machine_id")
        .order("created_at", { ascending: false });
      if (effectiveOwnerId) ticketQuery = ticketQuery.eq("user_id", effectiveOwnerId);
      const { data: ticketsData } = await ticketQuery;

      if (ticketsData && ticketsData.length > 0) {
        const tMachineIds = [...new Set(ticketsData.map(t => t.machine_id))];
        const { data: tMachines } = await supabase.from("machines").select("id, model").in("id", tMachineIds);
        const tMap = new Map(tMachines?.map(m => [m.id, m.model]) ?? []);
        setRecentTickets(ticketsData.map(t => ({
          id: t.id, type: t.type, description: t.description, status: t.status,
          machine_id: t.machine_id,
          machine_model: tMap.get(t.machine_id) ?? "—",
        })));
      } else {
        setRecentTickets([]);
      }

      // Fetch upcoming maintenances
      const todayStr = new Date().toISOString().split("T")[0];
      let maintQuery = supabase
        .from("maintenances")
        .select("id, type, scheduled_date, status, machine_id")
        .gte("scheduled_date", todayStr)
        .order("scheduled_date", { ascending: true });
      if (effectiveOwnerId) maintQuery = maintQuery.eq("user_id", effectiveOwnerId);
      const { data: maintData } = await maintQuery;

      if (maintData && maintData.length > 0) {
        const mMachineIds = [...new Set(maintData.map(m => m.machine_id))];
        const { data: mMachines } = await supabase.from("machines").select("id, model").in("id", mMachineIds);
        const mMap = new Map(mMachines?.map(m => [m.id, m.model]) ?? []);
        setUpcomingMaintenances(maintData.map(m => ({
          id: m.id, type: m.type, scheduled_date: m.scheduled_date, status: m.status,
          machine_id: m.machine_id,
          machine_model: mMap.get(m.machine_id) ?? "—",
        })));
      } else {
        setUpcomingMaintenances([]);
      }

      // Fetch pending service quotes (admin_master only)
      if (isAdminMaster && !viewUserId) {
        const { data: roleRows } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "servico");
        if (roleRows && roleRows.length > 0) {
          const serviceIds = roleRows.map((r) => r.user_id);
          const { count } = await supabase
            .from("cutting_quotes" as any)
            .select("*", { count: "exact", head: true })
            .in("user_id", serviceIds)
            .neq("status", "finalizado");
          setPendingServiceQuotes(count ?? 0);
        }
      }
    };

    fetchData();
  }, [viewUserId]);

  // Realtime subscription to update machine count on changes
  useEffect(() => {
    if (!isAdminMaster) return;
    const channel = supabase
      .channel('dashboard-machines')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'machines' }, () => {
        fetchMachineCount();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registered_equipment' }, () => {
        fetchMachineCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [viewUserId, isAdminMaster, session?.user?.id]);

  // Load custom banner and media type
  useEffect(() => {
    const loadBanner = async () => {
      const { data } = await supabase
        .from("site_settings" as any)
        .select("key, value")
        .in("key", ["hero_banner_url", "hero_media_type", "hero_video_url"]);
      if (data) {
        for (const row of data as any[]) {
          if (row.key === "hero_banner_url" && row.value) setCustomBannerUrl(row.value);
          if (row.key === "hero_media_type" && row.value) setHeroMediaType(row.value as "image" | "video");
          if (row.key === "hero_video_url" && row.value) setHeroVideoUrl(row.value);
        }
      }
    };
    loadBanner();
  }, []);

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem válida"); return; }
    setUploadingBanner(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `hero-banner.${ext}`;
      const { error: upErr } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("site-assets").getPublicUrl(path);
      const urlWithCache = `${publicUrl}?t=${Date.now()}`;
      const userId = (await supabase.auth.getSession()).data.session?.user?.id;
      await (supabase as any).from("site_settings").upsert(
        { key: "hero_banner_url", value: urlWithCache, updated_by: userId },
        { onConflict: "key" }
      );
      await (supabase as any).from("site_settings").upsert(
        { key: "hero_media_type", value: "image", updated_by: userId },
        { onConflict: "key" }
      );
      setCustomBannerUrl(urlWithCache);
      setHeroMediaType("image");
      toast.success("Imagem de apresentação atualizada!");
    } catch (err: any) {
      toast.error("Erro ao enviar imagem: " + err.message);
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) { toast.error("Selecione um vídeo válido"); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error("O vídeo deve ter no máximo 50MB"); return; }
    setUploadingBanner(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `hero-video.${ext}`;
      const { error: upErr } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("site-assets").getPublicUrl(path);
      const urlWithCache = `${publicUrl}?t=${Date.now()}`;
      const userId = (await supabase.auth.getSession()).data.session?.user?.id;
      await (supabase as any).from("site_settings").upsert(
        { key: "hero_video_url", value: urlWithCache, updated_by: userId },
        { onConflict: "key" }
      );
      await (supabase as any).from("site_settings").upsert(
        { key: "hero_media_type", value: "video", updated_by: userId },
        { onConflict: "key" }
      );
      setHeroVideoUrl(urlWithCache);
      setHeroMediaType("video");
      toast.success("Vídeo de apresentação atualizado!");
    } catch (err: any) {
      toast.error("Erro ao enviar vídeo: " + err.message);
    } finally {
      setUploadingBanner(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const toggleMediaType = async () => {
    const newType = heroMediaType === "image" ? "video" : "image";
    if (newType === "video" && !heroVideoUrl) {
      toast.error("Nenhum vídeo enviado ainda. Envie um vídeo primeiro.");
      return;
    }
    const userId = (await supabase.auth.getSession()).data.session?.user?.id;
    await (supabase as any).from("site_settings").upsert(
      { key: "hero_media_type", value: newType, updated_by: userId },
      { onConflict: "key" }
    );
    setHeroMediaType(newType);
    toast.success(`Mídia alterada para ${newType === "image" ? "foto" : "vídeo"}`);
  };

  const nextDueInvoice = openInvoices.length > 0
    ? openInvoices.reduce((a, b) => a.due_date < b.due_date ? a : b)
    : null;
  if (isServico) {
    return <Navigate to="/orcamento" replace />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Banner */}
      <div className="relative rounded-lg overflow-hidden h-56">
        {heroMediaType === "video" && heroVideoUrl ? (
          <video
            src={heroVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
            onEnded={(e) => {
              const video = e.currentTarget;
              video.currentTime = 0;
              video.play();
            }}
          />
        ) : (
          <img src={customBannerUrl || heroWelcome} alt="CNC Machine" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />
        <div className="absolute inset-0 flex items-center px-6">
          <div>
            {isViewingUser && (
              <button onClick={() => navigate("/usuarios")} className="text-xs text-primary hover:underline mb-1">
                ← Voltar para Usuários
              </button>
            )}
            <h1 className="text-2xl font-bold text-foreground">
              {isViewingUser ? `Dashboard de ${firstName}` : `Olá, ${firstName}`}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isViewingUser ? "Visualizando dados do usuário" : "Bem-vindo ao portal Dimension CNC"}
            </p>
          </div>
        </div>
        {isAdminMaster && !isViewingUser && (
          <div className="absolute bottom-3 right-3 flex gap-1.5">
            <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
            <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 text-xs opacity-80 hover:opacity-100"
              onClick={toggleMediaType}
              disabled={uploadingBanner}
            >
              {heroMediaType === "image" ? <Video className="w-3.5 h-3.5" /> : <Image className="w-3.5 h-3.5" />}
              {heroMediaType === "image" ? "Usar vídeo" : "Usar foto"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 text-xs opacity-80 hover:opacity-100"
              onClick={() => bannerInputRef.current?.click()}
              disabled={uploadingBanner}
            >
              <Camera className="w-3.5 h-3.5" />
              {uploadingBanner ? "Enviando..." : "Foto"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 text-xs opacity-80 hover:opacity-100"
              onClick={() => videoInputRef.current?.click()}
              disabled={uploadingBanner}
            >
              <Video className="w-3.5 h-3.5" />
              {uploadingBanner ? "Enviando..." : "Vídeo"}
            </Button>
          </div>
        )}
      </div>

      {/* Suggestion Card + PRO Status Card */}
      <SuggestionCard />
      <ProStatusCard />

      {/* Financial Status Banner for regular users */}
      {!isAdmin && openInvoices.length > 0 && (
        <div className={`rounded-lg border p-4 flex items-center justify-between flex-wrap gap-3 ${
          overdueInvoices.length > 0 
            ? "border-destructive/50 bg-destructive/10" 
            : "border-primary/30 bg-primary/5"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              overdueInvoices.length > 0 ? "bg-destructive/20" : "bg-primary/20"
            }`}>
              {overdueInvoices.length > 0 
                ? <AlertTriangle className="w-5 h-5 text-destructive" />
                : <DollarSign className="w-5 h-5 text-primary" />
              }
            </div>
            <div>
              {overdueInvoices.length > 0 ? (
                <>
                  <p className="text-sm font-semibold text-destructive">
                    Você possui {overdueInvoices.length} parcela{overdueInvoices.length > 1 ? "s" : ""} em atraso
                  </p>
                  <p className="text-xs text-destructive/80">
                    Total em atraso: R$ {overdueInvoices.reduce((s, i) => s + i.amount, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-primary">Pagamento em dia ✓</p>
                  <p className="text-xs text-muted-foreground">
                    Próxima fatura: {nextDueInvoice ? new Date(nextDueInvoice.due_date).toLocaleDateString("pt-BR") : "—"}
                    {nextDueInvoice ? ` — R$ ${nextDueInvoice.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""}
                  </p>
                </>
              )}
            </div>
          </div>
          {overdueInvoices.length > 0 && (
            <p className="text-lg font-bold text-destructive">
              R$ {overdueInvoices.reduce((s, i) => s + i.amount, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isAdminMaster && (
          <div className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => navigate("/maquinas")}>
            <StatCard
              title="Máquinas Ativas"
              value={totalMachines}
              subtitle="Total cadastradas"
              icon={Cpu}
              variant="highlight"
            />
          </div>
        )}
        <div className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => setShowOpenDialog(true)}>
          <StatCard
            title="Faturas em Aberto"
            value={openInvoices.length}
            subtitle={nextDueInvoice ? `Próx. venc. ${new Date(nextDueInvoice.due_date).toLocaleDateString("pt-BR")}` : "Nenhum"}
            icon={DollarSign}
            variant="warning"
          />
        </div>
        <div className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => setShowOverdueDialog(true)}>
          <StatCard
            title="Faturas em Atraso"
            value={overdueInvoices.length}
            subtitle={overdueInvoices.length > 0 ? "Requerem atenção" : "Nenhum atraso"}
            icon={AlertTriangle}
            variant={overdueInvoices.length > 0 ? "danger" : "default"}
          />
        </div>
        <div className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => navigate("/manutencao")}>
          <StatCard
            title="Próxima Manutenção"
            value={upcomingMaintenances.length > 0 ? new Date(upcomingMaintenances[0].scheduled_date).toLocaleDateString("pt-BR") : "—"}
            subtitle={upcomingMaintenances.length > 0 ? `${upcomingMaintenances[0].machine_model} • ${upcomingMaintenances[0].type}` : undefined}
            icon={Calendar}
          />
        </div>
        {isAdminMaster && !isViewingUser && (
          <div className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => navigate("/orcamento?tab=clients")}>
            <StatCard
              title="Serviços de Corte"
              value={pendingServiceQuotes}
              subtitle={pendingServiceQuotes > 0 ? "Pendentes de finalização" : "Todos finalizados"}
              icon={Scissors}
              variant={pendingServiceQuotes > 0 ? "warning" : "default"}
            />
          </div>
        )}
      </div>

      {/* Bulletin Card */}
      <BulletinCard />

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="gradient-card rounded-lg border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Chamados Recentes</h3>
            {!isAdmin && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => navigate("/suporte")}>
                <Plus className="w-3 h-3" /> Novo Chamado
              </Button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Buscar..." value={ticketSearch} onChange={e => setTicketSearch(e.target.value)} className="pl-8 bg-accent border-border h-8 text-xs" />
            </div>
            <Select value={ticketStatusFilter} onValueChange={setTicketStatusFilter}>
              <SelectTrigger className="bg-accent border-border h-8 text-xs w-full sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="aberto">Aberto</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="resolvido">Resolvido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {(() => {
              const filtered = recentTickets.filter(t => {
                if (ticketStatusFilter !== "todos" && t.status !== ticketStatusFilter) return false;
                if (ticketSearch.trim()) {
                  const q = ticketSearch.toLowerCase();
                  if (!t.type.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q) && !t.machine_model.toLowerCase().includes(q)) return false;
                }
                return true;
              });
              return filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum chamado encontrado.</p>
              ) : (
                 filtered.map(ticket => (
                   <div
                     key={ticket.id}
                     className="flex items-center justify-between p-3 rounded-md bg-accent/50 cursor-pointer hover:bg-accent/80 transition-colors"
                     onClick={() => navigate(`/maquinas/${ticket.machine_id}`)}
                   >
                     <div className="min-w-0 flex-1">
                       <p className="text-sm font-medium text-foreground truncate">{ticket.machine_model}</p>
                       <p className="text-xs text-muted-foreground truncate">{ticket.type} — {ticket.description}</p>
                     </div>
                     <div className="flex items-center gap-2 ml-3 shrink-0">
                       <StatusBadge status={ticket.status} />
                       {!isAdmin && (
                         <button
                           className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                           title="Excluir chamado"
                           onClick={async (e) => {
                             e.stopPropagation();
                             const { error } = await supabase.from("tickets").delete().eq("id", ticket.id);
                             if (error) { toast.error("Erro ao excluir chamado"); return; }
                             setRecentTickets(prev => prev.filter(t => t.id !== ticket.id));
                             toast.success("Chamado excluído");
                           }}
                         >
                           <Trash2 className="w-3.5 h-3.5" />
                         </button>
                       )}
                     </div>
                   </div>
                 ))
              );
            })()}
          </div>
        </div>

        <div className="gradient-card rounded-lg border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Manutenções Próximas</h3>
          {isAdminMaster && (
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Buscar..." value={maintSearch} onChange={e => setMaintSearch(e.target.value)} className="pl-8 bg-accent border-border h-8 text-xs" />
              </div>
              <Select value={maintStatusFilter} onValueChange={setMaintStatusFilter}>
                <SelectTrigger className="bg-accent border-border h-8 text-xs w-full sm:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="agendada">Agendada</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="realizada">Realizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {(() => {
              const filtered = upcomingMaintenances.filter(m => {
                if (maintStatusFilter !== "todos" && m.status !== maintStatusFilter) return false;
                if (maintSearch.trim()) {
                  const q = maintSearch.toLowerCase();
                  if (!m.type.toLowerCase().includes(q) && !m.machine_model.toLowerCase().includes(q)) return false;
                }
                return true;
              });
              return filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma manutenção encontrada.</p>
              ) : (
                filtered.map(m => (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between p-3 rounded-md bg-accent/50 ${isAdminMaster ? "cursor-pointer hover:bg-accent/80" : ""} transition-colors`}
                    onClick={isAdminMaster ? () => navigate(`/maquinas/${m.machine_id}`) : undefined}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{m.machine_model}</p>
                      <p className="text-xs text-muted-foreground">{m.type} — {new Date(m.scheduled_date).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <StatusBadge status={m.status} className="ml-3 shrink-0" />
                  </div>
                ))
              );
            })()}
          </div>
        </div>
      </div>

      {/* Dialog: Faturas em Aberto */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Faturas em Aberto</DialogTitle>
          </DialogHeader>
          {openInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhuma fatura em aberto.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {openInvoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-md bg-accent/50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{inv.user_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Parcela {inv.installment}/{inv.total_installments} — Venc. {new Date(inv.due_date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-foreground ml-3 shrink-0">
                    R$ {inv.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Faturas em Atraso */}
      <Dialog open={showOverdueDialog} onOpenChange={setShowOverdueDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Faturas em Atraso</DialogTitle>
          </DialogHeader>
          {overdueInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhuma fatura em atraso.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {overdueInvoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-md bg-accent/50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{inv.user_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Parcela {inv.installment}/{inv.total_installments} — Venc. {new Date(inv.due_date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-destructive ml-3 shrink-0">
                    R$ {inv.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
