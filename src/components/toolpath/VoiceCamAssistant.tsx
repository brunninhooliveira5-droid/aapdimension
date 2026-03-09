import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Volume2, VolumeX, Loader2, Sparkles, History, AlertTriangle, CheckCircle2, X, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { SvgVector, MaterialConfig, CncTool, ToolpathOperation, MaterialPreset } from "@/lib/toolpath-engine";

interface VoiceCommand {
  id: string;
  transcript: string;
  response: string;
  action?: string;
  timestamp: Date;
  success: boolean;
}

interface VoiceCamAssistantProps {
  vectors: SvgVector[];
  material: MaterialConfig;
  tools: CncTool[];
  operations: ToolpathOperation[];
  customPresets: MaterialPreset[];
  onMaterialChange: (material: MaterialConfig) => void;
  onOperationsChange: (operations: ToolpathOperation[]) => void;
  onGenerateCam: () => void;
  onClose: () => void;
}

export function VoiceCamAssistant({
  vectors,
  material,
  tools,
  operations,
  customPresets,
  onMaterialChange,
  onOperationsChange,
  onGenerateCam,
  onClose,
}: VoiceCamAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [commandHistory, setCommandHistory] = useState<VoiceCommand[]>([]);
  const [spokenFeedback, setSpokenFeedback] = useState(true);
  const [didacticMode, setDidacticMode] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "pt-BR";
      
      recognition.onresult = (event) => {
        const current = event.resultIndex;
        const result = event.results[current];
        const transcriptText = result[0].transcript;
        setTranscript(transcriptText);
        
        if (result.isFinal) {
          handleVoiceCommand(transcriptText);
        }
      };
      
      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === "not-allowed") {
          toast.error("Permissão de microfone negada");
        }
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (!spokenFeedback) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // Try to find a Portuguese voice
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.includes("pt"));
    if (ptVoice) utterance.voice = ptVoice;
    
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [spokenFeedback]);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current) {
      toast.error("Reconhecimento de voz não suportado neste navegador");
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      const updateLevel = () => {
        if (!analyserRef.current || !isListening) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioLevel(avg / 128);
        animationRef.current = requestAnimationFrame(updateLevel);
      };
      
      setIsListening(true);
      setTranscript("");
      recognitionRef.current.start();
      updateLevel();
      
      speak("Estou ouvindo. Pode falar seu comando.");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Erro ao acessar microfone");
    }
  }, [isListening, speak]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsListening(false);
    setAudioLevel(0);
  }, []);

  const handleVoiceCommand = useCallback(async (command: string) => {
    if (!command.trim()) return;
    
    setIsProcessing(true);
    
    try {
      const context = {
        command,
        material: {
          presetId: material.presetId,
          thickness: material.thickness,
        },
        vectorCount: vectors.length,
        operationCount: operations.length,
        tools: tools.map(t => ({ id: t.id, name: t.name, diameter: t.diameter })),
        didacticMode,
      };
      
      const { data, error } = await supabase.functions.invoke("voice-cam-assistant", {
        body: context,
      });
      
      if (error) throw error;
      
      const { action, parameters, response, didacticExplanation, warning } = data;
      
      // Execute the action
      let success = true;
      let finalResponse = response;
      
      if (warning) {
        speak(warning);
        finalResponse = `⚠️ ${warning}\n\n${response}`;
      }
      
      switch (action) {
        case "set_material":
          if (parameters?.presetId) {
            onMaterialChange({ ...material, presetId: parameters.presetId });
            if (parameters.thickness) {
              onMaterialChange({ ...material, presetId: parameters.presetId, thickness: parameters.thickness });
            }
          }
          break;
          
        case "set_thickness":
          if (parameters?.thickness) {
            onMaterialChange({ ...material, thickness: parameters.thickness });
          }
          break;
          
        case "set_tool":
          // Tool selection handled via operations
          break;
          
        case "generate_cam":
        case "generate_operation":
          onGenerateCam();
          break;
          
        case "add_tabs":
          const updatedOps = operations.map(op => {
            if (op.type === "profile-outside") {
              return { ...op, tabs: { enabled: true, count: 4, width: 5, height: 2, minDistance: 20 } };
            }
            return op;
          });
          onOperationsChange(updatedOps);
          break;
          
        case "set_quality":
          // Quality affects CAM generation parameters
          toast.info(`Qualidade definida: ${parameters?.quality || "balanceada"}`);
          break;
          
        case "simulate":
          toast.info("Iniciando simulação...");
          // Simulation trigger handled by parent
          break;
          
        case "generate_gcode":
          toast.info("Gerando G-code...");
          // G-code generation handled by parent
          break;
          
        case "cancel":
          onClose();
          break;
          
        case "help":
        case "unknown":
        default:
          // Just show response
          break;
      }
      
      // Add didactic explanation if enabled
      if (didacticMode && didacticExplanation) {
        finalResponse += `\n\n💡 ${didacticExplanation}`;
        speak(`${response}. ${didacticExplanation}`);
      } else {
        speak(response);
      }
      
      // Add to history
      const newCommand: VoiceCommand = {
        id: `cmd-${Date.now()}`,
        transcript: command,
        response: finalResponse,
        action,
        timestamp: new Date(),
        success,
      };
      
      setCommandHistory(prev => [newCommand, ...prev].slice(0, 20));
      
    } catch (error) {
      console.error("Error processing voice command:", error);
      const errorResponse = "Desculpe, não consegui processar seu comando. Pode repetir?";
      speak(errorResponse);
      
      setCommandHistory(prev => [{
        id: `cmd-${Date.now()}`,
        transcript: command,
        response: errorResponse,
        timestamp: new Date(),
        success: false,
      }, ...prev].slice(0, 20));
    } finally {
      setIsProcessing(false);
      setTranscript("");
    }
  }, [material, vectors, operations, tools, didacticMode, onMaterialChange, onOperationsChange, onGenerateCam, onClose, speak]);

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Assistente por Voz</h2>
          <Badge className="bg-primary text-primary-foreground border-0">
            V8
          </Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Voice Control */}
      <Card className="border-2 border-dashed">
        <CardContent className="p-6 flex flex-col items-center gap-4">
          {/* Microphone Button */}
          <div className="relative">
            <Button
              size="lg"
              variant={isListening ? "destructive" : "default"}
              className={`h-20 w-20 rounded-full transition-all ${
                isListening ? "animate-pulse ring-4 ring-destructive/30" : ""
              }`}
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : isListening ? (
                <MicOff className="h-8 w-8" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </Button>
            
            {/* Audio Level Indicator */}
            {isListening && (
              <div 
                className="absolute inset-0 rounded-full border-4 border-primary pointer-events-none"
                style={{
                  transform: `scale(${1 + audioLevel * 0.3})`,
                  opacity: 0.5 + audioLevel * 0.5,
                  transition: "transform 0.1s, opacity 0.1s",
                }}
              />
            )}
          </div>
          
          <p className="text-sm text-muted-foreground">
            {isProcessing ? "Processando..." : isListening ? "Ouvindo..." : "Clique para falar"}
          </p>
          
          {/* Live Transcript */}
          {transcript && (
            <div className="w-full p-3 bg-muted rounded-lg text-sm">
              <span className="text-muted-foreground">🎤 </span>
              {transcript}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Settings */}
      <div className="flex items-center gap-6 px-2">
        <div className="flex items-center gap-2">
          <Switch
            id="spoken-feedback"
            checked={spokenFeedback}
            onCheckedChange={setSpokenFeedback}
          />
          <Label htmlFor="spoken-feedback" className="text-sm flex items-center gap-1">
            {spokenFeedback ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            Resposta falada
          </Label>
        </div>
        
        <div className="flex items-center gap-2">
          <Switch
            id="didactic-mode"
            checked={didacticMode}
            onCheckedChange={setDidacticMode}
          />
          <Label htmlFor="didactic-mode" className="text-sm flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            Modo didático
          </Label>
        </div>
      </div>
      
      {/* Quick Commands */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Comandos Rápidos
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {[
              "Gerar CAM automático",
              "Material MDF 15mm",
              "Adicionar tabs",
              "Priorizar qualidade",
              "Gerar G-code",
            ].map((cmd) => (
              <Button
                key={cmd}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => handleVoiceCommand(cmd)}
                disabled={isProcessing}
              >
                {cmd}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Command History */}
      <Card className="flex-1 min-h-0">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico de Comandos
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <ScrollArea className="h-[200px]">
            {commandHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum comando ainda. Clique no microfone para começar.
              </p>
            ) : (
              <div className="space-y-3">
                {commandHistory.map((cmd) => (
                  <div key={cmd.id} className="border rounded-lg p-3 text-sm space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">🎤 {cmd.transcript}</p>
                      {cmd.success ? (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                    </div>
                    <p className="text-muted-foreground whitespace-pre-wrap">{cmd.response}</p>
                    <p className="text-xs text-muted-foreground">
                      {cmd.timestamp.toLocaleTimeString("pt-BR")}
                      {cmd.action && ` • ${cmd.action}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
      
      {/* Context Info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
        <span>📐 {vectors.length} vetores</span>
        <span>•</span>
        <span>🔧 {operations.length} operações</span>
        <span>•</span>
        <span>📦 {material.presetId || "Sem material"}</span>
      </div>
    </div>
  );
}
