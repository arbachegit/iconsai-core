---
name: logo-guide
description: Guia completo de uso do logo Iconsai com especificacoes tecnicas, cores, aplicacoes e boas praticas
allowed-tools: Read, Glob, Bash
---

# Guia de Uso do Logo Iconsai

Esta skill documenta todas as especificacoes e regras de uso do logo Iconsai nos projetos da organizacao.

---

## Descricao do Logo

O logo Iconsai e composto por:

### Elementos Visuais

| Elemento | Descricao | Cor |
|----------|-----------|-----|
| **"i"** (letra) | Letra minuscula com haste vertical | Cinza claro (#D1D5DB) |
| **Triangulo Play** | Icone de play sobre a letra "i" | Cinza claro (#D1D5DB) |
| **"cons"** | Letras em fonte sans-serif bold | Cinza claro (#D1D5DB) |
| **Triangulo Play interno** | Dentro da letra "o" | Vermelho/Laranja (#EF4444) |
| **"."** (ponto) | Separador antes de "ai" | Vermelho/Laranja (#EF4444) |
| **"ai"** | Letras finais representando Inteligencia Artificial | Vermelho/Laranja (#EF4444) |

### Tipografia

- **Fonte**: Sans-serif bold (similar a Poppins Bold ou Inter Bold)
- **Peso**: 700-800 (Bold/ExtraBold)
- **Estilo**: Moderno, limpo, tecnologico

### Paleta de Cores

\`\`\`css
/* Cores principais do logo */
--logo-gray: #D1D5DB;      /* Cinza claro - "icons" */
--logo-red: #EF4444;       /* Vermelho - ".ai" */
--logo-orange: #F97316;    /* Laranja alternativo */

/* Em HSL */
--logo-gray-hsl: 220 13% 84%;
--logo-red-hsl: 0 84% 60%;
--logo-orange-hsl: 25 95% 53%;
\`\`\`

---

## Arquivos do Logo

### Localizacao Fonte

\`\`\`
/Users/fernandoarbache/Downloads/Logo/Iconsai/
├── iconsai_no_bg copy.png    # Logo completo sem fundo (PRINCIPAL)
├── cropped_iconsai NO_BG.png # Logo cropped "i.ai" para favicon
└── [outras variacoes]
\`\`\`

### Arquivos no Projeto iconsai-core

\`\`\`
src/assets/
├── knowyou-logo.png          # Logo principal
├── knowyou-admin-logo.png    # Logo para admin dashboard
└── iconsai-logo.png          # Logo Iconsai (se existir)

public/
├── favicon.ico               # Favicon
└── apple-touch-icon.png      # Apple Touch Icon
\`\`\`

---

## Especificacoes Tecnicas

### Formato

| Propriedade | Valor |
|-------------|-------|
| Formato | PNG-24 |
| Transparencia | Sim (canal alpha) |
| Resolucao original | Alta (>2000px largura) |
| Tamanho arquivo | ~2.2MB |

### Dimensoes Recomendadas

| Uso | Largura | Altura | Classe CSS |
|-----|---------|--------|------------|
| Header/Login | 280px | auto | \`h-16 w-auto\` |
| Sidebar | 160px | auto | \`h-10 w-auto\` |
| Footer | 120px | auto | \`h-8 w-auto\` |
| Mobile | 200px | auto | \`h-12 w-auto\` |

---

## Fundo Transparente - OBRIGATORIO

### Regra Principal

> **O logo DEVE sempre ser exibido com fundo transparente.**
> **NAO adicionar bordas, sombras ou contornos ao redor do logo.**

### Implementacao Correta (React/Vite)

\`\`\`tsx
// CORRETO - Sem fundo, sem contorno
<img
  src={iconsaiLogo}
  alt="Iconsai"
  className="h-16 w-auto"
/>

// CORRETO - Importando o asset
import iconsaiLogo from "@/assets/iconsai-logo.png";

<img
  src={iconsaiLogo}
  alt="Iconsai"
  className="h-16 w-auto"
/>

// CORRETO - Sem classes de background
<div className="flex justify-center">
  <img src={iconsaiLogo} alt="Iconsai" className="h-16 w-auto" />
</div>
\`\`\`

### Implementacao INCORRETA

\`\`\`tsx
// ERRADO - Fundo branco
<div className="bg-white p-4">
  <img src={iconsaiLogo} alt="Iconsai" className="h-16 w-auto" />
</div>

// ERRADO - Borda ao redor
<img
  src={iconsaiLogo}
  alt="Iconsai"
  className="border border-gray-200 rounded-lg h-16 w-auto"
/>

// ERRADO - Sombra que cria "caixa"
<img
  src={iconsaiLogo}
  alt="Iconsai"
  className="shadow-lg h-16 w-auto"
/>
\`\`\`

---

## Aplicacoes

### 1. Tela de Login

\`\`\`tsx
import iconsaiLogo from "@/assets/iconsai-logo.png";

<div className="text-center">
  <div className="flex justify-center mb-6">
    <img
      src={iconsaiLogo}
      alt="Iconsai"
      className="h-16 w-auto"
    />
  </div>
  <h1 className="text-2xl font-bold">Iconsai Voice</h1>
</div>
\`\`\`

### 2. Sidebar Header

\`\`\`tsx
import iconsaiLogo from "@/assets/iconsai-logo.png";

<div className="flex items-center gap-3 px-4 py-3">
  <img
    src={iconsaiLogo}
    alt="Iconsai"
    className="h-10 w-auto"
  />
</div>
\`\`\`

### 3. Dashboard Header

\`\`\`tsx
import iconsaiAdminLogo from "@/assets/knowyou-admin-logo.png";

<header className="h-14 border-b border-border">
  <div className="flex items-center gap-3">
    <img
      src={iconsaiAdminLogo}
      alt="Iconsai Admin"
      className="h-8 w-auto"
    />
    <span className="font-semibold text-sm">Dashboard</span>
  </div>
</header>
\`\`\`

### 4. Footer

\`\`\`tsx
<footer className="border-t border-border py-4">
  <div className="flex justify-center">
    <img
      src={iconsaiLogo}
      alt="Iconsai"
      className="h-8 w-auto opacity-60"
    />
  </div>
</footer>
\`\`\`

---

## Area de Protecao (Clear Space)

O logo deve ter espaco livre ao redor equivalente a altura da letra "i":

\`\`\`
    ┌─────────────────────────────────┐
    │                                 │
    │    [  icons.ai  ]               │
    │                                 │
    └─────────────────────────────────┘
         ↑ Espaco minimo = altura do "i"
\`\`\`

---

## Contraste e Legibilidade

### Fundos Escuros (Recomendado)

O logo foi projetado para fundos escuros:

\`\`\`css
/* Fundos ideais */
background: #0a0e1a;  /* Azul escuro */
background: #0f1629;  /* Azul muito escuro */
background: #1a1a2e;  /* Roxo escuro */
background: #0B1120;  /* Sidebar background */
\`\`\`

### Fundos Claros

Em fundos claros, considerar usar versao com cores invertidas ou adicionar overlay:

\`\`\`tsx
// Overlay escuro para fundos claros
<div className="relative">
  <div className="absolute inset-0 bg-black/5 rounded-lg" />
  <img src={iconsaiLogo} alt="Iconsai" className="h-16 w-auto" />
</div>
\`\`\`

---

## Animacoes (Opcional)

### Fade In na Carga

\`\`\`tsx
<img
  src={iconsaiLogo}
  alt="Iconsai"
  className="h-16 w-auto animate-fade-in"
/>

// Em tailwind.config.ts, adicionar:
animation: {
  'fade-in': 'fade-in 0.5s ease-out',
}
keyframes: {
  'fade-in': {
    from: { opacity: '0', transform: 'translateY(-10px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  }
}
\`\`\`

### Hover Sutil (apenas em contextos interativos)

\`\`\`tsx
<Link to="/">
  <img
    src={iconsaiLogo}
    alt="Iconsai"
    className="h-16 w-auto transition-opacity hover:opacity-80"
  />
</Link>
\`\`\`

---

## Otimizacao de Performance

### Import Direto (Recomendado para Vite)

\`\`\`tsx
// Importar como modulo - Vite otimiza automaticamente
import iconsaiLogo from "@/assets/iconsai-logo.png";

<img
  src={iconsaiLogo}
  alt="Iconsai"
  loading="eager"  // Para logos above-the-fold
  className="h-16 w-auto"
/>
\`\`\`

### Propriedades Importantes

| Prop | Uso | Quando |
|------|-----|--------|
| \`loading="eager"\` | Carrega imediatamente | Logos no header/login |
| \`loading="lazy"\` | Carrega sob demanda | Logos no footer |
| \`decoding="async"\` | Decodifica em background | Sempre recomendado |

---

## Checklist de Implementacao

- [x] Usar arquivo PNG com fundo transparente
- [x] Importar via \`@/assets/\` para otimizacao do Vite
- [x] Adicionar \`alt="Iconsai"\` para acessibilidade
- [x] Usar \`loading="eager"\` para logos above-the-fold
- [x] Definir dimensoes via \`className\` (h-XX w-auto)
- [ ] Verificar contraste com fundo
- [ ] Testar em mobile
- [ ] Verificar que nao ha borda/contorno visivel

---

## Arquivos Relacionados no iconsai-core

| Arquivo | Uso |
|---------|-----|
| \`src/assets/knowyou-logo.png\` | Logo principal |
| \`src/assets/knowyou-admin-logo.png\` | Logo admin dashboard |
| \`public/favicon.ico\` | Favicon |
| \`public/apple-touch-icon.png\` | Apple Touch Icon |

---

## Referencias

- Arquivo fonte: \`/Users/fernandoarbache/Downloads/Logo/Iconsai/iconsai_no_bg copy.png\`
- Projeto: iconsai-core (React + Vite + TailwindCSS)
