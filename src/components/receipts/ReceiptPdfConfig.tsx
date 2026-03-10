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
import { Save, Upload, Image as ImageIcon } from "lucide-react";

export function ReceiptPdfConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [profileSignature, setProfileSignature] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [footerText, setFooterText] = useState("Comprovante gerado automaticamente");
  const [institutionalText, setInstitutionalText] = useState("");
  const [watermarkText, setWatermarkText] = useState("");
  const [watermarkImageUrl, setWatermarkImageUrl] = useState("");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.08);
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0066cc");
  const [documentTitle, setDocumentTitle] = useState("");
  const [subtitleText, setSubtitleText] = useState("");
  const [defaultTemplateType, setDefaultTemplateType] = useState("geral");

  const [showLogo, setShowLogo] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const [showObservations, setShowObservations] = useState(true);
  const [showEmitterSig, setShowEmitterSig] = useState(true);
  const [showPartySig, setShowPartySig] = useState(true);
  const [showWatermark, setShowWatermark] = useState(false);
  const [enablePixQr, setEnablePixQr] = useState(false);
  const [pixQrImageUrl, setPixQrImageUrl] = useState("");
  const [showInstallmentInfo, setShowInstallmentInfo] = useState(true);
  const [showRemainingBalance, setShowRemainingBalance] = useState(true);
  const [showHistorySummary, setShowHistorySummary] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const { data: prof } = await supabase.from("profiles").select("signature_url").eq("id", session.user.id).single();
    if (prof?.signature_url) setProfileSignature(prof.signature_url);

    const { data } = await supabase.from("receipt_pdf_settings").select("*").eq("user_id", session.user.id).maybeSingle();
    if (data) {
      setSettingsId(data.id);
      setCompanyName(data.company_name); setDocumentNumber(data.document_number);
      setAddress(data.address); setPhone(data.phone); setEmail(data.email);
      setLogoUrl(data.logo_url); setFooterText(data.footer_text);
      setInstitutionalText(data.institutional_text); setWatermarkText(data.watermark_text);
      setWatermarkImageUrl(data.watermark_image_url); setWatermarkOpacity(Number(data.watermark_opacity));
      setSignerName(data.signer_name); setSignerRole(data.signer_role);
      setPrimaryColor(data.primary_color); setDocumentTitle(data.document_title || "");
      setSubtitleText(data.subtitle_text || ""); setDefaultTemplateType(data.default_template_type || "geral");
      setShowLogo(data.show_logo); setShowFooter(data.show_footer);
      setShowObservations(data.show_observations); setShowEmitterSig(data.show_emitter_signature);
      setShowPartySig(data.show_party_signature); setShowWatermark(data.show_watermark);
      setEnablePixQr(data.enable_pix_qr || false);
      setShowInstallmentInfo(data.show_installment_info ?? true);
      setShowRemainingBalance(data.show_remaining_balance ?? true);
      setShowHistorySummary(data.show_history_summary ?? false);
    }
    setLoading(false);
  };

  const handleUpload = async (file: File, prefix: string, setter: (url: string) => void) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const path = `${prefix}/${session.user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("quote-logos").upload(path, file, { upsert: true });
    if (error) { toast.error("Erro ao enviar arquivo"); return; }
    const { data } = supabase.storage.from("quote-logos").getPublicUrl(path);
    setter(data.publicUrl);
    toast.success("Arquivo enviado!");
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }
    const payload = {
      user_id: session.user.id, company_name: companyName, document_number: documentNumber,
      address, phone, email, logo_url: logoUrl, footer_text: footerText,
      institutional_text: institutionalText, watermark_text: watermarkText,
      watermark_image_url: watermarkImageUrl, watermark_opacity: watermarkOpacity,
      signer_name: signerName, signer_role: signerRole, primary_color: primaryColor,
      document_title: documentTitle, subtitle_text: subtitleText, default_template_type: defaultTemplateType,
      show_logo: showLogo, show_footer: showFooter, show_observations: showObservations,
      show_emitter_signature: showEmitterSig, show_party_signature: showPartySig, show_watermark: showWatermark,
      enable_pix_qr: enablePixQr, show_installment_info: showInstallmentInfo,
      show_remaining_balance: showRemainingBalance, show_history_summary: showHistorySummary,
    };
    if (settingsId) {
      await supabase.from("receipt_pdf_settings").update(payload).eq("id", settingsId);
    } else {
      const { data } = await supabase.from("receipt_pdf_settings").insert(payload).select("id").single();
      if (data) setSettingsId(data.id);
    }
    toast.success("Configurações salvas!");
    setSaving(false);
  };

  if (loading) return <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Dados da Empresa / Emitente</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label className="text-xs">Nome / Empresa</Label><Input value={companyName} onChange={e => setCompanyName(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">CNPJ / CPF</Label><Input value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} /></div>
              <div><Label className="text-xs">Telefone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
            </div>
            <div><Label className="text-xs">Endereço</Label><Input value={address} onChange={e => setAddress(e.target.value)} /></div>
            <div><Label className="text-xs">E-mail</Label><Input value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Nome do Assinante</Label><Input value={signerName} onChange={e => setSignerName(e.target.value)} /></div>
              <div><Label className="text-xs">Cargo / Função</Label><Input value={signerRole} onChange={e => setSignerRole(e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Identidade Visual</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Logo</Label>
              <div className="flex gap-2 items-center">
                {logoUrl && <img src={logoUrl} alt="Logo" className="h-10 rounded border border-border" />}
                <Button variant="outline" size="sm" onClick={() => document.getElementById("rcfg-logo")?.click()} className="gap-1">
                  <Upload className="h-3 w-3" /> {logoUrl ? "Trocar" : "Enviar"}
                </Button>
                <input id="rcfg-logo" type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], "receipt-logos", setLogoUrl)} />
              </div>
            </div>
            <div><Label className="text-xs">Cor primária</Label><Input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-9 w-20" /></div>
            <div><Label className="text-xs">Título do documento (opcional)</Label><Input value={documentTitle} onChange={e => setDocumentTitle(e.target.value)} placeholder="Ex: COMPROVANTE DE PAGAMENTO" /></div>
            <div><Label className="text-xs">Subtítulo institucional</Label><Input value={subtitleText} onChange={e => setSubtitleText(e.target.value)} /></div>
            <div><Label className="text-xs">Rodapé</Label><Input value={footerText} onChange={e => setFooterText(e.target.value)} /></div>
            <div><Label className="text-xs">Texto institucional</Label><Textarea value={institutionalText} onChange={e => setInstitutionalText(e.target.value)} rows={2} /></div>
            <div>
              <Label className="text-xs">Modelo padrão</Label>
              <Select value={defaultTemplateType} onValueChange={setDefaultTemplateType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="geral">Geral</SelectItem>
                  <SelectItem value="maquina">Máquina</SelectItem>
                  <SelectItem value="servico">Serviço</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Marca d'Água</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label className="text-xs">Texto</Label><Input value={watermarkText} onChange={e => setWatermarkText(e.target.value)} placeholder="Ex: CONFIDENCIAL" /></div>
            <div>
              <Label className="text-xs">Imagem (alternativa)</Label>
              <div className="flex gap-2 items-center">
                {watermarkImageUrl && <img src={watermarkImageUrl} alt="WM" className="h-8 rounded border border-border opacity-50" />}
                <Button variant="outline" size="sm" onClick={() => document.getElementById("rcfg-wm")?.click()} className="gap-1">
                  <ImageIcon className="h-3 w-3" /> {watermarkImageUrl ? "Trocar" : "Enviar"}
                </Button>
                <input id="rcfg-wm" type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], "receipt-watermarks", setWatermarkImageUrl)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Opacidade ({Math.round(watermarkOpacity * 100)}%)</Label>
              <Input type="range" min="0.02" max="0.3" step="0.01" value={watermarkOpacity} onChange={e => setWatermarkOpacity(Number(e.target.value))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Toggles de Exibição</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Mostrar logo", v: showLogo, set: setShowLogo },
              { label: "Mostrar rodapé", v: showFooter, set: setShowFooter },
              { label: "Mostrar observações", v: showObservations, set: setShowObservations },
              { label: "Mostrar assinatura do emitente", v: showEmitterSig, set: setShowEmitterSig },
              { label: "Mostrar assinatura da outra parte", v: showPartySig, set: setShowPartySig },
              { label: "Mostrar marca d'água", v: showWatermark, set: setShowWatermark },
              { label: "Mostrar QR Code PIX", v: enablePixQr, set: setEnablePixQr },
              { label: "Mostrar info de parcela", v: showInstallmentInfo, set: setShowInstallmentInfo },
              { label: "Mostrar saldo restante", v: showRemainingBalance, set: setShowRemainingBalance },
              { label: "Mostrar histórico resumido", v: showHistorySummary, set: setShowHistorySummary },
            ].map(t => (
              <div key={t.label} className="flex items-center justify-between">
                <Label className="text-xs">{t.label}</Label>
                <Switch checked={t.v} onCheckedChange={t.set} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Assinatura do Emitente</CardTitle></CardHeader>
        <CardContent>
          {profileSignature ? (
            <div className="flex items-center gap-4">
              <img src={profileSignature} alt="Assinatura" className="h-16 border border-border rounded p-1 bg-white" />
              <p className="text-xs text-muted-foreground">Assinatura cadastrada em Configurações.</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhuma assinatura cadastrada. Acesse <strong>Configurações</strong> para cadastrar.</p>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gap-1">
        <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
}
