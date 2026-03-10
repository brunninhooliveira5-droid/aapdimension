import { useState, useEffect, useRef } from "react";
import { User, Bell, Shield, Eye, EyeOff, Palette, RotateCcw, Save, X, Crop, Upload, QrCode } from "lucide-react";
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
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [signatureSize, setSignatureSize] = useState(35);
  const [signatureOffsetX, setSignatureOffsetX] = useState(0);
  const [signatureOffsetY, setSignatureOffsetY] = useState(0);
  const [signatureZoom, setSignatureZoom] = useState(100);
  const [signatureDarkness, setSignatureDarkness] = useState(100);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const pixQrInputRef = useRef<HTMLInputElement>(null);
  const [pixQrImageUrl, setPixQrImageUrl] = useState<string | null>(null);
  const [uploadingPixQr, setUploadingPixQr] = useState(false);

  // Load signature on mount
  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from("profiles").select("signature_url, signature_size, signature_offset_x, signature_offset_y, signature_zoom, signature_darkness, pix_qr_image_url").eq("id", session.user.id).single()
      .then(({ data }) => {
        if (data?.signature_url) setSignatureUrl(data.signature_url);
        if ((data as any)?.pix_qr_image_url) setPixQrImageUrl((data as any).pix_qr_image_url);
        if ((data as any)?.signature_size) setSignatureSize((data as any).signature_size);
        if ((data as any)?.signature_offset_x != null) setSignatureOffsetX((data as any).signature_offset_x);
        if ((data as any)?.signature_offset_y != null) setSignatureOffsetY((data as any).signature_offset_y);
        if ((data as any)?.signature_zoom != null) setSignatureZoom((data as any).signature_zoom);
        if ((data as any)?.signature_darkness != null) setSignatureDarkness((data as any).signature_darkness);
      });
  }, [session?.user?.id]);

  const trimSignatureCanvas = (img: HTMLImageElement, padding = 10): Blob | null => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = imageData;

    let top = height, left = width, bottom = 0, right = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        // Consider pixel non-empty if not transparent AND not white-ish
        if (a > 20 && (r < 240 || g < 240 || b < 240)) {
          if (y < top) top = y;
          if (y > bottom) bottom = y;
          if (x < left) left = x;
          if (x > right) right = x;
        }
      }
    }

    if (bottom <= top || right <= left) return null;

    // Add padding
    top = Math.max(0, top - padding);
    left = Math.max(0, left - padding);
    bottom = Math.min(height - 1, bottom + padding);
    right = Math.min(width - 1, right + padding);

    const cropW = right - left + 1;
    const cropH = bottom - top + 1;
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const cropCtx = cropCanvas.getContext("2d");
    if (!cropCtx) return null;
    cropCtx.drawImage(canvas, left, top, cropW, cropH, 0, 0, cropW, cropH);

    let blob: Blob | null = null;
    cropCanvas.toBlob((b) => { blob = b; }, "image/png");
    return blob;
  };

  const trimAndUpload = async (file: Blob, userId: string): Promise<string> => {
    const path = `${userId}/signature-${Date.now()}.png`;
    const { error: upErr } = await supabase.storage.from("user-signatures").upload(path, file, { upsert: true, contentType: "image/png" });
    if (upErr) throw upErr;
    const { data: { publicUrl } } = supabase.storage.from("user-signatures").getPublicUrl(path);
    await supabase.from("profiles").update({ signature_url: publicUrl } as any).eq("id", userId);
    return publicUrl;
  };

  const loadImageEl = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const cropSignatureFromBlob = async (file: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const { data, width, height } = imageData;
        const padding = 10;

        let top = height, left = width, bottom = 0, right = 0;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            if (a > 20 && (r < 240 || g < 240 || b < 240)) {
              if (y < top) top = y;
              if (y > bottom) bottom = y;
              if (x < left) left = x;
              if (x > right) right = x;
            }
          }
        }

        URL.revokeObjectURL(url);

        if (bottom <= top || right <= left) { resolve(file); return; }

        top = Math.max(0, top - padding);
        left = Math.max(0, left - padding);
        bottom = Math.min(height - 1, bottom + padding);
        right = Math.min(width - 1, right + padding);

        const cropW = right - left + 1;
        const cropH = bottom - top + 1;
        const cropCanvas = document.createElement("canvas");
        cropCanvas.width = cropW;
        cropCanvas.height = cropH;
        const cropCtx = cropCanvas.getContext("2d")!;
        cropCtx.drawImage(canvas, left, top, cropW, cropH, 0, 0, cropW, cropH);

        cropCanvas.toBlob((b) => {
          resolve(b || file);
        }, "image/png");
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user?.id) return;
    if (!file.type.includes("png")) { toast.error("Apenas arquivos PNG são aceitos"); return; }
    setUploadingSignature(true);
    try {
      const cropped = await cropSignatureFromBlob(file);
      const publicUrl = await trimAndUpload(cropped, session.user.id);
      setSignatureUrl(publicUrl);
      toast.success("Assinatura salva e recortada automaticamente!");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
    setUploadingSignature(false);
    if (signatureInputRef.current) signatureInputRef.current.value = "";
  };

  const handleRecropSignature = async () => {
    if (!signatureUrl || !session?.user?.id) return;
    setUploadingSignature(true);
    try {
      const img = await loadImageEl(signatureUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Failed")), "image/png");
      });
      const cropped = await cropSignatureFromBlob(blob);
      const publicUrl = await trimAndUpload(cropped, session.user.id);
      setSignatureUrl(publicUrl + "?t=" + Date.now()); // bust cache
      toast.success("Assinatura recortada com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao recortar: " + err.message);
    }
    setUploadingSignature(false);
  };

  const handleRemoveSignature = async () => {
    if (!session?.user?.id) return;
    await supabase.from("profiles").update({ signature_url: null } as any).eq("id", session.user.id);
    setSignatureUrl(null);
    toast.success("Assinatura removida");
  };

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

        {/* Assinatura Digital */}
        <div className="border-t border-border pt-4 space-y-3">
          <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Assinatura Digital</Label>
          <p className="text-xs text-muted-foreground">Envie uma imagem PNG da sua assinatura (preferencialmente com fundo transparente). Ela será inserida automaticamente nos PDFs que você gerar.</p>
          {signatureUrl && (
            <div className="relative inline-block border border-border rounded-lg p-2 bg-white">
              <img src={signatureUrl} alt="Assinatura" style={{ height: `${signatureSize * 3}px` }} className="object-contain" />
              <button
                onClick={handleRemoveSignature}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => signatureInputRef.current?.click()} disabled={uploadingSignature}>
              {uploadingSignature ? "Enviando..." : signatureUrl ? "Trocar Assinatura" : "Enviar Assinatura"}
            </Button>
            {signatureUrl && (
              <Button variant="outline" size="sm" onClick={handleRecropSignature} disabled={uploadingSignature} className="gap-1">
                <Crop className="h-3 w-3" /> Recortar
              </Button>
            )}
            <input
              ref={signatureInputRef}
              type="file"
              accept="image/png"
              onChange={handleSignatureUpload}
              className="hidden"
            />
          </div>

          {/* Configurações da assinatura no PDF */}
          <div className="space-y-4 pt-2 border-t border-border mt-3">
            <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Configuração da Assinatura no PDF</Label>
            
            {/* Preview simulando área de assinatura do PDF */}
            {signatureUrl && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Preview (simulação no PDF)</Label>
                <div className="border-2 border-dashed border-border rounded-lg bg-white relative" style={{ width: '100%', maxWidth: 300, height: 120 }}>
                  {/* Linha de referência da assinatura (simula a linha do PDF) */}
                  <div className="absolute left-3 right-3 border-t-2 border-gray-800" style={{ bottom: 28 }} />
                  <span className="absolute left-3 text-[7px] text-muted-foreground/60 select-none font-medium" style={{ bottom: 16 }}>Técnico Responsável</span>
                  <span className="absolute right-3 text-[7px] text-muted-foreground/40 select-none" style={{ bottom: 16 }}>Data: __/__/____</span>
                  
                  {/* Área da assinatura acima da linha */}
                  <div className="absolute left-0 right-0 top-0 overflow-hidden flex items-end justify-center" style={{ bottom: 30 }}>
                    <img
                      src={signatureUrl}
                      alt="Preview"
                      style={{
                        maxHeight: `${(signatureSize / 35) * 100}%`,
                        maxWidth: '90%',
                        objectFit: 'contain',
                        transform: `scale(${signatureZoom / 100}) translate(${signatureOffsetX * 0.5}px, ${signatureOffsetY * 0.5}px)`,
                        transformOrigin: 'center bottom',
                        transition: 'transform 0.15s ease, max-height 0.15s ease, filter 0.15s ease',
                        filter: `contrast(${signatureDarkness / 100}) brightness(${Math.min(1, 200 / signatureDarkness)})`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Zoom */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Zoom: <span className="text-foreground font-medium">{signatureZoom}%</span></Label>
              <input type="range" min={50} max={200} step={5} value={signatureZoom}
                onChange={async (e) => {
                  const val = Number(e.target.value);
                  setSignatureZoom(val);
                  if (session?.user?.id) await supabase.from("profiles").update({ signature_zoom: val } as any).eq("id", session.user.id);
                }}
                className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-muted-foreground"><span>50%</span><span>200%</span></div>
            </div>

            {/* Posição X */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Posição Horizontal: <span className="text-foreground font-medium">{signatureOffsetX}px</span></Label>
              <input type="range" min={-50} max={50} step={1} value={signatureOffsetX}
                onChange={async (e) => {
                  const val = Number(e.target.value);
                  setSignatureOffsetX(val);
                  if (session?.user?.id) await supabase.from("profiles").update({ signature_offset_x: val } as any).eq("id", session.user.id);
                }}
                className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-muted-foreground"><span>← Esquerda</span><span>Direita →</span></div>
            </div>

            {/* Posição Y */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Posição Vertical: <span className="text-foreground font-medium">{signatureOffsetY}px</span></Label>
              <input type="range" min={-30} max={30} step={1} value={signatureOffsetY}
                onChange={async (e) => {
                  const val = Number(e.target.value);
                  setSignatureOffsetY(val);
                  if (session?.user?.id) await supabase.from("profiles").update({ signature_offset_y: val } as any).eq("id", session.user.id);
                }}
                className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-muted-foreground"><span>↑ Cima</span><span>Baixo ↓</span></div>
            </div>

            {/* Intensidade da Cor */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Intensidade da Cor: <span className="text-foreground font-medium">{signatureDarkness}%</span></Label>
              <input type="range" min={50} max={200} step={5} value={signatureDarkness}
                onChange={async (e) => {
                  const val = Number(e.target.value);
                  setSignatureDarkness(val);
                  if (session?.user?.id) await supabase.from("profiles").update({ signature_darkness: val } as any).eq("id", session.user.id);
                }}
                className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-muted-foreground"><span>50% Clara</span><span>200% Forte</span></div>
            </div>
          </div>
        </div>

        {/* QR Code PIX */}
        <div className="border-t border-border pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary" />
            <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">QR Code PIX</Label>
          </div>
          <p className="text-xs text-muted-foreground">Envie a imagem do seu QR Code PIX. Ela será usada nos PDFs de comprovante de pagamento e orçamento de corte.</p>
          {pixQrImageUrl && (
            <div className="relative inline-block border border-border rounded-lg p-2 bg-white">
              <img src={pixQrImageUrl} alt="QR Code PIX" className="h-28 w-28 object-contain" />
              <button
                onClick={async () => {
                  if (!session?.user?.id) return;
                  await supabase.from("profiles").update({ pix_qr_image_url: "" } as any).eq("id", session.user.id);
                  setPixQrImageUrl(null);
                  toast.success("QR Code removido");
                }}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => pixQrInputRef.current?.click()} disabled={uploadingPixQr} className="gap-1">
              <Upload className="h-3 w-3" /> {uploadingPixQr ? "Enviando..." : pixQrImageUrl ? "Trocar QR Code" : "Enviar QR Code"}
            </Button>
            <input
              ref={pixQrInputRef}
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !session?.user?.id) return;
                if (file.size > 2 * 1024 * 1024) { toast.error("Imagem deve ter no máximo 2MB."); return; }
                setUploadingPixQr(true);
                const ext = file.name.split(".").pop();
                const path = `${session.user.id}/pix-qr.${ext}`;
                const { error } = await supabase.storage.from("user-signatures").upload(path, file, { upsert: true });
                if (error) { toast.error("Erro ao enviar QR Code."); console.error(error); }
                else {
                  const { data } = supabase.storage.from("user-signatures").getPublicUrl(path);
                  await supabase.from("profiles").update({ pix_qr_image_url: data.publicUrl } as any).eq("id", session.user.id);
                  setPixQrImageUrl(data.publicUrl);
                  toast.success("QR Code PIX salvo!");
                }
                setUploadingPixQr(false);
                if (pixQrInputRef.current) pixQrInputRef.current.value = "";
              }}
              className="hidden"
            />
          </div>
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
