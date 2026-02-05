"""
Perplexity Service - Busca inteligente com fontes
https://docs.perplexity.ai/
"""

import httpx
from typing import Dict, Any, List, Optional


class PerplexityService:
    """
    Busca inteligente usando Perplexity AI.
    Retorna informações atualizadas da web com fontes.
    """

    BASE_URL = "https://api.perplexity.ai"

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.model = "llama-3.1-sonar-large-128k-online"

    async def buscar_empresa(self, nome_empresa: str, setor: Optional[str] = None) -> Dict[str, Any]:
        """
        Busca informações sobre uma empresa.

        Args:
            nome_empresa: Nome da empresa
            setor: Setor de atuação (opcional, melhora precisão)

        Returns:
            Informações da empresa com fontes
        """
        setor_texto = f" do setor de {setor}" if setor else ""

        prompt = f"""
        Busque informações atualizadas sobre a empresa "{nome_empresa}"{setor_texto} no Brasil.

        Retorne em formato estruturado:
        1. Nome completo e nome fantasia
        2. Website oficial
        3. Descrição do que a empresa faz
        4. Principais produtos/serviços
        5. Público-alvo
        6. Principais concorrentes
        7. Presença em redes sociais (LinkedIn, Instagram, etc)
        8. Notícias recentes relevantes
        9. CNPJ se disponível

        Seja preciso e cite as fontes.
        """

        return await self._query(prompt)

    async def buscar_concorrentes(self, nome_empresa: str, setor: str) -> Dict[str, Any]:
        """
        Busca concorrentes de uma empresa.
        """
        prompt = f"""
        Liste os principais concorrentes da empresa "{nome_empresa}" no setor de {setor} no Brasil.

        Para cada concorrente, informe:
        1. Nome da empresa
        2. Website
        3. Principais diferenciais
        4. Porte estimado (pequeno, médio, grande)
        5. Região de atuação

        Ordene por relevância de concorrência direta.
        Cite as fontes.
        """

        return await self._query(prompt)

    async def buscar_pessoa(self, nome: str, empresa: Optional[str] = None, cargo: Optional[str] = None) -> Dict[str, Any]:
        """
        Busca informações sobre uma pessoa.
        """
        contexto = ""
        if empresa:
            contexto += f" da empresa {empresa}"
        if cargo:
            contexto += f", {cargo}"

        prompt = f"""
        Busque informações profissionais sobre "{nome}"{contexto}.

        Retorne:
        1. Cargo atual e empresa
        2. Experiência profissional anterior
        3. Formação acadêmica
        4. Especialidades e competências
        5. Presença em redes profissionais (LinkedIn)
        6. Publicações ou participações em eventos
        7. Notícias relevantes

        Seja preciso e cite as fontes.
        """

        return await self._query(prompt)

    async def buscar_politico(self, nome: str, cargo: Optional[str] = None) -> Dict[str, Any]:
        """
        Busca informações sobre um político.
        """
        cargo_texto = f", {cargo}" if cargo else ""

        prompt = f"""
        Busque informações sobre o político "{nome}"{cargo_texto} no Brasil.

        Retorne:
        1. Dados pessoais básicos (idade, formação)
        2. Partido atual e histórico partidário
        3. Cargos políticos ocupados
        4. Principais projetos de lei
        5. Votações importantes
        6. Patrimônio declarado
        7. Processos judiciais ou investigações
        8. Posicionamentos políticos principais
        9. Atuação em comissões
        10. Redes sociais oficiais
        11. Notícias recentes

        Seja factual e cite as fontes oficiais.
        """

        return await self._query(prompt)

    async def analisar_website(self, url: str) -> Dict[str, Any]:
        """
        Analisa o conteúdo de um website.
        """
        prompt = f"""
        Analise o website {url} e extraia:

        1. Proposta de valor principal
        2. Produtos/serviços oferecidos
        3. Público-alvo aparente
        4. Tom de comunicação (formal, informal, técnico, etc)
        5. Diferenciais destacados
        6. Calls-to-action principais
        7. Informações de contato
        8. Presença de blog/conteúdo
        9. Integração com redes sociais
        10. Impressão geral de profissionalismo (1-10)

        Seja objetivo e baseie-se apenas no conteúdo visível.
        """

        return await self._query(prompt)

    async def _query(self, prompt: str) -> Dict[str, Any]:
        """Executa query na API do Perplexity"""

        url = f"{self.BASE_URL}/chat/completions"

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "Você é um assistente de pesquisa empresarial. Seja preciso, objetivo e sempre cite fontes."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "temperature": 0.2,
                    "return_citations": True,
                    "return_images": False
                }
            )

            if response.status_code != 200:
                raise Exception(f"Perplexity API error: {response.status_code} - {response.text}")

            data = response.json()

            # Extrai resposta e citações
            content = data["choices"][0]["message"]["content"]
            citations = data.get("citations", [])

            return {
                "content": content,
                "citations": citations,
                "model": self.model,
                "fonte": "perplexity"
            }
