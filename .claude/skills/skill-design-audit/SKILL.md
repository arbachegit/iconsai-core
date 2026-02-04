---
name: design-audit
description: >
  Skill para auditoria de design e UI/UX do sistema FIA. Use para verificar consistencia visual,
  validar componentes contra as regras de design, identificar desvios de padrao, e garantir que
  novas paginas sigam o Design System. Triggers incluem auditoria de design, verificar UI,
  consistencia visual, validar componente, design system e padrao visual.
---

# FIA Design Audit

Skill para auditoria e validacao de design do sistema FIA (Fiscalizacao Inteligente de Acoes).

## Objetivo Principal

Garantir consistencia visual em todo o sistema atraves de:
1. Auditoria de paginas contra o Design System
2. Validacao de novos componentes
3. Identificacao de desvios de padrao
4. Geracao de relatorios de conformidade
5. Sugestoes de correcao

## Design System de Referencia

O documento de regras esta em: `.claude/design-rules.md`

### Componentes de Referencia (Padrao Ouro)

| Tipo | Arquivo | Uso |
|------|---------|-----|
| Pagina CRUD | `src/pages/UserRegistryPage.tsx` | Cadastros, listagens |
| Pagina Relatorio | `src/pages/RGFPage.tsx` | Relatorios fiscais |
| Tab de Relatorio | `src/components/reports/tabs/rgf/DespesaPessoalTab.tsx` | Conteudo de abas |
| Header | `src/components/layout/Header.tsx` | Cabecalhos |
| Sidebar | `src/components/layout/Sidebar.tsx` | Menu lateral |
| Card Indicador | `src/components/reports/tabs/shared/IndicatorCard.tsx` | KPIs |
| Container Grafico | `src/components/reports/tabs/shared/ChartContainer.tsx` | Graficos |

## Workflow de Auditoria

### 1. Auditoria Rapida de Pagina

```bash
# Verificar uma pagina especifica
claude "auditar design de src/pages/NovaPagina.tsx"
```

O auditor ira:
1. Ler o arquivo da pagina
2. Comparar com as regras de design
3. Listar conformidades e desvios
4. Sugerir correcoes

### 2. Auditoria Completa do Sistema

```bash
# Auditar todas as paginas
claude "fazer auditoria completa de design"
```

Gera relatorio em `docs/AUDITORIA_DESIGN.md`

### 3. Validacao de Novo Componente

```bash
# Validar componente novo antes de commit
claude "validar design de src/components/novo/MeuComponente.tsx"
```

## Checklist de Auditoria

### Header
- [ ] Background: `bg-[#0f1629]/80 backdrop-blur-sm`
- [ ] Borda: `border-b border-cyan-500/10`
- [ ] Titulo: gradiente `from-cyan-400 via-green-400 to-yellow-400`
- [ ] Subtitulo: `text-sm text-slate-400`

### Sidebar
- [ ] Background: `bg-slate-900`
- [ ] Borda: `border-r border-slate-700`
- [ ] Item ativo: `bg-slate-800 text-cyan-400`
- [ ] Item hover: `hover:bg-slate-800 hover:text-white`

### Cards
- [ ] Background: `bg-[#0f1629]` ou `bg-[#0f1629]/80`
- [ ] Bordas: `rounded-xl` ou `rounded-2xl`
- [ ] Borda cor: `border-cyan-500/20`
- [ ] Shadow glow: `shadow-[0_0_30px_rgba(0,255,255,0.05)]`

### Tabelas
- [ ] Header: `bg-[#1a2332]/80`
- [ ] Linha hover: `hover:bg-cyan-500/5`
- [ ] Bordas: `border-cyan-500/10`
- [ ] Textos: branco para principais, `text-slate-400` para secundarios

### Inputs
- [ ] Background: `bg-[#1a2332]`
- [ ] Borda: `border-cyan-500/20`
- [ ] Focus: `focus:ring-cyan-500/30 focus:border-cyan-500/50`
- [ ] Placeholder: `placeholder-slate-500`

### Botoes

#### Tipos de Botao

| Tipo | Classes | Uso |
|------|---------|-----|
| **Primario** | `bg-gradient-to-r from-cyan-500 to-purple-500 hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] text-white font-medium rounded-xl` | Acoes principais em modais (Salvar, Confirmar) |
| **Destacado** | `group bg-slate-800/90 backdrop-blur-sm border-cyan-500/30 rounded-xl shadow-lg hover:scale-105 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)]` | Botoes de destaque em headers (Mapa Fiscal, Atualizar, Exportar) |
| **Acao** | `bg-[#1a2332] border border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/10 text-cyan-400 rounded-lg` | Botoes de acao em modais (Fechar, Cancelar) |
| **Ghost** | `hover:bg-slate-800 text-slate-300 hover:text-cyan-400` | Links e acoes sutis |
| **Destrutivo** | `bg-[#1a2332] border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/10 text-red-400 rounded-lg` | Excluir, Remover |

#### Codigo de Referencia

```tsx
// Botao Primario (para modais - acao principal)
<button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] text-white font-medium transition-all">
  <Icon className="h-4 w-4" />
  Confirmar
</button>

// Botao Destacado (para headers - Mapa Fiscal, Atualizar Dados, Exportar CSV)
<button className="group flex items-center gap-2 px-4 py-2.5 bg-slate-800/90 backdrop-blur-sm border border-cyan-500/30 rounded-xl shadow-lg transition-all duration-300 hover:bg-slate-700/90 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)] hover:scale-105">
  <Icon className="h-4 w-4 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
  <span className="text-cyan-400 group-hover:text-cyan-300 transition-colors text-sm font-medium">Mapa Fiscal</span>
</button>

// Botao de Acao (Fechar, Verificar, etc)
<button className="flex items-center gap-2 px-4 py-2 bg-[#1a2332] border border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/10 text-cyan-400 rounded-lg text-sm transition-all">
  Fechar
</button>
```

#### Botoes Toggle (Filtros)

```tsx
// Toggle Ativo - Gradiente Cyan (ex: "Apenas Capitais")
<button className="group flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all duration-300 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium shadow-lg hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] hover:scale-105">
  <Icon className="h-4 w-4 text-white" />
  <span className="text-white">Apenas Capitais</span>
</button>

// Toggle Ativo - Gradiente Ambar (ex: "Com Lacunas")
<button className="group flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all duration-300 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium shadow-lg hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-105">
  <Icon className="h-4 w-4 text-white" />
  <span className="text-white">Com Lacunas</span>
</button>

// Toggle Inativo (mesmo estilo do Destacado)
<button className="group flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all duration-300 bg-slate-800/90 border border-cyan-500/30 hover:bg-slate-700/90 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)] hover:scale-105">
  <Icon className="h-4 w-4 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
  <span className="text-cyan-400 group-hover:text-cyan-300 transition-colors">Filtro Inativo</span>
</button>
```

#### Padrao para Headers

| Botao | Tipo | Exemplo |
|-------|------|---------|
| Mapa | Destacado | Mapa Fiscal, Mapa Coropletico |
| Atualizar | Destacado | Atualizar Dados, Refresh |
| Exportar | Destacado | Exportar CSV, Download |
| Filtro toggle | Toggle | Apenas Capitais, Com Lacunas |

#### Padrao para Modais

| Botao | Tipo | Posicao |
|-------|------|---------|
| Fechar | Acao | Esquerda ou direita |
| Cancelar | Acao | Esquerda do primario |
| Verificar | Acao | Esquerda |
| Confirmar/Salvar | Primario | Direita (destaque) |

#### Checklist de Botoes
- [ ] Primario: gradiente cyan-purple com glow (apenas em modais)
- [ ] Destacado: `bg-slate-800/90 border-cyan-500/30` com `hover:scale-105` e `group` hover
- [ ] Acao: `bg-[#1a2332] border-cyan-500/20 text-cyan-400`
- [ ] Toggle ativo: gradiente apropriado (cyan ou ambar) com `hover:scale-105`
- [ ] Toggle inativo: mesmo estilo do Destacado
- [ ] Destrutivo: bordas e texto vermelhos
- [ ] Todos com `transition-all duration-300`
- [ ] Icones com `h-4 w-4` e cores coordenadas via `group-hover`

### Estados
- [ ] Loading: `Loader2` com `animate-spin text-cyan-400`
- [ ] Empty: icone + texto + CTA opcional
- [ ] Error: cores vermelhas

### Cores Semanticas
- [ ] Sucesso/OK: green-400/500
- [ ] Alerta/Atencao: yellow-400/500
- [ ] Erro/Critico: red-400/500
- [ ] Info/Neutro: cyan-400/500 ou slate-400

### Icones
- [ ] Biblioteca: Lucide React
- [ ] Tamanhos: `h-4 w-4` (sm), `h-5 w-5` (md), `h-6 w-6` (lg)

## Formato do Relatorio de Auditoria

```markdown
# Auditoria de Design - [Nome do Arquivo]

## Resumo
- **Conformidade**: X%
- **Desvios Criticos**: N
- **Desvios Menores**: N
- **Sugestoes**: N

## Conformidades
- [x] Header segue padrao
- [x] Cores semanticas corretas
...

## Desvios Encontrados

### Criticos
1. **[Linha X]** Background incorreto
   - Encontrado: `bg-gray-800`
   - Esperado: `bg-[#0f1629]`

### Menores
1. **[Linha Y]** Tamanho de icone inconsistente
   - Encontrado: `h-6 w-6`
   - Esperado: `h-5 w-5`

## Correcoes Sugeridas

### 1. Corrigir background do card
Alterar linha X:
- De: `<div className="bg-gray-800">`
- Para: `<div className="bg-[#0f1629]">`
```

## Regras de Priorizacao

### Desvios Criticos (CORRIGIR IMEDIATAMENTE)
- Cores de fundo diferentes do padrao
- Bordas de cores diferentes
- Estrutura de layout quebrada
- Gradientes de titulo incorretos

### Desvios Menores (CORRIGIR QUANDO POSSIVEL)
- Tamanhos de icones diferentes
- Espacamentos ligeiramente diferentes
- Rounded incorreto (xl vs 2xl)
- Opacidades diferentes

### Sugestoes (AVALIAR)
- Componentes que poderiam ser extraidos
- Oportunidades de usar componentes compartilhados
- Melhorias de acessibilidade

## Integracao com Desenvolvimento

### Antes de Criar Nova Pagina
1. Ler `.claude/design-rules.md`
2. Usar componentes de referencia como base
3. Seguir checklist de auditoria

### Antes de Commit
1. Executar auditoria rapida
2. Corrigir desvios criticos
3. Documentar desvios menores aceitos

### Code Review
1. Incluir resultado de auditoria no PR
2. Justificar desvios intencionais
3. Atualizar design-rules.md se houver nova regra

## Comandos Uteis

```bash
# Auditoria de pagina
claude "auditar design de src/pages/MinhaPage.tsx"

# Auditoria completa
claude "fazer auditoria completa de design do sistema"

# Validar novo componente
claude "validar componente src/components/novo/Componente.tsx contra design system"

# Comparar com referencia
claude "comparar src/pages/NovaPagina.tsx com src/pages/UserRegistryPage.tsx"

# Gerar correcoes
claude "gerar correcoes de design para src/pages/PaginaComProblemas.tsx"
```

## Metricas de Qualidade

| Metrica | Meta | Aceitavel |
|---------|------|-----------|
| Conformidade Geral | >95% | >85% |
| Desvios Criticos | 0 | 0 |
| Desvios Menores | <5 por pagina | <10 |
| Componentes Reutilizados | >80% | >60% |
