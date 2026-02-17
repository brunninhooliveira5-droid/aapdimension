import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Send, Eye } from "lucide-react";
import { generateProposalPdf } from "@/lib/proposal-pdf";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const maskCpfCnpj = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
};

const maskPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
};

interface ModelOption {
  id: string;
  name: string;
  category: string;
  description: string;
  tech_specs: string;
  area_x: number | null;
  area_y: number | null;
  area_z: number | null;
  base_price: number | null;
  delivery_days: number | null;
}

interface IncItem { name: string; }
interface OptItem { name: string; price: number | null; selected: boolean; }

export function ProposalCreator() {
  const { session } = useAuth();
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [saving, setSaving] = useState(false);

  // Client info
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientDocument, setClientDocument] = useState("");

  // Proposal data (editable after model selection)
  const [modelName, setModelName] = useState("");
  const [description, setDescription] = useState(`A Dimension CNC desenvolve e fabrica equipamentos CNC robustos e confiáveis, projetados para oferecer alta precisão, estabilidade e produtividade em processos de usinagem.

Os equipamentos são construídos com componentes selecionados e soluções técnicas consolidadas, garantindo desempenho consistente, baixa manutenção e longa vida útil.

Esta proposta apresenta as especificações, condições comerciais e prazos para fornecimento do equipamento, oferecendo ao cliente uma solução segura e adequada às suas necessidades produtivas.`);
  const [techSpecs, setTechSpecs] = useState("");
  const [includedItems, setIncludedItems] = useState<IncItem[]>([]);
  const [optionalItems, setOptionalItems] = useState<OptItem[]>([]);
  const [basePrice, setBasePrice] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [notes, setNotes] = useState("Esta proposta não constitui contrato. A efetivação da venda está condicionada à assinatura do contrato comercial e à confirmação das condições de pagamento.");
  const [paymentConditions, setPaymentConditions] = useState(`A Dimension CNC disponibiliza as seguintes condições de pagamento para aquisição de seus equipamentos, sujeitas à análise e aprovação comercial:

🔹 Pagamento à Vista
100% do valor no pedido.

🔹 Entrada + Saldo na Entrega
50% de entrada no pedido
50% restantes na retirada do equipamento.

🔹 Entrada + Parcelamento em Boleto
60% de entrada no pedido
Saldo remanescente parcelado em até 10 (dez) parcelas mensais no boleto,
sujeito à análise de crédito e acréscimo de juros.

🔹 Financiamento Bancário
Financiamento por instituição bancária de escolha do cliente,
mediante aprovação de crédito pela instituição financeira.

🔹 Permuta
Permutas poderão ser analisadas, mediante avaliação prévia e aprovação pela Dimension CNC.

As condições acima não são cumulativas e poderão ser ajustadas conforme negociação, análise de crédito e política comercial vigente.`);
  const [validityDays, setValidityDays] = useState("15");

  useEffect(() => {
    supabase.from("proposal_machine_models")
      .select("*")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => setModels((data as any[]) ?? []));
  }, []);

  const handleModelSelect = async (modelId: string) => {
    setSelectedModelId(modelId);
    if (!modelId) return;

    const model = models.find(m => m.id === modelId);
    if (!model) return;

    setModelName(model.name);
    setDescription(model.description);
    setTechSpecs(model.tech_specs);
    setBasePrice(model.base_price?.toString() ?? "");
    setDeliveryDays(model.delivery_days?.toString() ?? "");

    const [{ data: inc }, { data: opt }] = await Promise.all([
      supabase.from("proposal_machine_included_items").select("name").eq("model_id", modelId).order("sort_order"),
      supabase.from("proposal_machine_optional_items").select("name, price").eq("model_id", modelId).order("sort_order"),
    ]);

    setIncludedItems((inc as any[])?.map(i => ({ name: i.name })) ?? []);
    setOptionalItems((opt as any[])?.map(i => ({ name: i.name, price: i.price, selected: false })) ?? []);
  };

  const selectedOptionals = optionalItems.filter(i => i.selected);
  const optionalTotal = selectedOptionals.reduce((s, i) => s + (i.price ?? 0), 0);
  const basePriceNum = parseFloat(basePrice) || 0;
  const totalPrice = basePriceNum + optionalTotal;

  const handleSave = async (andDownload = false) => {
    if (!clientName.trim()) { toast.error("Informe o nome do cliente"); return; }
    if (!modelName.trim()) { toast.error("Selecione ou informe um modelo"); return; }
    if (!session?.user?.id) return;
    setSaving(true);

    try {
      const payload = {
        model_id: selectedModelId || null,
        client_name: clientName.trim(),
        client_company: clientCompany.trim(),
        client_email: clientEmail.trim(),
        client_phone: clientPhone.trim(),
        client_document: clientDocument.trim(),
        model_name: modelName.trim(),
        description: description.trim(),
        tech_specs: techSpecs.trim(),
        included_items: includedItems,
        optional_items: selectedOptionals.map(i => ({ name: i.name, price: i.price })),
        base_price: basePriceNum,
        optional_total: optionalTotal,
        total_price: totalPrice,
        delivery_days: deliveryDays ? parseInt(deliveryDays) : null,
        notes: notes.trim(),
        payment_conditions: paymentConditions.trim(),
        validity_days: parseInt(validityDays) || 15,
        status: "enviada",
        created_by: session.user.id,
      };

      const { data, error } = await supabase
        .from("client_proposals")
        .insert(payload as any)
        .select("id")
        .single();

      if (error) throw error;
      toast.success("Proposta salva!");

      if (andDownload) {
        // Load PDF settings
        const { data: pdfSettings } = await supabase
          .from("pdf_quote_settings")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();

        await generateProposalPdf({
          ...payload,
          id: (data as any).id,
          pdfSettings: pdfSettings as any,
        });
      }

      // Reset form
      setClientName(""); setClientCompany(""); setClientEmail("");
      setClientPhone(""); setClientDocument("");
      setSelectedModelId(""); setModelName(""); setDescription("");
      setTechSpecs(""); setIncludedItems([]); setOptionalItems([]);
      setBasePrice(""); setDeliveryDays(""); setNotes("");
      setPaymentConditions(""); setValidityDays("15");
    } catch (err: any) {
      toast.error("Erro: " + (err.message || "Falha ao salvar"));
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Model selector */}
      <div className="gradient-card rounded-lg border border-border p-4 space-y-4">
        <h3 className="font-semibold text-foreground">Modelo da Máquina</h3>
        <Select value={selectedModelId} onValueChange={handleModelSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um modelo cadastrado..." />
          </SelectTrigger>
          <SelectContent>
            {models.map(m => (
              <SelectItem key={m.id} value={m.id}>
                {m.name} {m.category && `(${m.category})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Client info */}
      <div className="gradient-card rounded-lg border border-border p-4 space-y-4">
        <h3 className="font-semibold text-foreground">Dados do Cliente</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label>Nome / Razão Social *</Label><Input value={clientName} onChange={e => setClientName(e.target.value)} /></div>
          <div><Label>Empresa</Label><Input value={clientCompany} onChange={e => setClientCompany(e.target.value)} /></div>
          <div><Label>E-mail</Label><Input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} /></div>
          <div><Label>Telefone</Label><Input value={clientPhone} onChange={e => setClientPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" /></div>
          <div><Label>CPF / CNPJ</Label><Input value={clientDocument} onChange={e => setClientDocument(maskCpfCnpj(e.target.value))} placeholder="000.000.000-00" /></div>
        </div>
      </div>

      {/* Machine details (editable) */}
      <div className="gradient-card rounded-lg border border-border p-4 space-y-4">
        <h3 className="font-semibold text-foreground">Detalhes do Equipamento</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Label>Nome do Modelo</Label>
            <Input value={modelName} onChange={e => setModelName(e.target.value)} placeholder="Ex: Orion 2800" />
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição Comercial</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="sm:col-span-2">
            <Label>Especificações Técnicas</Label>
            <Textarea value={techSpecs} onChange={e => setTechSpecs(e.target.value)} rows={4} />
          </div>
        </div>
      </div>

      {/* Included items */}
      {includedItems.length > 0 && (
        <div className="gradient-card rounded-lg border border-border p-4 space-y-3">
          <h3 className="font-semibold text-foreground">Itens Inclusos</h3>
          <ul className="space-y-1">
            {includedItems.map((item, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm py-1 px-2 rounded bg-accent/30">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                {item.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Optional items */}
      {optionalItems.length > 0 && (
        <div className="gradient-card rounded-lg border border-border p-4 space-y-3">
          <h3 className="font-semibold text-foreground">Itens Opcionais</h3>
          <div className="space-y-2">
            {optionalItems.map((item, idx) => (
              <label key={idx} className="flex items-center gap-3 text-sm py-1.5 px-2 rounded hover:bg-accent/30 cursor-pointer">
                <Checkbox
                  checked={item.selected}
                  onCheckedChange={(checked) => {
                    setOptionalItems(prev => prev.map((it, i) => i === idx ? { ...it, selected: !!checked } : it));
                  }}
                />
                <span className="flex-1">{item.name}</span>
                {item.price != null && <span className="text-primary text-xs font-medium">{fmt(item.price)}</span>}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Pricing and conditions */}
      <div className="gradient-card rounded-lg border border-border p-4 space-y-4">
        <h3 className="font-semibold text-foreground">Valores e Condições</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label>Preço Base (R$)</Label>
            <Input type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} />
          </div>
          <div>
            <Label>Prazo de Entrega (dias)</Label>
            <Input type="number" value={deliveryDays} onChange={e => setDeliveryDays(e.target.value)} />
          </div>
          <div>
            <Label>Validade (dias)</Label>
            <Input type="number" value={validityDays} onChange={e => setValidityDays(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Condições de Pagamento</Label>
          <Textarea value={paymentConditions} onChange={e => setPaymentConditions(e.target.value)} rows={12} placeholder="Ex: 50% na aprovação + 50% na entrega" />
        </div>
        <div>
          <Label>Observações</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
        </div>

        {/* Totals */}
        {basePriceNum > 0 && (
          <div className="border-t border-border pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Equipamento</span><span>{fmt(basePriceNum)}</span></div>
            {optionalTotal > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Opcionais ({selectedOptionals.length})</span><span>{fmt(optionalTotal)}</span></div>}
            <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
              <span>Total</span><span className="text-primary">{fmt(totalPrice)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
          <Send className="w-4 h-4 mr-1" /> Salvar Proposta
        </Button>
        <Button onClick={() => handleSave(true)} disabled={saving}>
          <FileDown className="w-4 h-4 mr-1" /> Salvar e Gerar PDF
        </Button>
      </div>
    </div>
  );
}
