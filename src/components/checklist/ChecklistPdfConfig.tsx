import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Save, Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PdfSettings {
  logo_url: string;
  company_name: string;
  footer_text: string;
  watermark_text: string;
  watermark_image_url: string;
  watermark_opacity: number;
  primary_color: string;
  show_signature: boolean;
  show_responsible: boolean;
  show_project: boolean;
  show_date: boolean;
  show_notes: boolean;
  subtitle: string;
}

const defaults: PdfSettings = {
  logo_url: "",
  company_name: "",
  footer_text: "",
  watermark_text: "",
  watermark_image_url: "",
  watermark_opacity: 0.1,
  primary_color: "#1a1a2e",
  show_signature: false,
  show_responsible: true,
  show_project: true,
  show_date: true,
  show_notes: true,
  subtitle: "",
};

function ImageUploadField({
  label,
  value,
  onChange,
  userId,
  folder,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  userId: string;
  folder: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem PNG, JPG ou WEBP");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${userId}/${folder}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("checklist-assets")
        .upload(path, file, { upsert: true });
      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("checklist-assets")
        .getPublicUrl(path);

      onChange(urlData.publicUrl);
      toast.success("Imagem enviada!");
    } catch (err: any) {
      toast.error("Erro ao enviar: " + err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {value ? (
        <div className="flex items-center gap-2">
          <img
            src={value}
            alt={label}
            className="h-10 w-auto max-w-[120px] object-contain rounded border border-border bg-muted p-0.5"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onChange("")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              "Enviando..."
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Importar Imagem PNG
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export function ChecklistPdfConfig() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [settings, setSettings] = useState<PdfSettings>(defaults);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userId) loadSettings();
  }, [userId]);

  async function loadSettings() {
    const { data } = await (supabase as any)
      .from("pc_checklist_pdf_settings")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (data) {
      setSettings({
        logo_url: data.logo_url || "",
        company_name: data.company_name || "",
        footer_text: data.footer_text || "",
        watermark_text: data.watermark_text || "",
        watermark_image_url: data.watermark_image_url || "",
        watermark_opacity: data.watermark_opacity ?? 0.1,
        primary_color: data.primary_color || "#1a1a2e",
        show_signature: data.show_signature ?? false,
        show_responsible: data.show_responsible ?? true,
        show_project: data.show_project ?? true,
        show_date: data.show_date ?? true,
        show_notes: data.show_notes ?? true,
        subtitle: data.subtitle || "",
      });
    }
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    try {
      const payload = { user_id: userId, ...settings };
      const { error } = await (supabase as any)
        .from("pc_checklist_pdf_settings")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("Configurações salvas!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  const update = (field: keyof PdfSettings, value: any) =>
    setSettings((p) => ({ ...p, [field]: value }));

  if (!userId) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Configuração de PDF - Checklist</h2>

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <ImageIcon className="h-4 w-4" /> Cabeçalho
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 grid grid-cols-1 md:grid-cols-2 gap-3">
          <ImageUploadField
            label="Logo da Empresa (PNG)"
            value={settings.logo_url}
            onChange={(url) => update("logo_url", url)}
            userId={userId}
            folder="logo"
          />
          <div>
            <Label className="text-xs">Nome da Empresa</Label>
            <Input value={settings.company_name} onChange={(e) => update("company_name", e.target.value)} className="text-xs" />
          </div>
          <div>
            <Label className="text-xs">Subtítulo</Label>
            <Input value={settings.subtitle} onChange={(e) => update("subtitle", e.target.value)} className="text-xs" />
          </div>
          <div>
            <Label className="text-xs">Cor Principal</Label>
            <div className="flex gap-2">
              <Input type="color" value={settings.primary_color} onChange={(e) => update("primary_color", e.target.value)} className="w-12 h-9 p-1" />
              <Input value={settings.primary_color} onChange={(e) => update("primary_color", e.target.value)} className="text-xs flex-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Marca d'Água</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div>
            <Label className="text-xs">Texto (opcional)</Label>
            <Input value={settings.watermark_text} onChange={(e) => update("watermark_text", e.target.value)} className="text-xs" />
          </div>
          <ImageUploadField
            label="Imagem de Marca d'Água (PNG)"
            value={settings.watermark_image_url}
            onChange={(url) => update("watermark_image_url", url)}
            userId={userId}
            folder="watermark"
          />
          <div>
            <Label className="text-xs">Opacidade: {Math.round(settings.watermark_opacity * 100)}%</Label>
            <Slider
              value={[settings.watermark_opacity]}
              onValueChange={([v]) => update("watermark_opacity", v)}
              min={0.01}
              max={0.5}
              step={0.01}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Exibição</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {[
            { key: "show_date" as const, label: "Mostrar Data" },
            { key: "show_responsible" as const, label: "Mostrar Responsável" },
            { key: "show_project" as const, label: "Mostrar Projeto/Cliente" },
            { key: "show_notes" as const, label: "Mostrar Observações" },
            { key: "show_signature" as const, label: "Mostrar Assinatura" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <Label className="text-xs">{item.label}</Label>
              <Switch checked={settings[item.key]} onCheckedChange={(v) => update(item.key, v)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Rodapé</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Label className="text-xs">Texto do Rodapé</Label>
          <Input value={settings.footer_text} onChange={(e) => update("footer_text", e.target.value)} className="text-xs" />
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        <Save className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
}
