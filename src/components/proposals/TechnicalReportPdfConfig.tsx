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

export function TechnicalReportPdfConfig() {
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
    show_checklist: true,
    show_signature: true,
    watermark_opacity: 15,
    show_watermark: false,
    header_color: "30,64,120",
    watermark_image_url: "",
    logo_bg_color: "",
  });
  const [hasSignature, setHasSignature] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase.from("technical_report_pdf_config").select("*").eq("user_id", userId).single().then(({ data }) => {
      if (data) {
        setConfig({
          company_name: (data as any).company_name || "",
          role_title: (data as any).role_title || "",
          phone: (data as any).phone || "",
          email: (data as any).email || "",
          city: (data as any).city || "",
          logo_url: (data as any).logo_url || "",
          footer_text: (data as any).footer_text || "",
          show_logo: (data as any).show_logo ?? true,
          show_photos: (data as any).show_photos ?? true,
          show_checklist: (data as any).show_checklist ?? true,
          show_signature: (data as any).show_signature ?? true,
          watermark_opacity: (data as any).watermark_opacity ?? 15,
          show_watermark: (data as any).show_watermark ?? false,
          header_color: (data as any).header_color || "30,64,120",
          watermark_image_url: (data as any).watermark_image_url || "",
          logo_bg_color: (data as any).logo_bg_color || "",
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
    const path = `${userId}/report-logo-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("technical-report-files").upload(path, file, { upsert: true });
    if (error) { toast.error("Erro no upload"); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("technical-report-files").getPublicUrl(path);
    update("logo_url", publicUrl);
    setUploading(false);
    toast.success("Logo carregado!");
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("technical_report_pdf_config").upsert({ ...config, user_id: userId } as any, { onConflict: "user_id" });
    if (error) toast.error("Erro ao salvar");
    else toast.success("Configuração salva!");
    setSaving(false);
  };

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
              {config.logo_url && (
                <div className="rounded border border-border p-1 bg-muted">
                  <img src={config.logo_url} alt="Logo" className="h-10" />
                </div>
              )}
              <Input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
              {config.logo_url && <Button variant="ghost" size="sm" onClick={() => update("logo_url", "")}>Remover</Button>}
            </div>
          </div>
          {config.logo_url && (
            <div className="sm:col-span-2">
              <Label>Cor da logomarca</Label>
              <p className="text-xs text-muted-foreground mb-2">Selecione "Original" para manter as cores originais, ou escolha uma cor para tingir a logo.</p>
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { label: "Original", value: "" },
                    { label: "Branco", value: "#ffffff" },
                    { label: "Preto", value: "#000000" },
                    { label: "Azul Escuro", value: "#1e4078" },
                    { label: "Vermelho", value: "#991b1b" },
                    { label: "Verde", value: "#166534" },
                    { label: "Dourado", value: "#b8860b" },
                  ].map((c) => (
                    <button
                      key={c.value}
                      onClick={() => update("logo_bg_color", c.value)}
                      className={`h-7 w-7 rounded-full border-2 transition-all ${config.logo_bg_color === c.value ? "border-primary scale-110 ring-2 ring-primary/30" : "border-border"}`}
                      style={{
                        backgroundColor: c.value || undefined,
                        backgroundImage: !c.value ? "linear-gradient(135deg, #ff0000 0%, #00ff00 33%, #0000ff 66%, #ff0000 100%)" : undefined,
                      }}
                      title={c.label}
                    />
                  ))}
                </div>
                <Input
                  type="color"
                  value={config.logo_bg_color || "#1e4078"}
                  onChange={(e) => update("logo_bg_color", e.target.value)}
                  className="w-10 h-8 p-0.5 cursor-pointer"
                />
              </div>
              {config.logo_bg_color && config.logo_url && (
                <div className="mt-3 flex items-center gap-4">
                  <div className="text-xs text-muted-foreground">Preview:</div>
                  <canvas
                    ref={(canvas) => {
                      if (!canvas || !config.logo_url) return;
                      const ctx = canvas.getContext("2d");
                      if (!ctx) return;
                      const img = new Image();
                      img.crossOrigin = "anonymous";
                      img.onload = () => {
                        canvas.width = img.width;
                        canvas.height = img.height;
                        canvas.style.height = "40px";
                        canvas.style.width = `${(img.width / img.height) * 40}px`;
                        ctx.drawImage(img, 0, 0);
                        ctx.globalCompositeOperation = "source-in";
                        ctx.fillStyle = config.logo_bg_color;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                      };
                      img.src = config.logo_url;
                    }}
                    className="rounded border border-border p-1 bg-muted"
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
            <div className="h-6 w-full rounded" style={{ backgroundColor: `rgb(${config.header_color})` }} />
            <Input value={config.header_color} onChange={(e) => update("header_color", e.target.value)} placeholder="R,G,B" className="w-32 text-xs" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Marca d'Água</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Toggle label="Ativar marca d'água" value={config.show_watermark} onChange={(v) => update("show_watermark", v)} />
          {config.show_watermark && (
            <>
              <div>
                <Label>Imagem da marca d'água (PNG)</Label>
                <div className="flex items-center gap-3 mt-1">
                  {config.watermark_image_url && (
                    <img src={config.watermark_image_url} alt="Marca d'água" className="h-14 rounded border border-border bg-muted p-1" />
                  )}
                  <Input
                    type="file"
                    accept="image/png"
                    onChange={async (e) => {
                      if (!e.target.files?.[0] || !userId) return;
                      setUploading(true);
                      const file = e.target.files[0];
                      const path = `${userId}/report-watermark-${Date.now()}.png`;
                      const { error } = await supabase.storage.from("technical-report-files").upload(path, file, { upsert: true });
                      if (error) { toast.error("Erro no upload"); setUploading(false); return; }
                      const { data: { publicUrl } } = supabase.storage.from("technical-report-files").getPublicUrl(path);
                      update("watermark_image_url", publicUrl);
                      setUploading(false);
                      toast.success("Marca d'água carregada!");
                    }}
                    disabled={uploading}
                  />
                  {config.watermark_image_url && (
                    <Button variant="ghost" size="sm" onClick={() => update("watermark_image_url", "")}>Remover</Button>
                  )}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Opacidade: {config.watermark_opacity}%</Label>
                <Slider value={[config.watermark_opacity]} onValueChange={([v]) => update("watermark_opacity", v)} min={5} max={50} step={1} />
              </div>
              <div className="relative border border-border rounded-lg h-28 bg-card overflow-hidden flex items-center justify-center">
                <p className="text-xs text-muted-foreground z-10">Pré-visualização</p>
                {config.watermark_image_url && (
                  <img
                    src={config.watermark_image_url}
                    alt="Preview"
                    className="absolute inset-0 m-auto max-h-20 max-w-[60%] object-contain pointer-events-none select-none"
                    style={{ opacity: config.watermark_opacity / 100 }}
                  />
                )}
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
          <Toggle label="Mostrar checklist" value={config.show_checklist} onChange={(v) => update("show_checklist", v)} />
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
