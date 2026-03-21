import { useState, useRef, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Share2, Facebook, Twitter, Linkedin, Link2, Check, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

const NARRATION_TEXT = `A Dimension é mais do que uma fabricante de máquinas CNC. Somos seu parceiro na produção diária. Com o nosso sistema, você acompanha a frota de máquinas em tempo real, abre chamados de suporte com apenas um toque e acessa ferramentas digitais poderosas como Plano de Corte, Slicer 3D e Mapeamento Z. Tudo integrado em uma plataforma pensada para facilitar sua rotina e aumentar a produtividade. Dimension. Seu parceiro na produção.`;

export default function AppShowcasePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const narrationRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [linkCopied, setLinkCopied] = useState(false);
  const [narrationState, setNarrationState] = useState<"idle" | "loading" | "ready" | "playing" | "error">("idle");
  const [narrationUrl, setNarrationUrl] = useState<string | null>(null);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      narrationRef.current?.pause();
    } else {
      videoRef.current.play();
      if (narrationRef.current && narrationState === "playing") {
        narrationRef.current.play();
      }
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    if (narrationRef.current) {
      narrationRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setProgress(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleSeek = (value: number[]) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = value[0];
    setProgress(value[0]);
    if (narrationRef.current) {
      narrationRef.current.currentTime = value[0];
    }
  };

  const handleFullscreen = () => {
    videoRef.current?.requestFullscreen();
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const generateNarration = useCallback(async () => {
    if (narrationState === "loading") return;

    if (narrationUrl && narrationRef.current) {
      // Already generated — toggle play
      if (narrationState === "playing") {
        narrationRef.current.pause();
        setNarrationState("ready");
      } else {
        narrationRef.current.currentTime = videoRef.current?.currentTime ?? 0;
        narrationRef.current.play();
        setNarrationState("playing");
      }
      return;
    }

    setNarrationState("loading");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: NARRATION_TEXT }),
        }
      );

      if (!response.ok) {
        throw new Error(`Erro ao gerar narração: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setNarrationUrl(url);

      const audio = new Audio(url);
      narrationRef.current = audio;
      audio.currentTime = videoRef.current?.currentTime ?? 0;
      audio.muted = isMuted;
      await audio.play();

      // If video is not playing, start it too
      if (!isPlaying && videoRef.current) {
        videoRef.current.play();
        setIsPlaying(true);
      }

      setNarrationState("playing");
      toast.success("Narração ativada!");

      audio.addEventListener("ended", () => {
        setNarrationState("ready");
      });
    } catch (err) {
      console.error("TTS error:", err);
      setNarrationState("error");
      toast.error("Não foi possível gerar a narração. Tente novamente.");
    }
  }, [narrationState, narrationUrl, isMuted, isPlaying]);

  const shareUrl = typeof window !== "undefined" ? window.location.origin : "";

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const shareLinks = [
    {
      label: "Facebook",
      icon: Facebook,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
    {
      label: "Twitter / X",
      icon: Twitter,
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("Conheça o AAP Dimension!")}`,
    },
    {
      label: "LinkedIn",
      icon: Linkedin,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    },
  ];

  const features = [
    { title: "Orçamento de Corte", desc: "Geração automática de orçamentos com cálculo preciso de tempo e custo." },
    { title: "Plano de Corte", desc: "Otimização inteligente de material com aproveitamento máximo de chapas." },
    { title: "Controle de Produção", desc: "Kanban, tarefas e metas para gestão visual da sua produção." },
    { title: "Gestão Financeira", desc: "Fluxo de caixa, contas a pagar/receber e relatórios completos." },
  ];

  const narrationLabel =
    narrationState === "loading" ? "Gerando narração…" :
    narrationState === "playing" ? "Pausar narração" :
    narrationUrl ? "Retomar narração" :
    "Narrar apresentação";

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero */}
      <section className="text-center space-y-3">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
          AAP Dimension
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Plataforma completa de gestão para indústria CNC — do orçamento à
          entrega, tudo em um só lugar.
        </p>
      </section>

      {/* Video Player */}
      <Card className="overflow-hidden border-border/60">
        <div className="relative aspect-video bg-black/80 flex items-center justify-center group">
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => {
              setIsPlaying(false);
              narrationRef.current?.pause();
            }}
            poster="/placeholder.svg"
            playsInline
          >
            <source src="/aap-dimension-apresentacao.mp4" type="video/mp4" />
          </video>

          {/* Overlay play */}
          {!isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30"
            >
              <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
                <Play className="w-7 h-7 text-primary-foreground ml-1" />
              </div>
            </button>
          )}
        </div>

        {/* Controls */}
        <CardContent className="p-3 space-y-2">
          <Slider
            value={[progress]}
            max={duration || 1}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" onClick={togglePlay}>
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={toggleMute}>
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <span className="text-xs text-muted-foreground ml-2 tabular-nums">
                {formatTime(progress)} / {formatTime(duration)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={narrationState === "playing" ? "default" : "secondary"}
                    onClick={generateNarration}
                    disabled={narrationState === "loading"}
                    className="gap-1.5 text-xs"
                  >
                    {narrationState === "loading" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Mic className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">{narrationLabel}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{narrationLabel}</TooltipContent>
              </Tooltip>
              <Button size="icon" variant="ghost" onClick={handleFullscreen}>
                <Maximize className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map((f) => (
          <Card key={f.title} className="border-border/60">
            <CardContent className="p-5 space-y-1">
              <h3 className="font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Share */}
      <Card className="border-border/60">
        <CardContent className="p-5 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 text-foreground">
            <Share2 className="w-5 h-5 text-primary" />
            <span className="font-medium">Compartilhar</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {shareLinks.map((s) => (
              <Tooltip key={s.label}>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => window.open(s.url, "_blank", "noopener")}
                  >
                    <s.icon className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{s.label}</TooltipContent>
              </Tooltip>
            ))}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="secondary" onClick={copyLink}>
                  {linkCopied ? <Check className="w-4 h-4 text-green-400" /> : <Link2 className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copiar link</TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
