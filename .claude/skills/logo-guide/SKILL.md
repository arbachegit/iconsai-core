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

```css
/* Cores principais do logo */
--logo-gray: #D1D5DB;      /* Cinza claro - "icons" */
--logo-red: #EF4444;       /* Vermelho - ".ai" */
--logo-orange: #F97316;    /* Laranja alternativo */

/* Em HSL */
--logo-gray-hsl: 220 13% 84%;
--logo-red-hsl: 0 84% 60%;
--logo-orange-hsl: 25 95% 53%;
```

---

## Arquivos do Logo

### Localizacao

```
/Users/fernandoarbache/Downloads/Logo/Iconsai/
├── iconsai_no_bg copy.png    # Logo completo sem fundo (PRINCIPAL)
├── cropped_iconsai NO_BG.png # Logo cropped "i.ai" para favicon
└── [outras variacoes]
```

### Arquivo Principal no Projeto

```
public/images/
└── iconsai-logo.png          # Logo principal (2.2MB, alta resolucao)
```

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
| Header/Login | 280px | auto | `h-16 w-auto` |
| Sidebar | 160px | auto | `h-10 w-auto` |
| Footer | 120px | auto | `h-8 w-auto` |
| Mobile | 200px | auto | `h-12 w-auto` |

---

## Fundo Transparente - OBRIGATORIO

### Regra Principal

> **O logo DEVE sempre ser exibido com fundo transparente.**
> **NAO adicionar bordas, sombras ou contornos ao redor do logo.**

### Implementacao Correta

```tsx
// CORRETO - Sem fundo, sem contorno
<Image
  src="/images/iconsai-logo.png"
  alt="Iconsai"
  width={280}
  height={80}
  className="h-16 w-auto"
/>

// CORRETO - Sem classes de background
<div className="flex justify-center">
  <Image src="/images/iconsai-logo.png" ... />
</div>
```

### Implementacao INCORRETA

```tsx
// ERRADO - Fundo branco
<div className="bg-white p-4">
  <Image src="/images/iconsai-logo.png" ... />
</div>

// ERRADO - Borda ao redor
<Image
  src="/images/iconsai-logo.png"
  className="border border-gray-200 rounded-lg"
  ...
/>

// ERRADO - Sombra que cria "caixa"
<Image
  src="/images/iconsai-logo.png"
  className="shadow-lg"
  ...
/>
```

---

## Aplicacoes

### 1. Tela de Login

```tsx
<div className="text-center">
  <div className="flex justify-center mb-6">
    <Image
      src="/images/iconsai-logo.png"
      alt="Iconsai"
      width={280}
      height={80}
      priority
      className="h-16 w-auto"
    />
  </div>
  <h1 className="text-2xl font-bold">OKR System</h1>
</div>
```

### 2. Sidebar Header

```tsx
<div className="flex items-center gap-3 px-4 py-3">
  <Image
    src="/images/iconsai-logo.png"
    alt="Iconsai"
    width={160}
    height={45}
    className="h-10 w-auto"
  />
</div>
```

### 3. Footer

```tsx
<footer className="border-t border-border py-4">
  <div className="flex justify-center">
    <Image
      src="/images/iconsai-logo.png"
      alt="Iconsai"
      width={120}
      height={34}
      className="h-8 w-auto opacity-60"
    />
  </div>
</footer>
```

---

## Area de Protecao (Clear Space)

O logo deve ter espaco livre ao redor equivalente a altura da letra "i":

```
    ┌─────────────────────────────────┐
    │                                 │
    │    [  icons.ai  ]               │
    │                                 │
    └─────────────────────────────────┘
         ↑ Espaco minimo = altura do "i"
```

---

## Contraste e Legibilidade

### Fundos Escuros (Recomendado)

O logo foi projetado para fundos escuros:

```css
/* Fundos ideais */
background: #0a0e1a;  /* Azul escuro */
background: #0f1629;  /* Azul muito escuro */
background: #1a1a2e;  /* Roxo escuro */
```

### Fundos Claros

Em fundos claros, considerar usar versao com cores invertidas ou adicionar overlay:

```tsx
// Overlay escuro para fundos claros
<div className="relative">
  <div className="absolute inset-0 bg-black/5 rounded-lg" />
  <Image src="/images/iconsai-logo.png" ... />
</div>
```

---

## Animacoes (Opcional)

### Fade In na Carga

```tsx
<Image
  src="/images/iconsai-logo.png"
  className="h-16 w-auto animate-fade-in"
  ...
/>

// CSS
@keyframes fade-in {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fade-in 0.5s ease-out;
}
```

### Hover Sutil (apenas em contextos interativos)

```tsx
<Link href="/">
  <Image
    src="/images/iconsai-logo.png"
    className="h-16 w-auto transition-opacity hover:opacity-80"
    ...
  />
</Link>
```

---

## Otimizacao de Performance

### Next.js Image Component

Sempre usar o componente `Image` do Next.js:

```tsx
import Image from 'next/image'

<Image
  src="/images/iconsai-logo.png"
  alt="Iconsai"
  width={280}      // Largura intrinseca
  height={80}      // Altura intrinseca
  priority         // Para logos above-the-fold
  className="..."  // Dimensoes via CSS
/>
```

### Propriedades Importantes

| Prop | Uso | Quando |
|------|-----|--------|
| `priority` | Pre-carrega a imagem | Logos no header/login |
| `loading="lazy"` | Carrega sob demanda | Logos no footer |
| `placeholder="blur"` | Mostra blur durante carga | Imagens grandes |

---

## Checklist de Implementacao

- [x] Usar arquivo PNG com fundo transparente
- [x] Implementar com `next/image` para otimizacao
- [x] Adicionar `alt="Iconsai"` para acessibilidade
- [x] Usar `priority` para logos above-the-fold
- [x] Definir dimensoes via `className` (h-XX w-auto)
- [ ] Verificar contraste com fundo
- [ ] Testar em mobile
- [ ] Verificar que nao ha borda/contorno visivel

---

## Arquivos Relacionados

| Arquivo | Uso |
|---------|-----|
| `public/images/iconsai-logo.png` | Logo principal |
| `src/app/icon.png` | Favicon (cropped "i.ai") |
| `src/app/apple-icon.png` | Apple Touch Icon |

---

## Referencias

- Arquivo fonte: `/Users/fernandoarbache/Downloads/Logo/Iconsai/iconsai_no_bg copy.png`
- Skill relacionada: `favicon-guide` (para icone da aba)
