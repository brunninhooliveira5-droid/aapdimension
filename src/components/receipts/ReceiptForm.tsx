import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignaturePad } from "@/components/SignaturePad";
import { Save, ArrowLeft, FileText } from "lucide-react";
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
  { value: "outro", label: "Outro" },
];

const defaultBaseText = "Declaramos para os devidos fins que recebemos/pagamos o valor descrito neste documento, referente ao serviço, aquisição, parcela ou obrigação comercial aqui identificada, na data informada e conforme a forma de pagamento registrada.";

export function ReceiptForm({ receiptId, onSaved, onCancel }: Props) {
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Form fields
  const [receiptType, setReceiptType] = useState("recebimento");
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
  const [baseText, setBaseText] = useState(defaultBaseText);
  const [relatedContract, setRelatedContract] = useState("");
  const [status, setStatus] = useState("rascunho");

  // Signature
  const [partySignatureUrl, setPartySignatureUrl] = useState<string | null>(null);
  const [existingPartySigId, setExistingPartySigId] = useState<string | null>(null);

  useEffect(() => {
    if (receiptId) loadReceipt(receiptId);
  }, [receiptId]);

  const loadReceipt = async (id: string) => {
    const { data } = await supabase.from("payment_receipts").select("*").eq("id", id).single();
    if (!data) return;
    setReceiptType(data.receipt_type);
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
    setStatus(data.status);

    const { data: sigs } = await supabase.from("receipt_signatures").select("*").eq("receipt_id", id);
    const partySig = (sigs ?? []).find((s: any) => s.signer_type === "outra_parte");
    if (partySig) {
      setPartySignatureUrl(partySig.image_url);
      setExistingPartySigId(partySig.id);
    }
  };

  const handleSave = async () => {
    if (!partyName.trim()) { toast.error("Informe o nome da outra parte"); return; }
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Faça login primeiro"); setSaving(false); return; }

    const payload = {
      user_id: session.user.id,
      receipt_type: receiptType,
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
      status,
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
      // Upload signature to storage
      const blob = await (await fetch(partySignatureUrl)).blob();
      const path = `receipts/${savedId}/party-signature.png`;
      await supabase.storage.from("user-signatures").upload(path, blob, { upsert: true });
      const { data: urlData } = supabase.storage.from("user-signatures").getPublicUrl(path);
      const sigUrl = urlData.publicUrl + "?t=" + Date.now();

      if (existingPartySigId) {
        await supabase.from("receipt_signatures").update({ image_url: sigUrl, signer_name: partyName }).eq("id", existingPartySigId);
      } else {
        await supabase.from("receipt_signatures").insert({
          receipt_id: savedId,
          signer_type: "outra_parte",
          image_url: sigUrl,
          signer_name: partyName,
        });
      }
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
      };
      const { blob, fileName } = await generateReceiptPdf(receiptData, pdfSettings, profileSig, partySignatureUrl);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF gerado!");
    } catch (err: any) {
      toast.error("Erro: " + (err.message || ""));
    }
    setGeneratingPdf(false);
  };

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
                <Label className="text-xs">Tipo</Label>
                <Select value={receiptType} onValueChange={setReceiptType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pagamento">Pagamento</SelectItem>
                    <SelectItem value="recebimento">Recebimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Data</Label>
                <Input type="date" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
              <div>
                <Label className="text-xs">Contrato/Proposta (opcional)</Label>
                <Input value={relatedContract} onChange={e => setRelatedContract(e.target.value)} placeholder="Nº do contrato" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Outra Parte */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Identificação da Outra Parte</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Nome / Razão Social *</Label>
              <Input value={partyName} onChange={e => setPartyName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">CPF / CNPJ</Label>
                <Input value={partyDocument} onChange={e => setPartyDocument(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Telefone</Label>
                <Input value={partyPhone} onChange={e => setPartyPhone(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">E-mail</Label>
                <Input value={partyEmail} onChange={e => setPartyEmail(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Endereço (opcional)</Label>
                <Input value={partyAddress} onChange={e => setPartyAddress(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dados Financeiros */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Dados Financeiros</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Valor (R$)</Label>
                <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Forma de Pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Referente a</Label>
              <Select value={referenceType} onValueChange={setReferenceType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {referenceTypes.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Descrição / Histórico</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>
            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea value={observations} onChange={e => setObservations(e.target.value)} rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Texto do Comprovante */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Texto do Comprovante</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Texto padrão (editável)</Label>
              <Textarea value={baseText} onChange={e => setBaseText(e.target.value)} rows={5} />
            </div>
            <Button variant="outline" size="sm" onClick={() => setBaseText(defaultBaseText)}>Restaurar texto padrão</Button>
          </CardContent>
        </Card>
      </div>

      {/* Assinatura da outra parte */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Assinatura da Outra Parte</CardTitle></CardHeader>
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
            <div className="max-w-lg">
              <SignaturePad onSave={(url) => setPartySignatureUrl(url)} width={500} height={150} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} disabled={saving} className="gap-1">
          <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar Comprovante"}
        </Button>
        <Button variant="outline" onClick={handleGeneratePdf} disabled={generatingPdf} className="gap-1">
          <FileText className="w-4 h-4" /> {generatingPdf ? "Gerando..." : "Gerar PDF"}
        </Button>
      </div>
    </div>
  );
}
