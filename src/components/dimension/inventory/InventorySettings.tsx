import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useModule } from "@/contexts/ModuleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Settings, Plus, X, KeyRound, Eye, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";

function PasswordManagement({ table }: { table: "dimension" | "pc" }) {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"idle" | "create" | "change">("idle");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const checkPassword = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("inventory-password", {
        body: { action: "check", table },
      });
      if (error) throw error;
      setHasPassword(data.has_password);
    } catch {
      toast.error("Erro ao verificar senha.");
    }
    setLoading(false);
  };

  useState(() => { checkPassword(); });

  const handleCreate = async () => {
    if (!password || password.length < 4) {
      toast.error("Senha deve ter pelo menos 4 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("inventory-password", {
        body: { action: "set", password, table },
      });
      if (error) throw error;
      if (data.error) { toast.error(data.error); setSubmitting(false); return; }
      toast.success("Senha do estoque criada com sucesso!");
      setHasPassword(true);
      setMode("idle");
      resetFields();
    } catch {
      toast.error("Erro ao criar senha.");
    }
    setSubmitting(false);
  };

  const handleChange = async () => {
    if (!loginPassword) {
      toast.error("Digite sua senha de login.");
      return;
    }
    if (!password || password.length < 4) {
      toast.error("Nova senha deve ter pelo menos 4 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("inventory-password", {
        body: { action: "change", password, login_password: loginPassword, table },
      });
      if (error) throw error;
      if (data.error) { toast.error(data.error); setSubmitting(false); return; }
      toast.success("Senha do estoque alterada com sucesso!");
      setMode("idle");
      resetFields();
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("403") || msg.includes("login")) {
        toast.error("Senha de login incorreta.");
      } else {
        toast.error("Erro ao alterar senha.");
      }
    }
    setSubmitting(false);
  };

  const resetFields = () => {
    setPassword("");
    setConfirmPassword("");
    setLoginPassword("");
    setShowPassword(false);
  };

  if (loading) return <p className="text-xs text-muted-foreground">Verificando...</p>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <KeyRound className="h-4 w-4" />
          Senha do Controle de Estoque
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {mode === "idle" && (
          <>
            {hasPassword ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm text-foreground">Senha cadastrada</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => { resetFields(); setMode("change"); }}>
                  Alterar Senha
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Nenhuma senha cadastrada. Crie uma senha para proteger operações de estoque (entradas, saídas, cadastro e exclusão de itens).
                </p>
                <Button size="sm" onClick={() => { resetFields(); setMode("create"); }}>
                  <KeyRound className="h-4 w-4 mr-1" />
                  Cadastrar Senha
                </Button>
              </div>
            )}
          </>
        )}

        {mode === "create" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nova Senha</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Confirmar Senha</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={submitting}>
                {submitting ? "Criando..." : "Criar Senha"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setMode("idle"); resetFields(); }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {mode === "change" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Senha de Login (para autenticar)</Label>
              <Input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Sua senha de login"
              />
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label className="text-xs">Nova Senha do Estoque</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Confirmar Nova Senha</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                onKeyDown={(e) => e.key === "Enter" && handleChange()}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleChange} disabled={submitting}>
                {submitting ? "Alterando..." : "Alterar Senha"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setMode("idle"); resetFields(); }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function InventorySettings() {
  const { session } = useAuth();
  const { tables } = useModule();
  const qc = useQueryClient();

  const table = tables.inventoryItems.startsWith("pc_") ? "pc" as const : "dimension" as const;

  const { data: settings } = useQuery({
    queryKey: [tables.inventorySettings],
    queryFn: async () => {
      const { data } = await supabase.from(tables.inventorySettings as any).select("*").limit(1).single();
      return data as any;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: any) => {
      if (!settings) return;
      await supabase.from(tables.inventorySettings as any).update({ ...updates, updated_by: session?.user.id }).eq("id", settings.id);
    },
    onSuccess: () => {
      toast.success("Configurações salvas!");
      qc.invalidateQueries({ queryKey: [tables.inventorySettings] });
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: [tables.inventoryCategories],
    queryFn: async () => {
      const { data } = await supabase.from(tables.inventoryCategories as any).select("*").order("sort_order");
      return data || [];
    },
  });

  const [newCat, setNewCat] = useState("");
  const addCategory = useMutation({
    mutationFn: async () => {
      if (!newCat.trim()) return;
      await supabase.from(tables.inventoryCategories as any).insert({ name: newCat.trim() });
    },
    onSuccess: () => {
      toast.success("Categoria criada!");
      qc.invalidateQueries({ queryKey: [tables.inventoryCategories] });
      setNewCat("");
    },
  });

  const { data: units = [] } = useQuery({
    queryKey: [tables.inventoryUnits],
    queryFn: async () => {
      const { data } = await supabase.from(tables.inventoryUnits as any).select("*").order("name");
      return data || [];
    },
  });

  const [newUnit, setNewUnit] = useState({ name: "", abbreviation: "" });
  const addUnit = useMutation({
    mutationFn: async () => {
      if (!newUnit.name.trim() || !newUnit.abbreviation.trim()) return;
      await supabase.from(tables.inventoryUnits as any).insert({ name: newUnit.name.trim(), abbreviation: newUnit.abbreviation.trim() });
    },
    onSuccess: () => {
      toast.success("Unidade criada!");
      qc.invalidateQueries({ queryKey: [tables.inventoryUnits] });
      setNewUnit({ name: "", abbreviation: "" });
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: [tables.inventoryLocations],
    queryFn: async () => {
      const { data } = await supabase.from(tables.inventoryLocations as any).select("*").order("name");
      return data || [];
    },
  });

  const [newLoc, setNewLoc] = useState("");
  const addLocation = useMutation({
    mutationFn: async () => {
      if (!newLoc.trim()) return;
      await supabase.from(tables.inventoryLocations as any).insert({ name: newLoc.trim() });
    },
    onSuccess: () => {
      toast.success("Localização criada!");
      qc.invalidateQueries({ queryKey: [tables.inventoryLocations] });
      setNewLoc("");
    },
  });

  const compatibleOptions: string[] = settings?.compatible_options || [];
  const [newCompat, setNewCompat] = useState("");

  const addCompatible = () => {
    const val = newCompat.trim();
    if (!val || compatibleOptions.includes(val)) return;
    updateSettings.mutate({ compatible_options: [...compatibleOptions, val] });
    setNewCompat("");
  };

  const removeCompatible = (val: string) => {
    updateSettings.mutate({ compatible_options: compatibleOptions.filter((c: string) => c !== val) });
  };

  return (
    <div className="space-y-4">
      <PasswordManagement table={table} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" />Configurações Gerais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Permitir estoque negativo</p>
              <p className="text-xs text-muted-foreground">Permite que saídas gerem saldo negativo</p>
            </div>
            <Switch
              checked={settings?.allow_negative_stock || false}
              onCheckedChange={(v) => updateSettings.mutate({ allow_negative_stock: v })}
            />
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Alerta mínimo global</Label>
              <Input
                type="number"
                defaultValue={settings?.global_min_alert || 5}
                onBlur={(e) => updateSettings.mutate({ global_min_alert: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Período consumo (dias)</Label>
              <Input
                type="number"
                defaultValue={settings?.consumption_period_days || 90}
                onBlur={(e) => updateSettings.mutate({ consumption_period_days: Number(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Compatíveis (Máquinas)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Nome da máquina/modelo"
              value={newCompat}
              onChange={(e) => setNewCompat(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCompatible()}
            />
            <Button size="sm" onClick={addCompatible}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {compatibleOptions.map((c: string) => (
              <Badge key={c} variant="secondary" className="gap-1 pr-1">
                {c}
                <button onClick={() => removeCompatible(c)} className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          {compatibleOptions.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum compatível cadastrado. Adicione acima.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Categorias</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Nome da categoria" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
            <Button size="sm" onClick={() => addCategory.mutate()}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(categories as any[]).map((c) => (
              <span key={c.id} className="px-2 py-1 bg-muted rounded text-xs">{c.name}</span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Unidades de Medida</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Nome" value={newUnit.name} onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })} className="flex-1" />
            <Input placeholder="Abrev." value={newUnit.abbreviation} onChange={(e) => setNewUnit({ ...newUnit, abbreviation: e.target.value })} className="w-20" />
            <Button size="sm" onClick={() => addUnit.mutate()}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(units as any[]).map((u) => (
              <span key={u.id} className="px-2 py-1 bg-muted rounded text-xs">{u.name} ({u.abbreviation})</span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Localizações Físicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Nome do local" value={newLoc} onChange={(e) => setNewLoc(e.target.value)} />
            <Button size="sm" onClick={() => addLocation.mutate()}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(locations as any[]).map((l) => (
              <span key={l.id} className="px-2 py-1 bg-muted rounded text-xs">{l.name}</span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
