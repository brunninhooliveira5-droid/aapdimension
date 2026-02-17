import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Settings2, Upload, Trash2, Save, Building2, Palette, Eye, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PdfSettings {
  company_name: string;
  company_phone: string;
  company_email: string;
  company_address: string;
  company_cep: string;
  company_cnpj: string;
  logo_url: string;
  primary_color: string;
  accent_color: string;
  footer_text: string;
  show_date: boolean;
  show_customer: boolean;
  show_delivery: boolean;
  show_material: boolean;
  show_thickness: boolean;
  show_cutting_value: boolean;
  show_material_value: boolean;
  show_service_value: boolean;
  label_service_value: string;
}

const DEFAULT_SETTINGS: PdfSettings = {
  company_name: "",
  company_phone: "",
  company_email: "",
  company_address: "",
  company_cep: "",
  company_cnpj: "",
  logo_url: "",
  primary_color: "#0066cc",
  accent_color: "#e94560",
  footer_text: "",
  show_date: true,
  show_customer: true,
  show_delivery: true,
  show_material: true,
  show_thickness: true,
  show_cutting_value: true,
  show_material_value: true,
  show_service_value: true,
  label_service_value: "Valor de Serviço",
};

export function ProposalPdfConfiguration() {
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
    const { data } = await supabase
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
        company_cep: d.company_cep || "",
        company_cnpj: d.company_cnpj || "",
        logo_url: d.logo_url || "",
        primary_color: d.primary_color || "#0066cc",
        accent_color: d.accent_color || "#e94560",
        footer_text: d.footer_text || "",
        show_date: d.show_date ?? true,
        show_customer: d.show_customer ?? true,
        show_delivery: d.show_delivery ?? true,
        show_material: d.show_material ?? true,
        show_thickness: d.show_thickness ?? true,
        show_cutting_value: d.show_cutting_value ?? true,
        show_material_value: d.show_material_value ?? true,
        show_service_value: d.show_service_value ?? true,
        label_service_value: d.label_service_value || "Valor de Serviço",
      });
    }
    setLoading(false);
  };

  const saveSettings = async () => {
    if (!session?.user) return;
    if (!settings.company_name.trim()) {
      toast.error("Nome da empresa é obrigatório.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!settings.company_email.trim() || !emailRegex.test(settings.company_email.trim())) {
      toast.error("Informe um e-mail válido (ex: contato@empresa.com).");
      return;
    }
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
    if (!file.type.startsWith("image/")) { toast.error("Selecione um arquivo de imagem."); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Imagem deve ter no máximo 2MB."); return; }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${session.user.id}/logo.${ext}`;

    const { error } = await supabase.storage.from("quote-logos").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Erro ao enviar logotipo.");
      console.error(error);
    } else {
      const { data: urlData } = supabase.storage.from("quote-logos").getPublicUrl(path);
      setSettings(s => ({ ...s, logo_url: urlData.publicUrl }));
      toast.success("Logotipo enviado!");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeLogo = () => setSettings(s => ({ ...s, logo_url: "" }));

  const maskCnpj = (raw: string) => {
    const d = raw.replace(/\D/g, "").slice(0, 14);
    return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2}\.\d{3})(\d)/, "$1.$2").replace(/^(\d{2}\.\d{3}\.\d{3})(\d)/, "$1/$2").replace(/^(\d{2}\.\d{3}\.\d{3}\/\d{4})(\d)/, "$1-$2");
  };
  const maskPhone = (raw: string) => {
    const d = raw.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d.replace(/^(\d{0,2})/, "($1");
    if (d.length <= 7) return d.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
  };
  const maskCep = (raw: string) => {
    const d = raw.replace(/\D/g, "").slice(0, 8);
    if (d.length <= 5) return d;
    return d.replace(/^(\d{5})(\d{0,3})/, "$1-$2");
  };

  const update = (key: keyof PdfSettings, value: any) => setSettings(s => ({ ...s, [key]: value }));

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Carregando configurações...</p>;

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Live Preview - Proposal style */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Preview do PDF da Proposta
          </CardTitle>
          <CardDescription>Visualização em tempo real da proposta comercial exportada</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-white rounded-lg shadow-lg overflow-hidden mx-auto" style={{ maxWidth: 520, aspectRatio: "210/297" }}>
            {/* Header bar */}
            <div className="px-5 py-4 flex items-center justify-between" style={{ backgroundColor: settings.primary_color }}>
              <div className="flex items-center gap-3">
                {settings.logo_url && (
                  <img src={settings.logo_url} alt="Logo" className="h-8 w-auto object-contain rounded" style={{ background: "rgba(255,255,255,0.15)", padding: 2 }} />
                )}
              </div>
              <div className="text-right">
                <p className="text-white font-semibold text-sm">{settings.company_name || "Nome da Empresa"}</p>
                {(settings.company_phone || settings.company_email) && (
                  <p className="text-white/70 text-[9px] mt-0.5">
                    {[settings.company_phone, settings.company_email].filter(Boolean).join(" | ")}
                  </p>
                )}
                {settings.company_cnpj && (
                  <p className="text-white/70 text-[9px]">CNPJ: {settings.company_cnpj}</p>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="px-5 py-3 space-y-2">
              {(settings.company_address || settings.company_cep) && (
                <p className="text-gray-400 text-[8px]">
                  {[settings.company_address, settings.company_cep ? `CEP: ${settings.company_cep}` : ""].filter(Boolean).join(" • ")}
                </p>
              )}

              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  {settings.show_date && <p className="text-gray-700 text-[9px]">Data: {new Date().toLocaleDateString("pt-BR")}</p>}
                  {settings.show_customer && (
                    <>
                      <p className="text-gray-700 text-[9px]">Cliente: João da Silva</p>
                      <p className="text-gray-700 text-[9px]">Empresa: Metalúrgica Silva</p>
                    </>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-[8px]">Proposta Nº: A1B2C3D4</p>
                  <p className="text-gray-400 text-[8px]">Validade: 15 dias</p>
                </div>
              </div>

              {/* Equipment section */}
              <div className="mt-1">
                <p className="text-[9px] font-bold" style={{ color: settings.primary_color }}>EQUIPAMENTO</p>
                <p className="text-gray-800 text-[9px] font-semibold">Orion 2800 CNC</p>
                <p className="text-gray-500 text-[8px]">Router CNC profissional de alta performance</p>
              </div>

              {/* Included items */}
              <div>
                <p className="text-[9px] font-bold" style={{ color: settings.primary_color }}>ITENS INCLUSOS</p>
                <div className="text-[8px] text-gray-600 space-y-0.5">
                  <p>• Spindle 3.5kW refrigerado a água</p>
                  <p>• Sistema de vácuo</p>
                  <p>• Software de controle</p>
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-gray-50 rounded px-3 py-2 mt-1">
                <div className="flex justify-between text-[9px] text-gray-600">
                  <span>Equipamento</span><span>{fmt(85000)}</span>
                </div>
                <div className="flex justify-between text-[9px] text-gray-600">
                  <span>Opcionais (2)</span><span>{fmt(4500)}</span>
                </div>
                <div className="border-t border-gray-200 mt-1 pt-1 flex justify-between text-[10px] font-bold">
                  <span style={{ color: settings.primary_color }}>TOTAL</span>
                  <span style={{ color: settings.accent_color }}>{fmt(89500)}</span>
                </div>
              </div>

              {/* Conditions */}
              {settings.show_delivery && (
                <p className="text-gray-500 text-[8px]">Prazo de entrega: 30 dias úteis</p>
              )}

              {/* Footer */}
              {settings.footer_text && (
                <p className="text-gray-400 text-[7px] mt-2 pt-2 border-t border-gray-100 leading-relaxed">
                  {settings.footer_text}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
          <div>
            <Label className="text-xs">Logotipo</Label>
            <div className="mt-1 flex items-center gap-4">
              {settings.logo_url ? (
                <div className="relative">
                  <img src={settings.logo_url} alt="Logo" className="h-16 w-auto rounded border border-border object-contain bg-white p-1" />
                  <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={removeLogo}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="h-16 w-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fileRef.current?.click()}>
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
              <Label className="text-xs">Nome da Empresa <span className="text-destructive">*</span></Label>
              <Input value={settings.company_name} onChange={e => update("company_name", e.target.value)} placeholder="Sua Empresa Ltda" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">CNPJ</Label>
              <Input value={settings.company_cnpj} onChange={e => update("company_cnpj", maskCnpj(e.target.value))} placeholder="00.000.000/0000-00" className="mt-1" maxLength={18} />
            </div>
            <div>
              <Label className="text-xs">Telefone</Label>
              <Input value={settings.company_phone} onChange={e => update("company_phone", maskPhone(e.target.value))} placeholder="(00) 00000-0000" className="mt-1" maxLength={15} />
            </div>
            <div>
              <Label className="text-xs">E-mail <span className="text-destructive">*</span></Label>
              <Input value={settings.company_email} onChange={e => update("company_email", e.target.value)} placeholder="contato@empresa.com" className="mt-1" type="email" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-xs">Endereço</Label>
              <Input value={settings.company_address} onChange={e => update("company_address", e.target.value)} placeholder="Rua, número, bairro, cidade - UF" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">CEP</Label>
              <Input value={settings.company_cep} onChange={e => update("company_cep", maskCep(e.target.value))} placeholder="00000-000" className="mt-1" maxLength={9} />
            </div>
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
                <input type="color" value={settings.primary_color} onChange={e => update("primary_color", e.target.value)} className="w-10 h-10 rounded border border-border cursor-pointer" />
                <Input value={settings.primary_color} onChange={e => update("primary_color", e.target.value)} className="flex-1 font-mono text-xs" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Cor de Destaque (total)</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={settings.accent_color} onChange={e => update("accent_color", e.target.value)} className="w-10 h-10 rounded border border-border cursor-pointer" />
                <Input value={settings.accent_color} onChange={e => update("accent_color", e.target.value)} className="flex-1 font-mono text-xs" />
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
          <CardDescription>Escolha quais informações serão exibidas na proposta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: "show_date" as const, label: "Data" },
            { key: "show_customer" as const, label: "Dados do Cliente" },
            { key: "show_delivery" as const, label: "Prazo de Entrega" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <Label className="text-sm">{label}</Label>
              <Switch checked={settings[key]} onCheckedChange={v => update(key, v)} />
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
          <CardDescription>Texto livre exibido no final do PDF da proposta</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={settings.footer_text}
            onChange={e => update("footer_text", e.target.value)}
            placeholder="Ex: Proposta válida conforme condições descritas. Sujeita a alteração sem aviso prévio."
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
