import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const COLOR_PRESETS = [
  { label: "Azul Escuro", value: "30,64,120" },
  { label: "Azul Royal", value: "41,98,255" },
  { label: "Verde Escuro", value: "22,101,52" },
  { label: "Vermelho", value: "153,27,27" },
  { label: "Cinza Escuro", value: "55,65,81" },
  { label: "Preto", value: "15,15,15" },
  { label: "Marrom", value: "120,53,15" },
  { label: "Roxo", value: "88,28,135" },
];

export function WorkDiaryPdfConfig() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [config, setConfig] = useState({
    company_name: "",
    role_title: "",
    phone: "",
    email: "",
    city: "",
    logo_url: "",
    footer_text: "",
    show_logo: true,
    show_photos: true,
    show_materials: true,
    show_time: true,
    show_status: true,
    show_signature: true,
    watermark_text: "",
    watermark_opacity: 15,
    show_watermark: false,
    header_color: "30,64,120",
    watermark_image_url: "",
  });
  const [hasSignature, setHasSignature] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase.from("work_diary_pdf_config").select("*").eq("user_id", userId).single().then(({ data }) => {
      if (data) {
        setConfig({
          company_name: data.company_name || "",
          role_title: data.role_title || "",
          phone: data.phone || "",
          email: data.email || "",
          city: data.city || "",
          logo_url: data.logo_url || "",
          footer_text: data.footer_text || "",
          show_logo: data.show_logo ?? true,
          show_photos: data.show_photos ?? true,
          show_materials: data.show_materials ?? true,
          show_time: data.show_time ?? true,
          show_status: data.show_status ?? true,
          show_signature: data.show_signature ?? true,
          watermark_text: (data as any).watermark_text || "",
          watermark_opacity: (data as any).watermark_opacity ?? 15,
          show_watermark: (data as any).show_watermark ?? false,
          header_color: (data as any).header_color || "30,64,120",
        });
      }
    });
    supabase.from("profiles").select("signature_url").eq("id", userId).single().then(({ data }) => {
      setHasSignature(!!data?.signature_url);
    });
  }, [userId]);

  const update = (key: string, val: any) => setConfig((p) => ({ ...p, [key]: val }));

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !userId) return;
    setUploading(true);
    const file = e.target.files[0];
    const path = `${userId}/logo-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("work-diary-files").upload(path, file, { upsert: true });
    if (error) { toast.error("Erro no upload"); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("work-diary-files").getPublicUrl(path);
    update("logo_url", publicUrl);
    setUploading(false);
    toast.success("Logo carregado!");
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("work_diary_pdf_config").upsert({ ...config, user_id: userId } as any, { onConflict: "user_id" });
    if (error) toast.error("Erro ao salvar");
    else toast.success("Configuração salva!");
    setSaving(false);
  };

  const colorRgb = config.header_color.split(",").map(Number);

  return (
    <div className="space-y-4 max-w-2xl">
      <Card>
        <CardHeader><CardTitle className="text-base">Dados do Cabeçalho</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Nome da empresa / usuário</Label><Input value={config.company_name} onChange={(e) => update("company_name", e.target.value)} /></div>
          <div><Label>Cargo / Função</Label><Input value={config.role_title} onChange={(e) => update("role_title", e.target.value)} /></div>
          <div><Label>Telefone</Label><Input value={config.phone} onChange={(e) => update("phone", e.target.value)} /></div>
          <div><Label>E-mail</Label><Input value={config.email} onChange={(e) => update("email", e.target.value)} /></div>
          <div><Label>Cidade</Label><Input value={config.city} onChange={(e) => update("city", e.target.value)} /></div>
          <div><Label>Rodapé personalizado</Label><Input value={config.footer_text} onChange={(e) => update("footer_text", e.target.value)} placeholder="Ex: Documento confidencial" /></div>
          <div className="sm:col-span-2">
            <Label>Logo (opcional)</Label>
            <div className="flex items-center gap-3 mt-1">
              {config.logo_url && <img src={config.logo_url} alt="Logo" className="h-10 rounded border border-border" />}
              <Input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
              {config.logo_url && <Button variant="ghost" size="sm" onClick={() => update("logo_url", "")}>Remover</Button>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tonalidade / Cor do PDF */}
      <Card>
        <CardHeader><CardTitle className="text-base">Tonalidade do PDF</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block">Cor do cabeçalho e títulos de seção</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => update("header_color", c.value)}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${config.header_color === c.value ? "border-primary scale-110 ring-2 ring-primary/30" : "border-border"}`}
                  style={{ backgroundColor: `rgb(${c.value})` }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="h-6 w-full rounded"
              style={{ backgroundColor: `rgb(${config.header_color})` }}
            />
            <Input
              value={config.header_color}
              onChange={(e) => update("header_color", e.target.value)}
              placeholder="R,G,B"
              className="w-32 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Marca d'água */}
      <Card>
        <CardHeader><CardTitle className="text-base">Marca d'Água</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Toggle label="Ativar marca d'água" value={config.show_watermark} onChange={(v) => update("show_watermark", v)} />
          {config.show_watermark && (
            <>
              <div>
                <Label>Texto da marca d'água</Label>
                <Input
                  value={config.watermark_text}
                  onChange={(e) => update("watermark_text", e.target.value)}
                  placeholder="Ex: CONFIDENCIAL, nome da empresa..."
                />
              </div>
              <div>
                <Label className="mb-2 block">Opacidade: {config.watermark_opacity}%</Label>
                <Slider
                  value={[config.watermark_opacity]}
                  onValueChange={([v]) => update("watermark_opacity", v)}
                  min={5}
                  max={50}
                  step={1}
                />
              </div>
              {/* Preview */}
              <div className="relative border border-border rounded-lg h-24 bg-card overflow-hidden flex items-center justify-center">
                <p className="text-xs text-muted-foreground z-10">Pré-visualização</p>
                <span
                  className="absolute inset-0 flex items-center justify-center text-2xl font-bold pointer-events-none select-none"
                  style={{
                    color: `rgba(${config.header_color}, ${config.watermark_opacity / 100})`,
                    transform: "rotate(-30deg)",
                  }}
                >
                  {config.watermark_text || "MARCA D'ÁGUA"}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Opções de Exibição no PDF</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Toggle label="Mostrar logo" value={config.show_logo} onChange={(v) => update("show_logo", v)} />
          <Toggle label="Mostrar fotos" value={config.show_photos} onChange={(v) => update("show_photos", v)} />
          <Toggle label="Mostrar materiais utilizados" value={config.show_materials} onChange={(v) => update("show_materials", v)} />
          <Toggle label="Mostrar horário inicial/final" value={config.show_time} onChange={(v) => update("show_time", v)} />
          <Toggle label="Mostrar status" value={config.show_status} onChange={(v) => update("show_status", v)} />
          <Toggle label="Mostrar assinatura" value={config.show_signature} onChange={(v) => update("show_signature", v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Assinatura</CardTitle></CardHeader>
        <CardContent>
          {hasSignature ? (
            <p className="text-sm text-green-600 dark:text-green-400">✓ Assinatura cadastrada no perfil. Será inserida automaticamente no PDF.</p>
          ) : (
            <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p className="text-sm">Nenhuma assinatura cadastrada. Acesse <strong>Configurações</strong> para cadastrar sua assinatura antes de gerar PDFs assinados.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Salvar Configuração"}</Button>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="cursor-pointer">{label}</Label>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}
