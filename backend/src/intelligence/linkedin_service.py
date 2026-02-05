"""
LinkedIn Service - Via Proxycurl API
https://nubela.co/proxycurl/docs
"""

import httpx
from typing import Dict, Any, List, Optional


class LinkedInService:
    """
    Busca dados do LinkedIn via Proxycurl API.
    Proxycurl é uma API legal que não viola ToS do LinkedIn.

    Pricing: ~$0.01 por request de pessoa, ~$0.02 por empresa
    """

    BASE_URL = "https://nubela.co/proxycurl/api"

    def __init__(self, api_key: str):
        self.api_key = api_key

    async def buscar_pessoa_por_url(self, linkedin_url: str) -> Optional[Dict[str, Any]]:
        """
        Busca perfil de pessoa pelo URL do LinkedIn.

        Args:
            linkedin_url: URL do perfil (ex: https://linkedin.com/in/username)

        Returns:
            Dados do perfil
        """
        url = f"{self.BASE_URL}/v2/linkedin"

        params = {
            "url": linkedin_url,
            "fallback_to_cache": "on-error",
            "use_cache": "if-present",
            "skills": "include",
            "inferred_salary": "include",
            "personal_email": "include",
            "personal_contact_number": "include",
        }

        return await self._request(url, params)

    async def buscar_pessoa_por_nome(
        self,
        nome: str,
        empresa: Optional[str] = None,
        cargo: Optional[str] = None,
        localizacao: str = "Brazil"
    ) -> Optional[Dict[str, Any]]:
        """
        Busca pessoa pelo nome (Person Lookup Endpoint).

        Args:
            nome: Nome completo da pessoa
            empresa: Empresa atual (melhora precisão)
            cargo: Cargo atual (melhora precisão)
            localizacao: País/região

        Returns:
            URL do LinkedIn encontrado + dados básicos
        """
        url = f"{self.BASE_URL}/linkedin/profile/resolve"

        params = {
            "first_name": nome.split()[0] if nome else "",
            "last_name": " ".join(nome.split()[1:]) if len(nome.split()) > 1 else "",
            "location": localizacao,
        }

        if empresa:
            params["company_domain"] = empresa  # ou nome da empresa

        if cargo:
            params["title"] = cargo

        result = await self._request(url, params)

        if result and result.get("url"):
            # Busca dados completos
            return await self.buscar_pessoa_por_url(result["url"])

        return result

    async def buscar_empresa_por_url(self, linkedin_url: str) -> Optional[Dict[str, Any]]:
        """
        Busca dados de empresa pelo URL do LinkedIn.

        Args:
            linkedin_url: URL da página da empresa

        Returns:
            Dados da empresa
        """
        url = f"{self.BASE_URL}/linkedin/company"

        params = {
            "url": linkedin_url,
            "resolve_numeric_id": "true",
            "categories": "include",
            "funding_data": "include",
            "extra": "include",
            "use_cache": "if-present",
        }

        return await self._request(url, params)

    async def buscar_funcionarios(
        self,
        linkedin_company_url: str,
        cargo_filtro: Optional[str] = None,
        limite: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Busca funcionários de uma empresa.

        Args:
            linkedin_company_url: URL da empresa no LinkedIn
            cargo_filtro: Filtrar por cargo (ex: "CEO", "CTO", "Diretor")
            limite: Número máximo de resultados

        Returns:
            Lista de funcionários com dados básicos
        """
        url = f"{self.BASE_URL}/linkedin/company/employees"

        params = {
            "url": linkedin_company_url,
            "page_size": min(limite, 100),  # Max 100 por página
        }

        if cargo_filtro:
            params["role_search"] = cargo_filtro

        result = await self._request(url, params)

        if result and "employees" in result:
            return result["employees"][:limite]

        return []

    async def buscar_empresa_por_dominio(self, dominio: str) -> Optional[Dict[str, Any]]:
        """
        Busca empresa pelo domínio do site.

        Args:
            dominio: Domínio do site (ex: "empresa.com.br")

        Returns:
            Dados da empresa no LinkedIn
        """
        url = f"{self.BASE_URL}/linkedin/company/resolve"

        params = {
            "company_domain": dominio,
        }

        result = await self._request(url, params)

        if result and result.get("url"):
            return await self.buscar_empresa_por_url(result["url"])

        return result

    async def _request(self, url: str, params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Executa request na API do Proxycurl"""

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                url,
                headers={"Authorization": f"Bearer {self.api_key}"},
                params=params
            )

            if response.status_code == 404:
                return None

            if response.status_code == 401:
                raise Exception("Proxycurl: API key inválida")

            if response.status_code == 403:
                raise Exception("Proxycurl: Sem créditos suficientes")

            if response.status_code != 200:
                raise Exception(f"Proxycurl error: {response.status_code} - {response.text}")

            data = response.json()

            # Normaliza dados
            return self._normalizar_pessoa(data) if "experiences" in data else self._normalizar_empresa(data)

    def _normalizar_pessoa(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Normaliza dados de pessoa do Proxycurl"""
        return {
            "nome": data.get("full_name"),
            "headline": data.get("headline"),
            "resumo": data.get("summary"),
            "localizacao": data.get("city"),
            "pais": data.get("country"),
            "foto_url": data.get("profile_pic_url"),
            "linkedin_url": data.get("public_identifier"),
            "experiencias": [
                {
                    "empresa": exp.get("company"),
                    "cargo": exp.get("title"),
                    "descricao": exp.get("description"),
                    "inicio": exp.get("starts_at"),
                    "fim": exp.get("ends_at"),
                    "localizacao": exp.get("location"),
                }
                for exp in data.get("experiences", [])
            ],
            "formacao": [
                {
                    "instituicao": edu.get("school"),
                    "curso": edu.get("field_of_study"),
                    "grau": edu.get("degree_name"),
                    "inicio": edu.get("starts_at"),
                    "fim": edu.get("ends_at"),
                }
                for edu in data.get("education", [])
            ],
            "habilidades": data.get("skills", []),
            "idiomas": data.get("languages", []),
            "certificacoes": data.get("certifications", []),
            "email_pessoal": data.get("personal_emails", [None])[0],
            "telefone_pessoal": data.get("personal_numbers", [None])[0],
            "fonte": "proxycurl_linkedin",
        }

    def _normalizar_empresa(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Normaliza dados de empresa do Proxycurl"""
        return {
            "nome": data.get("name"),
            "descricao": data.get("description"),
            "website": data.get("website"),
            "setor": data.get("industry"),
            "tamanho": data.get("company_size"),
            "num_funcionarios": data.get("company_size_on_linkedin"),
            "sede": data.get("hq", {}).get("city"),
            "pais": data.get("hq", {}).get("country"),
            "fundacao": data.get("founded_year"),
            "tipo": data.get("company_type"),
            "especialidades": data.get("specialities", []),
            "linkedin_url": data.get("linkedin_internal_id"),
            "logo_url": data.get("profile_pic_url"),
            "funding": data.get("funding_data"),
            "fonte": "proxycurl_linkedin",
        }
