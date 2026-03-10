import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";

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
  });
  const [hasSignature, setHasSignature] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    // Load config
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
        });
      }
    });
    // Check signature
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
    const { error } = await supabase.from("work_diary_pdf_config").upsert({ ...config, user_id: userId }, { onConflict: "user_id" });
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
              {config.logo_url && <img src={config.logo_url} alt="Logo" className="h-10 rounded border border-border" />}
              <Input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
              {config.logo_url && <Button variant="ghost" size="sm" onClick={() => update("logo_url", "")}>Remover</Button>}
            </div>
          </div>
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
