"""
OKR Excel Importer - Importa OKRs de planilhas Excel
Suporta formato padrão: Área, Objetivo, Key Result, Métrica, Meta, etc.
"""

import pandas as pd
from typing import Dict, Any, List, Optional
from datetime import datetime
from io import BytesIO


class OKRExcelImporter:
    """
    Importa OKRs de arquivos Excel.

    Formato esperado (colunas):
    - Área: Nome da área/time
    - Objetivo: Título do objetivo
    - Key Result (KR): Descrição do KR
    - Como é calculado / mensurado (Fórmula): Fórmula de cálculo
    - Fonte da informação: Onde buscar o dado
    - Métrica: Nome da métrica
    - Unidade: %, Número, Horas, Dias, etc
    - Direção: Maximizar ou Minimizar
    - Baseline: Valor inicial
    - Meta: Valor alvo
    - Prazo: Data limite
    - Status: Status atual
    """

    # Mapeamento de colunas (flexível para variações)
    COLUMN_MAPPING = {
        'area': ['Área', 'Area', 'Time', 'Team', 'Departamento'],
        'objetivo': ['Objetivo', 'Objective', 'OKR', 'Goal'],
        'key_result': ['Key Result (KR)', 'Key Result', 'KR', 'Result', 'Resultado'],
        'formula': ['Como é calculado / mensurado (Fórmula)', 'Fórmula', 'Formula', 'Como medir', 'Cálculo'],
        'fonte': ['Fonte da informação', 'Fonte', 'Source', 'Origem'],
        'metrica': ['Métrica', 'Metric', 'Indicador', 'KPI'],
        'unidade': ['Unidade', 'Unit', 'Tipo'],
        'direcao': ['Direção', 'Direction', 'Tipo Meta'],
        'baseline': ['Baseline', 'Valor Inicial', 'Atual', 'Current'],
        'meta': ['Meta', 'Target', 'Alvo', 'Goal'],
        'valor_atual': ['Valor Medição', 'Valor Atual', 'Current Value', 'Realizado'],
        'prazo': ['Prazo', 'Deadline', 'Due Date', 'Data Limite'],
        'status': ['Status', 'Estado', 'State'],
    }

    def importar_arquivo(self, file_path: str) -> Dict[str, Any]:
        """
        Importa OKRs de um arquivo Excel.

        Args:
            file_path: Caminho do arquivo Excel

        Returns:
            Estrutura hierárquica de OKRs
        """
        df = pd.read_excel(file_path)
        return self._processar_dataframe(df)

    def importar_bytes(self, file_content: bytes, filename: str = "okrs.xlsx") -> Dict[str, Any]:
        """
        Importa OKRs de bytes (upload).

        Args:
            file_content: Conteúdo do arquivo em bytes
            filename: Nome do arquivo (para detectar formato)

        Returns:
            Estrutura hierárquica de OKRs
        """
        if filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(file_content))
        else:
            df = pd.read_excel(BytesIO(file_content))

        return self._processar_dataframe(df)

    def _processar_dataframe(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Processa DataFrame e retorna estrutura de OKRs"""

        # Normaliza nomes das colunas
        df = self._normalizar_colunas(df)

        # Agrupa por área e objetivo
        resultado = {
            "ciclo": {
                "nome": f"Importado em {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                "data_importacao": datetime.now().isoformat(),
            },
            "areas": [],
            "estatisticas": {
                "total_areas": 0,
                "total_objetivos": 0,
                "total_key_results": 0,
            }
        }

        # Agrupa por área
        areas_dict = {}

        for _, row in df.iterrows():
            area_nome = str(row.get('area', 'Sem Área')).strip()
            objetivo_titulo = str(row.get('objetivo', '')).strip()

            if not objetivo_titulo:
                continue

            # Inicializa área se não existir
            if area_nome not in areas_dict:
                areas_dict[area_nome] = {
                    "nome": area_nome,
                    "objetivos": {}
                }

            # Inicializa objetivo se não existir
            if objetivo_titulo not in areas_dict[area_nome]["objetivos"]:
                areas_dict[area_nome]["objetivos"][objetivo_titulo] = {
                    "titulo": objetivo_titulo,
                    "key_results": []
                }

            # Adiciona Key Result
            kr = self._extrair_key_result(row)
            if kr:
                areas_dict[area_nome]["objetivos"][objetivo_titulo]["key_results"].append(kr)

        # Converte para lista
        for area_nome, area_data in areas_dict.items():
            area_obj = {
                "nome": area_nome,
                "objetivos": list(area_data["objetivos"].values())
            }
            resultado["areas"].append(area_obj)

            resultado["estatisticas"]["total_areas"] += 1
            resultado["estatisticas"]["total_objetivos"] += len(area_obj["objetivos"])
            for obj in area_obj["objetivos"]:
                resultado["estatisticas"]["total_key_results"] += len(obj["key_results"])

        return resultado

    def _normalizar_colunas(self, df: pd.DataFrame) -> pd.DataFrame:
        """Normaliza nomes das colunas para padrão interno"""

        column_renames = {}

        for col_padrao, variacoes in self.COLUMN_MAPPING.items():
            for variacao in variacoes:
                for col_original in df.columns:
                    if variacao.lower() in col_original.lower():
                        column_renames[col_original] = col_padrao
                        break

        return df.rename(columns=column_renames)

    def _extrair_key_result(self, row: pd.Series) -> Optional[Dict[str, Any]]:
        """Extrai dados de um Key Result da linha"""

        titulo = str(row.get('key_result', '')).strip()
        if not titulo or titulo == 'nan':
            return None

        # Converte valores numéricos
        baseline = self._para_numero(row.get('baseline'))
        meta = self._para_numero(row.get('meta'))
        valor_atual = self._para_numero(row.get('valor_atual'))

        # Converte prazo
        prazo = None
        prazo_raw = row.get('prazo')
        if pd.notna(prazo_raw):
            try:
                if isinstance(prazo_raw, datetime):
                    prazo = prazo_raw.strftime('%Y-%m-%d')
                else:
                    prazo = str(prazo_raw)
            except:
                pass

        # Normaliza direção
        direcao_raw = str(row.get('direcao', 'maximizar')).lower()
        direcao = 'minimizar' if 'minim' in direcao_raw else 'maximizar'

        # Normaliza status
        status_raw = str(row.get('status', 'nao_iniciado')).lower()
        status_map = {
            'não iniciado': 'nao_iniciado',
            'nao iniciado': 'nao_iniciado',
            'not started': 'nao_iniciado',
            'em progresso': 'em_progresso',
            'em andamento': 'em_progresso',
            'in progress': 'em_progresso',
            'concluído': 'concluido',
            'concluido': 'concluido',
            'completed': 'concluido',
            'done': 'concluido',
            'atrasado': 'atrasado',
            'delayed': 'atrasado',
            'at risk': 'em_risco',
            'em risco': 'em_risco',
        }
        status = status_map.get(status_raw, 'nao_iniciado')

        return {
            "titulo": titulo,
            "formula": str(row.get('formula', '')).strip() if pd.notna(row.get('formula')) else None,
            "fonte_informacao": str(row.get('fonte', '')).strip() if pd.notna(row.get('fonte')) else None,
            "metrica": str(row.get('metrica', '')).strip() if pd.notna(row.get('metrica')) else None,
            "unidade": str(row.get('unidade', '')).strip() if pd.notna(row.get('unidade')) else None,
            "direcao": direcao,
            "baseline": baseline,
            "meta": meta,
            "valor_atual": valor_atual,
            "prazo": prazo,
            "status": status,
        }

    def _para_numero(self, valor) -> Optional[float]:
        """Converte valor para número"""
        if pd.isna(valor) or valor is None:
            return None
        try:
            if isinstance(valor, str):
                valor = valor.replace(',', '.').replace('%', '').strip()
                if valor.lower() in ['n/d', 'n/a', 'nd', 'na', '-', '']:
                    return None
            return float(valor)
        except:
            return None
