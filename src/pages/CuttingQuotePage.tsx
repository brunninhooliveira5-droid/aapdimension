import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, FileText, History, BarChart3, Layers, Settings2, Lock, Shield, Users } from "lucide-react";
import { PricingSimulator, type PricingData } from "@/components/cutting-quote/PricingSimulator";
import { FileQuote } from "@/components/cutting-quote/FileQuote";
import { SavedQuotes } from "@/components/cutting-quote/SavedQuotes";
import { QuoteReports } from "@/components/cutting-quote/QuoteReports";
import { MaterialsManagement } from "@/components/cutting-quote/MaterialsManagement";
import { PdfConfiguration } from "@/components/cutting-quote/PdfConfiguration";
import { ServiceClientsTab } from "@/components/cutting-quote/ServiceClientsTab";
import { ServiceBonusCard } from "@/components/cutting-quote/ServiceBonusCard";
import { ServiceBonusManager } from "@/components/cutting-quote/ServiceBonusManager";
import { BulletinCard } from "@/components/BulletinCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import type { Tables } from "@/integrations/supabase/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function CuttingQuotePage() {
  const { session, user, getSectionVisibility } = useAuth();
  const { effectiveUserId, isImpersonating } = useEffectiveUser();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "quote";
  const [pricing, setPricing] = useState<PricingData>({
    costPerHour: 0,
    costPerMinute: 0,
    costPerMeter: 0,
    minPrice: 0,
    suggestedPrice: 0,
    avgCutSpeed: 0,
    profitMarginPercent: 30,
    minSpeedOverrideMMmin: 500,
    maxSpeedOverrideMMmin: 12000,
    maxPassesOverride: 10,
    allowUserOverrideSpeed: true,
    allowUserOverridePasses: true,
  });
  const [machines, setMachines] = useState<Tables<"machines">[]>([]);
  const [useMasterPricing, setUseMasterPricing] = useState(false);
  const [useDimensionMaterials, setUseDimensionMaterials] = useState(false);
  const [pricingLoaded, setPricingLoaded] = useState(false);
  const [masterPricingError, setMasterPricingError] = useState(false);
  // Debug temporário — pricingSource e pricingOwnerId
  const [pricingSource, setPricingSource] = useState<"master" | "user" | null>(null);
  const [pricingOwnerId, setPricingOwnerId] = useState<string | null>(null);

  // Helper to compute pricing from raw settings
  const computePricing = (data: any): PricingData => {
    const productiveHours = Number(data.productive_hours) || 160;
    const profitMargin = Number(data.profit_margin) || 30;
    const avgCutSpeed = Number(data.avg_cut_speed) || 2;

    const totalFixed = (Number(data.rent) || 0) + (Number(data.electricity) || 0) + (Number(data.internet) || 0) + (Number(data.other_fixed) || 0);
    const totalMachine = (Number(data.machine_cost) || 0) + (Number(data.gas_consumable) || 0) + (Number(data.maintenance_cost) || 0) + (Number(data.other_machine) || 0);
    const totalMonthlyCost = totalFixed + totalMachine;

    const costPerHour = productiveHours > 0 ? totalMonthlyCost / productiveHours : 0;
    const costPerMinute = costPerHour / 60;
    const costPerMeter = avgCutSpeed > 0 ? costPerMinute / (avgCutSpeed / 1000) : 0;
    const marginMultiplier = 1 + profitMargin / 100;
    const minPrice = costPerMinute * 1.15;
    const suggestedPrice = costPerMinute * marginMultiplier;

    return {
      costPerHour, costPerMinute, costPerMeter, minPrice, suggestedPrice, avgCutSpeed, profitMarginPercent: profitMargin,
      minSpeedOverrideMMmin: Number(data.min_speed_override_mmmin) || 500,
      maxSpeedOverrideMMmin: Number(data.max_speed_override_mmmin) || 12000,
      maxPassesOverride: Number(data.max_passes_override) || 10,
      allowUserOverrideSpeed: data.allow_user_override_speed ?? true,
      allowUserOverridePasses: data.allow_user_override_passes ?? true,
    };
  };

  // Load pricing settings - check if user inherits from admin master
  useEffect(() => {
    if (!session?.user || !effectiveUserId) return;

    const loadPricing = async () => {
      setPricingLoaded(false);
      setMasterPricingError(false);

      // Check if the effective user has use_master_pricing flag
      const { data: planData } = await supabase
        .from("user_plans")
        .select("use_master_pricing, use_dimension_materials")
        .eq("user_id", effectiveUserId)
        .maybeSingle();

      const inheritMaster = (planData as any)?.use_master_pricing ?? false;
      const inheritDimensionMaterials = (planData as any)?.use_dimension_materials ?? false;
      setUseMasterPricing(inheritMaster);
      // Service users inheriting master pricing should also use dimension materials
      setUseDimensionMaterials(inheritDimensionMaterials || inheritMaster);

      if (inheritMaster) {
        // Find admin_master user via secure RPC function (bypasses RLS)
        const { data: adminMasterUserId, error: rpcError } = await supabase
          .rpc("get_admin_master_user_id");

        if (adminMasterUserId && !rpcError) {
          const { data: masterSettings } = await supabase
            .from("pricing_settings" as any)
            .select("*")
            .eq("user_id", adminMasterUserId)
            .maybeSingle();

          if (masterSettings) {
            setPricing(computePricing(masterSettings));
            setPricingSource("master");
            setPricingOwnerId(adminMasterUserId);
          } else {
            setMasterPricingError(true);
            setPricingSource("master");
            setPricingOwnerId(adminMasterUserId);
          }
        } else {
          setMasterPricingError(true);
          setPricingSource("master");
          setPricingOwnerId(null);
        }
      } else {
        // Load the effective user's own pricing settings
        const { data } = await supabase
          .from("pricing_settings" as any)
          .select("*")
          .eq("user_id", effectiveUserId)
          .maybeSingle() as any;

        if (data) {
          setPricing(computePricing(data));
        }
        setPricingSource("user");
        setPricingOwnerId(effectiveUserId);
      }

      setPricingLoaded(true);
    };

    loadPricing();

    // Load machines owned by the effective user (respects impersonation)
    supabase
      .from("machines")
      .select("*")
      .eq("owner_id", effectiveUserId)
      .then(({ data }) => {
        if (data) setMachines(data);
      });
  }, [session, effectiveUserId, isImpersonating]);

  const canAccessSalvos = getSectionVisibility("orcamento_salvos") === "visible" || useMasterPricing;
  const canAccessClientes = user?.role === "admin_master";
  const isServico = user?.role === "servico";

  // Build grid class with safe static values (dynamic classes like `grid-cols-${n}` are purged by Tailwind in production)
  const gridColsClass = (() => {
    const count = (isServico ? 5 : 6) + (canAccessClientes ? 1 : 0);
    const map: Record<number, string> = {
      5: "grid-cols-5",
      6: "grid-cols-6",
      7: "grid-cols-7",
    };
    return map[count] || "grid-cols-6";
  })();

  return (
    <div className="space-y-6">
      {/* Bonus card for service users */}
      <ServiceBonusCard />
      {/* Bulletin card for service users */}
      {user?.role === "servico" && <BulletinCard filterByRole="servico" />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orçamento de Corte</h1>
          <p className="text-sm text-muted-foreground">Calcule orçamentos de corte CNC a partir de arquivos SVG</p>
          {/* Debug temporário — remover após validação */}
          {pricingLoaded && (
            <div className="mt-1 flex items-center gap-3 text-[10px] font-mono text-muted-foreground/60">
              <span>source: <strong className="text-muted-foreground">{pricingSource}</strong></span>
              <span>ownerId: <strong className="text-muted-foreground">{pricingOwnerId?.slice(0, 8) ?? "—"}</strong></span>
              <span>sessionId: <strong className="text-muted-foreground">{session?.user?.id?.slice(0, 8) ?? "—"}</strong></span>
              {masterPricingError && <span className="text-destructive">⚠ pricing não encontrado</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {useMasterPricing && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary border border-primary/20">
                    <Shield className="w-3.5 h-3.5" />
                    Configuração Dimension
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  Este orçamento utiliza as configurações oficiais de precificação da Dimension CNC, definidas pelo administrador master.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {useDimensionMaterials && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary border border-primary/20">
                    <Layers className="w-3.5 h-3.5" />
                    Materiais Dimension
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  Os materiais e espessuras são do catálogo oficial da Dimension CNC, gerenciado pelo administrador master.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className={`grid w-full max-w-4xl ${gridColsClass}`}>
          <TabsTrigger value="quote" className="gap-2">
            <FileText className="w-4 h-4" /> Orçamento
          </TabsTrigger>
          {!isServico && (
            <TabsTrigger value="simulator" className="gap-2">
              <Calculator className="w-4 h-4" /> Simulador
            </TabsTrigger>
          )}
          <TabsTrigger
            value="history"
            className="gap-2"
            disabled={!canAccessSalvos}
            onClick={(e) => {
              if (!canAccessSalvos) {
                e.preventDefault();
                toast.info("Para acessar o histórico de orçamentos salvos, entre em contato com o administrador para ativar essa funcionalidade no seu plano.", { duration: 6000 });
              }
            }}
          >
            <History className="w-4 h-4" /> Salvos
            {!canAccessSalvos && <Lock className="w-3 h-3 ml-0.5 text-muted-foreground" />}
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <BarChart3 className="w-4 h-4" /> Relatórios
          </TabsTrigger>
          <TabsTrigger value="materials" className="gap-2">
            <Layers className="w-4 h-4" /> Materiais
          </TabsTrigger>
          <TabsTrigger value="pdf-config" className="gap-2">
            <Settings2 className="w-4 h-4" /> Config. PDF
          </TabsTrigger>
          {canAccessClientes && (
            <TabsTrigger value="clients" className="gap-2">
              <Users className="w-4 h-4" /> Clientes
            </TabsTrigger>
          )}
        </TabsList>

        {!isServico && (
          <TabsContent value="simulator">
            {useMasterPricing ? (
              <div className="gradient-card rounded-lg border border-primary/20 p-6 text-center space-y-2">
                <Shield className="w-8 h-8 text-primary mx-auto" />
                <h3 className="text-sm font-semibold text-foreground">Configuração Dimension CNC Ativa</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Este módulo está utilizando as configurações oficiais de precificação da Dimension CNC, definidas pelo administrador master. 
                  Não é possível editar os parâmetros enquanto esta configuração estiver ativa.
                </p>
                <p className="text-[10px] text-muted-foreground italic">
                  Para utilizar configurações próprias, entre em contato com o administrador.
                </p>
              </div>
            ) : (
              <PricingSimulator onPricingChange={setPricing} />
            )}
          </TabsContent>
        )}

        <TabsContent value="quote">
          <FileQuote pricing={pricing} machines={machines} useMasterPricing={useMasterPricing} useDimensionMaterials={useDimensionMaterials} isAdminMaster={user?.role === "admin_master"} pricingLoaded={pricingLoaded} masterPricingError={masterPricingError} />
        </TabsContent>

        {canAccessSalvos && (
          <TabsContent value="history">
            <SavedQuotes />
          </TabsContent>
        )}

        <TabsContent value="reports">
          <QuoteReports />
        </TabsContent>

        <TabsContent value="materials">
          <MaterialsManagement useDimensionMaterials={useDimensionMaterials || isServico} isAdminMaster={user?.role === "admin_master"} useMasterPricing={useMasterPricing || isServico} />
        </TabsContent>

        <TabsContent value="pdf-config">
          <PdfConfiguration />
        </TabsContent>

        {canAccessClientes && (
          <TabsContent value="clients" className="space-y-6">
            <ServiceBonusManager />
            <ServiceClientsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
