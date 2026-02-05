"""
API Endpoints - Inteligência Competitiva
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

from src.config import get_settings
from src.intelligence.orchestrator import IntelligenceOrchestrator


router = APIRouter()


# ===========================================
# Request/Response Models
# ===========================================

class AnalisarEmpresaRequest(BaseModel):
    nome: str
    cnpj: Optional[str] = None
    website: Optional[str] = None
    setor: Optional[str] = None
    buscar_concorrentes: bool = True
    buscar_pessoas: bool = True
    cliente_id: Optional[str] = None  # ID do cliente que está pesquisando


class AnalisarPessoaRequest(BaseModel):
    nome: str
    empresa: Optional[str] = None
    cargo: Optional[str] = None
    linkedin_url: Optional[str] = None
    tipo: str = "funcionario"  # funcionario, politico, executivo, socio
    cliente_id: Optional[str] = None


class AnalisarAlinhamentoRequest(BaseModel):
    okrs_definidos: List[Dict[str, Any]]
    empresa_id: str  # ID da análise de empresa
    incluir_analise_pessoas: bool = True


class BuscarCNPJRequest(BaseModel):
    cnpj: str


# ===========================================
# Endpoints
# ===========================================

@router.post("/empresa/analisar")
async def analisar_empresa(request: AnalisarEmpresaRequest, background_tasks: BackgroundTasks):
    """
    Inicia análise completa de uma empresa.

    Coleta dados de:
    - BrasilAPI (CNPJ)
    - Perplexity (busca inteligente)
    - Website (scraping)
    - LinkedIn (empresa e pessoas)

    Analisa via Claude:
    - SWOT
    - OKRs sugeridos
    - Concorrentes
    - Perfil do time
    """
    settings = get_settings()

    orchestrator = IntelligenceOrchestrator(
        openai_api_key=settings.openai_api_key,
        anthropic_api_key=getattr(settings, 'anthropic_api_key', ''),
        perplexity_api_key=getattr(settings, 'perplexity_api_key', ''),
        proxycurl_api_key=getattr(settings, 'proxycurl_api_key', ''),
    )

    try:
        resultado = await orchestrator.analisar_empresa_completa(
            nome_empresa=request.nome,
            cnpj=request.cnpj,
            website=request.website,
            setor=request.setor,
            buscar_concorrentes=request.buscar_concorrentes,
            buscar_pessoas=request.buscar_pessoas,
        )

        # TODO: Salvar no banco (fato_pesquisas, fato_analise_empresa)

        return {
            "status": "success",
            "data": resultado
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pessoa/analisar")
async def analisar_pessoa(request: AnalisarPessoaRequest):
    """
    Analisa perfil de uma pessoa.

    Para funcionários/executivos:
    - LinkedIn (experiência, habilidades)
    - Perplexity (notícias, publicações)

    Para políticos:
    - Perplexity (atuação, votações, projetos)
    - Portais de transparência
    """
    settings = get_settings()

    orchestrator = IntelligenceOrchestrator(
        openai_api_key=settings.openai_api_key,
        anthropic_api_key=getattr(settings, 'anthropic_api_key', ''),
        perplexity_api_key=getattr(settings, 'perplexity_api_key', ''),
        proxycurl_api_key=getattr(settings, 'proxycurl_api_key', ''),
    )

    try:
        resultado = await orchestrator.analisar_pessoa(
            nome=request.nome,
            empresa=request.empresa,
            cargo=request.cargo,
            linkedin_url=request.linkedin_url,
            tipo=request.tipo,
        )

        # TODO: Salvar no banco (dim_pessoas, fato_analise_pessoa)

        return {
            "status": "success",
            "data": resultado
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alinhamento/analisar")
async def analisar_alinhamento(request: AnalisarAlinhamentoRequest):
    """
    Analisa alinhamento entre OKRs definidos e percepção externa.

    Compara:
    - OKRs definidos internamente
    - Percepção externa (site, comunicação)
    - Competências do time

    Retorna:
    - Score de alinhamento
    - Gaps identificados
    - Recomendações
    """
    settings = get_settings()

    # TODO: Buscar análise da empresa do banco
    # analise_empresa = await get_analise_empresa(request.empresa_id)
    # analise_pessoas = await get_analise_pessoas(request.empresa_id)

    orchestrator = IntelligenceOrchestrator(
        anthropic_api_key=getattr(settings, 'anthropic_api_key', ''),
    )

    try:
        # Placeholder - em produção, buscar do banco
        analise_empresa = {}  # TODO
        analise_pessoas = []  # TODO

        resultado = await orchestrator.analisar_alinhamento_okr(
            okrs_definidos=request.okrs_definidos,
            analise_empresa=analise_empresa,
            analise_pessoas=analise_pessoas,
        )

        return {
            "status": "success",
            "data": resultado
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cnpj/buscar")
async def buscar_cnpj(request: BuscarCNPJRequest):
    """
    Busca dados de empresa pelo CNPJ via BrasilAPI (gratuito).

    Retorna:
    - Razão social, nome fantasia
    - Endereço completo
    - CNAE principal e secundários
    - Quadro societário
    - Situação cadastral
    """
    from src.intelligence.brasil_api import BrasilAPIService

    service = BrasilAPIService()

    try:
        resultado = await service.buscar_cnpj(request.cnpj)

        if not resultado:
            raise HTTPException(status_code=404, detail="CNPJ não encontrado")

        return {
            "status": "success",
            "data": resultado
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fontes")
async def listar_fontes():
    """
    Lista fontes de dados disponíveis e status.
    """
    settings = get_settings()

    fontes = [
        {
            "nome": "brasilapi",
            "tipo": "api",
            "status": "ativo",
            "custo": "gratuito",
            "descricao": "Dados de CNPJ, CEP, bancos, etc"
        },
        {
            "nome": "perplexity",
            "tipo": "llm",
            "status": "ativo" if getattr(settings, 'perplexity_api_key', '') else "não configurado",
            "custo": "pago",
            "descricao": "Busca inteligente com fontes"
        },
        {
            "nome": "proxycurl",
            "tipo": "api",
            "status": "ativo" if getattr(settings, 'proxycurl_api_key', '') else "não configurado",
            "custo": "pago (~$0.01/req)",
            "descricao": "Dados do LinkedIn"
        },
        {
            "nome": "claude",
            "tipo": "llm",
            "status": "ativo" if getattr(settings, 'anthropic_api_key', '') else "não configurado",
            "custo": "pago",
            "descricao": "Análise e estruturação de dados"
        },
        {
            "nome": "website_scraper",
            "tipo": "scraping",
            "status": "ativo",
            "custo": "gratuito",
            "descricao": "Extração de conteúdo de sites"
        },
    ]

    return {"fontes": fontes}
