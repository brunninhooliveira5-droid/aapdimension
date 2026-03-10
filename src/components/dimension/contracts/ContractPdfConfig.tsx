import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Settings2, Upload, Trash2, Save, Building2, Palette, Droplets, PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { applyPhoneMask } from "@/lib/phone-mask";

interface PdfSettings {
  company_name: string;
  company_cnpj: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  logo_url: string;
  footer_text: string;
  institutional_text: string;
  watermark_text: string;
  watermark_image_url: string;
  watermark_opacity: number;
  watermark_position: string;
  show_watermark: boolean;
  signer_name: string;
  signer_role: string;
  signature_url: string;
  primary_color: string;
  accent_color: string;
}

const DEFAULT: PdfSettings = {
  company_name: "",
  company_cnpj: "",
  company_address: "",
  company_phone: "",
  company_email: "",
  logo_url: "",
  footer_text: "",
  institutional_text: "",
  watermark_text: "",
  watermark_image_url: "",
  watermark_opacity: 0.08,
  watermark_position: "center",
  show_watermark: false,
  signer_name: "",
  signer_role: "",
  signature_url: "",
  primary_color: "#0066cc",
  accent_color: "#e94560",
};

const maskCnpj = (raw: string) => {
  const d = raw.replace(/\D/g, "").slice(0, 14);
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2}\.\d{3})(\d)/, "$1.$2").replace(/^(\d{2}\.\d{3}\.\d{3})(\d)/, "$1/$2").replace(/^(\d{2}\.\d{3}\.\d{3}\/\d{4})(\d)/, "$1-$2");
};

export function ContractPdfConfig() {
  const { session } = useAuth();
  const [settings, setSettings] = useState<PdfSettings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileSignature, setProfileSignature] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const watermarkRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session?.user) {
      loadSettings();
      loadProfileSignature();
    }
  }, [session]);

  const loadProfileSignature = async () => {
    const { data } = await supabase.from("profiles").select("signature_url").eq("id", session!.user.id).single();
    if (data?.signature_url) setProfileSignature(data.signature_url);
  };

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from("dimension_contract_pdf_settings" as any).select("*").limit(1).maybeSingle();
    if (data) {
      const d = data as any;
      setSettings({
        company_name: d.company_name || "",
        company_cnpj: d.company_cnpj || "",
        company_address: d.company_address || "",
        company_phone: d.company_phone || "",
        company_email: d.company_email || "",
        logo_url: d.logo_url || "",
        footer_text: d.footer_text || "",
        institutional_text: d.institutional_text || "",
        watermark_text: d.watermark_text || "",
        watermark_image_url: d.watermark_image_url || "",
        watermark_opacity: d.watermark_opacity ?? 0.08,
        watermark_position: d.watermark_position || "center",
        show_watermark: d.show_watermark ?? false,
        signer_name: d.signer_name || "",
        signer_role: d.signer_role || "",
        signature_url: d.signature_url || "",
        primary_color: d.primary_color || "#0066cc",
        accent_color: d.accent_color || "#e94560",
      });
    }
    setLoading(false);
  };

  const saveSettings = async () => {
    if (!session?.user) return;
    setSaving(true);
    const payload = { ...settings, user_id: session.user.id, updated_at: new Date().toISOString() };
    const { data: existing } = await supabase.from("dimension_contract_pdf_settings" as any).select("id").eq("user_id", session.user.id).maybeSingle();
    let error;
    if (existing) {
      ({ error } = await supabase.from("dimension_contract_pdf_settings" as any).update(payload as any).eq("user_id", session.user.id));
    } else {
      ({ error } = await supabase.from("dimension_contract_pdf_settings" as any).insert(payload as any));
    }
    if (error) { toast.error("Erro ao salvar"); console.error(error); }
    else toast.success("Configurações salvas!");
    setSaving(false);
  };

  const uploadFile = async (file: File, path: string) => {
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return null; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Máximo 2MB"); return null; }
    const { error } = await supabase.storage.from("quote-logos").upload(path, file, { upsert: true });
    if (error) { toast.error("Erro no upload"); return null; }
    const { data } = supabase.storage.from("quote-logos").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof PdfSettings, pathPrefix: string) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user) return;
    const ext = file.name.split(".").pop();
    const url = await uploadFile(file, `${session.user.id}/contract-${pathPrefix}.${ext}`);
    if (url) setSettings(s => ({ ...s, [field]: url }));
  };

  const update = (key: keyof PdfSettings, value: any) => setSettings(s => ({ ...s, [key]: value }));

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Company */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> Dados da Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Logotipo</Label>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e, "logo_url", "logo")} />
            <div className="flex items-center gap-3 mt-1">
              {settings.logo_url ? (
                <div className="relative">
                  <img src={settings.logo_url} alt="Logo" className="h-14 w-auto rounded border border-border object-contain bg-white p-1" />
                  <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground" onClick={() => update("logo_url", "")}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => logoRef.current?.click()}><Upload className="w-3.5 h-3.5 mr-1" /> Enviar logo</Button>
              )}
              {settings.logo_url && <Button variant="outline" size="sm" onClick={() => logoRef.current?.click()}>Trocar</Button>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nome da Empresa</Label>
              <Input value={settings.company_name} onChange={e => update("company_name", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">CNPJ</Label>
              <Input value={settings.company_cnpj} onChange={e => update("company_cnpj", maskCnpj(e.target.value))} placeholder="00.000.000/0000-00" className="mt-1" maxLength={18} />
            </div>
            <div>
              <Label className="text-xs">Telefone</Label>
              <Input value={settings.company_phone} onChange={e => update("company_phone", applyPhoneMask(e.target.value))} placeholder="(00) 00000-0000" className="mt-1" maxLength={15} />
            </div>
            <div>
              <Label className="text-xs">E-mail</Label>
              <Input value={settings.company_email} onChange={e => update("company_email", e.target.value)} type="email" className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Endereço</Label>
            <Input value={settings.company_address} onChange={e => update("company_address", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Texto Institucional</Label>
            <Textarea value={settings.institutional_text} onChange={e => update("institutional_text", e.target.value)} rows={2} className="mt-1" placeholder="Texto institucional que aparece no PDF..." />
          </div>
          <div>
            <Label className="text-xs">Rodapé</Label>
            <Input value={settings.footer_text} onChange={e => update("footer_text", e.target.value)} placeholder="Texto do rodapé do PDF" className="mt-1" />
          </div>
        </CardContent>
      </Card>

      {/* Colors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Palette className="w-4 h-4 text-primary" /> Cores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Cor Principal</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={settings.primary_color} onChange={e => update("primary_color", e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                <Input value={settings.primary_color} onChange={e => update("primary_color", e.target.value)} className="flex-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Cor de Destaque</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={settings.accent_color} onChange={e => update("accent_color", e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                <Input value={settings.accent_color} onChange={e => update("accent_color", e.target.value)} className="flex-1" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Watermark */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Droplets className="w-4 h-4 text-primary" /> Marca d'Água</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={settings.show_watermark} onCheckedChange={v => update("show_watermark", v)} />
            <Label className="text-xs">Exibir marca d'água no PDF</Label>
          </div>
          {settings.show_watermark && (
            <>
              <div>
                <Label className="text-xs">Texto da marca d'água</Label>
                <Input value={settings.watermark_text} onChange={e => update("watermark_text", e.target.value)} placeholder="Ex: DIMENSION CNC" className="mt-1" />
                <p className="text-xs text-muted-foreground mt-1">Se preenchido, o texto será usado. Caso contrário, a imagem.</p>
              </div>
              <div>
                <Label className="text-xs">Imagem da marca d'água</Label>
                <input ref={watermarkRef} type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e, "watermark_image_url", "watermark")} />
                <div className="flex items-center gap-3 mt-1">
                  {settings.watermark_image_url ? (
                    <div className="relative">
                      <img src={settings.watermark_image_url} alt="Watermark" className="h-12 w-auto rounded border border-border object-contain bg-white p-1 opacity-30" />
                      <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground" onClick={() => update("watermark_image_url", "")}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => watermarkRef.current?.click()}><Upload className="w-3.5 h-3.5 mr-1" /> Enviar imagem</Button>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs">Opacidade ({Math.round(settings.watermark_opacity * 100)}%)</Label>
                <Slider value={[settings.watermark_opacity * 100]} onValueChange={v => update("watermark_opacity", v[0] / 100)} min={3} max={50} step={1} className="mt-2" />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Signature */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><PenLine className="w-4 h-4 text-primary" /> Assinatura</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nome do Assinante</Label>
              <Input value={settings.signer_name} onChange={e => update("signer_name", e.target.value)} placeholder="Nome completo" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Cargo / Função</Label>
              <Input value={settings.signer_role} onChange={e => update("signer_role", e.target.value)} placeholder="Ex: Diretor Comercial" className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Imagem da Assinatura</Label>
            <input ref={signatureRef} type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e, "signature_url", "signature")} />
            <div className="flex items-center gap-3 mt-1">
              {settings.signature_url ? (
                <div className="relative">
                  <img src={settings.signature_url} alt="Assinatura" className="h-12 w-auto rounded border border-border object-contain bg-white p-1" />
                  <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground" onClick={() => update("signature_url", "")}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => signatureRef.current?.click()}><Upload className="w-3.5 h-3.5 mr-1" /> Enviar assinatura</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pb-8">
        <Button onClick={saveSettings} disabled={saving}>
          <Save className="w-4 h-4 mr-1" /> {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}
