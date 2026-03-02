import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useModule } from "@/contexts/ModuleContext";
import { toast } from "sonner";

export function ProductionPdfConfig() {
  const { session } = useAuth();
  const { tables } = useModule();
  const [config, setConfig] = useState({
    id: "",
    empresa_nome: "Dimension",
    empresa_cnpj: "",
    empresa_contato: "",
    empresa_endereco: "",
    logo_url: "",
    cor_principal: "#1e40af",
    mostrar_cliente: true,
    mostrar_valores: true,
    mostrar_fornecedor: false,
    rodape_texto: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from(tables.productionPdfConfig as any).select("*").eq("created_by", session.user.id).limit(1).single().then(({ data }) => {
      if (data) setConfig(data as any);
      setLoading(false);
    });
  }, [tables, session?.user?.id]);

  const handleSave = async () => {
    const payload = { ...config, updated_by: session?.user.id, created_by: session?.user.id };
    if (config.id) {
      const { error } = await supabase.from(tables.productionPdfConfig as any).update(payload as any).eq("id", config.id);
      if (error) { toast.error("Erro ao salvar"); return; }
    } else {
      const { id, ...rest } = payload;
      const { error } = await supabase.from(tables.productionPdfConfig as any).insert(rest as any);
      if (error) { toast.error("Erro ao criar configuração"); return; }
    }
    toast.success("Configuração salva");
  };

  if (loading) return <p className="text-center text-muted-foreground py-8">Carregando...</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Configuração do PDF</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Nome da Empresa</Label>
            <Input value={config.empresa_nome} onChange={e => setConfig({ ...config, empresa_nome: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">CNPJ</Label>
            <Input value={config.empresa_cnpj} onChange={e => setConfig({ ...config, empresa_cnpj: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Contato</Label>
            <Input value={config.empresa_contato} onChange={e => setConfig({ ...config, empresa_contato: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Endereço</Label>
            <Input value={config.empresa_endereco} onChange={e => setConfig({ ...config, empresa_endereco: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">URL do Logo</Label>
            <Input value={config.logo_url || ""} onChange={e => setConfig({ ...config, logo_url: e.target.value })} placeholder="https://..." />
          </div>
          <div>
            <Label className="text-xs">Cor Principal</Label>
            <div className="flex gap-2">
              <input type="color" value={config.cor_principal} onChange={e => setConfig({ ...config, cor_principal: e.target.value })} className="h-10 w-12 rounded border cursor-pointer" />
              <Input value={config.cor_principal} onChange={e => setConfig({ ...config, cor_principal: e.target.value })} className="flex-1" />
            </div>
          </div>
        </div>

        <div>
          <Label className="text-xs">Texto do Rodapé</Label>
          <Textarea value={config.rodape_texto} onChange={e => setConfig({ ...config, rodape_texto: e.target.value })} rows={2} />
        </div>

        <div className="border-t pt-4 space-y-3">
          <p className="text-xs font-semibold">Opções de Exibição</p>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Mostrar cliente no PDF</Label>
            <Switch checked={config.mostrar_cliente} onCheckedChange={v => setConfig({ ...config, mostrar_cliente: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Mostrar valores (BOM)</Label>
            <Switch checked={config.mostrar_valores} onCheckedChange={v => setConfig({ ...config, mostrar_valores: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Mostrar fornecedor (BOM)</Label>
            <Switch checked={config.mostrar_fornecedor} onCheckedChange={v => setConfig({ ...config, mostrar_fornecedor: v })} />
          </div>
        </div>

        <Button onClick={handleSave}><Save className="h-4 w-4 mr-2" />Salvar Configuração</Button>
      </CardContent>
    </Card>
  );
}
