#!/usr/bin/env python3
"""
SKILL: skill-indicadores-fiscais
Calcula os 5 indicadores fiscais LRF para todos os municipios.

Indicadores:
    1. Despesa com Pessoal (dp_) - Anexo 01
    2. Deficit Atuarial RPPS (da_) - Anexos 02 e 05
    3. Disponibilidade de Caixa (dc_) - Anexo 05
    4. Liquidez (lq_) - Anexo 05
    5. Proporcao Ativos/Inativos (pa_) - Anexo 01

Uso:
    python script.py --exercicio 2024 --periodo 3
    python script.py --todos

Variaveis de ambiente:
    SUPABASE_URL: URL do projeto Supabase
    SUPABASE_SERVICE_KEY: Chave de servico
"""

import os
import sys
import logging
import argparse
from datetime import datetime

from supabase import create_client, Client

# Configuracao
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://tijadrwimhxlggzxuwna.supabase.co')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

# Limites LRF para Municipios (Poder Executivo)
LIMITES = {
    'despesa_pessoal': {
        'ok': 48.6,        # Normal
        'alerta': 51.3,    # Alerta
        'limite': 54.0     # Limite maximo
    },
    'cobertura_rpps': {
        'ok': 90,          # >= 90% = Normal
        'prudencial': 60,  # 60-89% = Prudencial
        'alerta': 30       # 30-59% = Alerta, < 30% = Critico
    },
    'disponibilidade_caixa': {
        # Percentual da RCL - baseado em boas praticas fiscais
        'ok': 10.0,        # >= 10% da RCL = Normal (reserva adequada)
        'prudencial': 5.0, # 5-9.99% = Prudencial (margem apertada)
        'alerta': 1.0      # 1-4.99% = Alerta (liquidez baixa), < 1% = Critico
    },
    'liquidez': {
        # Percentual da RCL (mesmo padrao de disponibilidade_caixa)
        'ok': 10.0,        # >= 10% da RCL = Normal
        'prudencial': 5.0, # 5-9.99% = Prudencial
        'alerta': 1.0      # 1-4.99% = Alerta, < 1% = Critico
    },
    'ativos_inativos': {
        'ok': 4.0,         # >= 4.0 = Normal
        'alerta': 2.0      # 2.0-3.99 = Alerta, < 2.0 = Critico
    }
}

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('skill_indicadores_fiscais.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class CalculadorIndicadores:
    """Calcula os 5 indicadores fiscais LRF para municipios."""

    def __init__(self):
        if not SUPABASE_SERVICE_KEY:
            raise ValueError("SUPABASE_SERVICE_KEY nao configurada!")

        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        self.stats = {'processados': 0, 'atualizados': 0, 'erros': 0}

    # =========================================
    # CLASSIFICADORES DE STATUS
    # =========================================

    def classificar_despesa_pessoal(self, pct):
        """
        Classifica status de despesa com pessoal.
        >= 54% = CRITICO, >= 51.3% = PRUDENCIAL, >= 48.6% = ALERTA, < 48.6% = NORMAL
        """
        if pct is None:
            return 'SEM_DADOS'
        if pct >= LIMITES['despesa_pessoal']['limite']:
            return 'CRITICO'
        elif pct >= LIMITES['despesa_pessoal']['alerta']:
            return 'PRUDENCIAL'
        elif pct >= LIMITES['despesa_pessoal']['ok']:
            return 'ALERTA'
        return 'NORMAL'

    def classificar_cobertura_rpps(self, pct):
        """
        Classifica cobertura do RPPS (ativos/passivo atuarial).
        >= 90% = NORMAL, 60-89% = PRUDENCIAL, 30-59% = ALERTA, < 30% = CRITICO
        """
        if pct is None:
            return 'SEM_DADOS'
        if pct >= LIMITES['cobertura_rpps']['ok']:
            return 'NORMAL'
        elif pct >= LIMITES['cobertura_rpps']['prudencial']:
            return 'PRUDENCIAL'
        elif pct >= LIMITES['cobertura_rpps']['alerta']:
            return 'ALERTA'
        return 'CRITICO'

    def classificar_disponibilidade_caixa(self, disp_liquida, rcl):
        """
        Classifica disponibilidade liquida de caixa como % da RCL.
        Valor negativo (insuficiencia) = CRITICO independente da RCL.
        >= 10% RCL = NORMAL, 5-9.99% = PRUDENCIAL, 1-4.99% = ALERTA, < 1% = CRITICO
        """
        if disp_liquida is None:
            return 'SEM_DADOS'

        # Insuficiencia absoluta (valor negativo) = sempre critico
        if disp_liquida < 0:
            return 'CRITICO'

        # Se nao tem RCL, usa fallback por valor absoluto
        if rcl is None or float(rcl) <= 0:
            # Fallback: sem RCL usa thresholds absolutos
            if disp_liquida < 100000:  # < R$ 100k
                return 'CRITICO'
            elif disp_liquida < 500000:  # < R$ 500k
                return 'ALERTA'
            elif disp_liquida < 1000000:  # < R$ 1M
                return 'PRUDENCIAL'
            return 'NORMAL'

        # Classifica por percentual da RCL
        percentual = (float(disp_liquida) / float(rcl)) * 100

        if percentual >= LIMITES['disponibilidade_caixa']['ok']:
            return 'NORMAL'
        elif percentual >= LIMITES['disponibilidade_caixa']['prudencial']:
            return 'PRUDENCIAL'
        elif percentual >= LIMITES['disponibilidade_caixa']['alerta']:
            return 'ALERTA'
        return 'CRITICO'

    def calcular_percentual_disponibilidade_rcl(self, disp_liquida, rcl):
        """Calcula o percentual da disponibilidade em relacao a RCL."""
        if disp_liquida is None or rcl is None or float(rcl) <= 0:
            return None
        return round((float(disp_liquida) / float(rcl)) * 100, 2)

    def classificar_liquidez(self, lq_caixa, rcl):
        """
        Classifica liquidez (Caixa Bruta) como % da RCL.
        >= 10% RCL = NORMAL, 5-9.99% = PRUDENCIAL, 1-4.99% = ALERTA, < 1% = CRITICO
        """
        if lq_caixa is None:
            return 'SEM_DADOS'

        # Se nao tem RCL, usa fallback por valor absoluto
        if rcl is None or float(rcl) <= 0:
            if lq_caixa < 100000:  # < R$ 100k
                return 'CRITICO'
            elif lq_caixa < 500000:  # < R$ 500k
                return 'ALERTA'
            elif lq_caixa < 1000000:  # < R$ 1M
                return 'PRUDENCIAL'
            return 'NORMAL'

        # Classifica por percentual da RCL
        percentual = (float(lq_caixa) / float(rcl)) * 100

        if percentual >= LIMITES['liquidez']['ok']:
            return 'NORMAL'
        elif percentual >= LIMITES['liquidez']['prudencial']:
            return 'PRUDENCIAL'
        elif percentual >= LIMITES['liquidez']['alerta']:
            return 'ALERTA'
        return 'CRITICO'

    def calcular_percentual_liquidez_rcl(self, lq_caixa, rcl):
        """Calcula o percentual do caixa de liquidez em relacao a RCL."""
        if lq_caixa is None or rcl is None or float(rcl) <= 0:
            return None
        return round((float(lq_caixa) / float(rcl)) * 100, 2)

    def classificar_ativos_inativos(self, proporcao):
        """
        Classifica proporcao ativos/inativos.
        >= 4.0 = NORMAL, 2.0-3.99 = ALERTA, < 2.0 = CRITICO
        """
        if proporcao is None:
            return 'SEM_DADOS'
        if proporcao >= LIMITES['ativos_inativos']['ok']:
            return 'NORMAL'
        elif proporcao >= LIMITES['ativos_inativos']['alerta']:
            return 'ALERTA'
        return 'CRITICO'

    def classificar_risco_consolidado(self, status_dict):
        """
        Calcula risco consolidado baseado em todos os 5 indicadores.
        """
        valores = [v for v in status_dict.values() if v and v != 'SEM_DADOS']

        criticos = sum(1 for v in valores if v == 'CRITICO')
        alertas = sum(1 for v in valores if v in ['ALERTA', 'PRUDENCIAL'])

        if criticos >= 3:
            return 'CRITICO'
        elif criticos >= 2:
            return 'ALTO'
        elif criticos >= 1 or alertas >= 3:
            return 'ALTO'
        elif alertas >= 2:
            return 'MEDIO'
        elif alertas >= 1:
            return 'BAIXO'
        return 'NORMAL'

    # =========================================
    # BUSCA DE DADOS
    # =========================================

    def buscar_dados_rgf(self, codigo_ibge, exercicio, periodo):
        """Busca todos os dados RGF de um municipio."""
        try:
            result = self.supabase.table('siconfi_rgf').select('*').eq(
                'codigo_ibge', codigo_ibge
            ).eq('exercicio', exercicio).eq('periodo', periodo).eq(
                'esfera', 'M'
            ).execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Erro buscar RGF {codigo_ibge}: {e}")
            return []

    def separar_por_anexo(self, dados):
        """Separa os dados por anexo do RGF."""
        anexos = {
            'anexo_01': [],  # Despesa com Pessoal
            'anexo_02': [],  # Divida Consolidada / Deficit Atuarial
            'anexo_05': [],  # Disponibilidade de Caixa
        }
        for row in dados:
            anexo = (row.get('anexo') or '').upper()
            if 'ANEXO 01' in anexo:
                anexos['anexo_01'].append(row)
            elif 'ANEXO 02' in anexo:
                anexos['anexo_02'].append(row)
            elif 'ANEXO 05' in anexo:
                anexos['anexo_05'].append(row)
        return anexos

    # =========================================
    # EXTRATORES DE VALORES
    # =========================================

    def extrair_valor(self, dados, conta_pattern, coluna_pattern=None, priorizar_dtp_vi=False):
        """
        Extrai valor de um registro especifico.
        Para Despesa com Pessoal, prioriza DTP (VI) sobre DTP (VIII).
        """
        candidatos = []

        for row in dados:
            conta = (row.get('conta') or '').upper()
            if conta_pattern.upper() in conta:
                if coluna_pattern:
                    coluna = (row.get('coluna') or '').upper()
                    if coluna_pattern.upper() in coluna:
                        valor = row.get('valor')
                        if valor is not None:
                            prioridade = 3
                            if priorizar_dtp_vi:
                                if '(VI)' in conta:
                                    prioridade = 1
                                elif '(VIII)' in conta:
                                    prioridade = 2
                            candidatos.append((prioridade, valor))
                else:
                    valor = row.get('valor')
                    if valor is not None:
                        prioridade = 3
                        if priorizar_dtp_vi:
                            if '(VI)' in conta:
                                prioridade = 1
                            elif '(VIII)' in conta:
                                prioridade = 2
                        candidatos.append((prioridade, valor))

        if candidatos:
            candidatos.sort(key=lambda x: x[0])
            return candidatos[0][1]
        return None

    def extrair_soma(self, dados, conta_patterns, coluna_pattern):
        """
        Extrai e soma valores de multiplas contas.
        Usado para somar totais de recursos (nao vinculados + vinculados exceto RPPS).
        """
        total = 0
        encontrou = False

        for row in dados:
            conta = (row.get('conta') or '').upper()
            coluna = (row.get('coluna') or '').upper()

            for pattern in conta_patterns:
                if pattern.upper() in conta and coluna_pattern.upper() in coluna:
                    valor = row.get('valor')
                    if valor is not None:
                        total += float(valor)
                        encontrou = True
                    break

        return total if encontrou else None

    # =========================================
    # CALCULO DOS 5 INDICADORES
    # =========================================

    def calcular_indicador_1_despesa_pessoal(self, anexo_01):
        """
        INDICADOR 1: Despesa com Pessoal (% da RCL)
        Fonte: Anexo 01 RGF
        """
        # RCL
        rcl = self.extrair_valor(anexo_01, 'RECEITA CORRENTE LIQUIDA', 'VALOR')

        # Despesa Total com Pessoal - prioriza DTP (VI) sobre DTP (VIII)
        dp_valor = self.extrair_valor(
            anexo_01,
            'DESPESA TOTAL COM PESSOAL',
            'VALOR',
            priorizar_dtp_vi=True
        )

        # Calcular percentual
        dp_pct = None
        if dp_valor and rcl and float(rcl) > 0:
            dp_pct = (float(dp_valor) / float(rcl)) * 100

        return {
            'dp_valor_total': dp_valor,
            'dp_rcl': rcl,
            'dp_percentual': round(dp_pct, 2) if dp_pct else None,
            'dp_status': self.classificar_despesa_pessoal(dp_pct)
        }

    def calcular_indicador_2_deficit_atuarial(self, anexo_02, anexo_05, periodo):
        """
        INDICADOR 2: Deficit Atuarial do RPPS
        Fonte: Anexo 02 (Passivo) e Anexo 05 (Ativos RPPS)
        Cobertura = (Ativos / Passivo) * 100
        """
        # Passivo Atuarial do Anexo 02 (coluna do quadrimestre atual)
        coluna_quad = f'{periodo}' + '%QUADRIMESTRE'
        passivo = self.extrair_valor(anexo_02, 'PASSIVO ATUARIAL', coluna_quad)

        # Se nao encontrou com filtro de quadrimestre, tenta sem
        if passivo is None:
            passivo = self.extrair_valor(anexo_02, 'PASSIVO ATUARIAL', 'QUADRIMESTRE')

        # Ativos do RPPS do Anexo 05
        ativo = self.extrair_valor(
            anexo_05,
            'TOTAL DOS RECURSOS VINCULADOS AO RPPS',
            'DISPONIBILIDADE DE CAIXA'
        )

        # Calcular deficit e cobertura
        deficit = None
        cobertura = None

        if passivo is not None and float(passivo) > 0:
            ativo_val = float(ativo) if ativo else 0
            passivo_val = float(passivo)
            deficit = passivo_val - ativo_val
            cobertura = (ativo_val / passivo_val) * 100

        return {
            'da_passivo_atuarial': passivo,
            'da_ativo_plano': ativo,
            'da_deficit': round(deficit, 2) if deficit else None,
            'da_cobertura_percentual': round(cobertura, 2) if cobertura else None,
            'da_status': self.classificar_cobertura_rpps(cobertura)
        }

    def calcular_indicador_3_disponibilidade_caixa(self, anexo_05, rcl=None):
        """
        INDICADOR 3: Disponibilidade de Caixa
        Fonte: Anexo 05 RGF

        Estrategia:
        1. Tentar usar DISPONIBILIDADE DE CAIXA LIQUIDA diretamente (ja calculada no RGF)
        2. Fallback: Calcular manualmente (Caixa Bruta - Obrigacoes)

        Classificacao: % da RCL (recebida do Indicador 1)
        """
        # Padroes de contas para totais (excluindo RPPS)
        contas_totais = [
            'TOTAL DOS RECURSOS NAO VINCULADOS',
            'TOTAL DOS RECURSOS NÃO VINCULADOS',
            'TOTAL DOS RECURSOS VINCULADOS (EXCETO',
            'TOTAL DOS RECURSOS VINCULADOS%(EXCETO',
            'TOTAL DOS RECURSOS VINCULADOS%(exceto',
        ]

        # ESTRATEGIA 1: Tentar pegar disponibilidade liquida diretamente
        disp_liquida_direta = self.extrair_soma(
            anexo_05,
            contas_totais,
            'DISPONIBILIDADE DE CAIXA LÍQUIDA (ANTES'  # Coluna (g)
        )

        # Se nao encontrou, tentar variacao sem acento
        if disp_liquida_direta is None:
            disp_liquida_direta = self.extrair_soma(
                anexo_05,
                contas_totais,
                'DISPONIBILIDADE DE CAIXA LIQUIDA'
            )

        # Caixa Bruta - soma dos totais
        caixa_bruta = self.extrair_soma(
            anexo_05,
            contas_totais,
            'DISPONIBILIDADE DE CAIXA BRUTA'
        )

        # Restos a Pagar do Exercicio - coluna (c)
        rp_exercicio = self.extrair_soma(
            anexo_05,
            contas_totais,
            'Do Exercício (c)'  # Nome exato da coluna
        )

        # Fallback: tentar padrao antigo
        if rp_exercicio is None:
            rp_exercicio = self.extrair_soma(
                anexo_05,
                contas_totais,
                'DO EXERC'
            )

        # Restos a Pagar de Exercicios Anteriores - coluna (b)
        rp_anteriores = self.extrair_soma(
            anexo_05,
            contas_totais,
            'De Exercícios Anteriores'
        )

        # Total de obrigacoes (para calculo de liquidez)
        total_obrigacoes = None
        if rp_exercicio is not None or rp_anteriores is not None:
            total_obrigacoes = (float(rp_exercicio) if rp_exercicio else 0) + \
                              (float(rp_anteriores) if rp_anteriores else 0)

        # Disponibilidade Liquida - usar direta ou calcular
        disp_liquida = None
        if disp_liquida_direta is not None:
            disp_liquida = disp_liquida_direta
        elif caixa_bruta is not None:
            # Calcular manualmente: Caixa Bruta - Obrigacoes
            obrig = total_obrigacoes if total_obrigacoes else 0
            disp_liquida = float(caixa_bruta) - obrig

        # Calcular percentual da RCL
        dc_percentual_rcl = None
        if disp_liquida is not None and rcl and float(rcl) > 0:
            dc_percentual_rcl = round((float(disp_liquida) / float(rcl)) * 100, 2)

        return {
            'dc_caixa_bruta': round(caixa_bruta, 2) if caixa_bruta else None,
            'dc_rp_processados': round(total_obrigacoes, 2) if total_obrigacoes else None,
            'dc_disponibilidade_liquida': round(disp_liquida, 2) if disp_liquida is not None else None,
            'dc_percentual_rcl': dc_percentual_rcl,
            'dc_status': self.classificar_disponibilidade_caixa(disp_liquida, rcl)
        }

    def calcular_indicador_4_liquidez(self, dc_caixa_bruta, dc_rp_processados, rcl=None):
        """
        INDICADOR 4: Liquidez (Caixa Bruta como % da RCL)
        Derivado do Indicador 3 (Disponibilidade de Caixa)
        Classificacao: Baseada no % da RCL (>=10% NORMAL, 5-9.99% PRUDENCIAL, 1-4.99% ALERTA, <1% CRITICO)
        """
        indice = None
        lq_percentual_rcl = None
        status = 'SEM_DADOS'

        if dc_caixa_bruta is not None:
            # Calcular indice de liquidez (mantido para compatibilidade)
            if dc_rp_processados is not None and float(dc_rp_processados) > 0:
                indice = float(dc_caixa_bruta) / float(dc_rp_processados)

            # Calcular percentual da RCL
            if rcl and float(rcl) > 0:
                lq_percentual_rcl = round((float(dc_caixa_bruta) / float(rcl)) * 100, 2)

            # Classificar pelo % da RCL
            status = self.classificar_liquidez(dc_caixa_bruta, rcl)

        return {
            'lq_caixa': dc_caixa_bruta,
            'lq_obrigacoes_cp': dc_rp_processados,
            'lq_indice': round(indice, 4) if indice else None,
            'lq_percentual_rcl': lq_percentual_rcl,
            'lq_status': status
        }

    def calcular_indicador_5_ativos_inativos(self, anexo_01):
        """
        INDICADOR 5: Proporcao Ativos/Inativos
        Fonte: Anexo 01 RGF

        Contas no RGF:
        - "Pessoal Ativo" - coluna "TOTAL (ÚLTIMOS 12 MESES) (a)"
        - "Pessoal Inativo e Pensionistas" - coluna "TOTAL (ÚLTIMOS 12 MESES) (a)"

        Interpretacao:
        - Proporcao alta (>= 4): Mais ativos que inativos = sustentavel
        - Proporcao baixa (< 2): Mais inativos = pressao previdenciaria
        - Municipio sem RPPS ou sem inativos: considerar NORMAL
        """
        # Coluna correta do total
        coluna_total = 'TOTAL (ÚLTIMOS 12 MESES)'

        # Despesa com Pessoal Ativo
        ativos = self.extrair_valor(
            anexo_01,
            'Pessoal Ativo',  # Nome exato (case-insensitive na busca)
            coluna_total
        )

        # Fallback: tentar variacao do nome
        if ativos is None:
            ativos = self.extrair_valor(anexo_01, 'PESSOAL ATIVO', coluna_total)
        if ativos is None:
            ativos = self.extrair_valor(anexo_01, 'Pessoal Ativo', 'TOTAL')

        # Despesa com Inativos e Pensionistas
        inativos = self.extrair_valor(
            anexo_01,
            'Pessoal Inativo e Pensionistas',  # Nome exato
            coluna_total
        )

        # Fallbacks para inativos
        if inativos is None:
            inativos = self.extrair_valor(
                anexo_01,
                'Inativos e Pensionistas com Recursos Vinculados',
                coluna_total
            )
        if inativos is None:
            inativos = self.extrair_valor(anexo_01, 'PESSOAL INATIVO', coluna_total)
        if inativos is None:
            inativos = self.extrair_valor(anexo_01, 'Pessoal Inativo', 'TOTAL')
        if inativos is None:
            inativos = self.extrair_valor(anexo_01, 'INATIVOS E PENSIONISTAS', 'TOTAL')

        # Calcular proporcao
        proporcao = None
        status = 'SEM_DADOS'

        # Caso 1: Tem ambos os valores
        if ativos is not None and inativos is not None:
            ativos_val = float(ativos)
            inativos_val = float(inativos)

            if inativos_val > 0:
                proporcao = ativos_val / inativos_val
                status = self.classificar_ativos_inativos(proporcao)
            elif ativos_val > 0:
                # Tem ativos mas inativos = 0 (municipio sem aposentados ou sem RPPS)
                proporcao = None
                status = 'NORMAL'  # Situacao saudavel - nao tem peso previdenciario
            else:
                # Ambos zero - situacao anomala
                status = 'SEM_DADOS'

        # Caso 2: Tem apenas ativos (municipio pode nao ter RPPS)
        elif ativos is not None and float(ativos) > 0:
            # Municipio sem registro de inativos - comum em cidades sem RPPS
            proporcao = None
            status = 'NORMAL'

        return {
            'pa_despesa_ativos': ativos,
            'pa_despesa_inativos': inativos,
            'pa_proporcao': round(proporcao, 4) if proporcao else None,
            'pa_status': status
        }

    # =========================================
    # CALCULO PRINCIPAL
    # =========================================

    def calcular_indicadores_municipio(self, codigo_ibge, exercicio, periodo):
        """Calcula todos os 5 indicadores de um municipio."""
        dados = self.buscar_dados_rgf(codigo_ibge, exercicio, periodo)

        if not dados:
            return None

        # Extrair metadados
        codigo_ibge_uf = dados[0].get('codigo_ibge_uf') if dados else None

        # Separar por anexo
        anexos = self.separar_por_anexo(dados)

        # Calcular os 5 indicadores
        # Indicador 1 primeiro para obter a RCL
        ind1 = self.calcular_indicador_1_despesa_pessoal(anexos['anexo_01'])
        rcl = ind1.get('dp_rcl')  # RCL para usar no indicador 3

        ind2 = self.calcular_indicador_2_deficit_atuarial(
            anexos['anexo_02'], anexos['anexo_05'], periodo
        )
        # Passa RCL para o indicador 3 para classificacao proporcional
        ind3 = self.calcular_indicador_3_disponibilidade_caixa(anexos['anexo_05'], rcl)
        # Passa RCL para o indicador 4 para classificacao proporcional (mesmo padrao do indicador 3)
        ind4 = self.calcular_indicador_4_liquidez(
            ind3['dc_caixa_bruta'], ind3['dc_rp_processados'], rcl
        )
        ind5 = self.calcular_indicador_5_ativos_inativos(anexos['anexo_01'])

        # Construir objeto de indicadores
        indicadores = {
            'codigo_ibge': codigo_ibge,
            'codigo_ibge_uf': codigo_ibge_uf,
            'exercicio': exercicio,
            'periodo': periodo,

            # Indicador 1: Despesa com Pessoal
            'dp_valor_total': ind1['dp_valor_total'],
            'dp_rcl': ind1['dp_rcl'],
            'dp_percentual': ind1['dp_percentual'],
            'dp_status': ind1['dp_status'],

            # Indicador 2: Deficit Atuarial RPPS
            'da_passivo_atuarial': ind2['da_passivo_atuarial'],
            'da_ativo_plano': ind2['da_ativo_plano'],
            'da_deficit': ind2['da_deficit'],
            'da_cobertura_percentual': ind2['da_cobertura_percentual'],
            'da_status': ind2['da_status'],

            # Indicador 3: Disponibilidade de Caixa
            'dc_caixa_bruta': ind3['dc_caixa_bruta'],
            'dc_rp_processados': ind3['dc_rp_processados'],
            'dc_disponibilidade_liquida': ind3['dc_disponibilidade_liquida'],
            'dc_percentual_rcl': ind3.get('dc_percentual_rcl'),
            'dc_status': ind3['dc_status'],

            # Indicador 4: Liquidez
            'lq_caixa': ind4['lq_caixa'],
            'lq_obrigacoes_cp': ind4['lq_obrigacoes_cp'],
            'lq_indice': ind4['lq_indice'],
            'lq_percentual_rcl': ind4.get('lq_percentual_rcl'),
            'lq_status': ind4['lq_status'],

            # Indicador 5: Proporcao Ativos/Inativos
            'pa_despesa_ativos': ind5['pa_despesa_ativos'],
            'pa_despesa_inativos': ind5['pa_despesa_inativos'],
            'pa_proporcao': ind5['pa_proporcao'],
            'pa_status': ind5['pa_status'],

            'atualizado_em': datetime.utcnow().isoformat() + "+00:00"
        }

        # Calcular risco consolidado
        status_dict = {
            'dp': ind1['dp_status'],
            'da': ind2['da_status'],
            'dc': ind3['dc_status'],
            'lq': ind4['lq_status'],
            'pa': ind5['pa_status']
        }

        indicadores['risco_consolidado'] = self.classificar_risco_consolidado(status_dict)
        indicadores['total_indicadores_criticos'] = sum(
            1 for v in status_dict.values() if v == 'CRITICO'
        )
        indicadores['total_indicadores_alerta'] = sum(
            1 for v in status_dict.values() if v in ['ALERTA', 'PRUDENCIAL']
        )

        return indicadores

    def upsert_indicadores(self, indicadores):
        """Insere ou atualiza indicadores."""
        try:
            self.supabase.table('indicadores_fiscais_municipio').upsert(
                indicadores,
                on_conflict='codigo_ibge,exercicio,periodo'
            ).execute()
            return True
        except Exception as e:
            logger.error(f"Erro upsert {indicadores.get('codigo_ibge')}: {e}")
            return False

    def processar_todos(self, exercicio, periodo):
        """Processa indicadores de todos os municipios."""
        logger.info(f"Buscando municipios com dados para {exercicio} Q{periodo}...")

        # Buscar municipios distintos com dados (limit alto para capturar todos)
        result = self.supabase.table('siconfi_rgf').select('codigo_ibge').eq(
            'exercicio', exercicio
        ).eq('periodo', periodo).eq('esfera', 'M').limit(500000).execute()

        codigos = list(set(m['codigo_ibge'] for m in result.data if m.get('codigo_ibge')))
        logger.info(f"Encontrados {len(codigos):,} municipios com dados")

        for i, codigo_ibge in enumerate(codigos):
            self.stats['processados'] += 1

            indicadores = self.calcular_indicadores_municipio(codigo_ibge, exercicio, periodo)

            if indicadores:
                if self.upsert_indicadores(indicadores):
                    self.stats['atualizados'] += 1
                else:
                    self.stats['erros'] += 1

            if (i + 1) % 500 == 0:
                logger.info(
                    f"  Processados {i+1:,}/{len(codigos):,} "
                    f"({self.stats['atualizados']:,} atualizados)"
                )

        logger.info(
            f"Concluido: {self.stats['atualizados']:,} indicadores atualizados, "
            f"{self.stats['erros']} erros"
        )

    def run(self, exercicio=None, periodo=None, todos=False):
        """Executa calculo de indicadores."""
        inicio = datetime.now()

        logger.info("=" * 70)
        logger.info("CALCULO DOS 5 INDICADORES FISCAIS LRF")
        logger.info("=" * 70)
        logger.info("Indicadores:")
        logger.info("  1. Despesa com Pessoal (dp_) - Anexo 01")
        logger.info("  2. Deficit Atuarial RPPS (da_) - Anexos 02/05")
        logger.info("  3. Disponibilidade de Caixa (dc_) - Anexo 05")
        logger.info("  4. Liquidez (lq_) - Anexo 05")
        logger.info("  5. Proporcao Ativos/Inativos (pa_) - Anexo 01")
        logger.info("=" * 70)

        if todos:
            for ex in range(2020, 2027):
                for per in [1, 2, 3]:
                    logger.info(f"\nProcessando {ex} Q{per}...")
                    self.processar_todos(ex, per)
        else:
            if not exercicio or not periodo:
                raise ValueError("Informe --exercicio e --periodo ou use --todos")
            self.processar_todos(exercicio, periodo)

        duracao = (datetime.now() - inicio).total_seconds() / 60

        logger.info("")
        logger.info("=" * 70)
        logger.info("RESULTADO")
        logger.info("=" * 70)
        logger.info(f"Processados: {self.stats['processados']:,}")
        logger.info(f"Atualizados: {self.stats['atualizados']:,}")
        logger.info(f"Erros: {self.stats['erros']:,}")
        logger.info(f"Tempo: {duracao:.1f} minutos")
        logger.info("=" * 70)


def main():
    parser = argparse.ArgumentParser(
        description='Calcula os 5 indicadores fiscais LRF para municipios'
    )
    parser.add_argument('--exercicio', type=int, help='Ano fiscal (ex: 2024)')
    parser.add_argument('--periodo', type=int, choices=[1, 2, 3], help='Quadrimestre (1, 2 ou 3)')
    parser.add_argument('--todos', action='store_true', help='Processar todos os anos (2020-2026)')

    args = parser.parse_args()

    if not args.todos and (not args.exercicio or not args.periodo):
        parser.print_help()
        print("\nExemplos:")
        print("  python script.py --exercicio 2024 --periodo 3")
        print("  python script.py --todos")
        sys.exit(1)

    CalculadorIndicadores().run(
        exercicio=args.exercicio,
        periodo=args.periodo,
        todos=args.todos
    )


if __name__ == '__main__':
    main()
