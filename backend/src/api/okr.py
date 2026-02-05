"""
API Endpoints - OKR Management and Analysis
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json

from src.config import get_settings
from src.okr.excel_importer import OKRExcelImporter
from src.okr.alignment_analyzer import OKRAlignmentAnalyzer


router = APIRouter()


# ===========================================
# Request/Response Models
# ===========================================

class AnalisarAlinhamentoRequest(BaseModel):
    okrs_definidos: Dict[str, Any]  # OKRs importados
    analise_empresa: Dict[str, Any]  # Análise de inteligência
    analise_concorrentes: Optional[List[Dict[str, Any]]] = None
    contexto_politico: Optional[str] = None
    contexto_economico: Optional[str] = None


# ===========================================
# Endpoints
# ===========================================

@router.post("/importar-excel")
async def importar_okrs_excel(
    file: UploadFile = File(...),
    ciclo_nome: str = Form(default="OKRs Importados"),
):
    """
    Importa OKRs de um arquivo Excel.

    Formato esperado:
    - Área, Objetivo, Key Result (KR), Métrica, Meta, Prazo, Status

    Returns:
        Estrutura hierárquica de OKRs
    """
    # Valida tipo de arquivo
    if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(
            status_code=400,
            detail="Formato não suportado. Use .xlsx, .xls ou .csv"
        )

    try:
        content = await file.read()
        importer = OKRExcelImporter()
        resultado = importer.importar_bytes(content, file.filename)
        resultado["ciclo"]["nome"] = ciclo_nome

        return {
            "status": "success",
            "message": f"Importados {resultado['estatisticas']['total_objetivos']} objetivos com {resultado['estatisticas']['total_key_results']} key results",
            "data": resultado
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analisar-alinhamento")
async def analisar_alinhamento_okrs(request: AnalisarAlinhamentoRequest):
    """
    Analisa alinhamento entre OKRs definidos e percepção externa.

    Compara:
    - OKRs definidos (do Excel)
    - Objetivos observados (análise externa)
    - Contexto político/econômico
    - Concorrentes

    Returns:
        Análise completa com scores, gaps e recomendações
    """
    settings = get_settings()

    if not getattr(settings, 'anthropic_api_key', ''):
        raise HTTPException(
            status_code=500,
            detail="Anthropic API key não configurada"
        )

    try:
        analyzer = OKRAlignmentAnalyzer(settings.anthropic_api_key)

        resultado = await analyzer.analisar_alinhamento_completo(
            okrs_definidos=request.okrs_definidos,
            analise_empresa=request.analise_empresa,
            analise_concorrentes=request.analise_concorrentes,
            contexto_politico=request.contexto_politico,
            contexto_economico=request.contexto_economico,
        )

        return {
            "status": "success",
            "data": resultado
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/guia-estrategico")
async def gerar_guia_estrategico(
    okrs_definidos: Dict[str, Any],
    analise_alinhamento: Dict[str, Any],
):
    """
    Gera um guia estratégico consolidado.

    O guia mostra na primeira página:
    - Objetivos observados vs descritos
    - Grau de dificuldade
    - Riscos
    - Ameaças e oportunidades
    - Contexto político

    Returns:
        Guia estruturado para visualização
    """
    settings = get_settings()

    try:
        guia = {
            "titulo": "Guia Estratégico de OKRs",
            "data_geracao": analise_alinhamento.get("timestamp"),

            # Página 1: Visão Geral
            "visao_geral": {
                "score_alinhamento": analise_alinhamento.get("analise_geral", {}).get("score_alinhamento_geral"),
                "score_coerencia": analise_alinhamento.get("analise_geral", {}).get("score_coerencia"),
                "score_viabilidade": analise_alinhamento.get("analise_geral", {}).get("score_viabilidade"),
                "resumo_executivo": analise_alinhamento.get("analise_geral", {}).get("resumo_executivo"),
            },

            # Página 2: Comparativo Objetivos Definidos vs Observados
            "comparativo_objetivos": {
                "objetivos_definidos": [
                    {
                        "area": area.get("nome"),
                        "objetivos": [obj.get("titulo") for obj in area.get("objetivos", [])]
                    }
                    for area in okrs_definidos.get("areas", [])
                ],
                "objetivos_observados": analise_alinhamento.get("objetivos_observados", []),
                "alinhamentos": analise_alinhamento.get("analise_geral", {}).get("principais_alinhamentos", []),
                "desalinhamentos": analise_alinhamento.get("analise_geral", {}).get("principais_desalinhamentos", []),
            },

            # Página 3: Análise de Dificuldade e Riscos
            "analise_riscos": {
                "por_objetivo": [
                    {
                        "objetivo": obj.get("objetivo_titulo"),
                        "area": obj.get("area"),
                        "grau_dificuldade": obj.get("grau_dificuldade"),
                        "riscos": obj.get("riscos", []),
                    }
                    for obj in analise_alinhamento.get("analise_por_objetivo", [])
                ],
                "riscos_contextuais": analise_alinhamento.get("analise_geral", {}).get("riscos_contextuais", []),
            },

            # Página 4: SWOT Consolidado
            "swot_consolidado": {
                "forcas": _consolidar_lista([obj.get("forcas", []) for obj in analise_alinhamento.get("analise_por_objetivo", [])]),
                "fraquezas": _consolidar_lista([obj.get("fraquezas", []) for obj in analise_alinhamento.get("analise_por_objetivo", [])]),
                "oportunidades": _consolidar_lista([obj.get("oportunidades", []) for obj in analise_alinhamento.get("analise_por_objetivo", [])]),
                "ameacas": _consolidar_lista([obj.get("ameacas", []) for obj in analise_alinhamento.get("analise_por_objetivo", [])]),
            },

            # Página 5: Posição vs Concorrentes
            "posicao_competitiva": analise_alinhamento.get("analise_geral", {}).get("comparativo_concorrentes", {}),

            # Página 6: Gaps e Recomendações
            "gaps_identificados": analise_alinhamento.get("gaps_identificados", []),
            "recomendacoes": analise_alinhamento.get("recomendacoes", []),

            # Página 7: Plano de Ação
            "plano_acao": _gerar_plano_acao(analise_alinhamento),
        }

        return {
            "status": "success",
            "data": guia
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _consolidar_lista(listas: List[List]) -> List[str]:
    """Consolida múltiplas listas removendo duplicatas"""
    resultado = []
    vistos = set()
    for lista in listas:
        for item in (lista or []):
            if item and item not in vistos:
                resultado.append(item)
                vistos.add(item)
    return resultado[:10]  # Top 10


def _gerar_plano_acao(analise: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Gera plano de ação baseado nas recomendações"""
    acoes = []

    # Prioriza recomendações estratégicas
    for i, rec in enumerate(analise.get("recomendacoes", [])[:10]):
        acoes.append({
            "ordem": i + 1,
            "acao": rec.get("descricao"),
            "tipo": rec.get("tipo"),
            "area": rec.get("area", "Geral"),
            "prioridade": rec.get("prioridade", "media"),
        })

    return acoes
