# 📚 Storybook - Documentação de Componentes

## 🎯 O que é Storybook?

Storybook é uma ferramenta de desenvolvimento que permite visualizar, testar e documentar componentes React de forma isolada. Com ele, você pode:

- 🔍 **Visualizar** componentes em diferentes estados
- 🎨 **Testar** variações de props e estilos
- 📖 **Documentar** APIs de componentes automaticamente
- 🧪 **Desenvolver** componentes sem precisar rodar a aplicação completa
- 🤝 **Compartilhar** componentes com o time

## 🚀 Como Usar

### 1. Iniciar o Storybook

No terminal, execute:

```bash
npm run storybook
```

Isso irá:
- Iniciar o servidor Storybook na porta 6007
- Abrir automaticamente o navegador em `http://localhost:6007`
- Compilar todas as stories em modo watch (recarrega automaticamente ao editar)

### 2. Navegação

Ao abrir o Storybook, você verá:

**Sidebar (esquerda):**
- Lista de componentes organizados por categoria
- Cada componente pode ter múltiplas "stories" (variações)
- Estrutura:
  ```
  Components/
    ├── PlayButton (10 stories)
    ├── HomePlayButton (11 stories)
    ├── ToggleMicrophoneButton (5 stories)
    ├── SpectrumAnalyzer (5 stories)
    └── DemoModeIndicator (5 stories)
  Layout/
    ├── MobileFrame (5 stories)
    └── UnifiedSplashScreen (8 stories)
  ```

**Canvas (centro):**
- Visualização do componente selecionado
- Fundo configurável (claro/escuro)
- Zoom e fullscreen disponíveis

**Addons (rodapé):**
- **Controls**: Alterar props em tempo real
- **Actions**: Ver callbacks sendo executados
- **Docs**: Documentação auto-gerada
- **A11y**: Testes de acessibilidade

### 3. Testando Componentes

#### Exemplo: PlayButton

1. Na sidebar, clique em `Components > PlayButton`
2. Selecione a story "Interactive"
3. No painel **Controls** (rodapé), você pode:
   - Alternar `isPlaying` (true/false)
   - Modificar `className` para testar estilos
4. Clique no botão para ver a action sendo disparada no painel **Actions**

#### Exemplo: ToggleMicrophoneButton

1. Clique em `Components > ToggleMicrophoneButton`
2. Teste as stories:
   - **Idle**: Botão roxo (estado padrão)
   - **Listening**: Botão vermelho pulsando (gravando)
   - **Speaking**: Botão azul pulsando (IA falando)
3. Use a story **Interactive** para simular o fluxo completo:
   - Clique 1: Idle → Listening
   - Clique 2: Listening → Speaking (simula IA)
   - Aguarde 3s: Speaking → Idle

#### Exemplo: HomePlayButton

1. Clique em `Components > HomePlayButton`
2. Explore os 6 estados diferentes:
   - **Idle**: Aguardando (pulso suave, gradiente ciano)
   - **Loading**: Carregando (spinner rápido, glow intenso)
   - **Playing**: Reproduzindo (pause icon, com progress arc)
   - **Waiting**: Aguardando IA (ondas expandindo - ripple effect)
   - **Processing**: Processando (spinner rápido)
   - **Listening**: Gravando (rotação rápida, glow ativo)
3. Teste a story **Interactive**:
   - Clique no botão e veja o fluxo completo:
   - Idle → Loading (1.5s) → Playing (progresso 0-100%) → Waiting (2s) → Replay Mode
4. Story **AllStates**: Veja todos os 7 estados lado a lado
5. Story **InHomeContext**: Visualize em contexto real da tela HOME

#### Exemplo: MobileFrame

1. Clique em `Layout > MobileFrame`
2. Veja diferentes contextos:
   - **Empty**: Apenas a estrutura do frame
   - **WithSplash**: Splash screen simulado
   - **WithChat**: Interface de chat
   - **WithVoiceAssistant**: Interface de voz
   - **Comparison**: 3 PWAs lado a lado

### 4. Documentação Automática

Cada componente tem uma aba **Docs** com:

- **Descrição** do componente
- **Tabela de Props** com tipos e valores padrão
- **Exemplos de código** para copiar
- **Stories** documentadas

Para ver:
1. Selecione qualquer componente na sidebar
2. Clique na aba **Docs** (ao lado de Canvas)

### 5. Controles Interativos

Use o painel **Controls** para:

**Boolean props:**
```
isPlaying: ☐ → ☑ (toggle checkbox)
```

**String props:**
```
className: [text input]
```

**Select props:**
```
variant: [dropdown] outline | solid | ghost
```

**Callbacks:**
- São automaticamente capturados e exibidos no painel **Actions**
- Exemplo: `onClick` mostra "clicked" com argumentos

### 6. Testes de Acessibilidade

O addon **A11y** (Accessibility) verifica automaticamente:

- Contraste de cores
- Labels em inputs
- ARIA attributes
- Navegação por teclado

Para ver os resultados:
1. Selecione qualquer story
2. Abra o painel **Accessibility** (rodapé)
3. Violações aparecem como ⚠️ warnings

## 📝 Como Criar Novas Stories

### Template Básico

Crie um arquivo `.stories.tsx` ao lado do componente:

```typescript
// src/components/exemplo/MeuComponente.stories.tsx

import type { Meta, StoryObj } from '@storybook/react';
import { MeuComponente } from './MeuComponente';

const meta = {
  title: 'Components/MeuComponente', // Caminho na sidebar
  component: MeuComponente,
  parameters: {
    layout: 'centered', // ou 'fullscreen', 'padded'
    docs: {
      description: {
        component: 'Descrição do componente aqui',
      },
    },
  },
  tags: ['autodocs'], // Gera documentação automática
  argTypes: {
    // Configurar controles manualmente (opcional)
    cor: {
      control: 'color',
      description: 'Cor do componente',
    },
    tamanho: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
  },
} satisfies Meta<typeof MeuComponente>;

export default meta;
type Story = StoryObj<typeof meta>;

// Story padrão
export const Default: Story = {
  args: {
    cor: '#ff0000',
    tamanho: 'medium',
  },
};

// Story com estado interativo
export const Interactive: Story = {
  render: () => {
    const [valor, setValor] = React.useState(0);

    return (
      <MeuComponente
        valor={valor}
        onChange={setValor}
      />
    );
  },
};

import React from 'react';
```

### Organizando Stories

**Por categoria:**
```typescript
title: 'Components/Buttons/PlayButton'  // Components > Buttons > PlayButton
title: 'Layout/MobileFrame'             // Layout > MobileFrame
title: 'Forms/Input'                    // Forms > Input
```

**Múltiplas variações:**
```typescript
export const Small: Story = { args: { size: 'sm' } };
export const Medium: Story = { args: { size: 'md' } };
export const Large: Story = { args: { size: 'lg' } };
```

## 🎨 Customização

### Adicionar Backgrounds

Em `.storybook/preview.ts`:

```typescript
backgrounds: {
  default: 'dark',
  values: [
    { name: 'dark', value: '#0a0a0a' },
    { name: 'light', value: '#ffffff' },
    { name: 'purple', value: '#6b21a8' },
  ],
}
```

Usar em story específica:

```typescript
export const MyStory: Story = {
  parameters: {
    backgrounds: { default: 'purple' },
  },
};
```

### Adicionar Viewport (Mobile/Desktop)

```typescript
export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'iphone14promax',
    },
  },
};
```

## 🔧 Configuração Atual

### Addons Instalados

1. **@chromatic-com/storybook** - Deploy e visual regression
2. **@storybook/addon-a11y** - Testes de acessibilidade
3. **@storybook/addon-docs** - Documentação automática
4. **@storybook/addon-vitest** - Integração com testes

### Tailwind CSS

Já configurado! Todas as classes Tailwind funcionam nas stories.

### Theme

Background padrão: `dark` (#0a0a0a) - combina com o tema do projeto.

## 📦 Build de Produção

Para gerar uma versão estática do Storybook:

```bash
npm run build-storybook
```

Isso cria uma pasta `storybook-static/` que pode ser:
- Hospedada em qualquer servidor estático
- Compartilhada com o time
- Integrada no CI/CD

Para servir localmente:

```bash
npx http-server storybook-static
```

## 🎯 Componentes Documentados

### ✅ Já Criados

1. **PlayButton** (`Components/PlayButton`)
   - Estados: Default, Playing
   - Variações: CustomSize, CustomColor
   - Interactive demo
   - Usado nos módulos (Help, Ideas, World, Health)

2. **HomePlayButton** (`Components/HomePlayButton`)
   - 6 Estados: idle, loading, playing, waiting, processing, listening
   - Efeitos: Rotating conic gradient, glow, pulse, ripple
   - Progress arc para mostrar progresso de áudio
   - Modo replay (gradiente roxo)
   - Interactive demo (fluxo completo)
   - Comparação de todos os estados
   - Usado exclusivamente na tela HOME do PWA

3. **ToggleMicrophoneButton** (`Components/ToggleMicrophoneButton`)
   - Estados: Idle, Listening, Speaking
   - Variações: CustomSize
   - Interactive demo (simula fluxo completo)

4. **SpectrumAnalyzer** (`Components/SpectrumAnalyzer`)
   - Simulação de áudio
   - Múltiplos analyzers
   - Dark container demo

5. **MobileFrame** (`Layout/MobileFrame`)
   - Empty, WithSplash, WithChat, WithVoiceAssistant
   - Comparison (3 PWAs)
   - Simula iPhone 14 Pro Max

6. **DemoModeIndicator** (`Components/DemoModeIndicator`)
   - Normal, DemoClean, DemoSeeded
   - InContext (PWA Health)
   - MultipleApps

7. **UnifiedSplashScreen** (`Layout/UnifiedSplashScreen`)
   - PWAPrincipal, PWACity, PWAHealth
   - FastDuration, LongDuration, CustomColors
   - Interactive, Comparison
   - Usado por todos os PWAs antes de carregar

---

## 🎯 Comportamento Padronizado dos Componentes

### PlayButtons - Comportamento Idêntico

**IMPORTANTE:** Todos os PlayButtons do sistema têm o **MESMO comportamento funcional**. Apenas as **cores mudam** por módulo.

#### Componentes:
- **PlayButton.tsx** - Usado nos módulos (Help, Ideas, World, Health)
- **HomePlayButton.tsx** - Usado exclusivamente na HOME

#### Comportamento Unificado:
```typescript
// Estados possíveis
type State = "idle" | "loading" | "playing" | "paused";

// Quando o usuário clica:
- Se state === "playing" → Muda para "paused" (Pause)
- Se state === "paused" → Muda para "playing" (Resume)
- Se state === "idle" → Muda para "loading" → "playing" (Play)

// Progresso circular:
- Todos exibem progresso de 0-100%
- Anel externo mostra a porcentagem visualmente
- Animação suave com transição
```

#### Sistema de Cores por Módulo:
| Módulo | Cor Principal | Hex |
|--------|---------------|-----|
| **Home** | Ciano | `#00D4FF` |
| **Help** | Azul | `#3B82F6` |
| **Ideas** | Roxo | `#8B5CF6` |
| **World** | Verde | `#10B981` |
| **Health** | Rosa | `#F43F5E` |

#### Exemplo de Uso Idêntico:

```tsx
// Módulo Help (Azul)
<PlayButton
  state={isPlaying ? "playing" : "idle"}
  onClick={handleToggle}
  progress={audioProgress}
  primaryColor="#3B82F6"
/>

// Módulo Ideas (Roxo)
<PlayButton
  state={isPlaying ? "playing" : "idle"}
  onClick={handleToggle}
  progress={audioProgress}
  primaryColor="#8B5CF6"
/>
```

**Conclusão:** A funcionalidade é **100% idêntica**, apenas a cor muda. Isso garante consistência de UX em todos os módulos.

---

### 📝 Próximos Componentes (Sugestões)

Para expandir a documentação, crie stories para:

- **VoiceSpectrum** - Visualizador alternativo de áudio
- **SplashScreen** - Telas de splash dos PWAs
- **HistoryScreen** - Tela de histórico de conversas
- **AuthGates** - Componentes de autenticação
- **DeviceGates** - Componentes de controle de dispositivo
- **PWAContainers** - Containers principais dos PWAs

## 🐛 Troubleshooting

### Storybook não inicia

**Erro:** `Failed to resolve import`

**Solução:** Limpar cache e reinstalar
```bash
rm -rf node_modules/.cache
npm run storybook
```

### Tailwind não funciona

**Causa:** CSS não importado

**Solução:** Verificar em `.storybook/preview.ts`:
```typescript
import '../src/index.css'; // ✅ Deve estar presente
```

### Componente não aparece

**Causa:** Story não exportada corretamente

**Verificar:**
- ✅ `export default meta` está presente
- ✅ Stories são exportadas: `export const Default: Story = {}`
- ✅ Arquivo termina com `.stories.tsx`
- ✅ Arquivo está em `src/**/*.stories.tsx`

### Hot reload não funciona

**Solução:** Reiniciar Storybook
```bash
# Ctrl+C para parar
npm run storybook
```

## 📚 Recursos Adicionais

- **Documentação oficial:** https://storybook.js.org/
- **Addons:** https://storybook.js.org/addons
- **Exemplos:** https://storybook.js.org/showcase

## 🎓 Boas Práticas

1. **Uma story por estado significativo**
   ```typescript
   export const Default: Story = {};
   export const Loading: Story = { args: { isLoading: true } };
   export const Error: Story = { args: { error: 'Erro' } };
   ```

2. **Nomear stories claramente**
   - ✅ `WithLongText`, `InMobileView`, `ErrorState`
   - ❌ `Story1`, `Test`, `Example`

3. **Documentar props complexas**
   ```typescript
   argTypes: {
     onSubmit: {
       description: 'Callback executado ao enviar formulário',
       table: {
         type: { summary: '(data: FormData) => void' },
       },
     },
   }
   ```

4. **Usar Interactive stories para fluxos**
   - Demonstrar interações completas
   - Simular estados assíncronos
   - Testar user journeys

5. **Agrupar componentes relacionados**
   ```
   Components/Buttons/
     ├── PlayButton
     ├── ToggleMicrophoneButton
     └── ActionButton
   ```

---

**Última atualização:** 2026-01-17
**Versão do Storybook:** 10.1.11
**Framework:** React + Vite + TypeScript
