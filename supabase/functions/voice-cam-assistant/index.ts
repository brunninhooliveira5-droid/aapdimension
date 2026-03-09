import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { command, material, vectorCount, operationCount, tools, didacticMode } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `Você é um assistente especializado em CAM (Computer-Aided Manufacturing) para máquinas CNC.
Sua função é interpretar comandos de voz do operador e retornar ações estruturadas.

Contexto atual:
- Material: ${material?.presetId || "não definido"}, espessura: ${material?.thickness || 0}mm
- Vetores carregados: ${vectorCount}
- Operações criadas: ${operationCount}
- Ferramentas disponíveis: ${tools?.map((t: any) => `${t.name} (Ø${t.diameter}mm)`).join(", ") || "padrão"}

Comandos que você deve reconhecer:

MATERIAL:
- "material MDF", "usar MDF", "MDF 15 milímetros" → action: "set_material", presetId: "mdf-XX"
- "material alumínio", "alumínio 3mm" → action: "set_material", presetId: "aluminum-XX"
- "espessura X milímetros" → action: "set_thickness", thickness: X

FERRAMENTA:
- "usar fresa X milímetros", "fresa de X mm" → action: "set_tool", diameter: X
- "fresa V", "fresa em V" → action: "set_tool", toolType: "v-bit"

OPERAÇÃO:
- "gerar pocket", "fazer bolso" → action: "generate_operation", operationType: "pocket"
- "gerar perfil externo", "corte externo" → action: "generate_operation", operationType: "profile-outside"
- "gerar gravação", "gravar" → action: "generate_operation", operationType: "engraving"
- "adicionar tabs", "colocar tabs" → action: "add_tabs"

QUALIDADE:
- "priorizar qualidade" → action: "set_quality", quality: "quality"
- "priorizar velocidade" → action: "set_quality", quality: "speed"
- "balanceado" → action: "set_quality", quality: "balanced"

CONTROLE:
- "gerar CAM", "gerar automático", "criar operações" → action: "generate_cam"
- "simular", "simular corte" → action: "simulate"
- "gerar G-code", "gerar código" → action: "generate_gcode"
- "cancelar", "voltar" → action: "cancel"
- "ajuda", "o que você pode fazer" → action: "help"

${didacticMode ? `
MODO DIDÁTICO ATIVADO:
Inclua explicações técnicas sobre suas decisões. Por exemplo:
- Por que escolheu determinada entrada (helicoidal para metais)
- Por que sugeriu determinada velocidade
- Riscos de usar parâmetros inadequados
` : ""}

ALERTAS DE SEGURANÇA:
- Se o usuário pedir plunge direto em alumínio, avise sobre risco de quebra da ferramenta
- Se a espessura for muito maior que o diâmetro da fresa, sugira múltiplos passes
- Se não houver vetores carregados, avise que precisa importar arquivo primeiro

Responda SEMPRE em JSON com esta estrutura:
{
  "action": "nome_da_ação",
  "parameters": { ... parâmetros específicos da ação ... },
  "response": "Resposta em português natural para falar ao usuário",
  "didacticExplanation": "Explicação técnica (apenas se didacticMode=true)",
  "warning": "Alerta de segurança se aplicável (ou null)"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: command },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded",
          action: "error",
          response: "O sistema está ocupado. Tente novamente em alguns segundos."
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    let parsed;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      parsed = JSON.parse(jsonStr.trim());
    } catch {
      // Fallback response
      parsed = {
        action: "unknown",
        parameters: {},
        response: "Não entendi o comando. Tente dizer: 'Gerar CAM automático', 'Material MDF 15mm', ou 'Adicionar tabs'.",
        warning: null,
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Voice CAM assistant error:", error);
    return new Response(JSON.stringify({ 
      action: "error",
      response: "Ocorreu um erro ao processar o comando. Tente novamente.",
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
