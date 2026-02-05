"""
BrasilAPI Service - Dados de CNPJ gratuitos
https://brasilapi.com.br/docs#tag/CNPJ
"""

import httpx
from typing import Dict, Any, Optional


class BrasilAPIService:
    """
    Consulta dados de empresas via BrasilAPI (gratuito).
    Retorna: razão social, nome fantasia, CNAE, endereço, sócios, etc.
    """

    BASE_URL = "https://brasilapi.com.br/api"

    async def buscar_cnpj(self, cnpj: str) -> Optional[Dict[str, Any]]:
        """
        Busca dados de empresa pelo CNPJ.

        Args:
            cnpj: CNPJ sem formatação (14 dígitos)

        Returns:
            Dados da empresa ou None se não encontrado
        """
        # Limpa CNPJ
        cnpj_limpo = "".join(filter(str.isdigit, cnpj))

        if len(cnpj_limpo) != 14:
            raise ValueError(f"CNPJ inválido: {cnpj}")

        url = f"{self.BASE_URL}/cnpj/v1/{cnpj_limpo}"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)

            if response.status_code == 404:
                return None

            if response.status_code != 200:
                raise Exception(f"BrasilAPI error: {response.status_code} - {response.text}")

            data = response.json()

            # Normaliza dados para nosso formato
            return self._normalizar_dados(data)

    def _normalizar_dados(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Normaliza dados da BrasilAPI para nosso formato"""

        # Extrai sócios
        socios = []
        for socio in data.get("qsa", []):
            socios.append({
                "nome": socio.get("nome_socio"),
                "qualificacao": socio.get("qualificacao_socio"),
                "data_entrada": socio.get("data_entrada_sociedade"),
                "cpf_cnpj": socio.get("cnpj_cpf_do_socio"),
                "faixa_etaria": socio.get("faixa_etaria"),
            })

        # Extrai CNAEs secundários
        cnaes_secundarios = [
            {"codigo": cnae.get("codigo"), "descricao": cnae.get("descricao")}
            for cnae in data.get("cnaes_secundarios", [])
        ]

        return {
            "cnpj": data.get("cnpj"),
            "razao_social": data.get("razao_social"),
            "nome_fantasia": data.get("nome_fantasia"),
            "situacao_cadastral": data.get("descricao_situacao_cadastral"),
            "data_situacao_cadastral": data.get("data_situacao_cadastral"),
            "data_inicio_atividade": data.get("data_inicio_atividade"),
            "natureza_juridica": data.get("natureza_juridica"),
            "porte": data.get("porte"),
            "capital_social": data.get("capital_social"),
            # Endereço
            "logradouro": data.get("logradouro"),
            "numero": data.get("numero"),
            "complemento": data.get("complemento"),
            "bairro": data.get("bairro"),
            "cep": data.get("cep"),
            "municipio": data.get("municipio"),
            "uf": data.get("uf"),
            # Contato
            "telefone": data.get("ddd_telefone_1"),
            "email": data.get("email"),
            # Atividade
            "cnae_principal": {
                "codigo": data.get("cnae_fiscal"),
                "descricao": data.get("cnae_fiscal_descricao"),
            },
            "cnaes_secundarios": cnaes_secundarios,
            # Sócios
            "socios": socios,
            # Metadados
            "fonte": "brasilapi",
        }


    async def buscar_cep(self, cep: str) -> Optional[Dict[str, Any]]:
        """Busca endereço pelo CEP"""
        cep_limpo = "".join(filter(str.isdigit, cep))

        url = f"{self.BASE_URL}/cep/v2/{cep_limpo}"

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)

            if response.status_code != 200:
                return None

            return response.json()
