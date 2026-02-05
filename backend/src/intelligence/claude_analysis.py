"""
Claude Analysis Service - Análise inteligente via Claude
Estrutura dados e gera insights
"""

import httpx
import json
from typing import Dict, Any, List, Optional


class ClaudeAnalysisService:
    """
    Usa Claude para análise e estruturação de dados.
    - Análise SWOT de empresas
    - Sugestão de OKRs
    - Análise comparativa de concorrentes
    - Análise de perfil de pessoas
    """

    BASE_URL = "https://api.anthropic.com/v1"

    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        self.api_key = api_key
        self.model = model

    async def analisar_empresa(self, dados_empresa: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analisa empresa e gera SWOT + OKRs sugeridos.

        Args:
            dados_empresa: Dados coletados da empresa (site, CNPJ, Perplexity, etc)

        Returns:
            Análise estruturada
        """
        prompt = f"""
Analise os seguintes dados de uma empresa e retorne uma análise estruturada em JSON:

DADOS DA EMPRESA:
{json.dumps(dados_empresa, indent=2, ensure_ascii=False)}

Retorne APENAS um JSON válido (sem markdown, sem ```json) com esta estrutura:
{{
    "pontos_fortes": ["lista de pontos fortes identificados"],
    "pontos_fracos": ["lista de pontos fracos ou áreas de melhoria"],
    "oportunidades": ["oportunidades de mercado identificadas"],
    "ameacas": ["ameaças ou riscos identificados"],
    "foco_principal": "descrição do foco principal da empresa",
    "proposta_valor": "proposta de valor identificada",
    "diferencial_competitivo": "principal diferencial",
    "publico_alvo": "público-alvo identificado",
    "tom_comunicacao": "formal|informal|técnico|amigável|corporativo",
    "mensagem_principal": "mensagem principal que a empresa comunica",
    "palavras_chave": ["palavras-chave que definem a empresa"],
    "okrs_sugeridos": [
        {{
            "objetivo": "Objetivo estratégico",
            "key_results": ["KR1", "KR2", "KR3"]
        }}
    ],
    "score_presenca_digital": 0-100,
    "score_clareza_proposta": 0-100,
    "score_profissionalismo": 0-100,
    "observacoes": "observações adicionais relevantes"
}}

Seja objetivo e baseie-se apenas nos dados fornecidos.
"""

        return await self._analyze(prompt)

    async def analisar_pessoa(
        self,
        dados_pessoa: Dict[str, Any],
        dados_empresa: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analisa perfil de pessoa e verifica alinhamento com empresa.

        Args:
            dados_pessoa: Dados da pessoa (LinkedIn, etc)
            dados_empresa: Dados da empresa relacionada (opcional)

        Returns:
            Análise do perfil
        """
        contexto_empresa = ""
        if dados_empresa:
            contexto_empresa = f"""
EMPRESA RELACIONADA:
{json.dumps(dados_empresa, indent=2, ensure_ascii=False)}
"""

        prompt = f"""
Analise o perfil profissional desta pessoa e retorne uma análise em JSON:

DADOS DA PESSOA:
{json.dumps(dados_pessoa, indent=2, ensure_ascii=False)}
{contexto_empresa}

Retorne APENAS um JSON válido (sem markdown) com esta estrutura:
{{
    "pontos_fortes": ["lista de pontos fortes profissionais"],
    "areas_experiencia": ["áreas de expertise"],
    "nivel_senioridade": "junior|pleno|senior|especialista|executivo",
    "perfil_resumido": "resumo do perfil em 2-3 frases",
    "competencias_principais": ["top 5 competências"],
    "gaps_identificados": ["possíveis gaps de competência"],
    {"\"alinhamento_empresa\": 0-100," if dados_empresa else ""}
    {"\"justificativa_alinhamento\": \"justificativa do score de alinhamento\"," if dados_empresa else ""}
    "score_perfil_profissional": 0-100,
    "score_influencia": 0-100,
    "recomendacoes": ["recomendações de desenvolvimento"]
}}
"""

        return await self._analyze(prompt)

    async def analisar_politico(self, dados_politico: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analisa perfil de político.

        Args:
            dados_politico: Dados do político coletados

        Returns:
            Análise do perfil político
        """
        prompt = f"""
Analise os dados deste político e retorne uma análise em JSON:

DADOS DO POLÍTICO:
{json.dumps(dados_politico, indent=2, ensure_ascii=False)}

Retorne APENAS um JSON válido (sem markdown) com esta estrutura:
{{
    "resumo_atuacao": "resumo da atuação política",
    "posicionamentos_principais": [
        {{"tema": "tema", "posicao": "posição do político"}}
    ],
    "areas_foco": ["áreas de foco na atuação"],
    "projetos_relevantes": ["projetos de lei ou iniciativas relevantes"],
    "pontos_positivos": ["aspectos positivos da atuação"],
    "controversias": ["controvérsias ou pontos de atenção"],
    "alinhamento_ideologico": "esquerda|centro-esquerda|centro|centro-direita|direita",
    "transparencia_score": 0-100,
    "efetividade_score": 0-100,
    "presenca_digital_score": 0-100,
    "observacoes": "observações adicionais"
}}

Seja factual e objetivo. Baseie-se apenas nos dados fornecidos.
"""

        return await self._analyze(prompt)

    async def comparar_empresas(
        self,
        empresa_cliente: Dict[str, Any],
        empresa_concorrente: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Compara duas empresas e gera análise competitiva.

        Args:
            empresa_cliente: Dados da empresa cliente
            empresa_concorrente: Dados do concorrente

        Returns:
            Análise comparativa
        """
        prompt = f"""
Compare estas duas empresas e gere uma análise competitiva em JSON:

EMPRESA CLIENTE:
{json.dumps(empresa_cliente, indent=2, ensure_ascii=False)}

EMPRESA CONCORRENTE:
{json.dumps(empresa_concorrente, indent=2, ensure_ascii=False)}

Retorne APENAS um JSON válido (sem markdown) com esta estrutura:
{{
    "nivel_concorrencia": "direto|indireto|potencial",
    "sobreposicao_mercado": 0-100,
    "vantagens_cliente": ["vantagens da empresa cliente"],
    "vantagens_concorrente": ["vantagens do concorrente"],
    "diferenciais_unicos_cliente": ["diferenciais únicos do cliente"],
    "diferenciais_unicos_concorrente": ["diferenciais únicos do concorrente"],
    "areas_confronto": ["áreas onde competem diretamente"],
    "oportunidades_diferenciacao": ["oportunidades para o cliente se diferenciar"],
    "ameacas_concorrente": ["ameaças que o concorrente representa"],
    "recomendacoes": ["recomendações estratégicas para o cliente"],
    "resumo_comparativo": "resumo da comparação em 3-4 frases"
}}
"""

        return await self._analyze(prompt)

    async def extrair_dados_estruturados(self, texto: str, schema: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extrai dados estruturados de texto livre.

        Args:
            texto: Texto para extrair dados
            schema: Schema esperado dos dados

        Returns:
            Dados estruturados
        """
        prompt = f"""
Extraia dados estruturados do seguinte texto e retorne em JSON:

TEXTO:
{texto}

SCHEMA ESPERADO:
{json.dumps(schema, indent=2, ensure_ascii=False)}

Retorne APENAS um JSON válido seguindo o schema. Use null para campos não encontrados.
"""

        return await self._analyze(prompt)

    async def _analyze(self, prompt: str) -> Dict[str, Any]:
        """Executa análise via Claude API"""

        url = f"{self.BASE_URL}/messages"

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                url,
                headers={
                    "x-api-key": self.api_key,
                    "Content-Type": "application/json",
                    "anthropic-version": "2023-06-01"
                },
                json={
                    "model": self.model,
                    "max_tokens": 4096,
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ]
                }
            )

            if response.status_code != 200:
                raise Exception(f"Claude API error: {response.status_code} - {response.text}")

            data = response.json()
            content = data["content"][0]["text"]

            # Parse JSON da resposta
            try:
                # Remove possíveis marcadores de código
                content = content.strip()
                if content.startswith("```"):
                    content = content.split("\n", 1)[1]
                if content.endswith("```"):
                    content = content.rsplit("```", 1)[0]

                result = json.loads(content)
                result["_modelo_llm"] = self.model
                return result

            except json.JSONDecodeError as e:
                return {
                    "erro": "Falha ao parsear resposta",
                    "conteudo_raw": content,
                    "_modelo_llm": self.model
                }
