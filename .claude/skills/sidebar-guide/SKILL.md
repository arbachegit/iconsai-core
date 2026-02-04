---
name: sidebar-guide
description: Guia completo do sistema de sidebar seguindo o padrao shadcn/ui com Radix UI
allowed-tools: Read, Grep, Glob
---

# Guia Completo do Sistema de Sidebar

Esta skill documenta a implementacao do sidebar seguindo o padrao shadcn/ui, incluindo o sistema de collapse, variante floating, e todos os componentes relacionados.

---

## Dependencias Necessarias

```bash
npm install @radix-ui/react-dialog @radix-ui/react-tooltip @radix-ui/react-separator @radix-ui/react-slot class-variance-authority clsx tailwind-merge lucide-react
```

| Pacote | Uso |
|--------|-----|
| `@radix-ui/react-dialog` | Sheet (drawer mobile) |
| `@radix-ui/react-tooltip` | Tooltips no modo colapsado |
| `@radix-ui/react-separator` | Separadores |
| `@radix-ui/react-slot` | Composicao de componentes |
| `class-variance-authority` | Variantes de estilo (cva) |
| `clsx` + `tailwind-merge` | Merge de classes CSS |
| `lucide-react` | Icones |

---

## Arquivos Principais

| Arquivo | Descricao |
|---------|-----------|
| `src/components/ui/sidebar.tsx` | Componente base com 20+ componentes compostos |
| `src/components/ui/button.tsx` | Botao base (usado pelo SidebarTrigger) |
| `src/components/ui/sheet.tsx` | Drawer mobile (Radix Dialog) |
| `src/components/ui/tooltip.tsx` | Tooltips (Radix Tooltip) |
| `src/components/ui/separator.tsx` | Separador (Radix Separator) |
| `src/components/ui/skeleton.tsx` | Loading skeleton |
| `src/components/ui/input.tsx` | Input base |
| `src/hooks/use-mobile.tsx` | Hook para deteccao de dispositivo mobile |
| `src/lib/utils.ts` | Funcao cn() para merge de classes |
| `src/app/globals.css` | Tokens de design do sidebar |

---

## 1. Estrutura de Componentes

O sistema exporta os seguintes componentes:

```typescript
// Provider e Context
export { SidebarProvider, useSidebar }

// Componentes principais
export { Sidebar, SidebarTrigger, SidebarRail, SidebarInset }

// Estrutura e layout
export { SidebarHeader, SidebarFooter, SidebarContent, SidebarSeparator }

// Grupos e organizacao
export { SidebarGroup, SidebarGroupLabel, SidebarGroupAction, SidebarGroupContent }

// Menu e itens
export { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuAction, SidebarMenuBadge }

// Sub-menus
export { SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton }

// Utilitarios
export { SidebarInput, SidebarMenuSkeleton }
```

---

## 2. Sistema de Contexto (SidebarContext)

### 2.1 Estrutura do Contexto

```typescript
type SidebarContext = {
  state: "expanded" | "collapsed";  // Estado visual atual
  open: boolean;                     // Desktop: sidebar aberto?
  setOpen: (open: boolean) => void;
  openMobile: boolean;               // Mobile: drawer aberto?
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;                 // E dispositivo mobile?
  toggleSidebar: () => void;         // Alterna estado
};
```

### 2.2 Hook useSidebar()

```typescript
import { useSidebar } from "@/components/ui/sidebar";

function MeuComponente() {
  const { state, open, toggleSidebar, isMobile } = useSidebar();

  return (
    <button onClick={toggleSidebar}>
      {state === "expanded" ? "Recolher" : "Expandir"}
    </button>
  );
}
```

### 2.3 SidebarProvider

```typescript
<SidebarProvider
  defaultOpen={true}           // Estado inicial (default: true)
  open={controlledOpen}        // Controle externo (opcional)
  onOpenChange={setOpen}       // Callback de mudanca (opcional)
>
  <Sidebar>...</Sidebar>
  <SidebarInset>...</SidebarInset>
</SidebarProvider>
```

**Funcionalidades automaticas:**
- Persiste estado em cookie por 7 dias (`sidebar:state`)
- Atalho de teclado: `Ctrl+B` / `Cmd+B`
- Deteccao automatica de mobile (breakpoint 768px)
- TooltipProvider integrado

---

## 3. Sistema de Collapse (Recolher/Expandir)

### 3.1 Modos de Collapse

O sidebar suporta tres modos de collapse via prop `collapsible`:

| Modo | Comportamento |
|------|---------------|
| `"offcanvas"` | Sidebar desliza para fora da view (padrao) |
| `"icon"` | Mostra apenas icones quando colapsado (3rem de largura) |
| `"none"` | Sempre visivel, sem collapse |

```typescript
<Sidebar collapsible="icon">
  {/* Quando colapsado, mostra apenas icones */}
</Sidebar>

<Sidebar collapsible="offcanvas">
  {/* Quando colapsado, sai completamente da view */}
</Sidebar>

<Sidebar collapsible="none">
  {/* Sempre visivel, nao recolhe */}
</Sidebar>
```

### 3.2 Dimensoes

```typescript
const SIDEBAR_WIDTH = "16rem";        // 256px - expandido desktop
const SIDEBAR_WIDTH_MOBILE = "18rem"; // 288px - mobile drawer
const SIDEBAR_WIDTH_ICON = "3rem";    // 48px - modo icone
```

### 3.3 Comportamento por Dispositivo

**Desktop (>= 768px):**
- Sidebar fixo na lateral
- Toggle alterna entre expanded/collapsed
- Usa transicoes CSS para animacao (200ms ease-linear)

**Mobile (< 768px):**
- Usa componente `Sheet` (Radix UI Dialog)
- Aparece como drawer deslizante
- Overlay escurece o fundo

```typescript
// Renderizacao mobile automatica (interno do Sidebar)
if (isMobile) {
  return (
    <Sheet open={openMobile} onOpenChange={setOpenMobile}>
      <SheetContent
        side={side}
        className="w-[--sidebar-width] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
        style={{ "--sidebar-width": SIDEBAR_WIDTH_MOBILE }}
      >
        <div className="flex h-full w-full flex-col">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
```

---

## 4. Variante Floating (Flutuante)

### 4.1 Tres Variantes Disponiveis

| Variante | Descricao |
|----------|-----------|
| `"sidebar"` | Fixo na lateral, ocupa espaco no layout (padrao) |
| `"floating"` | Flutuante com borda arredondada e sombra |
| `"inset"` | Inset com margem e sombra |

### 4.2 Implementacao Floating

```typescript
<Sidebar variant="floating" collapsible="icon">
  {/* Sidebar flutuante com collapse em modo icone */}
</Sidebar>
```

**Estilos aplicados no modo floating:**

```css
group-data-[variant=floating]:rounded-lg
group-data-[variant=floating]:border
group-data-[variant=floating]:border-sidebar-border
group-data-[variant=floating]:shadow
```

---

## 5. Componentes de Controle

### 5.1 SidebarTrigger

Botao para alternar o sidebar (usa componente Button com variant="ghost"):

```typescript
import { SidebarTrigger } from "@/components/ui/sidebar";

<SidebarTrigger className="h-7 w-7" />
```

Renderiza um botao com icone `PanelLeft` (lucide-react) que chama `toggleSidebar()`.

### 5.2 SidebarRail

Elemento interativo na borda do sidebar:

```typescript
<Sidebar>
  <SidebarContent>...</SidebarContent>
  <SidebarRail /> {/* Borda clicavel para toggle */}
</Sidebar>
```

**Caracteristicas:**
- Posicionado na borda direita do sidebar
- Cursor `w-resize` para indicar interatividade
- Linha de 2px aparece no hover
- Click dispara `toggleSidebar()`

---

## 6. Estrutura do Sidebar

### 6.1 Layout Basico

```typescript
<SidebarProvider>
  <Sidebar>
    <SidebarHeader>
      {/* Logo, titulo, etc */}
    </SidebarHeader>

    <SidebarSeparator />

    <SidebarContent>
      {/* Area scrollavel com menus */}
      <SidebarGroup>
        <SidebarGroupLabel>Navegacao</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton>Item 1</SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarSeparator />

    <SidebarFooter>
      {/* Acoes, perfil, etc */}
    </SidebarFooter>

    <SidebarRail />
  </Sidebar>

  <SidebarInset>
    <header>
      <SidebarTrigger />
    </header>
    <main>Conteudo principal</main>
  </SidebarInset>
</SidebarProvider>
```

---

## 7. Menu Buttons com Tooltip

### 7.1 SidebarMenuButton com Tooltip

```typescript
<SidebarMenuButton
  tooltip="Dashboard"  // Tooltip aparece no modo colapsado
  isActive={true}      // Estado ativo
  variant="default"    // "default" ou "outline"
  size="default"       // "default", "sm", ou "lg"
>
  <Home />
  <span>Dashboard</span>
</SidebarMenuButton>
```

**Comportamento do Tooltip:**
- Aparece automaticamente quando `state === "collapsed"`
- Posicionado a direita do botao
- Escondido em dispositivos mobile
- Usa Radix UI Tooltip internamente

### 7.2 Variantes de Tamanho

| Size | Altura | Font |
|------|--------|------|
| `"default"` | h-8 | text-sm |
| `"sm"` | h-7 | text-xs |
| `"lg"` | h-12 | text-sm |

---

## 8. Data Attributes

O sistema usa data attributes para estilos condicionais:

| Attribute | Valores | Uso |
|-----------|---------|-----|
| `data-state` | `"expanded"` / `"collapsed"` | Estado atual |
| `data-collapsible` | `"offcanvas"` / `"icon"` / `""` | Modo de collapse |
| `data-variant` | `"sidebar"` / `"floating"` / `"inset"` | Variante visual |
| `data-side` | `"left"` / `"right"` | Posicionamento |
| `data-sidebar` | `"sidebar"` / `"menu-button"` / etc | Identificador do componente |
| `data-active` | `"true"` / `"false"` | Estado ativo do item |

**Uso em CSS (Tailwind):**

```css
/* Quando colapsado no modo icon */
group-data-[collapsible=icon]:w-[--sidebar-width-icon]
group-data-[collapsible=icon]:!size-8
group-data-[collapsible=icon]:!p-2

/* Quando variante e floating */
group-data-[variant=floating]:rounded-lg

/* Ocultar label no modo icon */
group-data-[collapsible=icon]:-mt-8
group-data-[collapsible=icon]:opacity-0
```

---

## 9. Tokens de Design (globals.css)

### 9.1 CSS Variables

```css
@layer base {
  :root {
    /* Cores base do tema */
    --background: 225 71% 8%;
    --foreground: 220 17% 93%;
    --card: 225 54% 12%;
    --primary: 191 100% 50%;
    --secondary: 270 64% 58%;
    --muted: 225 40% 18%;
    --accent: 150 100% 50%;
    --destructive: 0 84% 60%;
    --border: 225 40% 20%;

    /* Tokens especificos do Sidebar */
    --sidebar-background: 225 54% 10%;
    --sidebar-foreground: 220 17% 93%;
    --sidebar-primary: 191 100% 50%;
    --sidebar-primary-foreground: 225 71% 8%;
    --sidebar-accent: 225 40% 18%;
    --sidebar-accent-foreground: 220 17% 93%;
    --sidebar-border: 225 40% 20%;
    --sidebar-ring: 191 100% 50%;
  }
}

@theme inline {
  --color-sidebar: hsl(var(--sidebar-background));
  --color-sidebar-foreground: hsl(var(--sidebar-foreground));
  --color-sidebar-primary: hsl(var(--sidebar-primary));
  --color-sidebar-accent: hsl(var(--sidebar-accent));
  --color-sidebar-accent-foreground: hsl(var(--sidebar-accent-foreground));
  --color-sidebar-border: hsl(var(--sidebar-border));
  --color-sidebar-ring: hsl(var(--sidebar-ring));
}
```

### 9.2 Cores Semanticas

| Token | Uso |
|-------|-----|
| `bg-sidebar` | Fundo do sidebar |
| `text-sidebar-foreground` | Texto principal |
| `bg-sidebar-accent` | Hover/active de itens |
| `text-sidebar-accent-foreground` | Texto no hover/active |
| `border-sidebar-border` | Bordas |
| `ring-sidebar-ring` | Focus ring |

---

## 10. Utilitario cn()

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 11. Hook useIsMobile

```typescript
// src/hooks/use-mobile.tsx
"use client";

import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
```

---

## 12. Resumo Tecnico

| Aspecto | Valor |
|---------|-------|
| **Contexto** | React Context com memoization |
| **Persistencia** | Cookie (7 dias) + state interno |
| **Mobile** | Sheet (Radix UI Dialog) como drawer |
| **Desktop** | Position fixed com transicoes |
| **Atalho** | Ctrl+B / Cmd+B |
| **Breakpoint** | 768px |
| **Variantes** | sidebar, floating, inset |
| **Collapse modes** | offcanvas, icon, none |
| **Animacao** | 200ms ease-linear |
| **Width expandido** | 16rem (256px) |
| **Width mobile** | 18rem (288px) |
| **Width icon** | 3rem (48px) |

---

## 13. Exemplo Completo

```typescript
// src/components/AppSidebar.tsx
"use client";

import { useRouter } from "next/navigation";
import {
  Home,
  Mic,
  Folder,
  Users,
  BarChart3,
  CheckCircle,
  Calendar,
  UserPlus,
  Settings,
  LogOut,
  Zap,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  user: { first_name?: string; org_role?: string } | null;
  onLogout?: () => void;
}

export function AppSidebar({ user, onLogout }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold text-gradient">Meu App</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive tooltip="Dashboard">
                  <Home />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Projetos">
                  <Folder />
                  <span>Projetos</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Equipe">
                  <Users />
                  <span>Equipe</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user?.org_role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Configuracoes">
                    <Settings />
                    <span>Configuracoes</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sair"
              onClick={onLogout}
              className="text-destructive hover:text-destructive"
            >
              <LogOut />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
```

```typescript
// src/app/dashboard/page.tsx
"use client";

import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function DashboardPage() {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar user={{ first_name: "Usuario", org_role: "admin" }} />

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-sm px-4">
          <SidebarTrigger />
          <h1>Dashboard</h1>
        </header>

        <main className="flex-1 p-6">
          {/* Conteudo */}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

---

## 14. Checklist de Implementacao

- [ ] Instalar dependencias (Radix UI, cva, lucide-react, etc.)
- [ ] Criar `src/lib/utils.ts` com funcao `cn()`
- [ ] Criar componentes UI base (button, sheet, tooltip, separator, skeleton, input)
- [ ] Criar `src/hooks/use-mobile.tsx`
- [ ] Criar `src/components/ui/sidebar.tsx` com todos os componentes
- [ ] Adicionar tokens do sidebar em `globals.css`
- [ ] Criar sidebar customizado (ex: `AppSidebar.tsx`)
- [ ] Usar `SidebarProvider` + `SidebarInset` no layout/page
