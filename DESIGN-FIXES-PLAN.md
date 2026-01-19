# 🎨 Plano de Correções de Design - PWAs

**Data:** 2026-01-17
**Status:** Em Andamento

---

## ✅ Concluído (3/10)

### 1. ✅ HOME - Ordem dos Componentes
**Problema:** SpectrumAnalyzer estava acima do HomePlayButton
**Solução:** Invertida a ordem, agora HomePlayButton aparece primeiro
**Arquivos Modificados:**
- `src/components/pwa/containers/HomeContainer.tsx`

### 2. ✅ HOME - VoiceSpectrum Bidirecional
**Problema:** Spectrum unidirecional (barras só sobem)
**Solução:** Criado novo componente `VoiceSpectrumBidirectional`
- Barras crescem simetricamente para cima E para baixo
- Linha horizontal central sempre visível
- Largura = 160px (mesma do HomePlayButton)
- Altura = 80px (40px cima + 40px baixo)

**Arquivos Criados:**
- `src/components/pwa/voice/VoiceSpectrumBidirectional.tsx`

**Arquivos Modificados:**
- `src/components/pwa/containers/HomeContainer.tsx` (substituiu SpectrumAnalyzer)

### 3. ✅ Storybook - PlayButton Toggle
**Problema:** PlayButton não alternava entre Play e Pause
**Solução:** Corrigidas todas as stories para usar as props corretas (`state` ao invés de `isPlaying`)
- Story Interactive agora alterna corretamente: Idle → Loading → Playing → Paused
- Adicionadas 8 stories completas (Default, Playing, Loading, SmallSize, ExtraLargeSize, CustomColor, WithProgress, WithLabel, Disabled, Interactive)

**Arquivos Modificados:**
- `src/stories/components/PlayButton.stories.tsx`
- `src/components/pwa/microservices/HomePlayButton.tsx` (corrigido progress arc)

---

## 🚧 Pendente (7/10)

### 4. ❌ PWA City - Header
**Problemas Identificados:**
- 2 botões confusos no header
  - Botão 1: Diz "em desenvolvimento"
  - Botão 2: Funcionalidade não clara
- Necessário: Identificar e remover/corrigir esses botões

**Ações Necessárias:**
1. Ler `src/components/pwacity/PWACityContainer.tsx`
2. Identificar botões problemáticos
3. Remover ou explicar funcionalidade clara
4. Manter apenas: Título + Logout

**Layout Esperado:**
```
┌─────────────────────────────┐
│ PWA City          [Logout] │
└─────────────────────────────┘
```

### 5. ❌ PWA City - Footer
**Problemas Identificados:**
- TextField para prompt inacessível
- Textos se sobrepondo ao botão Send
- Botão IA do lado esquerdo não funciona
- Necessário: Tornar área de input utilizável

**Ações Necessárias:**
1. Ler `src/components/pwacity/PWACityContainer.tsx` (footer section)
2. Corrigir z-index e posicionamento do TextField
3. Remover textos que se sobrepõem
4. Explicar/corrigir botão IA ou removê-lo
5. Testar que o input aceita texto e o botão Send funciona

**Layout Esperado:**
```
┌────────────────────────────────┐
│ [Input prompt...] [Send] │
└────────────────────────────────┘
```

### 6. ❌ PWA Health - Layout Geral
**Problemas Identificados:**
- SpectrumAnalyzer descentralizado
- Header se misturando com notch (confuso)
- Faltando botão de histórico no canto superior direito
- Deve copiar design do módulo Saúde do PWA original

**Ações Necessárias:**
1. Ler `src/components/pwahealth/PWAHealthContainer.tsx`
2. Centralizar SpectrumAnalyzer
3. Ajustar header para não conflitar com notch
4. Copiar botão de histórico de `src/components/pwa/containers/HealthModuleContainer.tsx`
5. Posicionar histórico no canto superior direito

**Layout Esperado:**
```
┌─────────────────────────────┐
│ PWA Health      [Histórico]│ (header limpo, abaixo do notch)
│                             │
│     [SpectrumAnalyzer]      │ (centralizado)
│     [Microfone/Button]      │
│                             │
└─────────────────────────────┘
```

### 7. ❌ Módulos - Botões Dentro do Frame
**Problema:** Quando SpectrumAnalyzer aparece, botões dos módulos saem da área do frame

**Ações Necessárias:**
1. Identificar containers dos módulos que usam SpectrumAnalyzer
2. Ajustar layout flex/grid para garantir que tudo fica contido
3. Usar `overflow-hidden` ou `max-height` para forçar containment
4. Testar em todos os módulos: Help, Ideas, World, Health

**Módulos a Verificar:**
- `src/components/pwa/containers/HelpModuleContainer.tsx`
- `src/components/pwa/containers/IdeasModuleContainer.tsx`
- `src/components/pwa/containers/WorldModuleContainer.tsx`
- `src/components/pwa/containers/HealthModuleContainer.tsx`

### 8. ❌ Microfone - Fixar no Frame
**Problema:** Microfone está solto como elemento independente, não está fixo no frame

**Ações Necessárias:**
1. Identificar onde o microfone é renderizado
2. Aplicar `position: fixed` com `bottom` e containment ao frame
3. Garantir que ele não sai do MobileFrame em desktop
4. Testar responsividade mobile vs desktop

**Componentes a Verificar:**
- `src/components/pwa/voice/ToggleMicrophoneButton.tsx`
- Containers que usam microfone (PWA City, PWA Health)

### 9. ❌ PlayButtons - Padronizar Comportamento
**Problema:** Todos os PlayButtons devem ter MESMO comportamento, apenas cores mudam por módulo

**Ações Necessárias:**
1. Auditar todos os PlayButtons:
   - `src/components/pwa/voice/PlayButton.tsx` (módulos)
   - `src/components/pwa/microservices/HomePlayButton.tsx` (HOME)
2. Garantir funcionalidade idêntica:
   - Clique alterna Play ↔ Pause
   - Estados: idle, loading, playing, paused
   - Progresso circular funciona igual
3. Apenas cores mudam conforme o módulo:
   - Help: Azul
   - Ideas: Roxo
   - World: Verde
   - Health: Verde saúde
   - Home: Ciano

**Consideração:** HomePlayButton tem design visual diferente (anel externo, efeitos), mas comportamento de clique deve ser idêntico.

### 10. ❌ SplashScreen - Unificar Para Todos os PWAs
**Problema:** Splash do Storybook está errado; TODOS os PWAs precisam de splash antes de começar; deve ser um único elemento reutilizável

**Ações Necessárias:**
1. Criar componente `UnifiedSplashScreen.tsx`
   - Design igual ao HOME do PWA (gradiente roxo-roxo)
   - Logo/ícone centralizado
   - Animação de loading
   - Aceita props: `appName`, `icon`, `primaryColor`, `secondaryColor`
2. Implementar SplashScreen em:
   - PWA Principal: `src/pages/PWAPage.tsx`
   - PWA City: `src/pages/PWACityPage.tsx`
   - PWA Health: `src/pages/PWAHealthPage.tsx`
3. Atualizar Storybook:
   - Corrigir `MobileFrame.stories.tsx` (story WithSplash)
   - Criar `UnifiedSplashScreen.stories.tsx`

**Design Esperado:**
```
┌─────────────────────────────┐
│                             │
│                             │
│          [LOGO]             │
│         KnowYOU             │
│        [Spinner]            │
│                             │
│                             │
└─────────────────────────────┘
```

---

## 📋 Priorização

### Alta Prioridade (Impacto UX crítico):
1. ❌ PWA City - Footer (input inacessível = não testável)
2. ❌ PWA Health - Layout Geral (header confuso + falta histórico)
3. ❌ SplashScreen - Unificar (experiência inicial inconsistente)

### Média Prioridade (Impacto visual):
4. ❌ Módulos - Botões Dentro do Frame
5. ❌ Microfone - Fixar no Frame
6. ❌ PWA City - Header

### Baixa Prioridade (Refinamento):
7. ❌ PlayButtons - Padronizar Comportamento

---

## 📊 Progresso Geral

- ✅ Concluído: 3/10 (30%)
- 🚧 Em Andamento: 0/10 (0%)
- ❌ Pendente: 7/10 (70%)

---

## 🔄 Próximos Passos Imediatos

1. **PWA City Footer** - Tornar input acessível
2. **PWA Health Layout** - Centralizar spectrum + adicionar histórico
3. **SplashScreen** - Criar componente unificado

---

## 📝 Notas Importantes

- **Todos os PlayButtons** devem ter comportamento idêntico (apenas cores mudam)
- **SplashScreen** deve ser único componente reutilizado por todos os PWAs
- **Frame containment** é crítico - nada pode sair do MobileFrame
- **PWA Health** deve copiar exatamente o design do módulo Saúde do PWA original

---

**Última atualização:** 2026-01-17 20:15
