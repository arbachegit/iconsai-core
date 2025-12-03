# 🔐 REGRAS DE PARIDADE DOS CHATS - DOCUMENT OBRIGATÓRIO

## PRINCÍPIO FUNDAMENTAL
**QUALQUER modificação em um chat DEVE ser replicada IDENTICAMENTE no outro.**

---

## 🛡️ SISTEMA DE REDUNDÂNCIA ANTI-LATÊNCIA (5 CAMADAS)

### Camada 1 - CÓDIGO
- ❌ ZERO `animationDelay` dinâmico (style={{ animationDelay: ... }})
- ❌ ZERO `animate-pulse` em elementos visíveis durante digitação
- ❌ ZERO `transition-*` classes em badges/botões dentro do chat
- ❌ ZERO `willChange: 'transform'` no textarea
- ❌ ZERO variáveis mortas (inputRef removido)

### Camada 2 - CSS (index.css)
- ✅ Seletores ultra-específicos para `.typing-active`
- ✅ `!important` em TODAS as propriedades de animação/transição
- ✅ Cobertura de `*`, `*::before`, `*::after`
- ✅ Badges SEM animações/transições por padrão
- ✅ Hover effects apenas via `:not(.typing-active *)`

### Camada 3 - REFS
- ✅ `isTypingRef.current` verificado em TODOS os callbacks
- ✅ `mutationObserverEnabledRef.current` para pausar observer
- ✅ `chatContainerRef.current` cacheado (evita querySelector)
- ✅ `typingTimeoutRef.current` para debounce de 500ms

### Camada 4 - DOM / MutationObserver
- ✅ MutationObserver verifica DUAS flags antes de processar
- ✅ Throttle de 1000ms no observer
- ✅ Container cacheado uma única vez no mount

### Camada 5 - JAVASCRIPT PROATIVO
- ✅ `disableAllAnimations()` aplica inline styles `animation: none !important`
- ✅ `enableAllAnimations()` remove inline styles após parar de digitar
- ✅ Executado NO MOMENTO da digitação (onChange do textarea)

---

## 📋 CHECKLIST DE VALIDAÇÃO ANTI-LATÊNCIA

Antes de qualquer modificação nos chats, verificar:

- [ ] ZERO `animationDelay` dinâmico no código
- [ ] ZERO `animate-pulse` em elementos durante digitação
- [ ] ZERO `animate-spin` sem verificação de typing
- [ ] TODAS as `transition-*` cobertas pelo CSS `.typing-active`
- [ ] `willChange` removido ou definido como 'auto'
- [ ] Nenhum `setInterval` sem verificação de `isTypingRef`
- [ ] `mutationObserverEnabledRef` verificado no observer
- [ ] `disableAllAnimations()` chamado no onChange
- [ ] `enableAllAnimations()` chamado no timeout de 500ms

---

## ARQUIVOS PROTEGIDOS

Antes de modificar qualquer um destes arquivos, verificar impacto de paridade:

### Arquivos de Chat
- `src/components/ChatKnowYOU.tsx`
- `src/components/ChatStudy.tsx`
- `src/hooks/useChatKnowYOU.ts`
- `src/hooks/useChatStudy.ts`

### Arquivos de Suporte
- `src/components/CarouselRow.tsx` - SEM transition-* classes
- `src/components/TopicDrillDown.tsx` - SEM transition-* classes
- `src/components/MarkdownContent.tsx`
- `src/components/AudioControls.tsx`
- `src/lib/chat-stream.ts`

### Arquivos de Proteção
- `src/index.css` - Seção .typing-active é CRÍTICA
- `src/components/chat/CHAT_PARITY_RULES.md` - Este documento

---

## ELEMENTOS IDÊNTICOS OBRIGATÓRIOS

### Container Principal
```tsx
<div className="chat-container flex flex-col h-full ...">
```

### Textarea com Proteção 5 Camadas
```tsx
onChange={(e) => {
  setInput(e.target.value);
  
  // 🛡️ PROTEÇÃO 5 CAMADAS
  isTypingRef.current = true;
  mutationObserverEnabledRef.current = false;
  chatContainerRef.current?.classList.add('typing-active');
  disableAllAnimations();
  
  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  typingTimeoutRef.current = setTimeout(() => {
    isTypingRef.current = false;
    mutationObserverEnabledRef.current = true;
    chatContainerRef.current?.classList.remove('typing-active');
    enableAllAnimations();
  }, 500);
}}
```

### Funções de Proteção JavaScript (CAMADA 5)
```tsx
const disableAllAnimations = () => {
  if (!chatContainerRef.current) return;
  const allElements = chatContainerRef.current.querySelectorAll('*');
  allElements.forEach(el => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.setProperty('animation', 'none', 'important');
    htmlEl.style.setProperty('transition', 'none', 'important');
  });
};

const enableAllAnimations = () => {
  if (!chatContainerRef.current) return;
  const allElements = chatContainerRef.current.querySelectorAll('*');
  allElements.forEach(el => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.removeProperty('animation');
    htmlEl.style.removeProperty('transition');
  });
};
```

---

## PADRÕES PROIBIDOS (CAUSAM LATÊNCIA)

### ❌ NUNCA FAZER

```tsx
// ❌ animationDelay dinâmico
style={{ animationDelay: `${idx * 50}ms` }}

// ❌ animate-pulse em badges
className="animate-pulse border-emerald-500/60"

// ❌ transition-* em elementos do chat
className="transition-colors transition-all transition-transform"

// ❌ willChange no textarea
style={{ willChange: 'transform' }}

// ❌ animate-spin sem verificação
<Loader2 className="animate-spin" />

// ❌ MutationObserver sem verificação de flags
const mutationObserver = new MutationObserver(() => {
  // ERRADO: não verifica mutationObserverEnabledRef
  observeElements();
});
```

### ✅ PADRÕES CORRETOS

```tsx
// ✅ Sem animationDelay
<div className="next-step-badge">

// ✅ Sem animate-pulse
className="border-emerald-500/60"

// ✅ Sem transition-* inline
className="h-6 px-2 rounded-full"

// ✅ MutationObserver com verificação dupla
if (!mutationObserverEnabledRef.current || isTypingRef.current) return;
```

---

## PROCESSO DE MODIFICAÇÃO

1. **VERIFICAR** impacto nos dois chats
2. **APLICAR** modificação identicamente em ambos
3. **TESTAR** latência digitando rapidamente
4. **VALIDAR** checklist anti-latência completo
5. **ATUALIZAR** este documento se necessário

---

## RESULTADO ESPERADO

- **0% latência perceptível** durante digitação
- **100% paridade** entre ChatKnowYOU e ChatStudy
- **5 camadas de proteção** ativas simultaneamente
- **Documentação atualizada** para prevenir regressões

---

## ⚠️ ÚLTIMA ATUALIZAÇÃO: 2025-12-03
- Sistema expandido para 5 camadas de proteção
- Adicionada Camada 5: JavaScript proativo (disableAllAnimations/enableAllAnimations)
- Adicionado mutationObserverEnabledRef para pausar observer
- Removido inputRef (variável morta)
- Removidas todas transition-* de CarouselRow e TopicDrillDown
- Removido animate-spin de Loader2 em TopicDrillDown
- CSS: badges sem animações por padrão, hover apenas via :not(.typing-active *)
