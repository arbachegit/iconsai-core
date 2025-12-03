# REGRAS DE PARIDADE DOS CHATS - SISTEMA DE PROTEÇÃO ANTI-REGRESSÃO

## 🔴 REGRA FUNDAMENTAL
**Qualquer modificação em um chat (ChatKnowYOU ou ChatStudy) DEVE ser replicada IDENTICAMENTE no outro.**

---

## 🔐 PROTEÇÃO ABSOLUTA - CÓDIGO PROTEGIDO CONTRA LATÊNCIA

### Arquivos que NÃO PODEM ser modificados sem revisão de paridade:
1. `src/components/ChatKnowYOU.tsx`
2. `src/components/ChatStudy.tsx`  
3. `src/components/TypingIndicator.tsx`
4. `src/components/CarouselRow.tsx`
5. `src/hooks/useDocumentSuggestions.ts`
6. `src/index.css` (seção .typing-active)

### Regras de Modificação:
- [ ] ANTES de modificar: Verificar se afeta digitação
- [ ] DURANTE modificação: Aplicar IDENTICAMENTE em ambos os chats
- [ ] DEPOIS de modificar: Testar latência em ambos

### Padrões PROIBIDOS (causam latência):
1. ❌ `useState` com dependência de `input` em useEffect
2. ❌ `useEffect` com `[input]` no dependency array
3. ❌ `setInterval` sem verificação de `isTypingRef.current`
4. ❌ `document.querySelector` dentro de onChange handlers (usar ref cacheada)
5. ❌ `animate-bounce`, `animate-spin`, `animate-pulse` em elementos visíveis durante digitação
6. ❌ `animationDelay` dinâmico em style props
7. ❌ `transition-*` sem classe `.typing-active` de override
8. ❌ `inputRef.current = value` redundante (já temos `input` state)

### Padrões OBRIGATÓRIOS:
1. ✅ `chatContainerRef` cacheado via useRef para DOM queries
2. ✅ `isTypingRef.current` verificado em todos os setInterval callbacks
3. ✅ `.typing-active` classe adicionada/removida via ref cacheada
4. ✅ Timeout de 500ms para remover `.typing-active`
5. ✅ MutationObserver com throttle de 1000ms
6. ✅ MutationObserver desabilitado quando `isTypingRef.current === true`

---

## ✅ ELEMENTOS QUE DEVEM SER IDÊNTICOS

### 1. Container Principal
- Classes: `chat-container flex flex-col h-full bg-background/50 backdrop-blur-sm rounded-lg border-2 border-primary/40`
- Shadow: `shadow-[0_0_15px_rgba(139,92,246,0.2),0_0_30px_rgba(139,92,246,0.1)]`
- Animação: `animate-fade-in`

### 2. Header
- Padding: `p-4`
- Border: `border-b-2 border-primary/30`
- Logo: `w-10 h-10`
- Online indicator: Simplificado (apenas dot verde sem ping múltiplo)

### 3. ScrollArea (Mensagens)
- Altura: `h-[500px]`
- Border: `border-2 border-cyan-400/60`
- Background: `bg-[hsl(var(--chat-container-bg))]`
- Shadow: `shadow-[inset_0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_3px_rgba(0,0,0,0.3),0_0_15px_rgba(34,211,238,0.3)]`
- Transform: `translateZ(-10px)`, `backfaceVisibility: 'hidden'`

### 4. Mensagens
- Border radius: `rounded-2xl`
- Padding: `px-4 py-3`
- Max width: `max-w-[80%]`
- User bg: `bg-[hsl(var(--chat-message-user-bg))]`
- AI bg: `bg-[hsl(var(--chat-message-ai-bg))]`

### 5. Textarea Input
- Altura mínima: `min-h-[100px]`
- Border: `border-2 border-cyan-400/60`
- Shadow: `shadow-[inset_0_2px_6px_rgba(0,0,0,0.3),0_0_10px_rgba(34,211,238,0.2)]`
- Style: `willChange: 'transform'`

### 6. Form Container
- Border: `border-t border-border/50`
- Shadow: `shadow-[0_-2px_12px_rgba(0,0,0,0.2)]`
- Padding: `p-4`

### 7. Botões de Ação
- Tamanho: `h-8 w-8`
- Posição: `absolute bottom-2 left-2`
- Alinhamento: `items-end`

### 8. Próximos Passos (Next Steps)
- Cores: Cyan (bg-cyan-500/20, border-cyan-400/60, text-cyan-300)
- Container: `bg-gradient-to-r from-cyan-500/20 to-cyan-600/10`
- Badge hover: `hover:bg-cyan-500 hover:text-cyan-950 hover:scale-105`
- Diagrama badge: Violet (SEM animate-pulse)

### 9. Refs e Scroll
- `scrollViewportRef` para capturar viewport do Radix ScrollArea
- `mountTimeRef` e `previousMessagesLength` para controle de scroll
- `INIT_PERIOD = 1000` para ignorar scrolls durante inicialização
- Auto-scroll via `requestAnimationFrame` + `scrollTo`
- `chatContainerRef` para DOM queries cacheadas

### 10. Otimização de Performance (PROTEÇÃO ABSOLUTA)
- `.typing-active` class durante digitação (via ref cacheada)
- `isTypingRef` para desabilitar MutationObserver
- Throttle de 1000ms no MutationObserver
- Sem `isTyping` state (causa re-renders)
- Sem typing indicator animado (animate-bounce removido)
- Sem animationDelay dinâmico em NENHUM componente
- Sem animate-pulse em badges visíveis
- Sem transition-all ou transition-colors em badges
- Sem willChange: 'transform' no textarea
- setIntervals pausados via verificação de isTypingRef ou classe .typing-active

---

## 🛡️ SISTEMA DE REDUNDÂNCIA ANTI-LATÊNCIA (4 CAMADAS)

### Camada 1 - CÓDIGO (Remoção Preventiva)
- ZERO `animationDelay` dinâmico no código
- ZERO `animate-pulse` em elementos visíveis durante digitação
- ZERO `transition-all` ou `transition-colors` em badges
- ZERO `willChange: 'transform'` em textareas (deixar browser decidir)

### Camada 2 - CSS (Seletores Ultra-Específicos)
```css
.typing-active, .typing-active *, .typing-active button,
.typing-active [class*="animate-"], .typing-active [class*="transition-"] {
  animation: none !important;
  animation-duration: 0s !important;
  transition: none !important;
  transition-duration: 0s !important;
  will-change: auto !important;
}
```

### Camada 3 - REFS (Controle de Estado)
- `isTypingRef.current` verificado em TODOS os setInterval callbacks
- `typingTimeoutRef` para debounce de 500ms
- `chatContainerRef` cacheado no mount para DOM queries

### Camada 4 - DOM (Queries Cacheadas)
- `chatContainerRef.current = document.querySelector('.chat-container')` no useEffect mount
- NUNCA usar `document.querySelector` diretamente no onChange
- Classes adicionadas/removidas via ref cacheada

### Checklist de Validação Anti-Latência
- [ ] ZERO `animationDelay` dinâmico no código
- [ ] ZERO `animate-pulse` em elementos visíveis durante digitação
- [ ] TODAS as `transition-*` removidas ou cobertas pelo CSS
- [ ] `willChange` removido do textarea
- [ ] Nenhum `setInterval` sem verificação de `isTypingRef`
- [ ] Nenhum `document.querySelector` dentro de event handlers
- [ ] CSS `.typing-active` com seletores ultra-específicos

---

## 🚫 ELEMENTOS PROIBIDOS (Causam Latência)

1. **`useState` para tracking de digitação** - Causa re-renders a cada keystroke
2. **Typing indicators animados** - `animate-bounce` durante input ativo
3. **Múltiplos `setTimeout` para scroll** - Usar apenas um `setTimeout(scrollToBottom, 100)`
4. **Online indicators com múltiplos ping** - Usar apenas dot sólido
5. **`useEffect` com `[input]` dependency** - Triggera a cada caractere
6. **`animate-pulse` em badges** - Animação infinita causa repaints constantes
7. **`animate-pulse` no indicador de gravação** - Remove durante recording
8. **Animações infinitas CSS** - Não usar `animation: X infinite` em elementos visíveis
9. **`document.querySelector` em onChange** - Layout thrashing a cada keystroke
10. **`animationDelay` dinâmico** - Recálculo de style a cada render

---

## 🔧 SISTEMA DE PROTEÇÃO ANTI-LATÊNCIA

### CSS (index.css) - PROTEÇÃO ABSOLUTA
```css
/* 🔐 PROTEÇÃO ABSOLUTA - NÃO MODIFICAR */
.typing-active,
.typing-active *,
.typing-active *::before,
.typing-active *::after,
.typing-active [class*="animate-"],
.typing-active [class*="transition-"] {
  animation: none !important;
  animation-play-state: paused !important;
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  transition: none !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
}

.typing-active * {
  will-change: auto !important;
  backface-visibility: visible !important;
}

.typing-active textarea {
  will-change: auto !important;
  transform: none !important;
}

.chat-container textarea {
  will-change: auto;
}
```

### JavaScript (Refs de Controle)
```javascript
// Refs obrigatórias em ambos os chats
const isTypingRef = useRef(false);
const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
const chatContainerRef = useRef<HTMLElement | null>(null);

// Cachear container no mount
useEffect(() => {
  chatContainerRef.current = document.querySelector('.chat-container');
}, []);
```

### JavaScript (onChange do Textarea)
```javascript
onChange={(e) => {
  const value = e.target.value;
  setInput(value);
  
  // PROTEÇÃO ABSOLUTA: Usar ref cacheada
  isTypingRef.current = true;
  chatContainerRef.current?.classList.add('typing-active');
  
  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  typingTimeoutRef.current = setTimeout(() => {
    isTypingRef.current = false;
    chatContainerRef.current?.classList.remove('typing-active');
  }, 500);
}}
```

### JavaScript (setInterval com verificação)
```javascript
// Em useDocumentSuggestions.ts e rotação de sugestões
const interval = setInterval(() => {
  // Verificar antes de atualizar
  const isTyping = document.querySelector('.typing-active');
  if (isTyping) return;
  if (isTypingRef.current) return;
  
  // Só atualizar se não estiver digitando
  doUpdate();
}, intervalMs);
```

---

## 📋 CHECKLIST ANTES DE MODIFICAR QUALQUER CHAT

- [ ] Verificar se a mudança afeta UI/UX
- [ ] Localizar código equivalente no outro chat
- [ ] Aplicar mudança IDÊNTICA no outro chat
- [ ] Testar digitação em ambos (sem lag)
- [ ] Comparar visualmente ambos lado a lado
- [ ] Verificar se animações pausam durante digitação
- [ ] Confirmar que não há `animate-pulse` em elementos visíveis durante typing
- [ ] Confirmar que não há `useState` com `[input]` como dependência
- [ ] Confirmar que DOM queries usam refs cacheadas
- [ ] Confirmar que setIntervals verificam isTypingRef antes de atualizar

---

## 🔧 ARQUIVOS RELACIONADOS

- `src/components/ChatKnowYOU.tsx` - Chat de Saúde
- `src/components/ChatStudy.tsx` - Chat de Estudo
- `src/components/TypingIndicator.tsx` - Indicador de digitação (ESTÁTICO)
- `src/components/CarouselRow.tsx` - Carrossel de badges (SEM animationDelay)
- `src/hooks/useChatKnowYOU.ts` - Hook do chat de saúde
- `src/hooks/useChatStudy.ts` - Hook do chat de estudo
- `src/hooks/useDocumentSuggestions.ts` - Sugestões dinâmicas (interval pausável)
- `src/index.css` - Regras `.typing-active` (PROTEÇÃO ABSOLUTA)

---

## ⚠️ ÚLTIMA ATUALIZAÇÃO: 2025-12-03
- Adicionada seção de PROTEÇÃO ABSOLUTA
- Removido `inputRef.current = value` redundante
- Cacheado `chatContainerRef` via useRef
- Removido `animate-bounce` do TypingIndicator
- Removido `animationDelay` dinâmico do CarouselRow
- Expandido CSS `.typing-active` com animation-duration e transition-duration
- Adicionada verificação de `.typing-active` no setInterval de useDocumentSuggestions
- Adicionada verificação de `isTypingRef.current` nos setIntervals de rotação
- Documentados todos os padrões proibidos e obrigatórios
