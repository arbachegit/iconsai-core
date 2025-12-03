# REGRAS DE PARIDADE DOS CHATS - SISTEMA DE PROTEÇÃO ANTI-REGRESSÃO

## 🔴 REGRA FUNDAMENTAL
**Qualquer modificação em um chat (ChatKnowYOU ou ChatStudy) DEVE ser replicada IDENTICAMENTE no outro.**

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

### 9. Refs e Scroll
- `scrollViewportRef` para capturar viewport do Radix ScrollArea
- `mountTimeRef` e `previousMessagesLength` para controle de scroll
- `INIT_PERIOD = 1000` para ignorar scrolls durante inicialização
- Auto-scroll via `requestAnimationFrame` + `scrollTo`

### 10. Otimização de Performance
- `.typing-active` class durante digitação
- `isTypingRef` para desabilitar MutationObserver
- Throttle de 1000ms no MutationObserver
- Sem `isTyping` state (causa re-renders)
- Sem typing indicator animado

---

## 🚫 ELEMENTOS PROIBIDOS (Causam Latência)

1. **`useState` para tracking de digitação** - Causa re-renders a cada keystroke
2. **Typing indicators animados** - `animate-bounce` durante input ativo
3. **Múltiplos `setTimeout` para scroll** - Usar apenas um `setTimeout(scrollToBottom, 100)`
4. **Online indicators com múltiplos ping** - Usar apenas dot sólido
5. **`useEffect` com `[input]` dependency** - Triggera a cada caractere

---

## 📋 CHECKLIST ANTES DE MODIFICAR QUALQUER CHAT

- [ ] Verificar se a mudança afeta UI/UX
- [ ] Localizar código equivalente no outro chat
- [ ] Aplicar mudança IDÊNTICA no outro chat
- [ ] Testar digitação em ambos (sem lag)
- [ ] Comparar visualmente ambos lado a lado
- [ ] Verificar se animações pausam durante digitação

---

## 🔧 ARQUIVOS RELACIONADOS

- `src/components/ChatKnowYOU.tsx` - Chat de Saúde
- `src/components/ChatStudy.tsx` - Chat de Estudo
- `src/hooks/useChatKnowYOU.ts` - Hook do chat de saúde
- `src/hooks/useChatStudy.ts` - Hook do chat de estudo
- `src/index.css` - Regras `.typing-active`

---

## ⚠️ ÚLTIMA ATUALIZAÇÃO: 2025-12-03
- Removido `isTyping` state de ambos os chats
- Removido typing indicator animado
- Simplificado online indicator
- Unificado sistema de scroll
- Adicionado regras CSS mais agressivas para `.typing-active`
