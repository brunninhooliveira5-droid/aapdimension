import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save, ArrowLeft, Cpu, User, FileText, DollarSign, ScrollText, Package } from "lucide-react";
import { applyPhoneMask } from "@/lib/phone-mask";

interface ContractItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface MachineModel {
  id: string;
  name: string;
  description: string;
  tech_specs: string;
  base_price: number | null;
  delivery_days: number | null;
  image_url: string | null;
}

const DEFAULT_CLAUSES = `CLÁUSULA 1 – OBJETO
O presente contrato tem por objeto a venda do equipamento descrito acima, nas condições aqui especificadas.

CLÁUSULA 2 – PRAZO DE ENTREGA
O prazo de entrega será conforme acordado entre as partes, contados a partir da confirmação do pagamento da entrada.

CLÁUSULA 3 – GARANTIA
O equipamento possui garantia de 12 (doze) meses contra defeitos de fabricação, a contar da data de instalação.

CLÁUSULA 4 – RESPONSABILIDADES
A instalação e treinamento serão realizados pela VENDEDORA, sem custos adicionais. O COMPRADOR deverá fornecer infraestrutura elétrica e pneumática adequada.

CLÁUSULA 5 – FORO
Fica eleito o foro da Comarca da sede da VENDEDORA para dirimir quaisquer questões oriundas deste contrato.`;

const paymentMethods = [
  "100% no pedido",
  "50% no pedido / 50% na entrega",
  "60% no pedido + boleto",
  "Financiamento bancário",
  "Permuta sob análise",
  "Personalizado",
];

const maskDocument = (raw: string) => {
  const d = raw.replace(/\D/g, "");
  if (d.length <= 11) {
    return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return d.slice(0, 14).replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2}\.\d{3})(\d)/, "$1.$2").replace(/^(\d{2}\.\d{3}\.\d{3})(\d)/, "$1/$2").replace(/^(\d{2}\.\d{3}\.\d{3}\/\d{4})(\d)/, "$1-$2");
};

interface Props {
  contractId: string | null;
  onSaved: () => void;
  onCancel: () => void;
}

export function ContractForm({ contractId, onSaved, onCancel }: Props) {
  const { session } = useAuth();
  const [saving, setSaving] = useState(false);
  const [models, setModels] = useState<MachineModel[]>([]);
  const [includedItems, setIncludedItems] = useState<{ name: string }[]>([]);
  const [optionalItems, setOptionalItems] = useState<{ name: string; price: number | null }[]>([]);

  // Form fields
  const [clientName, setClientName] = useState("");
  const [clientDocument, setClientDocument] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientResponsible, setClientResponsible] = useState("");
  const [closingDate, setClosingDate] = useState(new Date().toISOString().split("T")[0]);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [validityDate, setValidityDate] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [machineModel, setMachineModel] = useState("");
  const [machineDescription, setMachineDescription] = useState("");
  const [machineSpecs, setMachineSpecs] = useState("");
  const [machineIncluded, setMachineIncluded] = useState<string[]>([]);
  const [machineOptionals, setMachineOptionals] = useState<string[]>([]);
  const [items, setItems] = useState<ContractItem[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentEntry, setPaymentEntry] = useState("");
  const [paymentInstallments, setPaymentInstallments] = useState("");
  const [paymentBalance, setPaymentBalance] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [commercialConditions, setCommercialConditions] = useState("");
  const [clauses, setClauses] = useState(DEFAULT_CLAUSES);
  const [generalNotes, setGeneralNotes] = useState("");
  const [status, setStatus] = useState("rascunho");

  useEffect(() => {
    loadModels();
    if (contractId) loadContract(contractId);
  }, [contractId]);

  useEffect(() => {
    const total = items.reduce((sum, i) => sum + i.subtotal, 0);
    setTotalValue(total);
  }, [items]);

  const loadModels = async () => {
    const { data } = await supabase.from("proposal_machine_models").select("id, name, description, tech_specs, base_price, delivery_days, image_url").eq("is_active", true).order("name");
    setModels((data as any[]) ?? []);
  };

  const loadContract = async (id: string) => {
    const { data } = await supabase.from("dimension_contracts" as any).select("*").eq("id", id).single();
    if (!data) return;
    const c = data as any;
    setClientName(c.client_name);
    setClientDocument(c.client_document);
    setClientAddress(c.client_address);
    setClientPhone(c.client_phone);
    setClientEmail(c.client_email);
    setClientResponsible(c.client_responsible);
    setClosingDate(c.closing_date);
    setIssueDate(c.issue_date);
    setValidityDate(c.validity_date || "");
    setMachineModel(c.machine_model);
    setMachineDescription(c.machine_description);
    setMachineSpecs(c.machine_specs);
    setMachineIncluded(c.machine_included_items || []);
    setMachineOptionals(c.machine_optional_items || []);
    setTotalValue(c.total_value);
    setPaymentMethod(c.payment_method);
    setPaymentEntry(c.payment_entry?.toString() || "");
    setPaymentInstallments(c.payment_installments);
    setPaymentBalance(c.payment_balance?.toString() || "");
    setPaymentNotes(c.payment_notes);
    setCommercialConditions(c.commercial_conditions);
    setClauses(c.clauses || DEFAULT_CLAUSES);
    setGeneralNotes(c.general_notes);
    setStatus(c.status);

    const { data: itemsData } = await supabase.from("dimension_contract_items" as any).select("*").eq("contract_id", id).order("sort_order");
    if (itemsData) setItems((itemsData as any[]).map(i => ({ id: i.id, description: i.description, quantity: i.quantity, unit_price: i.unit_price, subtotal: i.subtotal })));
  };

  const handleSelectModel = async (modelId: string) => {
    setSelectedModelId(modelId);
    const model = models.find(m => m.id === modelId);
    if (!model) return;
    setMachineModel(model.name);
    setMachineDescription(model.description);
    setMachineSpecs(model.tech_specs);

    // Load included/optional items
    const [{ data: inc }, { data: opt }] = await Promise.all([
      supabase.from("proposal_machine_included_items").select("name").eq("model_id", modelId).order("sort_order"),
      supabase.from("proposal_machine_optional_items").select("name, price").eq("model_id", modelId).order("sort_order"),
    ]);
    const incNames = (inc as any[])?.map(i => i.name) ?? [];
    const optNames = (opt as any[])?.map(i => i.name) ?? [];
    setMachineIncluded(incNames);
    setMachineOptionals(optNames);
    setIncludedItems((inc as any[]) ?? []);
    setOptionalItems((opt as any[]) ?? []);

    // Auto-add machine as first item if no items yet
    if (items.length === 0 && model.base_price) {
      setItems([{ description: `Equipamento ${model.name}`, quantity: 1, unit_price: model.base_price, subtotal: model.base_price }]);
    }
  };

  const addItem = () => {
    setItems(prev => [...prev, { description: "", quantity: 1, unit_price: 0, subtotal: 0 }]);
  };

  const updateItem = (idx: number, field: keyof ContractItem, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      (updated[idx] as any)[field] = value;
      if (field === "quantity" || field === "unit_price") {
        updated[idx].subtotal = updated[idx].quantity * updated[idx].unit_price;
      }
      return updated;
    });
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!session?.user?.id) return;
    if (!clientName.trim()) { toast.error("Informe o nome do cliente"); return; }
    if (!machineModel.trim()) { toast.error("Informe a máquina/modelo"); return; }
    setSaving(true);
    try {
      const payload = {
        client_name: clientName,
        client_document: clientDocument,
        client_address: clientAddress,
        client_phone: clientPhone,
        client_email: clientEmail,
        client_responsible: clientResponsible,
        closing_date: closingDate,
        issue_date: issueDate,
        validity_date: validityDate || null,
        machine_model: machineModel,
        machine_description: machineDescription,
        machine_specs: machineSpecs,
        machine_included_items: machineIncluded,
        machine_optional_items: machineOptionals,
        specs_snapshot: { model_id: selectedModelId, included: includedItems, optionals: optionalItems },
        total_value: totalValue,
        payment_method: paymentMethod,
        payment_entry: paymentEntry ? parseFloat(paymentEntry) : 0,
        payment_installments: paymentInstallments,
        payment_balance: paymentBalance ? parseFloat(paymentBalance) : 0,
        payment_notes: paymentNotes,
        commercial_conditions: commercialConditions,
        clauses,
        general_notes: generalNotes,
        status,
      };

      let contractDbId = contractId;
      if (contractId) {
        const { error } = await supabase.from("dimension_contracts" as any).update(payload as any).eq("id", contractId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("dimension_contracts" as any)
          .insert({ ...payload, created_by: session.user.id } as any)
          .select("id")
          .single();
        if (error) throw error;
        contractDbId = (data as any).id;
      }

      // Sync items
      await supabase.from("dimension_contract_items" as any).delete().eq("contract_id", contractDbId!);
      if (items.length > 0) {
        await supabase.from("dimension_contract_items" as any).insert(
          items.map((item, idx) => ({
            contract_id: contractDbId!,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
            sort_order: idx,
          })) as any
        );
      }

      toast.success(contractId ? "Contrato atualizado!" : "Contrato criado!");
      onSaved();
    } catch (err: any) {
      toast.error("Erro: " + (err.message || "Falha ao salvar"));
      console.error(err);
    }
    setSaving(false);
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <h2 className="text-lg font-semibold">{contractId ? "Editar Contrato" : "Novo Contrato"}</h2>
      </div>

      {/* Client Data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Dados do Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nome / Razão Social *</Label>
              <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nome do cliente" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">CPF / CNPJ</Label>
              <Input value={clientDocument} onChange={e => setClientDocument(maskDocument(e.target.value))} placeholder="000.000.000-00" className="mt-1" maxLength={18} />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Endereço</Label>
              <Input value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="Rua, nº, bairro, cidade - UF" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Telefone</Label>
              <Input value={clientPhone} onChange={e => setClientPhone(applyPhoneMask(e.target.value))} placeholder="(00) 00000-0000" className="mt-1" maxLength={15} />
            </div>
            <div>
              <Label className="text-xs">E-mail</Label>
              <Input value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="cliente@email.com" className="mt-1" type="email" />
            </div>
            <div>
              <Label className="text-xs">Responsável</Label>
              <Input value={clientResponsible} onChange={e => setClientResponsible(e.target.value)} placeholder="Nome do responsável" className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contract Data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Dados do Contrato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Data de Fechamento</Label>
              <Input type="date" value={closingDate} onChange={e => setClosingDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Data de Emissão</Label>
              <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Validade (opcional)</Label>
              <Input type="date" value={validityDate} onChange={e => setValidityDate(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="assinado">Assinado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Observações Gerais</Label>
            <Textarea value={generalNotes} onChange={e => setGeneralNotes(e.target.value)} rows={2} placeholder="Observações..." className="mt-1" />
          </div>
        </CardContent>
      </Card>

      {/* Machine Data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Cpu className="w-4 h-4 text-primary" /> Dados da Máquina</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Selecionar Máquina (Specs)</Label>
            <Select value={selectedModelId} onValueChange={handleSelectModel}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um modelo..." /></SelectTrigger>
              <SelectContent>
                {models.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Os dados serão preenchidos automaticamente mas podem ser editados.</p>
          </div>
          <div>
            <Label className="text-xs">Nome / Modelo *</Label>
            <Input value={machineModel} onChange={e => setMachineModel(e.target.value)} placeholder="Ex: Orion 2800" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Descrição Comercial</Label>
            <Textarea value={machineDescription} onChange={e => setMachineDescription(e.target.value)} rows={2} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Especificações Técnicas</Label>
            <Textarea value={machineSpecs} onChange={e => setMachineSpecs(e.target.value)} rows={4} className="mt-1" />
          </div>
          {machineIncluded.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Itens Inclusos</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {machineIncluded.map((item, i) => (
                  <span key={i} className="px-2 py-0.5 bg-accent text-accent-foreground rounded-full text-xs">{item}</span>
                ))}
              </div>
            </div>
          )}
          {machineOptionals.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Opcionais Disponíveis</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {machineOptionals.map((item, i) => (
                  <span key={i} className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs">{item}</span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contract Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Itens Contratados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-end">
              <div className="flex-1">
                {idx === 0 && <Label className="text-xs">Descrição</Label>}
                <Input value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} placeholder="Descrição do item" />
              </div>
              <div className="w-20">
                {idx === 0 && <Label className="text-xs">Qtd</Label>}
                <Input type="number" min={1} value={item.quantity} onChange={e => updateItem(idx, "quantity", parseFloat(e.target.value) || 1)} />
              </div>
              <div className="w-32">
                {idx === 0 && <Label className="text-xs">Valor Unit.</Label>}
                <Input type="number" min={0} step="0.01" value={item.unit_price} onChange={e => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="w-32">
                {idx === 0 && <Label className="text-xs">Subtotal</Label>}
                <Input value={fmt(item.subtotal)} readOnly className="bg-muted/50" />
              </div>
              <Button size="icon" variant="ghost" className="h-10 w-10 text-destructive shrink-0" onClick={() => removeItem(idx)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="w-4 h-4 mr-1" /> Adicionar Item
          </Button>
          <div className="flex justify-end pt-2 border-t border-border">
            <div className="text-right">
              <span className="text-sm text-muted-foreground mr-3">Total:</span>
              <span className="text-lg font-bold text-primary">{fmt(totalValue)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> Condições Comerciais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Forma de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Entrada (R$)</Label>
              <Input type="number" step="0.01" value={paymentEntry} onChange={e => setPaymentEntry(e.target.value)} placeholder="0.00" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Parcelamento</Label>
              <Input value={paymentInstallments} onChange={e => setPaymentInstallments(e.target.value)} placeholder="Ex: 3x sem juros" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Saldo (R$)</Label>
              <Input type="number" step="0.01" value={paymentBalance} onChange={e => setPaymentBalance(e.target.value)} placeholder="0.00" className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Observações de Pagamento</Label>
            <Textarea value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} rows={2} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Condições Comerciais (texto livre)</Label>
            <Textarea value={commercialConditions} onChange={e => setCommercialConditions(e.target.value)} rows={3} placeholder="Descreva as condições comerciais..." className="mt-1" />
          </div>
        </CardContent>
      </Card>

      {/* Clauses */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><ScrollText className="w-4 h-4 text-primary" /> Cláusulas do Contrato</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea value={clauses} onChange={e => setClauses(e.target.value)} rows={12} placeholder="Cláusulas, garantia, responsabilidades..." />
          <p className="text-xs text-muted-foreground mt-1">Texto padrão pré-preenchido. Edite conforme necessário antes de gerar o PDF.</p>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex gap-3 justify-end pb-8">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-1" /> {saving ? "Salvando..." : "Salvar Contrato"}
        </Button>
      </div>
    </div>
  );
}
