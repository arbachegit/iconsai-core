# Skill: skill-indicadores-fiscais

Calcula todos os indicadores fiscais da LRF para cada municipio, incluindo classificacao de risco.

## Metadados

```yaml
nome: skill-indicadores-fiscais
prioridade: ALTA
tabela_destino: indicadores_fiscais_municipio
fonte: siconfi_rgf, siconfi_rreo (internas)
periodicidade: Apos cada importacao SICONFI
tempo_estimado: 15 minutos
registros_esperados: ~83K (5.571 x 5 anos x 3 periodos)
dependencias: [skill-siconfi-rgf-completo, skill-siconfi-rreo-completo]
```

## Objetivo

Calcular e classificar os indicadores fiscais de cada municipio conforme os limites da Lei de Responsabilidade Fiscal (LRF), alimentando a tabela `indicadores_fiscais_municipio`.

## Funcionalidades do Frontend que Dependem

- **Alertas Fiscais**: Painel completo de alertas por estado/municipio
- **Dashboard**: Indicadores de risco, gauge charts
- **RGF**: Status de cada limite LRF

## Indicadores Calculados

| Indicador | Campo | Calculo | Limites |
|-----------|-------|---------|---------|
| Despesa Pessoal | dp_percentual | (Despesa Pessoal / RCL) x 100 | OK <48.6%, ALERTA 48.6-51.2%, PRUDENCIAL 51.3-53.9%, CRITICO >=54% |
| **Disponibilidade Caixa** | dc_percentual_rcl | (Disp. Liquida / RCL) x 100 | OK >=10%, PRUDENCIAL 5-9.99%, ALERTA 1-4.99%, CRITICO <1% ou negativo |
| **Liquidez** | lq_percentual_rcl | (Caixa Bruta / RCL) x 100 | OK >=10%, PRUDENCIAL 5-9.99%, ALERTA 1-4.99%, CRITICO <1% |
| Cobertura RPPS | da_cobertura | (Ativo RPPS / Passivo RPPS) x 100 | OK >=90%, PRUDENCIAL 60-89%, ALERTA 30-59%, CRITICO <30% |
| Ativos/Inativos | pa_proporcao | Despesa Ativos / Despesa Inativos | OK >4.0, ALERTA 2-4, CRITICO <2 |
| Risco Consolidado | risco_consolidado | Matriz de risco | NORMAL, BAIXO, MEDIO, ALTO, CRITICO |

> **Nota (v1.65):** Disponibilidade de Caixa e Liquidez agora sao classificadas como % da RCL, nao mais por valor absoluto. Isso garante classificacao proporcional ao porte do municipio.

## Classificacao de Risco

```
CRITICO:  2+ indicadores criticos
ALTO:     1 critico OU 3+ alertas
MEDIO:    2 alertas
BAIXO:    1 alerta
NORMAL:   Nenhum alerta
```

## Estrutura da Tabela Destino

```sql
indicadores_fiscais_municipio (
    id SERIAL PRIMARY KEY,
    codigo_ibge INTEGER NOT NULL,
    exercicio INTEGER NOT NULL,
    periodo INTEGER NOT NULL,

    -- Despesa com Pessoal
    dp_valor_total NUMERIC(20,2),
    dp_rcl NUMERIC(20,2),
    dp_percentual NUMERIC(5,2),
    dp_status VARCHAR(20),

    -- Deficit Atuarial
    da_passivo_atuarial NUMERIC(20,2),
    da_ativo_plano NUMERIC(20,2),
    da_deficit NUMERIC(20,2),
    da_cobertura_percentual NUMERIC(5,2),
    da_status VARCHAR(20),

    -- Disponibilidade de Caixa
    dc_caixa_bruta NUMERIC(20,2),
    dc_rp_processados NUMERIC(20,2),
    dc_disponibilidade_liquida NUMERIC(20,2),
    dc_percentual_rcl NUMERIC(6,2),       -- NOVO: % da RCL
    dc_status VARCHAR(20),

    -- Liquidez
    lq_caixa NUMERIC(20,2),
    lq_obrigacoes_cp NUMERIC(20,2),
    lq_indice NUMERIC(5,2),
    lq_percentual_rcl NUMERIC(6,2),       -- NOVO: % da RCL
    lq_status VARCHAR(20),

    -- Proporcao Ativos/Inativos
    pa_despesa_ativos NUMERIC(20,2),
    pa_despesa_inativos NUMERIC(20,2),
    pa_proporcao NUMERIC(5,2),
    pa_status VARCHAR(20),

    -- Consolidado
    risco_consolidado VARCHAR(20),
    total_indicadores_criticos INTEGER,
    total_indicadores_alerta INTEGER,
    atualizado_em TIMESTAMP WITH TIME ZONE,

    UNIQUE(codigo_ibge, exercicio, periodo)
)
```

## Execucao

```bash
# Calcular indicadores de um exercicio/periodo
python scripts/skill_indicadores_fiscais.py --exercicio 2025 --periodo 3

# Recalcular todos os indicadores
python scripts/skill_indicadores_fiscais.py --todos
```

## Cron

```cron
# Executar apos importacao RGF (dia 21 de mai, set, jan)
0 6 21 5,9,1 * cd /app/scripts && python skill_indicadores_fiscais.py --exercicio $(date +\%Y) --periodo $(($(date +\%m)/4+1))
```

## Pos-Execucao

Apos executar esta skill:
1. `skill-alertas-estado` - Atualizar agregacao por estado
2. `skill-refresh-materializadas` - Atualizar MVs

## Triggers

- Executar quando: importacao RGF/RREO concluida
- Executar quando: usuario solicitar recalculo de indicadores
