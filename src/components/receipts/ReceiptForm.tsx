import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignaturePad } from "@/components/SignaturePad";
import { Save, ArrowLeft, FileText, MessageCircle, Copy } from "lucide-react";
import { generateReceiptPdf } from "@/lib/receipt-pdf";

interface Props {
  receiptId: string | null;
  onSaved: () => void;
  onCancel: () => void;
}

const paymentMethods = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "transferencia", label: "Transferência" },
  { value: "boleto", label: "Boleto" },
  { value: "cartao", label: "Cartão" },
  { value: "cheque", label: "Cheque" },
  { value: "outro", label: "Outro" },
];

const referenceTypes = [
  { value: "servico", label: "Serviço" },
  { value: "parcela", label: "Parcela" },
  { value: "entrada", label: "Entrada" },
  { value: "equipamento", label: "Equipamento" },
  { value: "maquina", label: "Máquina" },
  { value: "contrato", label: "Contrato" },
  { value: "proposta", label: "Proposta" },
  { value: "outro", label: "Outro" },
];

const docTypes = [
  { value: "pagamento", label: "Comprovante de Pagamento" },
  { value: "recebimento", label: "Comprovante de Recebimento" },
  { value: "recibo", label: "Recibo Simples" },
  { value: "entrada", label: "Recibo de Entrada" },
  { value: "parcela", label: "Recibo Parcelado" },
];

const templateTypes = [
  { value: "geral", label: "Modelo Geral" },
  { value: "maquina", label: "Modelo para Máquina" },
  { value: "servico", label: "Modelo para Serviço" },
];

function getSmartText(type: string, currentInstallment: number, totalInstallments: number): string {
  switch (type) {
    case "recebimento":
      return "Declaramos para os devidos fins que recebemos o valor descrito neste documento, referente ao serviço, aquisição ou obrigação comercial aqui identificada, na data informada e conforme a forma de pagamento registrada.";
    case "pagamento":
      return "Declaramos para os devidos fins que efetuamos o pagamento do valor descrito neste documento, referente ao serviço, aquisição ou obrigação comercial aqui identificada, na data informada e conforme a forma de pagamento registrada.";
    case "entrada":
      return "Declaramos o recebimento do valor referente à entrada do contrato/proposta identificado neste documento, conforme condições comerciais acordadas entre as partes.";
    case "parcela":
      return `Declaramos o recebimento referente à parcela ${currentInstallment || "X"} de ${totalInstallments || "Y"} do contrato/proposta identificado neste documento, conforme condições de pagamento acordadas.`;
    case "recibo":
      return "Recebemos a importância descrita neste documento, referente aos serviços/produtos aqui identificados, dando plena e irrevogável quitação.";
    default:
      return "Declaramos para os devidos fins que recebemos/pagamos o valor descrito neste documento.";
  }
}

export function ReceiptForm({ receiptId, onSaved, onCancel }: Props) {
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Form fields
  const [receiptType, setReceiptType] = useState("recebimento");
  const [docSubtype, setDocSubtype] = useState("geral");
  const [templateType, setTemplateType] = useState("geral");
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
  const [partyName, setPartyName] = useState("");
  const [partyDocument, setPartyDocument] = useState("");
  const [partyPhone, setPartyPhone] = useState("");
  const [partyEmail, setPartyEmail] = useState("");
  const [partyAddress, setPartyAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [referenceType, setReferenceType] = useState("servico");
  const [description, setDescription] = useState("");
  const [observations, setObservations] = useState("");
  const [baseText, setBaseText] = useState("");
  const [relatedContract, setRelatedContract] = useState("");
  const [proposalId, setProposalId] = useState("");
  const [machineId, setMachineId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [status, setStatus] = useState("rascunho");
  const [commercialNotes, setCommercialNotes] = useState("");
  const [complementDeadline, setComplementDeadline] = useState("");

  // Installments
  const [currentInstallment, setCurrentInstallment] = useState(0);
  const [totalInstallments, setTotalInstallments] = useState(0);
  const [remainingBalance, setRemainingBalance] = useState("");
  const [installmentDueDate, setInstallmentDueDate] = useState("");
  const [installmentStatus, setInstallmentStatus] = useState("pago");

  // PIX
  const [enablePixQr, setEnablePixQr] = useState(false);
  const [pixKey, setPixKey] = useState("");
  const [pixBeneficiary, setPixBeneficiary] = useState("");

  // Signature
  const [partySignatureUrl, setPartySignatureUrl] = useState<string | null>(null);
  const [existingPartySigId, setExistingPartySigId] = useState<string | null>(null);
  const [requirePartySignature, setRequirePartySignature] = useState(false);

  // Init smart text on type change
  useEffect(() => {
    if (!receiptId) {
      setBaseText(getSmartText(receiptType, currentInstallment, totalInstallments));
    }
  }, [receiptType]);

  useEffect(() => {
    if (receiptId) loadReceipt(receiptId);
  }, [receiptId]);

  const loadReceipt = async (id: string) => {
    const { data } = await supabase.from("payment_receipts").select("*").eq("id", id).single();
    if (!data) return;
    setReceiptType(data.receipt_type);
    setDocSubtype(data.doc_subtype || "geral");
    setTemplateType(data.template_type || "geral");
    setReceiptDate(data.receipt_date);
    setPartyName(data.party_name);
    setPartyDocument(data.party_document);
    setPartyPhone(data.party_phone);
    setPartyEmail(data.party_email);
    setPartyAddress(data.party_address);
    setAmount(String(data.amount));
    setPaymentMethod(data.payment_method);
    setReferenceType(data.reference_type);
    setDescription(data.description);
    setObservations(data.observations);
    setBaseText(data.base_text);
    setRelatedContract(data.related_contract);
    setProposalId(data.proposal_id || "");
    setMachineId(data.machine_id || "");
    setServiceId(data.service_id || "");
    setStatus(data.status);
    setCommercialNotes(data.commercial_notes || "");
    setComplementDeadline(data.complement_deadline || "");
    setCurrentInstallment(data.current_installment || 0);
    setTotalInstallments(data.total_installments || 0);
    setRemainingBalance(String(data.remaining_balance || 0));
    setInstallmentDueDate(data.installment_due_date || "");
    setInstallmentStatus(data.installment_status || "pago");
    setEnablePixQr(data.enable_pix_qr || false);
    setPixKey(data.pix_key || "");
    setPixBeneficiary(data.pix_beneficiary || "");
    setRequirePartySignature(data.require_party_signature || false);

    const { data: sigs } = await supabase.from("receipt_signatures").select("*").eq("receipt_id", id);
    const partySig = (sigs ?? []).find((s: any) => s.signer_type === "outra_parte");
    if (partySig) { setPartySignatureUrl(partySig.image_url); setExistingPartySigId(partySig.id); }
  };

  const handleSave = async () => {
    if (!partyName.trim()) { toast.error("Informe o nome da outra parte"); return; }
    if (requirePartySignature && !partySignatureUrl) { toast.error("Assinatura da outra parte é obrigatória"); return; }
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Faça login primeiro"); setSaving(false); return; }

    const payload = {
      user_id: session.user.id,
      receipt_type: receiptType,
      doc_subtype: docSubtype,
      template_type: templateType,
      receipt_date: receiptDate,
      party_name: partyName,
      party_document: partyDocument,
      party_phone: partyPhone,
      party_email: partyEmail,
      party_address: partyAddress,
      amount: parseFloat(amount) || 0,
      payment_method: paymentMethod,
      reference_type: referenceType,
      description,
      observations,
      base_text: baseText,
      related_contract: relatedContract,
      contract_id: relatedContract,
      proposal_id: proposalId,
      machine_id: machineId,
      service_id: serviceId,
      status,
      commercial_notes: commercialNotes,
      complement_deadline: complementDeadline,
      current_installment: currentInstallment,
      total_installments: totalInstallments,
      remaining_balance: parseFloat(remainingBalance) || 0,
      installment_due_date: installmentDueDate || null,
      installment_status: installmentStatus,
      enable_pix_qr: enablePixQr,
      pix_key: pixKey,
      pix_beneficiary: pixBeneficiary,
      require_party_signature: requirePartySignature,
    };

    let savedId = receiptId;
    if (receiptId) {
      const { error } = await supabase.from("payment_receipts").update(payload).eq("id", receiptId);
      if (error) { toast.error("Erro ao atualizar"); console.error(error); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("payment_receipts").insert(payload).select("id").single();
      if (error) { toast.error("Erro ao criar"); console.error(error); setSaving(false); return; }
      savedId = data.id;
    }

    // Save party signature
    if (partySignatureUrl && savedId) {
      const blob = await (await fetch(partySignatureUrl)).blob();
      const path = `receipts/${savedId}/party-signature.png`;
      await supabase.storage.from("user-signatures").upload(path, blob, { upsert: true });
      const { data: urlData } = supabase.storage.from("user-signatures").getPublicUrl(path);
      const sigUrl = urlData.publicUrl + "?t=" + Date.now();
      if (existingPartySigId) {
        await supabase.from("receipt_signatures").update({ image_url: sigUrl, signer_name: partyName }).eq("id", existingPartySigId);
      } else {
        await supabase.from("receipt_signatures").insert({ receipt_id: savedId, signer_type: "outra_parte", image_url: sigUrl, signer_name: partyName });
      }
    }

    // Save to payment_history
    if (savedId) {
      await supabase.from("payment_history").insert({
        user_id: session.user.id,
        receipt_id: savedId,
        party_name: partyName,
        contract_id: relatedContract,
        proposal_id: proposalId,
        payment_date: receiptDate,
        amount: parseFloat(amount) || 0,
        payment_type: receiptType,
        payment_method: paymentMethod,
        current_installment: currentInstallment,
        total_installments: totalInstallments,
        status: installmentStatus || "pago",
      });
    }

    toast.success(receiptId ? "Comprovante atualizado!" : "Comprovante criado!");
    setSaving(false);
    onSaved();
  };

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      let pdfSettings: any = null;
      let profileSig: string | null = null;
      if (userId) {
        const { data: ps } = await supabase.from("receipt_pdf_settings").select("*").eq("user_id", userId).maybeSingle();
        pdfSettings = ps;
        const { data: prof } = await supabase.from("profiles").select("signature_url").eq("id", userId).single();
        profileSig = prof?.signature_url || null;
      }
      const receiptData = {
        receipt_number: 0,
        receipt_type: receiptType,
        receipt_date: receiptDate,
        party_name: partyName,
        party_document: partyDocument,
        party_phone: partyPhone,
        party_email: partyEmail,
        amount: parseFloat(amount) || 0,
        payment_method: paymentMethod,
        reference_type: referenceType,
        description,
        observations,
        base_text: baseText,
        current_installment: currentInstallment,
        total_installments: totalInstallments,
        remaining_balance: parseFloat(remainingBalance) || 0,
        enable_pix_qr: enablePixQr,
        pix_key: pixKey,
        pix_beneficiary: pixBeneficiary,
        template_type: templateType,
        commercial_notes: commercialNotes,
      };
      const { blob, fileName } = await generateReceiptPdf(receiptData, pdfSettings, profileSig, partySignatureUrl);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF gerado!");
    } catch (err: any) { toast.error("Erro: " + (err.message || "")); }
    setGeneratingPdf(false);
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(`Segue comprovante referente ao ${receiptType} registrado. Valor: R$ ${amount}`);
    const phone = partyPhone?.replace(/\D/g, "") || "";
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const showInstallments = receiptType === "parcela" || totalInstallments > 0;
  const showEntryFields = receiptType === "entrada";

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Dados Gerais */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Dados Gerais</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo do Documento</Label>
                <Select value={receiptType} onValueChange={setReceiptType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {docTypes.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Modelo</Label>
                <Select value={templateType} onValueChange={setTemplateType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {templateTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Data</Label>
                <Input type="date" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="finalizado">Finalizado</SelectItem>
                    <SelectItem value="assinado">Assinado</SelectItem>
                    <SelectItem value="enviado">Enviado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Outra Parte */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Identificação da Outra Parte</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label className="text-xs">Nome / Razão Social *</Label><Input value={partyName} onChange={e => setPartyName(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">CPF / CNPJ</Label><Input value={partyDocument} onChange={e => setPartyDocument(e.target.value)} /></div>
              <div><Label className="text-xs">Telefone</Label><Input value={partyPhone} onChange={e => setPartyPhone(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">E-mail</Label><Input value={partyEmail} onChange={e => setPartyEmail(e.target.value)} /></div>
              <div><Label className="text-xs">Endereço</Label><Input value={partyAddress} onChange={e => setPartyAddress(e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        {/* Dados Financeiros */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Dados Financeiros</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Valor (R$)</Label><Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></div>
              <div>
                <Label className="text-xs">Forma de Pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{paymentMethods.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Referente a</Label>
              <Select value={referenceType} onValueChange={setReferenceType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{referenceTypes.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Descrição / Histórico</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} /></div>
            <div><Label className="text-xs">Observações</Label><Textarea value={observations} onChange={e => setObservations(e.target.value)} rows={2} /></div>
          </CardContent>
        </Card>

        {/* Vínculos */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Vínculos (opcional)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Contrato relacionado</Label><Input value={relatedContract} onChange={e => setRelatedContract(e.target.value)} placeholder="Nº do contrato" /></div>
              <div><Label className="text-xs">Proposta relacionada</Label><Input value={proposalId} onChange={e => setProposalId(e.target.value)} placeholder="Nº da proposta" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Máquina / Modelo</Label><Input value={machineId} onChange={e => setMachineId(e.target.value)} placeholder="Ex: Router CNC 1325" /></div>
              <div><Label className="text-xs">Serviço / OS</Label><Input value={serviceId} onChange={e => setServiceId(e.target.value)} placeholder="Ex: OS-0042" /></div>
            </div>
          </CardContent>
        </Card>

        {/* Parcelas */}
        {(showInstallments || showEntryFields) && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">{showEntryFields ? "Dados da Entrada" : "Dados da Parcela"}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {showInstallments && (
                <div className="grid grid-cols-3 gap-3">
                  <div><Label className="text-xs">Parcela Atual</Label><Input type="number" value={currentInstallment} onChange={e => setCurrentInstallment(Number(e.target.value))} /></div>
                  <div><Label className="text-xs">Total de Parcelas</Label><Input type="number" value={totalInstallments} onChange={e => setTotalInstallments(Number(e.target.value))} /></div>
                  <div>
                    <Label className="text-xs">Status Parcela</Label>
                    <Select value={installmentStatus} onValueChange={setInstallmentStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pago">Pago</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="atrasado">Atrasado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Saldo Restante (R$)</Label><Input type="number" step="0.01" value={remainingBalance} onChange={e => setRemainingBalance(e.target.value)} /></div>
                <div><Label className="text-xs">Vencimento</Label><Input type="date" value={installmentDueDate} onChange={e => setInstallmentDueDate(e.target.value)} /></div>
              </div>
              {showEntryFields && (
                <>
                  <div><Label className="text-xs">Prazo para complemento</Label><Input value={complementDeadline} onChange={e => setComplementDeadline(e.target.value)} placeholder="Ex: 30 dias" /></div>
                  <div><Label className="text-xs">Observações comerciais</Label><Textarea value={commercialNotes} onChange={e => setCommercialNotes(e.target.value)} rows={2} /></div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* PIX */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">QR Code PIX</CardTitle>
              <Switch checked={enablePixQr} onCheckedChange={setEnablePixQr} />
            </div>
          </CardHeader>
          {enablePixQr && (
            <CardContent className="space-y-3">
              <div><Label className="text-xs">Chave PIX</Label><Input value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória" /></div>
              <div><Label className="text-xs">Favorecido</Label><Input value={pixBeneficiary} onChange={e => setPixBeneficiary(e.target.value)} /></div>
              {pixKey && (
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(pixKey); toast.success("Chave copiada!"); }} className="gap-1">
                  <Copy className="h-3 w-3" /> Copiar chave PIX
                </Button>
              )}
            </CardContent>
          )}
        </Card>

        {/* Texto do Comprovante */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Texto do Comprovante</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label className="text-xs">Texto (editável)</Label><Textarea value={baseText} onChange={e => setBaseText(e.target.value)} rows={4} /></div>
            <Button variant="outline" size="sm" onClick={() => setBaseText(getSmartText(receiptType, currentInstallment, totalInstallments))}>Restaurar texto automático</Button>
          </CardContent>
        </Card>
      </div>

      {/* Assinatura da outra parte */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Assinatura da Outra Parte</CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Obrigatória</Label>
              <Switch checked={requirePartySignature} onCheckedChange={setRequirePartySignature} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">Desenhe a assinatura da outra parte no campo abaixo.</p>
          {partySignatureUrl ? (
            <div className="space-y-2">
              <div className="border border-border rounded-lg overflow-hidden bg-white p-2 max-w-md">
                <img src={partySignatureUrl} alt="Assinatura" className="max-h-24 mx-auto" />
              </div>
              <Button variant="outline" size="sm" onClick={() => setPartySignatureUrl(null)}>Refazer assinatura</Button>
            </div>
          ) : (
            <div className="max-w-lg"><SignaturePad onSave={(url) => setPartySignatureUrl(url)} width={500} height={150} /></div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2 pt-2 flex-wrap">
        <Button onClick={handleSave} disabled={saving} className="gap-1">
          <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar Comprovante"}
        </Button>
        <Button variant="outline" onClick={handleGeneratePdf} disabled={generatingPdf} className="gap-1">
          <FileText className="w-4 h-4" /> {generatingPdf ? "Gerando..." : "Gerar PDF"}
        </Button>
        <Button variant="outline" onClick={handleWhatsApp} className="gap-1">
          <MessageCircle className="w-4 h-4" /> WhatsApp
        </Button>
      </div>
    </div>
  );
}
