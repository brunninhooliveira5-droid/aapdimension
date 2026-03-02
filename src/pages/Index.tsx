import { useNavigate, useParams, Navigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, Video, Image, Move, Save, LayoutTemplate, Cpu, DollarSign, AlertTriangle, Calendar, Scissors } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import heroWelcome from "@/assets/hero-welcome.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BulletinCard } from "@/components/BulletinCard";
import { SuggestionCard } from "@/components/SuggestionCard";
import { ProStatusCard } from "@/components/ProStatusCard";
import { StatCard } from "@/components/StatCard";
import { DashboardCustomizer } from "@/components/dashboard/DashboardCustomizer";
import { DraggableDashboardGrid } from "@/components/dashboard/DraggableDashboardGrid";
import { useDashboardLayout, DashboardCardItem } from "@/hooks/useDashboardLayout";
import { FinancialStatusWidget } from "@/components/dashboard/widgets/FinancialStatusWidget";
import { TicketsWidget } from "@/components/dashboard/widgets/TicketsWidget";
import { MaintenanceWidget } from "@/components/dashboard/widgets/MaintenanceWidget";
import { CuttingQuoteShortcutWidget } from "@/components/dashboard/widgets/CuttingQuoteShortcutWidget";
import { StoreShortcutWidget } from "@/components/dashboard/widgets/StoreShortcutWidget";
import { RecentFilesWidget } from "@/components/dashboard/widgets/RecentFilesWidget";
import { ShortcutCard } from "@/components/dashboard/ShortcutCard";

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
  const { effectiveUserId, showAllData, isImpersonating } = useEffectiveUser();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin_master" || user?.role === "admin";
  const isAdminMaster = !isImpersonating && user?.role === "admin_master";
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
  const [editMode, setEditMode] = useState(false);
  const [savingAsTemplate, setSavingAsTemplate] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Dashboard layout hook
  const {
    cards, setCards, visibleCards, isLoading: layoutLoading,
    isSaving, saveCards, resetToDefault, isCardAvailable,
    appliedTemplateId, dashboardLocked, applyTemplate,
  } = useDashboardLayout();

  const fetchMachineCount = async () => {
    const effectiveOwnerId = viewUserId || (!showAllData ? effectiveUserId : null);
    let machineQuery = supabase.from("machines").select("*", { count: "exact", head: true }).eq("category", "maquina");
    if (effectiveOwnerId) machineQuery = machineQuery.eq("owner_id", effectiveOwnerId);
    const { count: machineCount } = await machineQuery;

    let regEquipQuery = (supabase as any).from("registered_equipment").select("*", { count: "exact", head: true }).eq("category", "maquina");
    if (effectiveOwnerId) regEquipQuery = regEquipQuery.eq("owner_id", effectiveOwnerId);
    const { count: regEquipCount } = await regEquipQuery;

    setTotalMachines((machineCount ?? 0) + (regEquipCount ?? 0));
  };

  useEffect(() => {
    if (isServico) return;
    const fetchData = async () => {
      if (viewUserId) {
        const { data: profile } = await supabase.from("profiles").select("name").eq("id", viewUserId).single();
        setViewUserName(profile?.name?.split(" ")[0] ?? "Usuário");
      }

      const effectiveOwnerId = viewUserId || (!showAllData ? effectiveUserId : null);
      await fetchMachineCount();

      let invoiceQuery = supabase.from("invoices").select("*");
      if (effectiveOwnerId) invoiceQuery = invoiceQuery.eq("user_id", effectiveOwnerId);
      const { data: invoices } = await invoiceQuery;

      if (invoices) {
        const today = new Date().toISOString().split("T")[0];
        const userIds = [...new Set(invoices.map(i => i.user_id))];
        const { data: profiles } = await supabase.from("profiles").select("id, name, email").in("id", userIds);
        const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);

        const mapInvoice = (inv: any): InvoiceWithUser => {
          const profile = profileMap.get(inv.user_id);
          return {
            id: inv.id, amount: inv.amount, due_date: inv.due_date,
            installment: inv.installment, total_installments: inv.total_installments,
            status: inv.status, user_name: profile?.name ?? "—", user_email: profile?.email ?? "—",
          };
        };

        setOpenInvoices(invoices.filter(i => i.status === "em_aberto").map(mapInvoice));
        setOverdueInvoices(invoices.filter(i => i.status === "em_aberto" && i.due_date < today).map(mapInvoice));
      }

      let ticketsData: any[] | null = null;
      if (effectiveOwnerId) {
        const { data } = await supabase.from("tickets").select("id, type, description, status, machine_id").eq("user_id", effectiveOwnerId).order("created_at", { ascending: false });
        ticketsData = data;
      } else {
        const { data } = await supabase.from("tickets").select("id, type, description, status, machine_id").order("created_at", { ascending: false });
        ticketsData = data;
      }

      if (ticketsData && ticketsData.length > 0) {
        const tMachineIds = [...new Set(ticketsData.map(t => t.machine_id))];
        const { data: tMachines } = await supabase.from("machines").select("id, model").in("id", tMachineIds);
        const tMap = new Map(tMachines?.map(m => [m.id, m.model]) ?? []);
        setRecentTickets(ticketsData.map(t => ({
          id: t.id, type: t.type, description: t.description, status: t.status,
          machine_id: t.machine_id, machine_model: tMap.get(t.machine_id) ?? "—",
        })));
      } else {
        setRecentTickets([]);
      }

      const todayStr = new Date().toISOString().split("T")[0];
      let maintData: any[] | null = null;
      if (effectiveOwnerId) {
        const { data } = await supabase.from("maintenances").select("id, type, scheduled_date, status, machine_id").eq("user_id", effectiveOwnerId).neq("status", "realizada").gte("scheduled_date", todayStr).order("scheduled_date", { ascending: true });
        maintData = data;
      } else {
        const { data } = await supabase.from("maintenances").select("id, type, scheduled_date, status, machine_id").neq("status", "realizada").gte("scheduled_date", todayStr).order("scheduled_date", { ascending: true });
        maintData = data;
      }

      if (maintData && maintData.length > 0) {
        const mMachineIds = [...new Set(maintData.map(m => m.machine_id))];
        const { data: mMachines } = await supabase.from("machines").select("id, model").in("id", mMachineIds);
        const mMap = new Map(mMachines?.map(m => [m.id, m.model]) ?? []);
        setUpcomingMaintenances(maintData.map(m => ({
          id: m.id, type: m.type, scheduled_date: m.scheduled_date, status: m.status,
          machine_id: m.machine_id, machine_model: mMap.get(m.machine_id) ?? "—",
        })));
      } else {
        setUpcomingMaintenances([]);
      }

      if (showAllData && !viewUserId) {
        const { data: roleRows } = await supabase.from("user_roles").select("user_id").eq("role", "servico");
        if (roleRows && roleRows.length > 0) {
          const serviceIds = roleRows.map((r) => r.user_id);
          const { count } = await supabase.from("cutting_quotes" as any).select("*", { count: "exact", head: true }).in("user_id", serviceIds).neq("status", "finalizado");
          setPendingServiceQuotes(count ?? 0);
        }
      }
    };

    fetchData();
  }, [viewUserId, effectiveUserId, showAllData]);

  useEffect(() => {
    if (!isAdminMaster) return;
    const channel = supabase
      .channel('dashboard-machines')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'machines' }, () => fetchMachineCount())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registered_equipment' }, () => fetchMachineCount())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [viewUserId, isAdminMaster, session?.user?.id]);

  useEffect(() => {
    const loadBanner = async () => {
      const { data } = await supabase.from("site_settings" as any).select("key, value").in("key", ["hero_banner_url", "hero_media_type", "hero_video_url"]);
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
      await (supabase as any).from("site_settings").upsert({ key: "hero_banner_url", value: urlWithCache, updated_by: userId }, { onConflict: "key" });
      await (supabase as any).from("site_settings").upsert({ key: "hero_media_type", value: "image", updated_by: userId }, { onConflict: "key" });
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
      await (supabase as any).from("site_settings").upsert({ key: "hero_video_url", value: urlWithCache, updated_by: userId }, { onConflict: "key" });
      await (supabase as any).from("site_settings").upsert({ key: "hero_media_type", value: "video", updated_by: userId }, { onConflict: "key" });
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
    await (supabase as any).from("site_settings").upsert({ key: "hero_media_type", value: newType, updated_by: userId }, { onConflict: "key" });
    setHeroMediaType(newType);
    toast.success(`Mídia alterada para ${newType === "image" ? "foto" : "vídeo"}`);
  };

  const nextDueInvoice = openInvoices.length > 0
    ? openInvoices.reduce((a, b) => a.due_date < b.due_date ? a : b)
    : null;

  const handleReorder = useCallback((newVisibleCards: DashboardCardItem[]) => {
    // Merge reordered visible cards with hidden cards
    const visibleKeys = new Set(newVisibleCards.map(c => c.key));
    const hiddenCards = cards.filter(c => !visibleKeys.has(c.key));
    const merged = [
      ...newVisibleCards.map((c, i) => ({ ...c, order: i })),
      ...hiddenCards.map((c, i) => ({ ...c, order: newVisibleCards.length + i })),
    ];
    setCards(merged);
  }, [cards, setCards]);

  const handleResizeCard = useCallback((key: string, colSpan: number) => {
    setCards(prev => prev.map(c => c.key === key ? { ...c, colSpan } : c));
  }, [setCards]);

  const handleSaveOrder = useCallback(async () => {
    await saveCards(cards);
    setEditMode(false);
  }, [saveCards, cards]);

  const handleSaveAsTemplate = useCallback(async () => {
    const name = window.prompt("Nome do template:");
    if (!name?.trim()) return;
    setSavingAsTemplate(true);
    try {
      const userId = (await supabase.auth.getSession()).data.session?.user?.id;
      const { error } = await supabase
        .from("dashboard_templates" as any)
        .insert({
          name: name.trim(),
          description: "Criado a partir do dashboard atual",
          layout: cards.filter(c => c.visible).map((c, i) => ({ ...c, order: i })),
          created_by: userId,
          is_locked: false,
          allowed_roles: [],
        } as any);
      if (error) throw error;
      toast.success("Template salvo com sucesso!");
    } catch {
      toast.error("Erro ao salvar template");
    }
    setSavingAsTemplate(false);
  }, [cards]);

  if (isServico) {
    return <Navigate to="/orcamento" replace />;
  }

  // Render a widget by key
  const renderWidget = (key: string) => {
    switch (key) {
      case "tips_card":
        return <SuggestionCard />;
      case "pro_countdown_card":
        return <ProStatusCard />;
      case "financial_status_card":
        return (
          <FinancialStatusWidget
            isAdmin={isAdmin}
            openInvoices={openInvoices}
            overdueInvoices={overdueInvoices}
          />
        );
      case "stat_active_machines":
        return (
          <div className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => navigate("/maquinas")}>
            <StatCard title="Máquinas Ativas" value={totalMachines} subtitle="Total cadastradas" icon={Cpu} variant="highlight" />
          </div>
        );
      case "stat_open_invoices":
        return (
          <div className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => setShowOpenDialog(true)}>
            <StatCard title="Faturas em Aberto" value={openInvoices.length}
              subtitle={nextDueInvoice ? `Próx. venc. ${new Date(nextDueInvoice.due_date).toLocaleDateString("pt-BR")}` : "Nenhum"}
              icon={DollarSign} variant="warning" />
          </div>
        );
      case "stat_overdue_invoices":
        return (
          <div className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => setShowOverdueDialog(true)}>
            <StatCard title="Faturas em Atraso" value={overdueInvoices.length}
              subtitle={overdueInvoices.length > 0 ? "Requerem atenção" : "Nenhum atraso"}
              icon={AlertTriangle} variant={overdueInvoices.length > 0 ? "danger" : "default"} />
          </div>
        );
      case "stat_next_maintenance":
        return (
          <div className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => navigate("/manutencao")}>
            <StatCard title="Próxima Manutenção"
              value={upcomingMaintenances.length > 0 ? new Date(upcomingMaintenances[0].scheduled_date).toLocaleDateString("pt-BR") : "—"}
              subtitle={upcomingMaintenances.length > 0 ? `${upcomingMaintenances[0].machine_model} • ${upcomingMaintenances[0].type}` : undefined}
              icon={Calendar} />
          </div>
        );
      case "stat_cutting_services":
        return (
          <div className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => navigate("/orcamento?tab=clients")}>
            <StatCard title="Serviços de Corte" value={pendingServiceQuotes}
              subtitle={pendingServiceQuotes > 0 ? "Pendentes de finalização" : "Todos finalizados"}
              icon={Scissors} variant={pendingServiceQuotes > 0 ? "warning" : "default"} />
          </div>
        );
      case "bulletins_card":
        return <BulletinCard />;
      case "support_tickets_card":
        return (
          <TicketsWidget
            tickets={recentTickets}
            setTickets={setRecentTickets}
            isAdmin={isAdmin}
          />
        );
      case "maintenance_card":
        return (
          <MaintenanceWidget
            maintenances={upcomingMaintenances}
            isAdminMaster={!!isAdminMaster}
          />
        );
      case "cutting_quote_shortcut":
        return <CuttingQuoteShortcutWidget />;
      case "store_shortcut_card":
        return <StoreShortcutWidget />;
      case "recent_files_card":
        return <RecentFilesWidget />;
      default:
        return null;
    }
  };

  const renderCard = (card: DashboardCardItem) => {
    if (card.type === "shortcut") {
      return (
        <ShortcutCard
          key={card.key}
          id={card.key}
          title={card.title}
          targetRoute={card.targetRoute ?? "/"}
        />
      );
    }
    return <div key={card.key} className="h-full">{renderWidget(card.key)}</div>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Banner */}
      <div className="relative rounded-lg overflow-hidden h-56">
        {heroMediaType === "video" && heroVideoUrl ? (
          <video src={heroVideoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover"
            onEnded={(e) => { const video = e.currentTarget; video.currentTime = 0; video.play(); }} />
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
            <Button size="sm" variant="secondary" className="gap-1.5 text-xs opacity-80 hover:opacity-100" onClick={toggleMediaType} disabled={uploadingBanner}>
              {heroMediaType === "image" ? <Video className="w-3.5 h-3.5" /> : <Image className="w-3.5 h-3.5" />}
              {heroMediaType === "image" ? "Usar vídeo" : "Usar foto"}
            </Button>
            <Button size="sm" variant="secondary" className="gap-1.5 text-xs opacity-80 hover:opacity-100" onClick={() => bannerInputRef.current?.click()} disabled={uploadingBanner}>
              <Camera className="w-3.5 h-3.5" />
              {uploadingBanner ? "Enviando..." : "Foto"}
            </Button>
            <Button size="sm" variant="secondary" className="gap-1.5 text-xs opacity-80 hover:opacity-100" onClick={() => videoInputRef.current?.click()} disabled={uploadingBanner}>
              <Video className="w-3.5 h-3.5" />
              {uploadingBanner ? "Enviando..." : "Vídeo"}
            </Button>
          </div>
        )}
      </div>

      {/* Customize buttons */}
      {!isViewingUser && (
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {!dashboardLocked && (
            <>
              {editMode ? (
                <Button variant="default" size="sm" className="gap-1.5 text-xs" onClick={handleSaveOrder} disabled={isSaving}>
                  <Save className="w-3.5 h-3.5" /> Salvar ordem
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setEditMode(true)}>
                  <Move className="w-3.5 h-3.5" /> Reorganizar
                </Button>
              )}
            </>
          )}
          {isAdminMaster && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleSaveAsTemplate} disabled={savingAsTemplate}>
              <LayoutTemplate className="w-3.5 h-3.5" /> Salvar como template
            </Button>
          )}
          <DashboardCustomizer
            cards={cards}
            isCardAvailable={isCardAvailable}
            isSaving={isSaving}
            dashboardLocked={dashboardLocked}
            appliedTemplateId={appliedTemplateId}
            onSave={saveCards}
            onReset={resetToDefault}
            onApplyTemplate={applyTemplate}
          />
        </div>
      )}

      {/* Dynamic cards grid */}
      {!layoutLoading && (
        <DraggableDashboardGrid
          cards={visibleCards}
          editMode={editMode && !dashboardLocked}
          onReorder={handleReorder}
          onResizeCard={handleResizeCard}
          renderCard={renderCard}
        />
      )}

      {/* Dialog: Faturas em Aberto */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Faturas em Aberto</DialogTitle></DialogHeader>
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
          <DialogHeader><DialogTitle>Faturas em Atraso</DialogTitle></DialogHeader>
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
