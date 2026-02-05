"""
OKR Alignment Analyzer - Analisa alinhamento entre OKRs e percepção externa
"""

import json
from typing import Dict, Any, List, Optional
from datetime import datetime

from src.intelligence.claude_analysis import ClaudeAnalysisService


class OKRAlignmentAnalyzer:
    """
    Analisa alinhamento entre:
    - OKRs definidos (importados do Excel)
    - Percepção externa (análise de inteligência)
    - Cenário político/econômico
    - Concorrentes
    """

    def __init__(self, anthropic_api_key: str):
        self.claude = ClaudeAnalysisService(anthropic_api_key)

    async def analisar_alinhamento_completo(
        self,
        okrs_definidos: Dict[str, Any],
        analise_empresa: Dict[str, Any],
        analise_concorrentes: List[Dict[str, Any]] = None,
        contexto_politico: str = None,
        contexto_economico: str = None,
    ) -> Dict[str, Any]:
        """
        Análise completa de alinhamento.

        Args:
            okrs_definidos: OKRs importados do Excel
            analise_empresa: Análise de inteligência da empresa
            analise_concorrentes: Análises dos concorrentes
            contexto_politico: Cenário político atual
            contexto_economico: Cenário econômico atual

        Returns:
            Análise completa de alinhamento
        """
        resultado = {
            "timestamp": datetime.utcnow().isoformat(),
            "analise_geral": {},
            "analise_por_objetivo": [],
            "objetivos_observados": [],
            "gaps_identificados": [],
            "recomendacoes": [],
        }

        # 1. Extrai objetivos observados da análise externa
        objetivos_observados = await self._extrair_objetivos_observados(analise_empresa)
        resultado["objetivos_observados"] = objetivos_observados

        # 2. Análise geral de alinhamento
        resultado["analise_geral"] = await self._analisar_alinhamento_geral(
            okrs_definidos,
            analise_empresa,
            objetivos_observados,
            analise_concorrentes,
            contexto_politico,
            contexto_economico,
        )

        # 3. Análise individual de cada objetivo
        for area in okrs_definidos.get("areas", []):
            for objetivo in area.get("objetivos", []):
                analise_obj = await self._analisar_objetivo_individual(
                    objetivo,
                    area["nome"],
                    analise_empresa,
                    objetivos_observados,
                    analise_concorrentes,
                )
                resultado["analise_por_objetivo"].append(analise_obj)

        # 4. Consolida gaps e recomendações
        resultado["gaps_identificados"] = self._consolidar_gaps(resultado["analise_por_objetivo"])
        resultado["recomendacoes"] = self._consolidar_recomendacoes(resultado)

        return resultado

    async def _extrair_objetivos_observados(self, analise_empresa: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extrai objetivos implícitos da análise da empresa"""

        prompt = f"""
Analise os dados da empresa e identifique os OBJETIVOS IMPLÍCITOS que ela parece perseguir,
baseado em sua comunicação, site, posicionamento e ações.

DADOS DA EMPRESA:
{json.dumps(analise_empresa, indent=2, ensure_ascii=False)}

Retorne APENAS um JSON válido (sem markdown) com esta estrutura:
{{
    "objetivos_observados": [
        {{
            "titulo": "Objetivo identificado",
            "descricao": "Descrição do objetivo",
            "evidencias": ["Evidência 1", "Evidência 2"],
            "fonte": "website|linkedin|perplexity|cnpj",
            "confianca": 0-100,
            "categoria": "crescimento|eficiencia|inovacao|cliente|mercado|pessoas",
            "tipo": "estrategico|tatico|operacional"
        }}
    ]
}}

Identifique entre 3 e 10 objetivos.
"""

        try:
            result = await self.claude._analyze(prompt)
            return result.get("objetivos_observados", [])
        except Exception as e:
            return [{"erro": str(e)}]

    async def _analisar_alinhamento_geral(
        self,
        okrs_definidos: Dict[str, Any],
        analise_empresa: Dict[str, Any],
        objetivos_observados: List[Dict[str, Any]],
        analise_concorrentes: List[Dict[str, Any]],
        contexto_politico: str,
        contexto_economico: str,
    ) -> Dict[str, Any]:
        """Análise geral de alinhamento"""

        prompt = f"""
Analise o alinhamento entre os OKRs definidos pela empresa e a percepção externa.

OKRs DEFINIDOS:
{json.dumps(okrs_definidos, indent=2, ensure_ascii=False)}

OBJETIVOS OBSERVADOS (Percepção Externa):
{json.dumps(objetivos_observados, indent=2, ensure_ascii=False)}

ANÁLISE DA EMPRESA (Percepção Externa):
{json.dumps(analise_empresa.get('analise', {}), indent=2, ensure_ascii=False)}

{"ANÁLISE DOS CONCORRENTES:" if analise_concorrentes else ""}
{json.dumps(analise_concorrentes, indent=2, ensure_ascii=False) if analise_concorrentes else ""}

{"CONTEXTO POLÍTICO:" if contexto_politico else ""}
{contexto_politico or ""}

{"CONTEXTO ECONÔMICO:" if contexto_economico else ""}
{contexto_economico or ""}

Retorne APENAS um JSON válido com esta estrutura:
{{
    "score_alinhamento_geral": 0-100,
    "score_coerencia": 0-100,
    "score_diferenciacao": 0-100,
    "score_viabilidade": 0-100,
    "resumo_executivo": "Resumo em 3-4 frases",
    "principais_alinhamentos": ["Onde OKRs estão alinhados com percepção externa"],
    "principais_desalinhamentos": ["Onde há divergência"],
    "riscos_contextuais": [
        {{
            "risco": "Descrição do risco",
            "origem": "politico|economico|mercado|interno",
            "impacto": "baixo|medio|alto",
            "okrs_afetados": ["OKR 1", "OKR 2"]
        }}
    ],
    "oportunidades_contextuais": ["Oportunidades identificadas"],
    "comparativo_concorrentes": {{
        "posicao_geral": "atras|alinhado|a_frente|diferenciado",
        "vantagens": ["Vantagens vs concorrentes"],
        "desvantagens": ["Desvantagens vs concorrentes"]
    }},
    "recomendacoes_estrategicas": ["Top 5 recomendações"]
}}
"""

        try:
            return await self.claude._analyze(prompt)
        except Exception as e:
            return {"erro": str(e)}

    async def _analisar_objetivo_individual(
        self,
        objetivo: Dict[str, Any],
        area: str,
        analise_empresa: Dict[str, Any],
        objetivos_observados: List[Dict[str, Any]],
        analise_concorrentes: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Análise individual de um objetivo"""

        prompt = f"""
Analise este OBJETIVO específico em relação à percepção externa e concorrentes.

ÁREA: {area}

OBJETIVO:
{json.dumps(objetivo, indent=2, ensure_ascii=False)}

OBJETIVOS OBSERVADOS EXTERNAMENTE:
{json.dumps(objetivos_observados, indent=2, ensure_ascii=False)}

ANÁLISE DA EMPRESA:
{json.dumps(analise_empresa.get('analise', {}), indent=2, ensure_ascii=False)}

Retorne APENAS um JSON válido com esta estrutura:
{{
    "objetivo_titulo": "{objetivo.get('titulo', '')}",
    "area": "{area}",
    "alinhamento_percepcao_externa": 0-100,
    "justificativa_alinhamento": "Por que está alinhado ou não",
    "objetivo_observado_correspondente": "Qual objetivo observado mais se relaciona (ou null)",
    "grau_dificuldade": "baixo|medio|alto|muito_alto",
    "fatores_dificuldade": ["Fator 1", "Fator 2"],
    "riscos": [
        {{
            "risco": "Descrição",
            "probabilidade": "baixa|media|alta",
            "impacto": "baixo|medio|alto",
            "mitigacao": "Como mitigar"
        }}
    ],
    "forcas": ["Forças que apoiam este objetivo"],
    "fraquezas": ["Fraquezas que dificultam"],
    "oportunidades": ["Oportunidades para este objetivo"],
    "ameacas": ["Ameaças a este objetivo"],
    "posicao_vs_concorrentes": "atras|alinhado|a_frente|diferenciado",
    "recomendacoes": ["Recomendações específicas"]
}}
"""

        try:
            return await self.claude._analyze(prompt)
        except Exception as e:
            return {
                "objetivo_titulo": objetivo.get('titulo', ''),
                "area": area,
                "erro": str(e)
            }

    def _consolidar_gaps(self, analises_objetivos: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Consolida gaps identificados"""
        gaps = []

        for analise in analises_objetivos:
            if analise.get("alinhamento_percepcao_externa", 100) < 50:
                gaps.append({
                    "objetivo": analise.get("objetivo_titulo"),
                    "area": analise.get("area"),
                    "tipo": "baixo_alinhamento",
                    "descricao": analise.get("justificativa_alinhamento"),
                    "score": analise.get("alinhamento_percepcao_externa"),
                })

            if analise.get("grau_dificuldade") in ["alto", "muito_alto"]:
                gaps.append({
                    "objetivo": analise.get("objetivo_titulo"),
                    "area": analise.get("area"),
                    "tipo": "alta_dificuldade",
                    "descricao": ", ".join(analise.get("fatores_dificuldade", [])),
                    "grau": analise.get("grau_dificuldade"),
                })

        return gaps

    def _consolidar_recomendacoes(self, resultado: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Consolida todas as recomendações"""
        recomendacoes = []

        # Recomendações estratégicas da análise geral
        for rec in resultado.get("analise_geral", {}).get("recomendacoes_estrategicas", []):
            recomendacoes.append({
                "tipo": "estrategica",
                "descricao": rec,
                "prioridade": "alta",
            })

        # Recomendações por objetivo
        for analise in resultado.get("analise_por_objetivo", []):
            for rec in analise.get("recomendacoes", []):
                recomendacoes.append({
                    "tipo": "objetivo",
                    "objetivo": analise.get("objetivo_titulo"),
                    "area": analise.get("area"),
                    "descricao": rec,
                    "prioridade": "media",
                })

        return recomendacoes
