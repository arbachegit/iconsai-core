#!/usr/bin/env python3
"""
FIA Mapas Brasil - Script para trabalhar com mapas vetoriais do Brasil
Integra geobr, geopandas, folium e dados fiscais do Supabase
"""

import os
import sys
import json
import argparse
import requests
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime

# Tentar importar dependencias opcionais
try:
    import geopandas as gpd
    import pandas as pd
    import matplotlib.pyplot as plt
    HAS_GEOPANDAS = True
except ImportError:
    HAS_GEOPANDAS = False
    print("AVISO: geopandas nao instalado. Instale com: pip install geopandas matplotlib")

try:
    from geobr import read_municipality, read_state
    HAS_GEOBR = True
except ImportError:
    HAS_GEOBR = False
    print("AVISO: geobr nao instalado. Instale com: pip install geobr")

try:
    import folium
    HAS_FOLIUM = True
except ImportError:
    HAS_FOLIUM = False

try:
    from supabase import create_client
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False


# URLs de fontes de dados GeoJSON
URLS = {
    "municipios_uf_minified": "https://raw.githubusercontent.com/luizpedone/municipal-brazilian-geodata/master/minified/{uf}.min.json",
    "municipios_uf_data": "https://raw.githubusercontent.com/luizpedone/municipal-brazilian-geodata/master/data/{uf}.json",
    "municipios_br": "https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-100-mun.json",
    "estados": "https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-100-uf.json",
}

# Codigos IBGE dos estados
UF_CODES = {
    'AC': 12, 'AL': 27, 'AP': 16, 'AM': 13, 'BA': 29, 'CE': 23,
    'DF': 53, 'ES': 32, 'GO': 52, 'MA': 21, 'MT': 51, 'MS': 50,
    'MG': 31, 'PA': 15, 'PB': 25, 'PR': 41, 'PE': 26, 'PI': 22,
    'RJ': 33, 'RN': 24, 'RS': 43, 'RO': 11, 'RR': 14, 'SC': 42,
    'SP': 35, 'SE': 28, 'TO': 17
}

# Paletas de cores para mapas coropleticos
COLORMAPS = {
    'despesa_pessoal': 'RdYlGn_r',  # Verde=baixo, Vermelho=alto
    'divida': 'RdYlGn_r',
    'disponibilidade_caixa': 'RdYlGn',  # Verde=alto
    'receita': 'Blues',
    'populacao': 'YlOrRd',
    'default': 'viridis'
}


def download_geojson(url: str, output_path: Optional[str] = None) -> Dict:
    """Baixa GeoJSON de uma URL"""
    print(f"Baixando: {url}")
    response = requests.get(url)
    response.raise_for_status()
    data = response.json()

    if output_path:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False)
        print(f"Salvo em: {output_path}")

    return data


def download_municipios_uf(uf: str, output_path: Optional[str] = None, minified: bool = True) -> Dict:
    """Baixa GeoJSON de municipios de um estado"""
    url_key = "municipios_uf_minified" if minified else "municipios_uf_data"
    url = URLS[url_key].format(uf=uf.upper())
    return download_geojson(url, output_path)


def download_estados(output_path: Optional[str] = None) -> Dict:
    """Baixa GeoJSON de todos os estados"""
    return download_geojson(URLS["estados"], output_path)


def load_municipios_geobr(code_muni: str = "all", year: int = 2010, simplified: bool = True):
    """Carrega municipios usando geobr"""
    if not HAS_GEOBR:
        raise ImportError("geobr nao instalado. Instale com: pip install geobr")

    print(f"Carregando municipios via geobr (code={code_muni}, year={year})...")
    return read_municipality(code_muni=code_muni, year=year, simplified=simplified)


def load_estados_geobr(code_state: str = "all", year: int = 2010, simplified: bool = True):
    """Carrega estados usando geobr"""
    if not HAS_GEOBR:
        raise ImportError("geobr nao instalado. Instale com: pip install geobr")

    print(f"Carregando estados via geobr (code={code_state}, year={year})...")
    return read_state(code_state=code_state, year=year, simplified=simplified)


def load_dados_fiscais(indicador: str, ano: int, periodo: int = 3) -> pd.DataFrame:
    """Carrega dados fiscais do Supabase"""
    if not HAS_SUPABASE:
        raise ImportError("supabase nao instalado. Instale com: pip install supabase")

    supabase_url = os.environ.get('SUPABASE_URL')
    supabase_key = os.environ.get('SUPABASE_KEY')

    if not supabase_url or not supabase_key:
        raise ValueError("Variaveis SUPABASE_URL e SUPABASE_KEY nao configuradas")

    supabase = create_client(supabase_url, supabase_key)

    # Mapear indicador para coluna
    colunas_indicador = {
        'despesa_pessoal': 'dp_percentual',
        'divida_consolidada': 'dc_percentual',
        'disponibilidade_caixa': 'disp_caixa_liquida',
    }

    coluna = colunas_indicador.get(indicador, indicador)

    response = supabase.table('indicadores_fiscais') \
        .select(f'codigo_ibge, {coluna}, exercicio') \
        .eq('exercicio', ano) \
        .eq('periodo', periodo) \
        .execute()

    df = pd.DataFrame(response.data)
    df = df.rename(columns={'codigo_ibge': 'code_muni', coluna: 'valor'})
    return df


def criar_mapa_coropletico(
    gdf: gpd.GeoDataFrame,
    coluna: str,
    titulo: str = "Mapa Coropletico",
    cmap: str = "viridis",
    scheme: str = "quantiles",
    k: int = 5,
    output_path: Optional[str] = None,
    figsize: tuple = (12, 14)
):
    """Cria mapa coropletico estatico"""
    if not HAS_GEOPANDAS:
        raise ImportError("geopandas nao instalado")

    fig, ax = plt.subplots(figsize=figsize)

    # Verificar se tem dados na coluna
    if coluna not in gdf.columns or gdf[coluna].isna().all():
        print(f"AVISO: Coluna '{coluna}' nao encontrada ou vazia. Plotando apenas geometrias.")
        gdf.plot(ax=ax, linewidth=0.1, edgecolor='grey', facecolor='#f0f0f0')
    else:
        gdf.plot(
            ax=ax,
            column=coluna,
            cmap=cmap,
            scheme=scheme,
            k=k,
            linewidth=0.05,
            edgecolor='grey',
            legend=True,
            legend_kwds={
                'title': coluna,
                'loc': 'lower right',
                'fontsize': 8
            },
            missing_kwds={
                'color': '#f0f0f0',
                'label': 'Sem dados'
            }
        )

    ax.set_axis_off()
    plt.title(titulo, fontsize=14, fontweight='bold')

    if output_path:
        plt.savefig(output_path, dpi=200, bbox_inches='tight', facecolor='white')
        print(f"Mapa salvo em: {output_path}")
    else:
        plt.show()

    plt.close()


def criar_mapa_interativo(
    gdf: gpd.GeoDataFrame,
    coluna: Optional[str] = None,
    centro: tuple = (-14.5, -52),
    zoom: int = 4,
    output_path: str = "mapa.html"
):
    """Cria mapa interativo com Folium"""
    if not HAS_FOLIUM:
        raise ImportError("folium nao instalado. Instale com: pip install folium")

    m = folium.Map(location=centro, zoom_start=zoom)

    if coluna and coluna in gdf.columns:
        # Mapa coropletico
        folium.Choropleth(
            geo_data=gdf.__geo_interface__,
            name='choropleth',
            data=gdf,
            columns=['code_muni', coluna] if 'code_muni' in gdf.columns else [gdf.index.name, coluna],
            key_on='feature.properties.code_muni',
            fill_color='YlOrRd',
            fill_opacity=0.7,
            line_opacity=0.2,
            legend_name=coluna
        ).add_to(m)
    else:
        # Apenas geometrias
        def style_function(feature):
            return {
                'fillColor': '#00FFFF',
                'color': '#0066cc',
                'weight': 0.5,
                'fillOpacity': 0.2
            }

        folium.GeoJson(
            gdf.__geo_interface__,
            style_function=style_function,
            tooltip=folium.GeoJsonTooltip(
                fields=['name_muni'] if 'name_muni' in gdf.columns else [],
                aliases=['Municipio:']
            )
        ).add_to(m)

    folium.LayerControl().add_to(m)

    m.save(output_path)
    print(f"Mapa interativo salvo em: {output_path}")


def exportar_geojson_web(
    uf: str = "all",
    output_dir: str = "./geo",
    simplified: bool = True
):
    """Exporta GeoJSON otimizado para uso em frontend"""
    if not HAS_GEOBR:
        raise ImportError("geobr nao instalado")

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    if uf.lower() == "all":
        # Exportar todos os estados separadamente
        for sigla in UF_CODES.keys():
            print(f"Processando {sigla}...")
            try:
                gdf = load_municipios_geobr(code_muni=sigla, simplified=simplified)
                # Selecionar apenas colunas necessarias
                colunas = ['code_muni', 'name_muni', 'abbrev_state', 'geometry']
                gdf = gdf[[c for c in colunas if c in gdf.columns]]

                output_file = output_path / f"municipios_{sigla}.geojson"
                gdf.to_file(output_file, driver="GeoJSON")
                print(f"  -> {output_file}")
            except Exception as e:
                print(f"  ERRO em {sigla}: {e}")
    else:
        gdf = load_municipios_geobr(code_muni=uf.upper(), simplified=simplified)
        colunas = ['code_muni', 'name_muni', 'abbrev_state', 'geometry']
        gdf = gdf[[c for c in colunas if c in gdf.columns]]

        output_file = output_path / f"municipios_{uf.upper()}.geojson"
        gdf.to_file(output_file, driver="GeoJSON")
        print(f"Salvo em: {output_file}")


def gerar_relatorio():
    """Gera relatorio sobre disponibilidade de dados geograficos"""
    relatorio = f"""
# Relatorio de Dados Geograficos - FIA

Gerado em: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Dependencias Instaladas

| Pacote | Status |
|--------|--------|
| geopandas | {'Instalado' if HAS_GEOPANDAS else 'NAO INSTALADO'} |
| geobr | {'Instalado' if HAS_GEOBR else 'NAO INSTALADO'} |
| folium | {'Instalado' if HAS_FOLIUM else 'NAO INSTALADO'} |
| supabase | {'Instalado' if HAS_SUPABASE else 'NAO INSTALADO'} |

## Fontes de Dados Disponiveis

### GeoJSON (via URL)
- Municipios por UF: {URLS['municipios_uf']}
- Todos os municipios: {URLS['municipios_br']}
- Estados: {URLS['estados']}

### geobr (IPEA)
- read_municipality(): Municipios do Brasil
- read_state(): Estados do Brasil
- Anos disponiveis: 1872-2020

## Codigos IBGE dos Estados

| UF | Codigo |
|----|--------|
"""
    for uf, code in sorted(UF_CODES.items()):
        relatorio += f"| {uf} | {code} |\n"

    relatorio += """
## Comandos Disponiveis

```bash
# Baixar GeoJSON de municipios
python script.py download-municipios --uf SP

# Baixar estados
python script.py download-estados

# Criar mapa coropletico
python script.py mapa --uf all --indicador valor --output mapa.png

# Mapa interativo
python script.py mapa-interativo --uf MG --output mapa.html

# Exportar para web
python script.py exportar-web --output ./public/geo/
```
"""

    print(relatorio)


def main():
    parser = argparse.ArgumentParser(
        description='FIA Mapas Brasil - Trabalhar com mapas vetoriais do Brasil',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    subparsers = parser.add_subparsers(dest='comando', help='Comandos disponiveis')

    # Download municipios
    p_mun = subparsers.add_parser('download-municipios', help='Baixar GeoJSON de municipios')
    p_mun.add_argument('--uf', required=True, help='Sigla do estado (ex: SP, MG)')
    p_mun.add_argument('--output', '-o', help='Arquivo de saida')

    # Download estados
    p_est = subparsers.add_parser('download-estados', help='Baixar GeoJSON de estados')
    p_est.add_argument('--output', '-o', help='Arquivo de saida')

    # Mapa coropletico
    p_mapa = subparsers.add_parser('mapa', help='Criar mapa coropletico')
    p_mapa.add_argument('--uf', default='all', help='UF ou "all" para todos')
    p_mapa.add_argument('--indicador', help='Nome da coluna para colorir')
    p_mapa.add_argument('--cmap', default='viridis', help='Paleta de cores')
    p_mapa.add_argument('--output', '-o', help='Arquivo de saida (PNG)')

    # Mapa interativo
    p_int = subparsers.add_parser('mapa-interativo', help='Criar mapa interativo HTML')
    p_int.add_argument('--uf', default='all', help='UF ou "all" para todos')
    p_int.add_argument('--output', '-o', default='mapa.html', help='Arquivo de saida')

    # Exportar para web
    p_web = subparsers.add_parser('exportar-web', help='Exportar GeoJSON para frontend')
    p_web.add_argument('--uf', default='all', help='UF ou "all" para todos')
    p_web.add_argument('--output', '-o', default='./geo', help='Diretorio de saida')

    # Relatorio
    subparsers.add_parser('relatorio', help='Gerar relatorio de status')

    args = parser.parse_args()

    if args.comando == 'download-municipios':
        output = args.output or f"municipios_{args.uf.upper()}.geojson"
        download_municipios_uf(args.uf, output)

    elif args.comando == 'download-estados':
        output = args.output or "estados.geojson"
        download_estados(output)

    elif args.comando == 'mapa':
        if not HAS_GEOBR or not HAS_GEOPANDAS:
            print("ERRO: geobr e geopandas sao necessarios para este comando")
            sys.exit(1)

        gdf = load_municipios_geobr(code_muni=args.uf)
        criar_mapa_coropletico(
            gdf,
            coluna=args.indicador or 'code_muni',
            cmap=args.cmap,
            output_path=args.output
        )

    elif args.comando == 'mapa-interativo':
        if not HAS_GEOBR or not HAS_FOLIUM:
            print("ERRO: geobr e folium sao necessarios para este comando")
            sys.exit(1)

        gdf = load_municipios_geobr(code_muni=args.uf)
        criar_mapa_interativo(gdf, output_path=args.output)

    elif args.comando == 'exportar-web':
        exportar_geojson_web(uf=args.uf, output_dir=args.output)

    elif args.comando == 'relatorio':
        gerar_relatorio()

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
