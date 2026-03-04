import { useState, useEffect } from "react";
import { User, Bell, Shield, Eye, EyeOff, Palette, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth, roleLabels } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { hexToHsl, applyCustomBg, hexLuminance } from "@/components/ThemeToggle";
import { useUserAppearance } from "@/hooks/useUserAppearance";

const presetColors = [
  { name: "Padrão", value: "" },
  { name: "Azul Marinho", value: "#0a1628" },
  { name: "Grafite", value: "#1a1a2e" },
  { name: "Carvão", value: "#1e1e1e" },
  { name: "Verde Escuro", value: "#0a1f1a" },
  { name: "Roxo Escuro", value: "#1a0a2e" },
  { name: "Marrom", value: "#1e140a" },
  { name: "Azul Petróleo", value: "#0a2028" },
  { name: "Vinho", value: "#2a0a14" },
  { name: "Cinza Quente", value: "#2a2520" },
];

const SettingsPage = () => {
  const { user, session } = useAuth();
  const { saveAppearance } = useUserAppearance(session?.user?.id ?? null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const [customBg, setCustomBg] = useState(() => localStorage.getItem("custom-bg-color") || "");
  const [customSidebar, setCustomSidebar] = useState(() => localStorage.getItem("custom-sidebar-color") || "");
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    (localStorage.getItem("theme") as "dark" | "light") || "dark"
  );

  const applyBgColor = (hex: string) => {
    setCustomBg(hex);
    if (hex) {
      localStorage.setItem("custom-bg-color", hex);
    } else {
      localStorage.removeItem("custom-bg-color");
    }
    applyCustomBg();
    saveAppearance();
  };

  const applySidebarColor = (hex: string) => {
    setCustomSidebar(hex);
    if (hex) {
      localStorage.setItem("custom-sidebar-color", hex);
    } else {
      localStorage.removeItem("custom-sidebar-color");
    }
    applyCustomBg();
    saveAppearance();
  };

  const [customCard, setCustomCard] = useState(() => localStorage.getItem("custom-card-color") || "");

  const applyCardColor = (hex: string) => {
    setCustomCard(hex);
    if (hex) {
      localStorage.setItem("custom-card-color", hex);
    } else {
      localStorage.removeItem("custom-card-color");
    }
    applyCustomBg();
    saveAppearance();
  };

  const [customFg, setCustomFg] = useState(() => localStorage.getItem("custom-fg-color") || "");

  const applyFgColor = (hex: string) => {
    setCustomFg(hex);
    if (hex) {
      localStorage.setItem("custom-fg-color", hex);
    } else {
      localStorage.removeItem("custom-fg-color");
    }
    applyCustomBg();
    saveAppearance();
  };

  const textFxOptions = [
    { label: "Nenhum", value: "" },
    { label: "Sombra Sutil", value: "text-fx-shadow-subtle" },
    { label: "Sombra Média", value: "text-fx-shadow-medium" },
    { label: "Sombra Forte", value: "text-fx-shadow-strong" },
    { label: "Neon", value: "text-fx-neon" },
  ];
  const textWeightOptions = [
    { label: "Padrão", value: "" },
    { label: "Leve", value: "text-wt-light" },
    { label: "Normal", value: "text-wt-normal" },
    { label: "Médio", value: "text-wt-medium" },
    { label: "Negrito", value: "text-wt-bold" },
    { label: "Extra Negrito", value: "text-wt-extrabold" },
  ];
  const textSizeOptions = [
    { label: "Padrão", value: "" },
    { label: "Menor", value: "text-sz-smaller" },
    { label: "Maior", value: "text-sz-larger" },
  ];
  const textSpacingOptions = [
    { label: "Padrão", value: "" },
    { label: "Apertado", value: "text-sp-tight" },
    { label: "Normal", value: "text-sp-normal" },
    { label: "Largo", value: "text-sp-wide" },
  ];

  const [textFx, setTextFx] = useState(() => localStorage.getItem("text-fx") || "");
  const [textWeight, setTextWeight] = useState(() => localStorage.getItem("text-wt") || "");
  const [textSize, setTextSize] = useState(() => localStorage.getItem("text-sz") || "");
  const [textSpacing, setTextSpacing] = useState(() => localStorage.getItem("text-sp") || "");
  const [textShadowColor, setTextShadowColor] = useState(() => localStorage.getItem("custom-text-shadow-color") || "");
  const [autoContrast, setAutoContrast] = useState(() => localStorage.getItem("auto-contrast") === "true");

  const toggleAutoContrast = () => {
    const next = !autoContrast;
    setAutoContrast(next);
    if (next) {
      localStorage.setItem("auto-contrast", "true");
    } else {
      localStorage.removeItem("auto-contrast");
    }
    applyCustomBg();
    saveAppearance();
  };

  const applyTextShadowColor = (hex: string) => {
    setTextShadowColor(hex);
    if (hex && /^#[0-9a-fA-F]{6}$/.test(hex)) {
      document.documentElement.style.setProperty("--text-fx-shadow-color", hexToHsl(hex));
      localStorage.setItem("custom-text-shadow-color", hex);
    } else if (!hex) {
      document.documentElement.style.removeProperty("--text-fx-shadow-color");
      localStorage.removeItem("custom-text-shadow-color");
    }
    saveAppearance();
  };

  const applyTextOption = (options: { label: string; value: string }[], val: string, key: string, setter: (v: string) => void) => {
    setter(val);
    const root = document.documentElement;
    options.forEach(o => { if (o.value) root.classList.remove(o.value); });
    if (val) { root.classList.add(val); localStorage.setItem(key, val); }
    else localStorage.removeItem(key);
    saveAppearance();
  };

  const cardFxOptions = [
    { label: "Nenhum", value: "" },
    { label: "Sutil", value: "card-fx-subtle" },
    { label: "Médio", value: "card-fx-medium" },
    { label: "Forte", value: "card-fx-strong" },
    { label: "Brilho", value: "card-fx-glow" },
  ];
  const [cardFx, setCardFx] = useState(() => localStorage.getItem("card-fx") || "");
  const [card3d, setCard3d] = useState(() => localStorage.getItem("card-3d") === "true");

  const applyCardFx = (val: string) => {
    setCardFx(val);
    const root = document.documentElement;
    cardFxOptions.forEach(o => { if (o.value) root.classList.remove(o.value); });
    if (val) root.classList.add(val);
    if (val) localStorage.setItem("card-fx", val);
    else localStorage.removeItem("card-fx");
    saveAppearance();
  };

  const toggleCard3d = () => {
    const next = !card3d;
    setCard3d(next);
    if (next) {
      document.documentElement.classList.add("card-fx-3d");
      localStorage.setItem("card-3d", "true");
    } else {
      document.documentElement.classList.remove("card-fx-3d");
      localStorage.removeItem("card-3d");
    }
    saveAppearance();
  };

  const [cardFxColor, setCardFxColor] = useState(() => localStorage.getItem("custom-card-fx-color") || "");

  const applyCardFxColor = (hex: string) => {
    setCardFxColor(hex);
    if (hex) {
      localStorage.setItem("custom-card-fx-color", hex);
    } else {
      localStorage.removeItem("custom-card-fx-color");
    }
    applyCustomBg();
    saveAppearance();
  };

  // Apply saved effects on mount
  useEffect(() => {
    const root = document.documentElement;
    const saved = localStorage.getItem("card-fx");
    if (saved) root.classList.add(saved);
    if (localStorage.getItem("card-3d") === "true") root.classList.add("card-fx-3d");
    // Text effects
    ["text-fx", "text-wt", "text-sz", "text-sp"].forEach(key => {
      const v = localStorage.getItem(key);
      if (v) root.classList.add(v);
    });
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    const root = document.documentElement;
    if (next === "light") root.classList.add("light");
    else root.classList.remove("light");
    localStorage.setItem("theme", next);
    applyCustomBg();
    saveAppearance();
  };

  // Sync if localStorage changes externally
  useEffect(() => { applyCustomBg(); }, []);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Preencha todos os campos.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setSaving(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? "",
      password: currentPassword,
    });

    if (signInError) {
      toast.error("Senha atual incorreta.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error("Erro ao alterar senha: " + error.message);
      setSaving(false);
      return;
    }

    toast.success("Senha alterada com sucesso!");
    setShowPasswordForm(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie sua conta e preferências</p>
      </div>

      {/* Appearance */}
      <div className="gradient-card rounded-lg border border-border p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Palette className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Aparência</h3>
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-sm text-foreground">Modo {theme === "dark" ? "Escuro" : "Claro"}</Label>
          <Switch checked={theme === "light"} onCheckedChange={toggleTheme} />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Cor de fundo</Label>
          <div className="flex flex-wrap gap-2">
            {presetColors.map((c) => (
              <button
                key={c.name}
                title={c.name}
                onClick={() => applyBgColor(c.value)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  customBg === c.value
                    ? "border-primary ring-2 ring-primary/40 scale-110"
                    : "border-border hover:border-muted-foreground"
                }`}
                style={{
                  background: c.value
                    ? c.value
                    : "linear-gradient(135deg, hsl(220 20% 10%), hsl(210 20% 96%))",
                }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Label className="text-xs text-muted-foreground shrink-0">Cor personalizada</Label>
          <input
            type="color"
            value={customBg || "#191d2b"}
            onChange={(e) => applyBgColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent"
          />
          <Input
            value={customBg}
            onChange={(e) => {
              const v = e.target.value;
              if (/^#[0-9a-fA-F]{6}$/.test(v)) applyBgColor(v);
              setCustomBg(v);
            }}
            placeholder="#1a1a2e"
            className="bg-accent border-border w-28 font-mono text-xs"
          />
          {customBg && (
            <Button variant="ghost" size="sm" onClick={() => applyBgColor("")} className="text-xs gap-1">
              <RotateCcw className="w-3 h-3" /> Padrão
            </Button>
          )}
        </div>
        <div className="border-t border-border pt-4 space-y-2">
          <Label className="text-xs text-muted-foreground">Cor da barra lateral</Label>
          <div className="flex flex-wrap gap-2">
            {presetColors.map((c) => (
              <button
                key={c.name}
                title={c.name}
                onClick={() => applySidebarColor(c.value)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  customSidebar === c.value
                    ? "border-primary ring-2 ring-primary/40 scale-110"
                    : "border-border hover:border-muted-foreground"
                }`}
                style={{
                  background: c.value
                    ? c.value
                    : "linear-gradient(135deg, hsl(220 22% 8%), hsl(210 15% 97%))",
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground shrink-0">Cor personalizada</Label>
            <input
              type="color"
              value={customSidebar || "#101420"}
              onChange={(e) => applySidebarColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent"
            />
            <Input
              value={customSidebar}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{6}$/.test(v)) applySidebarColor(v);
                setCustomSidebar(v);
              }}
              placeholder="#101420"
              className="bg-accent border-border w-28 font-mono text-xs"
            />
            {customSidebar && (
              <Button variant="ghost" size="sm" onClick={() => applySidebarColor("")} className="text-xs gap-1">
                <RotateCcw className="w-3 h-3" /> Padrão
              </Button>
            )}
          </div>
        </div>
        <div className="border-t border-border pt-4 space-y-2">
          <Label className="text-xs text-muted-foreground">Cor dos cards</Label>
          <div className="flex flex-wrap gap-2">
            {presetColors.map((c) => (
              <button
                key={c.name}
                title={c.name}
                onClick={() => applyCardColor(c.value)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  customCard === c.value
                    ? "border-primary ring-2 ring-primary/40 scale-110"
                    : "border-border hover:border-muted-foreground"
                }`}
                style={{
                  background: c.value
                    ? c.value
                    : "linear-gradient(135deg, hsl(220 18% 13%), hsl(0 0% 100%))",
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground shrink-0">Cor personalizada</Label>
            <input
              type="color"
              value={customCard || "#1e2235"}
              onChange={(e) => applyCardColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent"
            />
            <Input
              value={customCard}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{6}$/.test(v)) applyCardColor(v);
                setCustomCard(v);
              }}
              placeholder="#1e2235"
              className="bg-accent border-border w-28 font-mono text-xs"
            />
            {customCard && (
              <Button variant="ghost" size="sm" onClick={() => applyCardColor("")} className="text-xs gap-1">
                <RotateCcw className="w-3 h-3" /> Padrão
              </Button>
            )}
          </div>
        </div>
        <div className="border-t border-border pt-4 space-y-2">
          <Label className="text-xs text-muted-foreground">Cor das letras</Label>
          <div className="flex flex-wrap gap-2">
            {[
              { name: "Padrão", value: "" },
              { name: "Branco", value: "#ffffff" },
              { name: "Cinza Claro", value: "#d4d4d8" },
              { name: "Cinza", value: "#a1a1aa" },
              { name: "Âmbar", value: "#fbbf24" },
              { name: "Verde Claro", value: "#86efac" },
              { name: "Azul Claro", value: "#93c5fd" },
              { name: "Rosa", value: "#f9a8d4" },
              { name: "Preto", value: "#1a1a1a" },
            ].map((c) => (
              <button
                key={c.name}
                title={c.name}
                onClick={() => applyFgColor(c.value)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  customFg === c.value
                    ? "border-primary ring-2 ring-primary/40 scale-110"
                    : "border-border hover:border-muted-foreground"
                }`}
                style={{
                  background: c.value
                    ? c.value
                    : "linear-gradient(135deg, hsl(210 20% 90%), hsl(220 20% 14%))",
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground shrink-0">Cor personalizada</Label>
            <input
              type="color"
              value={customFg || "#e4e4e7"}
              onChange={(e) => applyFgColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent"
            />
            <Input
              value={customFg}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{6}$/.test(v)) applyFgColor(v);
                setCustomFg(v);
              }}
              placeholder="#e4e4e7"
              className="bg-accent border-border w-28 font-mono text-xs"
            />
            {customFg && (
              <Button variant="ghost" size="sm" onClick={() => applyFgColor("")} className="text-xs gap-1">
                <RotateCcw className="w-3 h-3" /> Padrão
              </Button>
            )}
          </div>
        </div>
        <div className="border-t border-border pt-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm text-foreground">Ajustar contraste automaticamente</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Garante texto legível independente da cor do card</p>
            </div>
            <Switch checked={autoContrast} onCheckedChange={toggleAutoContrast} />
          </div>
        </div>
        <div className="border-t border-border pt-4 space-y-2">
          <Label className="text-xs text-muted-foreground">Efeito dos cards</Label>
          <div className="flex flex-wrap gap-2">
            {cardFxOptions.map((o) => (
              <button
                key={o.label}
                onClick={() => applyCardFx(o.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                  cardFx === o.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between pt-1">
            <Label className="text-sm text-foreground">Efeito 3D</Label>
            <Switch checked={card3d} onCheckedChange={toggleCard3d} />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Label className="text-xs text-muted-foreground shrink-0">Cor do efeito</Label>
            <input
              type="color"
              value={cardFxColor || "#3b82f6"}
              onChange={(e) => applyCardFxColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent"
            />
            <Input
              value={cardFxColor}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{6}$/.test(v)) applyCardFxColor(v);
                setCardFxColor(v);
              }}
              placeholder="#3b82f6"
              className="bg-accent border-border w-28 font-mono text-xs"
            />
            {cardFxColor && (
              <Button variant="ghost" size="sm" onClick={() => applyCardFxColor("")} className="text-xs gap-1">
                <RotateCcw className="w-3 h-3" /> Padrão
              </Button>
            )}
          </div>
        </div>
        <div className="border-t border-border pt-4 space-y-3">
          <Label className="text-xs text-muted-foreground">Efeito das letras</Label>
          <div className="flex flex-wrap gap-2">
            {textFxOptions.map((o) => (
              <button
                key={o.label}
                onClick={() => applyTextOption(textFxOptions, o.value, "text-fx", setTextFx)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                  textFx === o.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Label className="text-xs text-muted-foreground shrink-0">Cor da sombra</Label>
            <input
              type="color"
              value={textShadowColor || "#000000"}
              onChange={(e) => applyTextShadowColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent"
            />
            <Input
              value={textShadowColor}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{6}$/.test(v)) applyTextShadowColor(v);
                setTextShadowColor(v);
              }}
              placeholder="#000000"
              className="bg-accent border-border w-28 font-mono text-xs"
            />
            {textShadowColor && (
              <Button variant="ghost" size="sm" onClick={() => applyTextShadowColor("")} className="text-xs gap-1">
                <RotateCcw className="w-3 h-3" /> Padrão
              </Button>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Peso da fonte</Label>
            <div className="flex flex-wrap gap-2">
              {textWeightOptions.map((o) => (
                <button
                  key={o.label}
                  onClick={() => applyTextOption(textWeightOptions, o.value, "text-wt", setTextWeight)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                    textWeight === o.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tamanho base</Label>
            <div className="flex flex-wrap gap-2">
              {textSizeOptions.map((o) => (
                <button
                  key={o.label}
                  onClick={() => applyTextOption(textSizeOptions, o.value, "text-sz", setTextSize)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                    textSize === o.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Espaçamento</Label>
            <div className="flex flex-wrap gap-2">
              {textSpacingOptions.map((o) => (
                <button
                  key={o.label}
                  onClick={() => applyTextOption(textSpacingOptions, o.value, "text-sp", setTextSpacing)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                    textSpacing === o.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-border pt-4 flex justify-end">
          <Button
            onClick={async () => {
              await saveAppearance();
              toast.success("Aparência salva com sucesso!");
            }}
            className="gap-2"
          >
            <Save className="w-4 h-4" /> Salvar Aparência
          </Button>
        </div>
      </div>
      <div className="gradient-card rounded-lg border border-border p-5 space-y-4">
        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Perfil</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-muted-foreground text-xs">Nome</p><p className="text-foreground font-medium">{user?.name ?? "—"}</p></div>
          <div><p className="text-muted-foreground text-xs">E-mail</p><p className="text-foreground font-medium">{user?.email ?? "—"}</p></div>
          <div><p className="text-muted-foreground text-xs">Perfil</p><p className="text-foreground font-medium">{user ? roleLabels[user.role] : "—"}</p></div>
          <div><p className="text-muted-foreground text-xs">Empresa</p><p className="text-foreground font-medium">{user?.company || "—"}</p></div>
        </div>
      </div>

      {/* Notifications */}
      <div className="gradient-card rounded-lg border border-border p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Notificações</h3>
        </div>
        <div className="space-y-3">
          {["Alertas de manutenção", "Vencimento de faturas", "Atualizações de chamados"].map(label => (
            <div key={label} className="flex items-center justify-between">
              <Label className="text-sm text-foreground">{label}</Label>
              <Switch defaultChecked />
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="gradient-card rounded-lg border border-border p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Segurança</h3>
        </div>
        {!showPasswordForm ? (
          <Button variant="outline" className="border-border text-foreground" onClick={() => setShowPasswordForm(true)}>
            Alterar Senha
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-foreground text-xs">Senha Atual</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="bg-accent border-border pr-10"
                  placeholder="Digite sua senha atual"
                />
                <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowCurrent(!showCurrent)}>
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground text-xs">Nova Senha</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="bg-accent border-border pr-10"
                  placeholder="Mínimo 6 caracteres"
                />
                <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowNew(!showNew)}>
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground text-xs">Confirmar Nova Senha</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="bg-accent border-border"
                placeholder="Repita a nova senha"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleChangePassword} disabled={saving} size="sm">
                {saving ? "Salvando..." : "Salvar"}
              </Button>
              <Button variant="outline" size="sm" className="border-border" onClick={() => { setShowPasswordForm(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
