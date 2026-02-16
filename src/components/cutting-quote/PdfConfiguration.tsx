import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Settings2, Upload, Trash2, Save, Building2, Palette, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PdfSettings {
  company_name: string;
  company_phone: string;
  company_email: string;
  company_address: string;
  company_cnpj: string;
  logo_url: string;
  primary_color: string;
  accent_color: string;
  show_material: boolean;
  show_thickness: boolean;
  show_cutting_value: boolean;
  show_material_value: boolean;
  show_delivery: boolean;
  show_date: boolean;
  show_customer: boolean;
  footer_text: string;
}

const DEFAULT_SETTINGS: PdfSettings = {
  company_name: "",
  company_phone: "",
  company_email: "",
  company_address: "",
  company_cnpj: "",
  logo_url: "",
  primary_color: "#1a1a2e",
  accent_color: "#e94560",
  show_material: true,
  show_thickness: true,
  show_cutting_value: true,
  show_material_value: true,
  show_delivery: true,
  show_date: true,
  show_customer: true,
  footer_text: "",
};

export function PdfConfiguration() {
  const { session } = useAuth();
  const [settings, setSettings] = useState<PdfSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!session?.user) return;
    loadSettings();
  }, [session]);

  const loadSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pdf_quote_settings" as any)
      .select("*")
      .eq("user_id", session!.user.id)
      .maybeSingle();
    if (data) {
      const d = data as any;
      setSettings({
        company_name: d.company_name || "",
        company_phone: d.company_phone || "",
        company_email: d.company_email || "",
        company_address: d.company_address || "",
        company_cnpj: d.company_cnpj || "",
        logo_url: d.logo_url || "",
        primary_color: d.primary_color || "#1a1a2e",
        accent_color: d.accent_color || "#e94560",
        show_material: d.show_material ?? true,
        show_thickness: d.show_thickness ?? true,
        show_cutting_value: d.show_cutting_value ?? true,
        show_material_value: d.show_material_value ?? true,
        show_delivery: d.show_delivery ?? true,
        show_date: d.show_date ?? true,
        show_customer: d.show_customer ?? true,
        footer_text: d.footer_text || "",
      });
    }
    setLoading(false);
  };

  const saveSettings = async () => {
    if (!session?.user) return;
    setSaving(true);
    const payload = { ...settings, user_id: session.user.id, updated_at: new Date().toISOString() };

    const { data: existing } = await supabase
      .from("pdf_quote_settings" as any)
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("pdf_quote_settings" as any)
        .update(payload as any)
        .eq("user_id", session.user.id));
    } else {
      ({ error } = await supabase.from("pdf_quote_settings" as any).insert(payload as any));
    }

    if (error) {
      toast.error("Erro ao salvar configurações.");
      console.error(error);
    } else {
      toast.success("Configurações salvas com sucesso!");
    }
    setSaving(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 2MB.");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${session.user.id}/logo.${ext}`;

    const { error } = await supabase.storage.from("quote-logos").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Erro ao enviar logotipo.");
      console.error(error);
    } else {
      const { data: urlData } = supabase.storage.from("quote-logos").getPublicUrl(path);
      setSettings((s) => ({ ...s, logo_url: urlData.publicUrl }));
      toast.success("Logotipo enviado!");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeLogo = () => {
    setSettings((s) => ({ ...s, logo_url: "" }));
  };

  const update = (key: keyof PdfSettings, value: any) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Carregando configurações...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Company Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Dados da Empresa
          </CardTitle>
          <CardDescription>Informações que aparecerão no cabeçalho do PDF</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo */}
          <div>
            <Label className="text-xs">Logotipo</Label>
            <div className="mt-1 flex items-center gap-4">
              {settings.logo_url ? (
                <div className="relative">
                  <img
                    src={settings.logo_url}
                    alt="Logo"
                    className="h-16 w-auto rounded border border-border object-contain bg-white p-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={removeLogo}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div
                  className="h-16 w-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  <div className="text-center">
                    <Upload className="w-5 h-5 mx-auto text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground mt-1">Enviar logo</p>
                  </div>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              {settings.logo_url && (
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? "Enviando..." : "Trocar"}
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nome da Empresa</Label>
              <Input value={settings.company_name} onChange={(e) => update("company_name", e.target.value)} placeholder="Sua Empresa Ltda" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">CNPJ</Label>
              <Input value={settings.company_cnpj} onChange={(e) => update("company_cnpj", e.target.value)} placeholder="00.000.000/0000-00" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Telefone</Label>
              <Input value={settings.company_phone} onChange={(e) => update("company_phone", e.target.value)} placeholder="(00) 00000-0000" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">E-mail</Label>
              <Input value={settings.company_email} onChange={(e) => update("company_email", e.target.value)} placeholder="contato@empresa.com" className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Endereço</Label>
            <Input value={settings.company_address} onChange={(e) => update("company_address", e.target.value)} placeholder="Rua, número, bairro, cidade - UF" className="mt-1" />
          </div>
        </CardContent>
      </Card>

      {/* Colors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            Cores do PDF
          </CardTitle>
          <CardDescription>Personalize as cores do cabeçalho e destaques</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Cor Principal (cabeçalho)</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => update("primary_color", e.target.value)}
                  className="w-10 h-10 rounded border border-border cursor-pointer"
                />
                <Input
                  value={settings.primary_color}
                  onChange={(e) => update("primary_color", e.target.value)}
                  className="flex-1 font-mono text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Cor de Destaque</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={settings.accent_color}
                  onChange={(e) => update("accent_color", e.target.value)}
                  className="w-10 h-10 rounded border border-border cursor-pointer"
                />
                <Input
                  value={settings.accent_color}
                  onChange={(e) => update("accent_color", e.target.value)}
                  className="flex-1 font-mono text-xs"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visible Fields */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            Campos Visíveis no PDF
          </CardTitle>
          <CardDescription>Escolha quais informações serão exibidas no orçamento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: "show_date" as const, label: "Data" },
            { key: "show_customer" as const, label: "Nome do Cliente" },
            { key: "show_material" as const, label: "Material" },
            { key: "show_thickness" as const, label: "Espessura" },
            { key: "show_cutting_value" as const, label: "Valor do Corte" },
            { key: "show_material_value" as const, label: "Valor do Material" },
            { key: "show_delivery" as const, label: "Prazo de Entrega" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <Label className="text-sm">{label}</Label>
              <Switch checked={settings[key]} onCheckedChange={(v) => update(key, v)} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Footer */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            Rodapé
          </CardTitle>
          <CardDescription>Texto livre exibido no final do PDF</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={settings.footer_text}
            onChange={(e) => update("footer_text", e.target.value)}
            placeholder="Ex: Orçamento válido por 15 dias. Pagamento via PIX ou boleto."
            rows={3}
          />
        </CardContent>
      </Card>

      <Button onClick={saveSettings} disabled={saving} className="w-full gap-2">
        <Save className="w-4 h-4" />
        {saving ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
}
