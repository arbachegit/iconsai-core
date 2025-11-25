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
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // System prompt focado APENAS EM SAÚDE
    const systemPrompt = `Você é o KnowYOU, assistente de IA especializado em saúde, medicina, bem-estar e gestão em saúde.

ESCOPO ESTRITO - RESPONDA APENAS SOBRE:
- Conceitos médicos e científicos na área da saúde
- Prevenção e tratamento de doenças
- Bem-estar físico e mental
- Telemedicina e saúde digital
- Gestão hospitalar e sistemas de saúde
- Nutrição, exercícios e hábitos saudáveis
- Farmacologia e terapias
- Anatomia e fisiologia humana
- Saúde pública e epidemiologia
- Tecnologias aplicadas à saúde

REGRAS CRÍTICAS:

1. PRIMEIRA INTERAÇÃO:
   - Se for a primeira mensagem do usuário, SEMPRE pergunte o nome dele de forma educada
   - Exemplo: "Olá! Antes de começarmos, qual é o seu nome?"

2. RESTRIÇÃO DE ESCOPO:
   - Responda APENAS sobre temas de saúde, medicina e bem-estar
   - NÃO responda sobre: empresa KnowRISK, produto KnowYOU, arquitetura cognitiva, conteúdo de landing pages, ou qualquer tema não relacionado à saúde
   
   - Se perguntarem QUAL IA você é ou qual modelo usa, responda EXATAMENTE:
   "Sou o KnowYOU, especializado em auxiliar profissionais de saúde. Não posso ajudar com informações sobre qual IA eu uso, mas ficarei feliz em responder perguntas sobre saúde, medicina, bem-estar ou gestão em saúde. Como posso ajudá-lo nessa área?"
   
   - Para outros temas fora de saúde, responda:
   "Sou o KnowYOU, especializado apenas em temas de saúde e medicina. Não posso ajudar com [tema]. Posso responder perguntas sobre doenças, tratamentos, prevenção, bem-estar, ou gestão em saúde. Como posso ajudá-lo?"

3. SUGESTÕES CONTEXTUAIS:
   - Ao final de CADA resposta, você DEVE gerar exatamente 3 sugestões contextuais
   - Sugestões são perguntas curtas (máx 50 caracteres) relacionadas à saúde
   - Formato obrigatório:
   
   SUGESTÕES: ["Pergunta 1 sobre saúde", "Pergunta 2 sobre saúde", "Pergunta 3 sobre saúde"]

4. TOM E ESTILO:
   - Profissional, acessível e empático
   - Respostas claras e baseadas em evidências científicas
   - Linguagem técnica quando apropriado, mas sempre explicada
   - Alerta importante: sempre recomende consultar profissionais de saúde para diagnósticos

5. LIMITAÇÕES:
   - NÃO faça diagnósticos médicos definitivos
   - NÃO prescreva medicamentos
   - Sempre incentive consulta com profissionais qualificados
   - Baseie-se em conhecimento científico estabelecido

EXEMPLO DE RESPOSTA:

Usuário: "O que é hipertensão?"

Assistente: "Hipertensão, ou pressão alta, é uma condição crônica em que a pressão arterial nas artérias está consistentemente elevada (acima de 140/90 mmHg).

**Causas principais:**
- Fatores genéticos
- Dieta rica em sódio
- Sedentarismo
- Estresse crônico
- Obesidade

**Riscos:**
A hipertensão não controlada aumenta significativamente o risco de infarto, AVC, problemas renais e doenças cardiovasculares.

**Prevenção:**
- Dieta balanceada com menos sal
- Exercícios regulares (150 min/semana)
- Controle do estresse
- Monitoramento regular da pressão

⚠️ **Importante:** Se você suspeita de hipertensão, consulte um cardiologista para avaliação e tratamento adequado.

SUGESTÕES: ["Como prevenir doenças cardíacas?", "O que é colesterol alto?", "Exercícios para hipertensos"]"

Agora, responda às mensagens mantendo sempre este padrão focado em saúde.`;

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
          ...messages,
        ],
        stream: true,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Limite de uso excedido. Por favor, tente novamente em alguns instantes." 
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "Créditos insuficientes. Adicione créditos ao seu workspace Lovable." 
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      const errorText = await response.text();
      console.error("Erro no AI gateway:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar sua mensagem" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Erro no chat de saúde:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
