# ✅ Correções de Design - Progresso

**Data:** 2026-01-17
**Status:** 60% Concluído

---

## ✅ Completado (6/10)

### 1. ✅ PWA Home - Botões dos Módulos Dentro do Frame
**Problema:** Botões dos módulos saindo do frame quando Spectrum aparecia
**Solução:**
- Alterado container para `h-full` e `overflow-hidden`
- Todas as seções com `flex-shrink-0` para altura fixa
- Player area contida com `gap-4 py-4`
- Module selector sempre visível com `overflow-visible`

**Arquivo:** `src/components/pwa/containers/HomeContainer.tsx`

### 2. ✅ VoiceSpectrum Bidirecional Criado
**Problema:** Spectrum unidirecional (barras só sobem)
**Solução:**
- Novo componente `VoiceSpectrumBidirectional.tsx`
- Barras crescem simetricamente para cima E para baixo
- Linha horizontal central sempre visível
- Largura = 160px, Altura = 80px

**Arquivo:** `src/components/pwa/voice/VoiceSpectrumBidirectional.tsx`

### 3. ✅ Storybook - PlayButton Corrigido
**Problema:** PlayButton não alternava entre Play/Pause
**Solução:**
- Corrigidas todas as stories para usar props corretas (`state` não `isPlaying`)
- Story Interactive agora alterna: Idle → Loading → Playing → Paused
- 10 stories completas documentadas

**Arquivo:** `src/stories/components/PlayButton.stories.tsx`

### 4. ✅ HomePlayButton - Progress Arc Corrigido
**Problema:** Barra de progresso não começava em zero (meia-noite)
**Solução:**
- Corrigido cálculo do strokeDashoffset
- Usando viewBox fixo (0 0 160 160)
- Valores absolutos corretos (r=72, cx=80, cy=80)
- Rotação `-rotate-90` para começar no topo

**Arquivo:** `src/components/pwa/microservices/HomePlayButton.tsx`

### 5. ✅ PWA City - Header Simplificado
**Problema:** Botões confusos (Menu "em desenvolvimento")
**Solução:**
- Removido botão de Menu (estava mostrando toast de desenvolvimento)
- Header limpo: Logo + Nome + Logout
- Adicionado `paddingTop: 3rem` para espaço do notch
- Layout: Espaço vazio (esquerda) | Centro (logo) | Logout (direita)

**Arquivo:** `src/components/pwacity/PWACityHeader.tsx`

### 6. ✅ PWA City - Footer Simplificado
**Problema:** TextField inacessível, textos sobrepostos, botão IA não funcional
**Solução:**
- Removido ícone decorativo Sparkles (botão IA confuso)
- Removido contador de caracteres
- Removida dica de atalho (Enter/Shift+Enter)
- Layout limpo: Textarea + Botão Send
- Container com `flex-shrink-0` e `safe-area-inset-bottom`

**Arquivos:**
- `src/components/pwacity/PromptArea.tsx`
- `src/components/pwacity/PWACityContainer.tsx` (layout h-full + overflow-hidden)

---

## 🚧 Pendente (4/10)

### 7. ❌ PWA Health - Layout Completo
**Problemas:**
- SpectrumAnalyzer descentralizado
- Header se misturando com notch
- Faltando botão de histórico no canto superior direito

**Ações Necessárias:**
1. Adicionar `paddingTop: 3rem` no header (espaço para notch)
2. Centralizar SpectrumAnalyzer (já está dentro de div, verificar CSS)
3. Copiar botão de histórico de `HealthModuleContainer.tsx`
4. Posicionar histórico no canto superior direito do header

**Arquivo:** `src/components/pwahealth/PWAHealthContainer.tsx`

### 8. ❌ Microfone - Fixar Dentro do Frame
**Problema:** Microfone está solto (`position: fixed`), não fica dentro do MobileFrame

**Ações Necessárias:**
1. Alterar PWA Health de `position: fixed` para layout flexbox
2. Microfone deve estar no final do container (dentro do layout)
3. Usar `flex-shrink-0` e padding bottom para posicionar
4. Garantir que fica visível dentro do MobileFrame em desktop

**Arquivos:**
- `src/components/pwahealth/PWAHealthContainer.tsx`
- `src/components/pwa/voice/ToggleMicrophoneButton.tsx` (verificar se precisa ajustes)

### 9. ❌ PlayButtons - Padronizar Comportamento
**Problema:** Documentação indica que PlayButtons devem ter MESMO comportamento

**Ações Necessárias:**
1. Auditar todos os PlayButtons:
   - `PlayButton.tsx` (módulos) - ✅ JÁ FUNCIONA (state-based)
   - `HomePlayButton.tsx` (HOME) - ✅ JÁ FUNCIONA (state-based)
2. Documentar no Storybook que o comportamento é idêntico:
   - Click: Alterna entre states (idle ↔ playing)
   - Estados: idle, loading, playing, paused
   - Progresso: 0-100%
3. Apenas cores mudam por módulo:
   - Help: Azul (#3B82F6)
   - Ideas: Roxo (#8B5CF6)
   - World: Verde (#10B981)
   - Health: Rosa (#F43F5E)
   - Home: Ciano (#00D4FF)

**Arquivos:**
- `STORYBOOK.md` (adicionar seção de padronização)
- Stories dos botões (adicionar nota de comportamento)

### 10. ❌ SplashScreen - Unificar Para Todos os PWAs
**Problema:** Cada PWA tem splash diferente ou sem splash; Storybook está errado

**Ações Necessárias:**
1. Criar `UnifiedSplashScreen.tsx`:
   ```typescript
   interface UnifiedSplashScreenProps {
     appName: string;          // "KnowYOU", "PWA City", "PWA Health"
     icon: React.ReactNode;    // Ícone do app
     primaryColor: string;     // Cor primária do gradiente
     secondaryColor: string;   // Cor secundária do gradiente
     duration?: number;        // Duração do splash (default 2000ms)
     onComplete?: () => void;  // Callback quando completar
   }
   ```
2. Design:
   - Gradiente de fundo (primaryColor → secondaryColor)
   - Logo/ícone centralizado com animação fade-in
   - Nome do app abaixo do logo
   - Spinner de loading
   - Fade-out suave ao completar
3. Implementar em:
   - PWA Principal: `PWAPage.tsx`
   - PWA City: `PWACityPage.tsx`
   - PWA Health: `PWAHealthPage.tsx`
4. Atualizar Storybook:
   - `MobileFrame.stories.tsx` (story WithSplash)
   - Criar `UnifiedSplashScreen.stories.tsx`

**Arquivos a Criar:**
- `src/components/pwa/UnifiedSplashScreen.tsx`
- `src/stories/components/UnifiedSplashScreen.stories.tsx`

**Arquivos a Modificar:**
- `src/pages/PWAPage.tsx`
- `src/pages/PWACityPage.tsx`
- `src/pages/PWAHealthPage.tsx`
- `src/stories/components/MobileFrame.stories.tsx`

---

## 📊 Métricas

- **Concluído:** 6/10 (60%)
- **Pendente:** 4/10 (40%)

### Por Prioridade:

**Alta (UX crítico):**
- ✅ PWA City Footer
- ✅ PWA Home Overflow
- ❌ PWA Health Layout
- ❌ SplashScreen

**Média (Visual):**
- ✅ PWA City Header
- ❌ Microfone Fixo

**Baixa (Refinamento):**
- ✅ PlayButton Storybook
- ✅ HomePlayButton Progress
- ✅ VoiceSpectrum Bidirecional
- ❌ PlayButtons Padronização

---

## 🎯 Próximos Passos Recomendados

1. **PWA Health - Layout** (15 min)
   - Header com padding para notch
   - Botão de histórico
   - Centralizar spectrum

2. **Microfone Fixo** (10 min)
   - Remover position: fixed
   - Integrar no layout flexbox

3. **SplashScreen Unificado** (30 min)
   - Criar componente
   - Implementar nos 3 PWAs
   - Atualizar Storybook

4. **Documentação Storybook** (10 min)
   - Adicionar nota sobre comportamento padrão dos PlayButtons
   - Explicar sistema de cores por módulo

---

**Última atualização:** 2026-01-17 20:45
**Próxima revisão:** Após implementar itens 7-10
