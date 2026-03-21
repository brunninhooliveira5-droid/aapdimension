import { useState, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Share2, Facebook, Twitter, Linkedin, Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

export default function AppShowcasePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [linkCopied, setLinkCopied] = useState(false);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
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
  };

  const handleFullscreen = () => {
    videoRef.current?.requestFullscreen();
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

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
            onEnded={() => setIsPlaying(false)}
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
            <Button size="icon" variant="ghost" onClick={handleFullscreen}>
              <Maximize className="w-4 h-4" />
            </Button>
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
