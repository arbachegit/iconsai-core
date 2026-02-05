"""
Website Scraper Service - Extrai conteúdo de sites
Usa httpx + BeautifulSoup para scraping básico
"""

import httpx
import re
from typing import Dict, Any, List, Optional
from urllib.parse import urljoin, urlparse


class WebsiteScraperService:
    """
    Scraper de websites para extração de conteúdo.
    Foca em páginas públicas: home, sobre, produtos/serviços.
    """

    def __init__(self, max_pages: int = 5):
        self.max_pages = max_pages
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        }

    async def extrair_conteudo(self, url: str) -> Dict[str, Any]:
        """
        Extrai conteúdo principal de um website.

        Args:
            url: URL do site

        Returns:
            Conteúdo estruturado do site
        """
        try:
            from bs4 import BeautifulSoup
        except ImportError:
            # Fallback simples sem BeautifulSoup
            return await self._extrair_simples(url)

        # Normaliza URL
        if not url.startswith(("http://", "https://")):
            url = f"https://{url}"

        base_domain = urlparse(url).netloc
        paginas_coletadas = {}

        # Coleta página principal
        home_content = await self._fetch_page(url)
        if not home_content:
            return {"erro": "Não foi possível acessar o site", "url": url}

        soup = BeautifulSoup(home_content, "html.parser")
        paginas_coletadas["home"] = self._extrair_texto(soup)

        # Encontra links importantes
        links_importantes = self._encontrar_links_importantes(soup, url, base_domain)

        # Coleta páginas adicionais
        for nome, link in list(links_importantes.items())[:self.max_pages - 1]:
            content = await self._fetch_page(link)
            if content:
                soup = BeautifulSoup(content, "html.parser")
                paginas_coletadas[nome] = self._extrair_texto(soup)

        # Extrai metadados
        soup = BeautifulSoup(home_content, "html.parser")
        metadados = self._extrair_metadados(soup)

        # Extrai redes sociais
        redes_sociais = self._extrair_redes_sociais(soup)

        # Extrai contato
        contato = self._extrair_contato(home_content)

        return {
            "url": url,
            "metadados": metadados,
            "paginas": paginas_coletadas,
            "redes_sociais": redes_sociais,
            "contato": contato,
            "fonte": "website_scraper"
        }

    async def _fetch_page(self, url: str) -> Optional[str]:
        """Busca conteúdo de uma página"""
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                response = await client.get(url, headers=self.headers)
                if response.status_code == 200:
                    return response.text
        except Exception:
            pass
        return None

    async def _extrair_simples(self, url: str) -> Dict[str, Any]:
        """Extração simples sem BeautifulSoup"""
        content = await self._fetch_page(url)
        if not content:
            return {"erro": "Não foi possível acessar o site", "url": url}

        # Remove tags HTML de forma básica
        text = re.sub(r'<script[^>]*>.*?</script>', '', content, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<[^>]+>', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()

        return {
            "url": url,
            "paginas": {"home": text[:5000]},
            "fonte": "website_scraper"
        }

    def _extrair_texto(self, soup) -> str:
        """Extrai texto limpo de uma página"""
        # Remove scripts e estilos
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.decompose()

        # Pega texto
        text = soup.get_text(separator=" ", strip=True)

        # Limpa espaços extras
        text = re.sub(r'\s+', ' ', text)

        return text[:5000]  # Limita tamanho

    def _extrair_metadados(self, soup) -> Dict[str, str]:
        """Extrai metadados da página"""
        metadados = {}

        # Título
        if soup.title:
            metadados["titulo"] = soup.title.string

        # Meta tags
        for meta in soup.find_all("meta"):
            name = meta.get("name", meta.get("property", "")).lower()
            content = meta.get("content", "")

            if name in ["description", "og:description"]:
                metadados["descricao"] = content
            elif name in ["keywords"]:
                metadados["keywords"] = content
            elif name in ["og:title"]:
                metadados["og_titulo"] = content
            elif name in ["og:image"]:
                metadados["og_imagem"] = content

        return metadados

    def _encontrar_links_importantes(self, soup, base_url: str, base_domain: str) -> Dict[str, str]:
        """Encontra links para páginas importantes"""
        links = {}
        palavras_importantes = {
            "sobre": ["sobre", "about", "quem-somos", "empresa", "institucional", "historia"],
            "servicos": ["servicos", "services", "solucoes", "produtos", "products"],
            "contato": ["contato", "contact", "fale-conosco"],
            "equipe": ["equipe", "team", "time", "nosso-time"],
            "clientes": ["clientes", "cases", "portfolio", "projetos"],
        }

        for a in soup.find_all("a", href=True):
            href = a.get("href", "").lower()
            texto = a.get_text(strip=True).lower()

            for categoria, palavras in palavras_importantes.items():
                if categoria not in links:
                    for palavra in palavras:
                        if palavra in href or palavra in texto:
                            link_completo = urljoin(base_url, a.get("href"))
                            if base_domain in link_completo:
                                links[categoria] = link_completo
                                break

        return links

    def _extrair_redes_sociais(self, soup) -> Dict[str, str]:
        """Extrai links de redes sociais"""
        redes = {}
        padroes = {
            "linkedin": r"linkedin\.com/company/([^/\s\"\']+)",
            "instagram": r"instagram\.com/([^/\s\"\']+)",
            "facebook": r"facebook\.com/([^/\s\"\']+)",
            "twitter": r"(twitter|x)\.com/([^/\s\"\']+)",
            "youtube": r"youtube\.com/(channel|c|@)([^/\s\"\']+)",
        }

        html = str(soup)
        for rede, padrao in padroes.items():
            match = re.search(padrao, html, re.IGNORECASE)
            if match:
                redes[rede] = match.group(0)

        return redes

    def _extrair_contato(self, html: str) -> Dict[str, str]:
        """Extrai informações de contato"""
        contato = {}

        # Email
        emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', html)
        if emails:
            # Filtra emails genéricos
            emails_filtrados = [e for e in emails if not any(x in e.lower() for x in ["example", "test", "email", "sentry"])]
            if emails_filtrados:
                contato["email"] = emails_filtrados[0]

        # Telefone Brasil
        telefones = re.findall(r'\(?\d{2}\)?\s*\d{4,5}[-.\s]?\d{4}', html)
        if telefones:
            contato["telefone"] = telefones[0]

        # WhatsApp
        whatsapp = re.findall(r'wa\.me/(\d+)', html)
        if whatsapp:
            contato["whatsapp"] = whatsapp[0]

        return contato
