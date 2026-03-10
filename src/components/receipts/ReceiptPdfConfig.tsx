import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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

  const [showLogo, setShowLogo] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const [showObservations, setShowObservations] = useState(true);
  const [showEmitterSig, setShowEmitterSig] = useState(true);
  const [showPartySig, setShowPartySig] = useState(true);
  const [showWatermark, setShowWatermark] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    // Profile signature
    const { data: prof } = await supabase.from("profiles").select("signature_url").eq("id", session.user.id).single();
    if (prof?.signature_url) setProfileSignature(prof.signature_url);

    const { data } = await supabase.from("receipt_pdf_settings").select("*").eq("user_id", session.user.id).maybeSingle();
    if (data) {
      setSettingsId(data.id);
      setCompanyName(data.company_name);
      setDocumentNumber(data.document_number);
      setAddress(data.address);
      setPhone(data.phone);
      setEmail(data.email);
      setLogoUrl(data.logo_url);
      setFooterText(data.footer_text);
      setInstitutionalText(data.institutional_text);
      setWatermarkText(data.watermark_text);
      setWatermarkImageUrl(data.watermark_image_url);
      setWatermarkOpacity(Number(data.watermark_opacity));
      setSignerName(data.signer_name);
      setSignerRole(data.signer_role);
      setPrimaryColor(data.primary_color);
      setShowLogo(data.show_logo);
      setShowFooter(data.show_footer);
      setShowObservations(data.show_observations);
      setShowEmitterSig(data.show_emitter_signature);
      setShowPartySig(data.show_party_signature);
      setShowWatermark(data.show_watermark);
    }
    setLoading(false);
  };

  const handleLogoUpload = async (file: File) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const path = `receipt-logos/${session.user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("quote-logos").upload(path, file, { upsert: true });
    if (error) { toast.error("Erro ao enviar logo"); return; }
    const { data } = supabase.storage.from("quote-logos").getPublicUrl(path);
    setLogoUrl(data.publicUrl);
    toast.success("Logo enviada!");
  };

  const handleWatermarkUpload = async (file: File) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const path = `receipt-watermarks/${session.user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("quote-logos").upload(path, file, { upsert: true });
    if (error) { toast.error("Erro ao enviar marca d'água"); return; }
    const { data } = supabase.storage.from("quote-logos").getPublicUrl(path);
    setWatermarkImageUrl(data.publicUrl);
    toast.success("Marca d'água enviada!");
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }

    const payload = {
      user_id: session.user.id,
      company_name: companyName,
      document_number: documentNumber,
      address,
      phone,
      email,
      logo_url: logoUrl,
      footer_text: footerText,
      institutional_text: institutionalText,
      watermark_text: watermarkText,
      watermark_image_url: watermarkImageUrl,
      watermark_opacity: watermarkOpacity,
      signer_name: signerName,
      signer_role: signerRole,
      primary_color: primaryColor,
      show_logo: showLogo,
      show_footer: showFooter,
      show_observations: showObservations,
      show_emitter_signature: showEmitterSig,
      show_party_signature: showPartySig,
      show_watermark: showWatermark,
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
                <Button variant="outline" size="sm" onClick={() => document.getElementById("receipt-logo-input")?.click()} className="gap-1">
                  <Upload className="h-3 w-3" /> {logoUrl ? "Trocar" : "Enviar"}
                </Button>
                <input id="receipt-logo-input" type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
              </div>
            </div>
            <div><Label className="text-xs">Cor primária</Label><Input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-9 w-20" /></div>
            <div><Label className="text-xs">Rodapé</Label><Input value={footerText} onChange={e => setFooterText(e.target.value)} /></div>
            <div><Label className="text-xs">Texto institucional</Label><Textarea value={institutionalText} onChange={e => setInstitutionalText(e.target.value)} rows={2} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Marca d'Água</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label className="text-xs">Texto da marca d'água</Label><Input value={watermarkText} onChange={e => setWatermarkText(e.target.value)} placeholder="Ex: CONFIDENCIAL" /></div>
            <div>
              <Label className="text-xs">Imagem (alternativa ao texto)</Label>
              <div className="flex gap-2 items-center">
                {watermarkImageUrl && <img src={watermarkImageUrl} alt="Watermark" className="h-8 rounded border border-border opacity-50" />}
                <Button variant="outline" size="sm" onClick={() => document.getElementById("receipt-wm-input")?.click()} className="gap-1">
                  <ImageIcon className="h-3 w-3" /> {watermarkImageUrl ? "Trocar" : "Enviar"}
                </Button>
                <input id="receipt-wm-input" type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleWatermarkUpload(e.target.files[0])} />
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
            ].map(t => (
              <div key={t.label} className="flex items-center justify-between">
                <Label className="text-xs">{t.label}</Label>
                <Switch checked={t.v} onCheckedChange={t.set} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Profile signature preview */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Assinatura do Emitente</CardTitle></CardHeader>
        <CardContent>
          {profileSignature ? (
            <div className="flex items-center gap-4">
              <img src={profileSignature} alt="Assinatura" className="h-16 border border-border rounded p-1 bg-white" />
              <p className="text-xs text-muted-foreground">Assinatura cadastrada em Configurações. Para alterar, acesse Configurações.</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhuma assinatura cadastrada. Acesse <strong>Configurações</strong> para cadastrar sua assinatura.</p>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gap-1">
        <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
}
