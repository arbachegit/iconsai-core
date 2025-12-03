# 🔐 REGRAS DE PARIDADE DOS CHATS - DOCUMENT OBRIGATÓRIO

## PRINCÍPIO FUNDAMENTAL
**QUALQUER modificação em um chat DEVE ser replicada IDENTICAMENTE no outro.**

---

## 🛡️ FILOSOFIA ANTI-LATÊNCIA: SIMPLICIDADE

> "A melhor proteção contra latência é **NÃO FAZER NADA** desnecessário no onChange."

### REGRA DE OURO
O `onChange` do textarea deve fazer **APENAS**:
```tsx
onChange={(e) => setInput(e.target.value)}
```

**NADA MAIS.** Zero manipulação de DOM, zero refs, zero timeouts.

---

## 🎯 PROTEÇÃO VIA CSS PURO

A detecção de digitação é feita 100% via CSS usando `:focus-within`:

```css
.chat-container:focus-within,
.chat-container:focus-within * {
  animation: none !important;
  transition: none !important;
}
```

**Vantagens:**
- Zero JavaScript executado durante digitação
- Detecção automática pelo navegador
- Performance nativa, sem overhead
- Impossível causar latência

---

## ❌ PADRÕES PROIBIDOS

### NUNCA FAZER no onChange:

```tsx
// ❌ Manipulação de refs
isTypingRef.current = true;

// ❌ Manipulação de DOM
element?.classList.add('typing-active');

// ❌ setTimeout/clearTimeout
if (timeoutRef.current) clearTimeout(timeoutRef.current);
timeoutRef.current = setTimeout(() => {...}, 500);

// ❌ Iteração sobre elementos
document.querySelectorAll('*').forEach(el => {...});

// ❌ Qualquer função que manipule DOM
disableAllAnimations();
enableAllAnimations();
```

### SEMPRE FAZER:

```tsx
// ✅ APENAS atualizar o state
onChange={(e) => setInput(e.target.value)}
```

---

## 📋 CHECKLIST DE VALIDAÇÃO

Antes de qualquer modificação nos chats:

- [ ] onChange faz APENAS `setInput(value)`
- [ ] ZERO refs relacionados a typing (isTypingRef, typingTimeoutRef, etc.)
- [ ] ZERO funções de manipulação de animações (disableAllAnimations, etc.)
- [ ] ZERO classList.add/remove durante digitação
- [ ] CSS `:focus-within` ativo no index.css

---

## ARQUIVOS PROTEGIDOS

### Arquivos de Chat
- `src/components/ChatKnowYOU.tsx`
- `src/components/ChatStudy.tsx`
- `src/hooks/useChatKnowYOU.ts`
- `src/hooks/useChatStudy.ts`

### Arquivos de Suporte
- `src/components/CarouselRow.tsx`
- `src/components/TopicDrillDown.tsx`
- `src/components/MarkdownContent.tsx`

### Arquivos de Proteção
- `src/index.css` - Seção :focus-within é CRÍTICA
- `src/components/chat/CHAT_PARITY_RULES.md` - Este documento

---

## PROCESSO DE MODIFICAÇÃO

1. **VERIFICAR** impacto nos dois chats
2. **APLICAR** modificação identicamente em ambos
3. **TESTAR** latência digitando rapidamente
4. **VALIDAR** onChange ainda é simples
5. **ATUALIZAR** este documento se necessário

---

## RESULTADO ESPERADO

- **0% latência** - onChange faz apenas setInput
- **CSS puro** - :focus-within detecta digitação
- **ZERO JavaScript** durante keystroke
- **100% paridade** entre ChatKnowYOU e ChatStudy

---

## ⚠️ ÚLTIMA ATUALIZAÇÃO: 2025-12-03
- Filosofia mudada para SIMPLICIDADE
- Removidas todas as 5 camadas de "proteção" JavaScript (causavam latência)
- Implementado CSS `:focus-within` para detecção automática
- onChange simplificado para apenas `setInput(e.target.value)`
