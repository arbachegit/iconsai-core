"""
Intelligence Orchestrator - Orquestra todos os serviços
Coleta dados de múltiplas fontes e gera análise unificada
"""

import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime

from .brasil_api import BrasilAPIService
from .perplexity_service import PerplexityService
from .website_scraper import WebsiteScraperService
from .linkedin_service import LinkedInService
from .claude_analysis import ClaudeAnalysisService


class IntelligenceOrchestrator:
    """
    Orquestra a coleta e análise de inteligência competitiva.

    Fluxo:
    1. Recebe nome/CNPJ da empresa
    2. Coleta dados de múltiplas fontes em paralelo
    3. Analisa via LLM
    4. Identifica concorrentes e analisa
    5. Analisa pessoas/time
    6. Gera OKRs sugeridos e análise de alinhamento
    """

    def __init__(
        self,
        openai_api_key: str = "",
        anthropic_api_key: str = "",
        perplexity_api_key: str = "",
        proxycurl_api_key: str = "",
    ):
        self.brasil_api = BrasilAPIService()
        self.perplexity = PerplexityService(perplexity_api_key) if perplexity_api_key else None
        self.scraper = WebsiteScraperService()
        self.linkedin = LinkedInService(proxycurl_api_key) if proxycurl_api_key else None
        self.claude = ClaudeAnalysisService(anthropic_api_key) if anthropic_api_key else None

    async def analisar_empresa_completa(
        self,
        nome_empresa: str,
        cnpj: Optional[str] = None,
        website: Optional[str] = None,
        setor: Optional[str] = None,
        buscar_concorrentes: bool = True,
        buscar_pessoas: bool = True,
        limite_concorrentes: int = 5,
        limite_pessoas: int = 10,
    ) -> Dict[str, Any]:
        """
        Análise completa de uma empresa.

        Args:
            nome_empresa: Nome da empresa
            cnpj: CNPJ (opcional)
            website: URL do site (opcional)
            setor: Setor de atuação (opcional)
            buscar_concorrentes: Se deve buscar concorrentes
            buscar_pessoas: Se deve buscar pessoas do time
            limite_concorrentes: Máximo de concorrentes
            limite_pessoas: Máximo de pessoas

        Returns:
            Análise completa estruturada
        """
        resultado = {
            "empresa": nome_empresa,
            "timestamp": datetime.utcnow().isoformat(),
            "fontes_utilizadas": [],
            "dados_coletados": {},
            "analise": {},
            "concorrentes": [],
            "pessoas": [],
            "okrs_sugeridos": [],
            "alinhamento": {},
        }

        # ===========================================
        # FASE 1: Coleta de dados em paralelo
        # ===========================================
        tarefas = []

        # CNPJ via BrasilAPI
        if cnpj:
            tarefas.append(("cnpj", self._coletar_cnpj(cnpj)))

        # Busca via Perplexity
        if self.perplexity:
            tarefas.append(("perplexity", self._coletar_perplexity(nome_empresa, setor)))

        # Scraping do website
        if website:
            tarefas.append(("website", self._coletar_website(website)))

        # LinkedIn da empresa
        if self.linkedin and website:
            dominio = website.replace("https://", "").replace("http://", "").split("/")[0]
            tarefas.append(("linkedin_empresa", self._coletar_linkedin_empresa(dominio)))

        # Executa coletas em paralelo
        if tarefas:
            resultados = await asyncio.gather(
                *[tarefa for _, tarefa in tarefas],
                return_exceptions=True
            )

            for i, (nome_fonte, _) in enumerate(tarefas):
                if not isinstance(resultados[i], Exception) and resultados[i]:
                    resultado["dados_coletados"][nome_fonte] = resultados[i]
                    resultado["fontes_utilizadas"].append(nome_fonte)

        # ===========================================
        # FASE 2: Análise via Claude
        # ===========================================
        if self.claude and resultado["dados_coletados"]:
            try:
                analise = await self.claude.analisar_empresa(resultado["dados_coletados"])
                resultado["analise"] = analise
                resultado["okrs_sugeridos"] = analise.get("okrs_sugeridos", [])
            except Exception as e:
                resultado["analise"] = {"erro": str(e)}

        # ===========================================
        # FASE 3: Buscar concorrentes
        # ===========================================
        if buscar_concorrentes and self.perplexity and setor:
            try:
                concorrentes_info = await self.perplexity.buscar_concorrentes(nome_empresa, setor)
                # Extrair nomes dos concorrentes e analisar cada um
                # (simplificado - em produção, usar Claude para extrair nomes)
                resultado["concorrentes_raw"] = concorrentes_info
            except Exception as e:
                resultado["concorrentes_erro"] = str(e)

        # ===========================================
        # FASE 4: Buscar pessoas do time
        # ===========================================
        if buscar_pessoas and self.linkedin:
            linkedin_empresa = resultado["dados_coletados"].get("linkedin_empresa", {})
            linkedin_url = linkedin_empresa.get("linkedin_url")

            if linkedin_url:
                try:
                    # Busca executivos/líderes
                    funcionarios = await self.linkedin.buscar_funcionarios(
                        linkedin_url,
                        cargo_filtro="Director OR CEO OR CTO OR CFO OR Manager",
                        limite=limite_pessoas
                    )
                    resultado["pessoas"] = funcionarios
                except Exception as e:
                    resultado["pessoas_erro"] = str(e)

        return resultado

    async def analisar_pessoa(
        self,
        nome: str,
        empresa: Optional[str] = None,
        cargo: Optional[str] = None,
        linkedin_url: Optional[str] = None,
        tipo: str = "funcionario",  # funcionario, politico, executivo
    ) -> Dict[str, Any]:
        """
        Análise completa de uma pessoa.

        Args:
            nome: Nome da pessoa
            empresa: Empresa relacionada
            cargo: Cargo atual
            linkedin_url: URL do LinkedIn (se conhecido)
            tipo: Tipo de pessoa

        Returns:
            Análise do perfil
        """
        resultado = {
            "nome": nome,
            "tipo": tipo,
            "timestamp": datetime.utcnow().isoformat(),
            "fontes_utilizadas": [],
            "dados_coletados": {},
            "analise": {},
        }

        # Coleta LinkedIn
        if self.linkedin:
            try:
                if linkedin_url:
                    dados_linkedin = await self.linkedin.buscar_pessoa_por_url(linkedin_url)
                else:
                    dados_linkedin = await self.linkedin.buscar_pessoa_por_nome(
                        nome, empresa=empresa, cargo=cargo
                    )

                if dados_linkedin:
                    resultado["dados_coletados"]["linkedin"] = dados_linkedin
                    resultado["fontes_utilizadas"].append("linkedin")
            except Exception as e:
                resultado["linkedin_erro"] = str(e)

        # Busca via Perplexity (especialmente para políticos)
        if self.perplexity:
            try:
                if tipo == "politico":
                    dados_perplexity = await self.perplexity.buscar_politico(nome, cargo)
                else:
                    dados_perplexity = await self.perplexity.buscar_pessoa(nome, empresa, cargo)

                resultado["dados_coletados"]["perplexity"] = dados_perplexity
                resultado["fontes_utilizadas"].append("perplexity")
            except Exception as e:
                resultado["perplexity_erro"] = str(e)

        # Análise via Claude
        if self.claude and resultado["dados_coletados"]:
            try:
                if tipo == "politico":
                    analise = await self.claude.analisar_politico(resultado["dados_coletados"])
                else:
                    analise = await self.claude.analisar_pessoa(resultado["dados_coletados"])

                resultado["analise"] = analise
            except Exception as e:
                resultado["analise"] = {"erro": str(e)}

        return resultado

    async def analisar_alinhamento_okr(
        self,
        okrs_definidos: List[Dict[str, Any]],
        analise_empresa: Dict[str, Any],
        analise_pessoas: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Analisa se os OKRs definidos estão alinhados com a visão externa.

        Args:
            okrs_definidos: OKRs definidos internamente pela empresa
            analise_empresa: Análise da empresa (percepção externa)
            analise_pessoas: Análise das pessoas do time

        Returns:
            Análise de alinhamento
        """
        if not self.claude:
            return {"erro": "Claude API não configurada"}

        prompt_dados = {
            "okrs_definidos": okrs_definidos,
            "percepcao_externa_empresa": analise_empresa.get("analise", {}),
            "okrs_sugeridos_externos": analise_empresa.get("okrs_sugeridos", []),
            "perfil_time": [p.get("analise", {}) for p in analise_pessoas],
        }

        prompt = f"""
Analise o alinhamento entre os OKRs definidos internamente e a percepção externa da empresa:

DADOS:
{prompt_dados}

Retorne APENAS um JSON válido com esta estrutura:
{{
    "score_alinhamento_geral": 0-100,
    "analise_por_okr": [
        {{
            "okr": "objetivo analisado",
            "alinhamento_visao_externa": 0-100,
            "gaps_identificados": ["gaps entre OKR e percepção externa"],
            "recomendacoes": ["recomendações de ajuste"]
        }}
    ],
    "competencias_time_vs_okrs": {{
        "competencias_presentes": ["competências do time que suportam OKRs"],
        "competencias_ausentes": ["competências necessárias não identificadas no time"],
        "score_capacidade_execucao": 0-100
    }},
    "consistencia_comunicacao": {{
        "score": 0-100,
        "divergencias": ["pontos onde comunicação externa diverge dos OKRs"],
        "recomendacoes": ["recomendações para alinhar comunicação"]
    }},
    "resumo_executivo": "resumo do alinhamento em 3-4 frases",
    "acoes_prioritarias": ["top 5 ações para melhorar alinhamento"]
}}
"""

        try:
            return await self.claude._analyze(prompt)
        except Exception as e:
            return {"erro": str(e)}

    # ===========================================
    # Métodos auxiliares de coleta
    # ===========================================

    async def _coletar_cnpj(self, cnpj: str) -> Dict[str, Any]:
        """Coleta dados via BrasilAPI"""
        return await self.brasil_api.buscar_cnpj(cnpj)

    async def _coletar_perplexity(self, nome: str, setor: Optional[str]) -> Dict[str, Any]:
        """Coleta dados via Perplexity"""
        return await self.perplexity.buscar_empresa(nome, setor)

    async def _coletar_website(self, url: str) -> Dict[str, Any]:
        """Coleta dados do website"""
        return await self.scraper.extrair_conteudo(url)

    async def _coletar_linkedin_empresa(self, dominio: str) -> Dict[str, Any]:
        """Coleta dados do LinkedIn da empresa"""
        return await self.linkedin.buscar_empresa_por_dominio(dominio)
