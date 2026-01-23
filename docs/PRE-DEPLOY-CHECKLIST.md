# Checklist Pré-Deploy

## Antes de CADA Deploy

### 1. ✅ Verificação Automática
```bash
npm run pre-deploy
```

### 2. 🗄️ Banco de Dados

- [ ] Todas as migrations foram aplicadas?
  ```bash
  # Verificar migrations pendentes
  ls supabase/migrations/
  ```
- [ ] Types do Supabase estão atualizados?
  ```bash
  npx supabase gen types typescript --project-id uhazjwqfsvxqozepyjjj > src/integrations/supabase/types.ts
  ```

### 3. 🔧 Edge Functions

- [ ] Todas as funções têm CORS correto?
  ```typescript
  // ✅ CORRETO
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // ❌ ERRADO (sem status explícito)
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  ```

- [ ] Todas as funções têm try/catch?
- [ ] Todas as funções têm header de versão?

### 4. 🔐 Variáveis de Ambiente

**No Supabase Dashboard > Settings > Edge Functions:**
- [ ] `OPENAI_API_KEY`
- [ ] `GEMINI_API_KEY`
- [ ] `INFOBIP_API_KEY`
- [ ] `INFOBIP_BASE_URL`
- [ ] `TWILIO_ACCOUNT_SID`
- [ ] `TWILIO_AUTH_TOKEN`
- [ ] `TWILIO_SMS_NUMBER`
- [ ] `RESEND_API_KEY`

### 5. 🏗️ Build

```bash
npm run build
```
- [ ] Build passou sem erros?
- [ ] Sem warnings críticos?

### 6. 🧪 Teste Local (Opcional)

```bash
# Testar Edge Functions localmente
npx supabase functions serve

# Em outro terminal
curl -X POST http://localhost:54321/functions/v1/create-invitation \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com"}'
```

---

## Após o Deploy

### 1. 🔍 Verificar GitHub Actions
- [ ] [Actions](https://github.com/arbachegit/knowyou-production/actions) completou com sucesso?

### 2. 🧪 Smoke Tests

| Funcionalidade | Testar |
|----------------|--------|
| Login Admin | https://fia.iconsai.ai/admin |
| Criar Convite | Admin > Usuários > Novo Convite |
| PWA Home | https://fia.iconsai.ai/pwa |
| Voz TTS | Falar no PWA e ouvir resposta |

### 3. 📊 Logs

```bash
# Ver logs das Edge Functions
npx supabase functions logs create-invitation --project-ref uhazjwqfsvxqozepyjjj
npx supabase functions logs send-sms --project-ref uhazjwqfsvxqozepyjjj
```

---

## Problemas Comuns

### CORS Error: "preflight request doesn't pass"
```typescript
// Adicionar status explícito
return new Response(null, { status: 204, headers: corsHeaders });
```

### Column does not exist
```sql
-- Verificar se coluna existe
SELECT column_name FROM information_schema.columns
WHERE table_name = 'sua_tabela';

-- Adicionar coluna faltando
ALTER TABLE sua_tabela ADD COLUMN IF NOT EXISTS nova_coluna TIPO;
```

### Edge Function não responde
```bash
# Verificar se está deployada
npx supabase functions list

# Re-deploy
npx supabase functions deploy nome-da-funcao --no-verify-jwt
```

### Types desatualizados
```bash
npx supabase gen types typescript --project-id uhazjwqfsvxqozepyjjj > src/integrations/supabase/types.ts
```

---

## Contatos

- **Supabase Dashboard**: https://supabase.com/dashboard/project/uhazjwqfsvxqozepyjjj
- **GitHub Actions**: https://github.com/arbachegit/knowyou-production/actions
- **Logs**: Supabase Dashboard > Edge Functions > Logs
