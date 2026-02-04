---
name: mapas-brasil
description: >
  Skill para trabalhar com mapas vetoriais do Brasil usando geobr, geopandas e fontes de dados
  GeoJSON do IBGE. Use para baixar geometrias de municipios/estados, criar mapas coropleticos,
  integrar dados fiscais com visualizacoes geograficas, e exportar mapas para web. Triggers
  incluem mapa do brasil, geojson municipios, mapa coropletico, geobr, geopandas e visualizacao geografica.
---

# Mapas do Brasil - FIA

Skill para trabalhar com mapas vetoriais do Brasil, integrando dados geograficos com analises fiscais municipais.

## Objetivo Principal

Facilitar a criacao de visualizacoes geograficas para o sistema FIA:
1. Baixar geometrias de municipios e estados (GeoJSON/Shapefile)
2. Criar mapas coropleticos com dados fiscais
3. Exportar mapas para web (Leaflet, Folium)
4. Integrar com banco de dados do sistema

## Fontes de Dados Geograficos

### Repositorios GitHub Recomendados

| Repositorio | Descricao | URL |
|-------------|-----------|-----|
| **geobr (IPEA)** | Dados oficiais do IBGE em R/Python | https://github.com/ipeaGIT/geobr |
| **geodata-br** | GeoJSON de municipios por estado | https://github.com/tbrugz/geodata-br |
| **municipal-brazilian-geodata** | GeoJSON bruto e minificado | https://github.com/luizpedone/municipal-brazilian-geodata |
| **geodata-brasil** | Scripts para API do IBGE | https://github.com/alimarques/geodata-brasil |
| **brasil-municipios-geojson** | Otimizado para dashboards | https://github.com/dadosfera/brasil-municipios-geojson |

### URLs Diretas para GeoJSON

```python
# Municipios por estado (minificado)
URL_MUNICIPIOS_UF = "https://raw.githubusercontent.com/luizpedone/municipal-brazilian-geodata/master/minified/{UF}.json"

# Todos os municipios (geodata-br)
URL_MUNICIPIOS_BR = "https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-100-mun.json"

# Estados
URL_ESTADOS = "https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-100-uf.json"
```

## Instalacao de Dependencias

```bash
pip install geobr geopandas matplotlib mapclassify folium
```

## Uso com geobr (Python)

### Baixar Todos os Municipios

```python
from geobr import read_municipality

# Todos os municipios do Brasil
mun = read_municipality(code_muni="all", year=2010)

# Municipios de um estado (codigo IBGE ou sigla)
mg = read_municipality(code_muni=31, year=2010)  # Minas Gerais
sp = read_municipality(code_muni="SP", year=2010)  # Sao Paulo
```

### Baixar Estados

```python
from geobr import read_state

# Todos os estados
ufs = read_state(code_state="all", year=2010)

# Estado especifico
rj = read_state(code_state=33, year=2010)
sc = read_state(code_state="SC", year=2010)
```

### Parametros Principais

| Parametro | Descricao | Valores |
|-----------|-----------|---------|
| `code_muni` / `code_state` | Codigo IBGE ou "all" | 31, "SP", "all" |
| `year` | Ano da malha territorial | 2010, 2018, 2020 |
| `simplified` | Geometria simplificada | True/False |
| `cache` | Reutilizar arquivo local | True/False |

## Criando Mapas Coropleticos

### Mapa Basico

```python
import matplotlib.pyplot as plt
from geobr import read_municipality

mun = read_municipality(code_muni="all", year=2010)

fig, ax = plt.subplots(figsize=(10, 12))
mun.plot(ax=ax, linewidth=0.1, edgecolor="grey", facecolor="white")
ax.set_axis_off()
plt.title("Municipios do Brasil")
plt.savefig("mapa_brasil.png", dpi=150, bbox_inches="tight")
```

### Mapa com Dados Fiscais

```python
import pandas as pd
import geopandas as gpd
from geobr import read_municipality

# 1. Carregar geometrias
mun = read_municipality(code_muni="all", year=2010)

# 2. Carregar dados fiscais (exemplo)
dados = pd.DataFrame({
    'code_muni': [3550308, 3304557, 2927408],  # SP, RJ, Salvador
    'despesa_pessoal_pct': [45.2, 52.1, 48.3]
})

# 3. Fazer merge
mun = mun.merge(dados, on='code_muni', how='left')

# 4. Plotar mapa coropletico
fig, ax = plt.subplots(figsize=(10, 12))
mun.plot(
    ax=ax,
    column='despesa_pessoal_pct',
    cmap='RdYlGn_r',  # Vermelho=alto, Verde=baixo
    scheme='quantiles',
    k=5,
    linewidth=0.05,
    edgecolor='grey',
    legend=True,
    legend_kwds={
        'title': '% Despesa Pessoal/RCL',
        'loc': 'lower right'
    },
    missing_kwds={'color': 'lightgrey', 'label': 'Sem dados'}
)
ax.set_axis_off()
plt.title("Despesa com Pessoal por Municipio")
plt.savefig("mapa_despesa_pessoal.png", dpi=150, bbox_inches="tight")
```

### Esquemas de Classificacao

| Esquema | Descricao | Uso |
|---------|-----------|-----|
| `quantiles` | Classes com mesma quantidade | Distribuicao uniforme |
| `equal_interval` | Intervalos iguais | Dados lineares |
| `natural_breaks` | Jenks (quebras naturais) | Dados com clusters |
| `fisher_jenks` | Otimizado Fisher | Menos variancia |

### Paletas de Cores Recomendadas

```python
# Dados divergentes (bom/ruim)
cmap='RdYlGn'      # Vermelho-Amarelo-Verde
cmap='RdYlGn_r'    # Invertido (verde=baixo)
cmap='RdBu'        # Vermelho-Azul

# Dados sequenciais
cmap='viridis'     # Perceptualmente uniforme
cmap='Blues'       # Tons de azul
cmap='OrRd'        # Laranja-Vermelho

# Dados categoricos
cmap='Set3'        # 12 cores distintas
cmap='Paired'      # Pares de cores
```

## Mapas Interativos com Folium

### Mapa Basico

```python
import folium
import requests

# Carregar GeoJSON
url = "https://raw.githubusercontent.com/luizpedone/municipal-brazilian-geodata/master/minified/SP.json"
geojson = requests.get(url).json()

# Criar mapa
m = folium.Map(location=[-23.5, -46.6], zoom_start=7)

folium.GeoJson(
    geojson,
    style_function=lambda f: {
        'color': '#00FFFF',
        'weight': 0.5,
        'fillOpacity': 0.1,
    }
).add_to(m)

m.save("mapa_sp.html")
```

### Mapa Coropletico Interativo

```python
import folium
import geopandas as gpd
from geobr import read_municipality

# Carregar e preparar dados
mun = read_municipality(code_muni=35, year=2010)  # SP
mun['valor'] = range(len(mun))  # Exemplo

# Criar mapa
m = folium.Map(location=[-22.5, -48.5], zoom_start=6)

folium.Choropleth(
    geo_data=mun.__geo_interface__,
    name='choropleth',
    data=mun,
    columns=['code_muni', 'valor'],
    key_on='feature.properties.code_muni',
    fill_color='YlOrRd',
    fill_opacity=0.7,
    line_opacity=0.2,
    legend_name='Indicador Fiscal'
).add_to(m)

folium.LayerControl().add_to(m)
m.save("mapa_coropletico_sp.html")
```

## Integracao com Supabase

### Carregar Dados Fiscais do Banco

```python
import os
import pandas as pd
from supabase import create_client
from geobr import read_municipality

# Conectar ao Supabase
supabase = create_client(
    os.environ.get('SUPABASE_URL'),
    os.environ.get('SUPABASE_KEY')
)

# Buscar indicadores fiscais
response = supabase.table('indicadores_fiscais') \
    .select('codigo_ibge, dp_percentual, exercicio') \
    .eq('exercicio', 2024) \
    .eq('periodo', 3) \
    .execute()

dados = pd.DataFrame(response.data)
dados = dados.rename(columns={'codigo_ibge': 'code_muni'})

# Carregar geometrias
mun = read_municipality(code_muni="all", year=2010)

# Merge
mun = mun.merge(dados, on='code_muni', how='left')

# Plotar
fig, ax = plt.subplots(figsize=(12, 14))
mun.plot(
    ax=ax,
    column='dp_percentual',
    cmap='RdYlGn_r',
    scheme='natural_breaks',
    k=5,
    legend=True,
    missing_kwds={'color': '#f0f0f0'}
)
ax.set_axis_off()
plt.title("Despesa com Pessoal - 2024/Q3")
plt.savefig("mapa_despesa_2024.png", dpi=200, bbox_inches="tight")
```

## Exportar para Web (React/Leaflet)

### Gerar GeoJSON para Frontend

```python
import geopandas as gpd
from geobr import read_municipality

# Carregar e simplificar
mun = read_municipality(code_muni="all", year=2010, simplified=True)

# Selecionar colunas necessarias
mun = mun[['code_muni', 'name_muni', 'abbrev_state', 'geometry']]

# Exportar GeoJSON
mun.to_file("municipios_brasil.geojson", driver="GeoJSON")

# Ou exportar por estado para arquivos menores
for uf in mun['abbrev_state'].unique():
    mun_uf = mun[mun['abbrev_state'] == uf]
    mun_uf.to_file(f"municipios_{uf}.geojson", driver="GeoJSON")
```

### Exemplo React + Leaflet

```tsx
// src/components/MapaBrasil.tsx
import { MapContainer, GeoJSON, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface Props {
  dados: { codigo_ibge: number; valor: number }[];
}

export function MapaBrasil({ dados }: Props) {
  const getColor = (valor: number) => {
    if (valor >= 54) return '#DC2626';  // red
    if (valor >= 48.6) return '#F59E0B'; // yellow
    return '#10B981';  // green
  };

  const style = (feature: any) => {
    const dado = dados.find(d => d.codigo_ibge === feature.properties.code_muni);
    return {
      fillColor: dado ? getColor(dado.valor) : '#f0f0f0',
      weight: 0.5,
      opacity: 1,
      color: '#666',
      fillOpacity: 0.7,
    };
  };

  return (
    <MapContainer
      center={[-14.5, -52]}
      zoom={4}
      style={{ height: '600px', width: '100%' }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <GeoJSON
        data={geojsonData}
        style={style}
        onEachFeature={(feature, layer) => {
          layer.bindPopup(`
            <strong>${feature.properties.name_muni}</strong><br/>
            ${feature.properties.abbrev_state}
          `);
        }}
      />
    </MapContainer>
  );
}
```

## Comandos da Skill

```bash
# Baixar geometrias de municipios
python script.py download-municipios --uf SP --output municipios_sp.geojson

# Baixar todos os estados
python script.py download-estados --output estados.geojson

# Criar mapa coropletico com dados fiscais
python script.py mapa-coropletico --indicador despesa_pessoal --ano 2024 --output mapa.png

# Exportar GeoJSON para web
python script.py exportar-web --uf all --output ./public/geo/

# Gerar mapa interativo HTML
python script.py mapa-interativo --uf MG --output mapa_mg.html
```

## Estrutura de Dados

### GeoJSON de Municipio

```json
{
  "type": "Feature",
  "properties": {
    "code_muni": 3550308,
    "name_muni": "Sao Paulo",
    "code_state": 35,
    "abbrev_state": "SP",
    "name_state": "Sao Paulo",
    "code_region": 3,
    "name_region": "Sudeste"
  },
  "geometry": {
    "type": "MultiPolygon",
    "coordinates": [[[...]]]
  }
}
```

### Codigo IBGE

- **7 digitos**: 2 UF + 5 municipio (ex: 3550308 = SP + Sao Paulo)
- **2 digitos**: codigo UF (ex: 35 = SP)
- Usado como FK em `geo_municipios` e todas as tabelas fato

## Referencias

### Documentacao Oficial
- geobr: https://ipeagit.github.io/geobr/
- geopandas: https://geopandas.org/
- folium: https://python-visualization.github.io/folium/
- mapclassify: https://pysal.org/mapclassify/

### Dados do IBGE
- Malha Municipal: https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/15774-malhas.html
- API de Localidades: https://servicodados.ibge.gov.br/api/docs/localidades

### Repositorios de Referencia
- geobr (IPEA): https://github.com/ipeaGIT/geobr
- geodata-br: https://github.com/tbrugz/geodata-br
- municipal-brazilian-geodata: https://github.com/luizpedone/municipal-brazilian-geodata
