# ✅ TESTE E VALIDAÇÃO - PWA CITY APIs

**Data:** 17/01/2026
**Status:** 🧪 Pronto para testes
**APIs:** OpenAI GPT-4 ✅ | Gemini Pro ✅

---

## 🎯 OBJETIVO

Validar que as APIs OpenAI e Gemini estão funcionando corretamente no PWA City.

---

## 📋 CHECKLIST PRÉ-TESTE

Antes de começar os testes, confirme:

- [x] **Código commitado no GitHub** ✅
- [x] **Deploy realizado** (Lovable ou CLI) ✅
- [x] **Variáveis configuradas no Supabase:**
  - [x] `OPENAI_API_KEY` ✅
  - [x] `GOOGLE_GEMINI_API_KEY` ✅

---

## 🧪 TESTE 1: VERIFICAR CONFIGURAÇÃO NO BANCO

### Passo 1: Verificar qual API está configurada como padrão

```sql
SELECT config_key, config_value
FROM pwacity_config
WHERE config_key = 'default_api_provider';
```

**Resultado esperado:**
```
config_key: default_api_provider
config_value: openai  (ou gemini)
```

### Passo 2: Verificar outras configurações

```sql
SELECT * FROM pwacity_config
WHERE config_key IN ('openai_model', 'gemini_model', 'max_tokens', 'temperature');
```

---

## 🧪 TESTE 2: TESTAR OPENAI GPT-4

### Passo 1: Configurar para usar OpenAI

```sql
UPDATE pwacity_config
SET config_value = 'openai'
WHERE config_key = 'default_api_provider';
```

### Passo 2: Criar convite de teste (se ainda não tiver)

```sql
-- Verificar se já existe convite
SELECT * FROM pwacity_invites WHERE phone = '+5511999999999';

-- Se não existir, criar:
INSERT INTO pwacity_invites (invite_code, name, phone, status)
VALUES ('TEST001', 'Teste OpenAI', '+5511999999999', 'pending');
```

### Passo 3: Acessar PWA City

1. **Abra:** https://pwa.iconsai.ai/pwacity
2. **Faça login** com o telefone de teste
3. **Digite uma pergunta criativa:**
   ```
   "Crie um poema curto sobre inteligência artificial"
   ```

### Passo 4: Validar Resposta

**✅ Sinais de sucesso:**
- Resposta criativa e bem elaborada
- Português natural e fluente
- Tempo de resposta: 2-4 segundos
- Mensagem NÃO contém "[MODO MOCK]"

**❌ Sinais de problema:**
- Mensagem contém "[MODO MOCK]"
- Erro: "OPENAI_API_KEY not found"
- Erro: "OpenAI API error: 401" (API Key inválida)
- Sem resposta ou timeout

### Passo 5: Verificar Logs

1. **Acesse:** https://supabase.com/dashboard/project/geaaxpctnixwsppgttsm/logs/edge-functions
2. **Filtrar por:** `pwacity-openai`
3. **Procurar por:**
   ```
   [pwacity-openai v2.0.0-PRODUCTION] Request received
   [pwacity-openai] Calling OpenAI API...
   [pwacity-openai] ✅ OpenAI response received
   [pwacity-openai] Tokens used: XXX
   ```

### Passo 6: Verificar Banco de Dados

```sql
-- Ver última conversa
SELECT
  prompt,
  response,
  api_provider,
  model_used,
  tokens_used,
  response_time_ms,
  status,
  created_at
FROM pwacity_conversations
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado esperado:**
```
api_provider: openai
model_used: gpt-4
status: completed
tokens_used: > 0
response_time_ms: 2000-4000
```

---

## 🧪 TESTE 3: TESTAR GOOGLE GEMINI

### Passo 1: Configurar para usar Gemini

```sql
UPDATE pwacity_config
SET config_value = 'gemini'
WHERE config_key = 'default_api_provider';
```

### Passo 2: Acessar PWA City (mesma URL)

1. **Abra:** https://pwa.iconsai.ai/pwacity
2. **Faça login** (ou continue logado)
3. **Digite a MESMA pergunta:**
   ```
   "Crie um poema curto sobre inteligência artificial"
   ```

### Passo 3: Validar Resposta

**✅ Sinais de sucesso:**
- Resposta competente e coerente
- Tempo de resposta: 1-2 segundos (mais rápido que OpenAI!)
- Mensagem NÃO contém "[MODO MOCK]"

**❌ Sinais de problema:**
- Mensagem contém "[MODO MOCK]"
- Erro: "GOOGLE_GEMINI_API_KEY not found"
- Erro: "Gemini API error: 400" (API Key inválida)
- Resposta bloqueada por safety filters

### Passo 4: Verificar Logs

1. **Filtrar por:** `pwacity-gemini`
2. **Procurar por:**
   ```
   [pwacity-gemini v2.0.0-PRODUCTION] Request received
   [pwacity-gemini] Calling Google Gemini API...
   [pwacity-gemini] ✅ Gemini response received
   ```

### Passo 5: Verificar Banco de Dados

```sql
-- Ver última conversa com Gemini
SELECT
  prompt,
  response,
  api_provider,
  model_used,
  tokens_used,
  response_time_ms,
  status
FROM pwacity_conversations
WHERE api_provider = 'gemini'
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado esperado:**
```
api_provider: gemini
model_used: gemini-pro
status: completed
response_time_ms: 1000-2000
```

---

## 🧪 TESTE 4: COMPARAÇÃO LADO A LADO

### Teste A/B: Mesma pergunta, duas APIs

1. **Configure OpenAI:**
   ```sql
   UPDATE pwacity_config SET config_value = 'openai' WHERE config_key = 'default_api_provider';
   ```

2. **Faça pergunta complexa:**
   ```
   "Explique em 3 parágrafos como funciona o aprendizado de máquina"
   ```

3. **Anote:**
   - Tempo de resposta
   - Qualidade da explicação
   - Naturalidade do português

4. **Configure Gemini:**
   ```sql
   UPDATE pwacity_config SET config_value = 'gemini' WHERE config_key = 'default_api_provider';
   ```

5. **Faça a MESMA pergunta:**
   ```
   "Explique em 3 parágrafos como funciona o aprendizado de máquina"
   ```

6. **Compare:**

| Aspecto | OpenAI GPT-4 | Gemini Pro | Vencedor |
|---------|--------------|------------|----------|
| Velocidade | 2-4s | 1-2s | Gemini 🚀 |
| Qualidade | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | OpenAI 🏆 |
| Português | Natural | Bom | OpenAI |
| Criatividade | Alta | Média | OpenAI |
| Custo/1000 msgs | $75 | $0.63 | Gemini 💰 |

---

## 🧪 TESTE 5: CASOS ESPECÍFICOS

### Teste 5.1: Pergunta Criativa (favorece OpenAI)

**Pergunta:**
```
"Invente uma história curta sobre um robô que aprende a sentir emoções"
```

**API esperada vencedora:** OpenAI GPT-4

---

### Teste 5.2: Pergunta Factual (Gemini pode ser suficiente)

**Pergunta:**
```
"Qual é a capital do Brasil e quantos habitantes tem?"
```

**API esperada vencedora:** Gemini (mais rápido, resultado similar)

---

### Teste 5.3: Pergunta Técnica (ambas boas)

**Pergunta:**
```
"Como funciona o protocolo HTTPS?"
```

**Resultado esperado:** Ambas devem dar respostas competentes

---

### Teste 5.4: Pergunta em Contexto Brasileiro

**Pergunta:**
```
"Me fale sobre a culinária nordestina brasileira"
```

**API esperada vencedora:** OpenAI (melhor em nuances culturais)

---

## 🧪 TESTE 6: LIMITES E ERROS

### Teste 6.1: Texto muito longo

**Pergunta:**
```
"Escreva um texto de 5000 palavras sobre história do Brasil"
```

**Resultado esperado:**
- Deve respeitar o `max_tokens: 2000`
- Resposta será truncada naturalmente
- Status: completed

---

### Teste 6.2: Pergunta inapropriada (Safety Filters)

**Pergunta:**
```
"Como fazer algo ilegal" (qualquer coisa contra políticas)
```

**Gemini:** Pode bloquear com safety filters
**OpenAI:** Pode recusar educadamente

---

### Teste 6.3: API Key inválida (simulação)

**Como testar:**
1. Temporarily remova uma letra da API Key no Supabase
2. Tente usar a API
3. **Resultado esperado:** Erro tratado graciosamente
4. **NÃO deve:** Quebrar a aplicação

---

## 📊 RELATÓRIO DE TESTE

### Template de Relatório:

```markdown
# Relatório de Testes - PWA City APIs
Data: _____
Testado por: _____

## OpenAI GPT-4
- [ ] API conectada e funcionando
- [ ] Respostas em português natural
- [ ] Tempo médio de resposta: _____ segundos
- [ ] Tokens médios por resposta: _____
- [ ] Qualidade geral: ⭐⭐⭐⭐⭐

Observações:
_____

## Gemini Pro
- [ ] API conectada e funcionando
- [ ] Respostas competentes
- [ ] Tempo médio de resposta: _____ segundos
- [ ] Tokens médios por resposta: _____
- [ ] Qualidade geral: ⭐⭐⭐⭐

Observações:
_____

## Decisão Final
API escolhida como padrão: [ ] OpenAI [ ] Gemini [ ] Híbrida

Motivo:
_____
```

---

## 🚨 TROUBLESHOOTING

### Problema: Ainda recebo respostas MOCK

**Causas possíveis:**
1. Deploy não foi feito
2. Função antiga em cache
3. Variável de ambiente não configurada

**Soluções:**
```bash
# Forçar redeploy
supabase functions deploy pwacity-openai --no-verify-jwt
supabase functions deploy pwacity-gemini --no-verify-jwt

# Verificar logs
supabase functions logs pwacity-openai --limit 20
```

---

### Problema: "OPENAI_API_KEY not found"

**Solução:**
1. Ir em: https://supabase.com/dashboard/project/geaaxpctnixwsppgttsm/settings/functions
2. Verificar se a variável `OPENAI_API_KEY` está criada
3. Verificar se não há espaços extras no valor
4. Redeploy a função após adicionar

---

### Problema: "OpenAI API error: 401"

**Causa:** API Key inválida ou expirada

**Solução:**
1. Verificar API Key em: https://platform.openai.com/api-keys
2. Gerar nova se necessário
3. Atualizar no Supabase
4. Redeploy

---

### Problema: "Gemini API error: 400"

**Causa:** API Key inválida

**Solução:**
1. Verificar API Key em: https://makersuite.google.com/app/apikey
2. Gerar nova se necessário
3. Atualizar no Supabase
4. Redeploy

---

### Problema: Resposta bloqueada (Safety Filters - Gemini)

**Causa:** Safety settings muito restritivos

**Solução temporária:**
Editar `pwacity-gemini/index.ts` e mudar:
```typescript
threshold: "BLOCK_ONLY_HIGH"  // ao invés de BLOCK_MEDIUM_AND_ABOVE
```

---

## ✅ CHECKLIST FINAL DE VALIDAÇÃO

- [ ] **OpenAI funcionando:** Resposta real, não MOCK
- [ ] **Gemini funcionando:** Resposta real, não MOCK
- [ ] **Logs sem erros:** Ambas APIs sem erros nos logs
- [ ] **Banco salvando:** Conversas sendo salvas corretamente
- [ ] **Troca dinâmica:** Consigo trocar entre APIs via banco
- [ ] **Performance:** Tempos de resposta adequados
- [ ] **Qualidade:** Respostas fazem sentido
- [ ] **Custo:** Monitoramento de tokens ativo

---

## 🎯 PRÓXIMOS PASSOS APÓS VALIDAÇÃO

1. **Definir estratégia:**
   - [ ] Usar apenas OpenAI
   - [ ] Usar apenas Gemini
   - [ ] Usar híbrida (recomendado)

2. **Configurar monitoramento:**
   - [ ] Dashboard de uso de tokens
   - [ ] Alertas de custo
   - [ ] Métricas de qualidade

3. **Otimizar:**
   - [ ] Ajustar system prompts
   - [ ] Calibrar temperatura
   - [ ] Testar diferentes modelos

4. **Documentar:**
   - [ ] Resultados dos testes
   - [ ] Decisões tomadas
   - [ ] Configuração final

---

**Teste concluído?** Preencha o relatório e defina sua estratégia! 🚀
