# Skill: Deploy do FIA (Fiscalizacao Inteligente de Arrecadacao)

Skill para realizar deploy da aplicacao e documentar o processo de CI/CD.

## Arquitetura de Deploy

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────────────┐
│   GitHub Repo   │────▶│   GitHub Actions │────▶│   Digital Ocean Droplet     │
│   (main branch) │     │   (CI/CD)        │     │   (VPS + Nginx + Services)  │
└─────────────────┘     └──────────────────┘     └─────────────────────────────┘
                                                          │
                                                          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         DIGITAL OCEAN DROPLET                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│  /var/www/html/              │  Frontend (dist/)                             │
│  /opt/fia/comparacao-service │  Microservice Python (porta 8090)             │
│  /opt/fia/completude-service │  Microservice Python (porta 8091)             │
│  Nginx                       │  Proxy reverso + SSL + servir arquivos        │
└──────────────────────────────────────────────────────────────────────────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │  Digital Ocean  │
                                                 │  DNS            │
                                                 │  fiscal.iconsai.ai
                                                 └─────────────────┘
```

## Como Fazer Deploy

### Deploy Automatico (Recomendado)

O deploy e disparado **automaticamente** quando um commit e feito na branch `main`:

```bash
# 1. Fazer as alteracoes necessarias
# 2. Adicionar arquivos ao stage
git add <arquivos>

# 3. Criar commit
git commit -m "feat: descricao da alteracao"

# 4. Push para main (dispara deploy automatico)
git push origin main
```

### O que acontece no CI/CD:

1. **Job: Version** - Incrementa versao automaticamente
2. **Job: Build** - Compila o frontend com Vite
3. **Job: Deploy** - Envia arquivos para Digital Ocean via SCP

### Verificar Status do Deploy

```bash
# Ver ultimos workflows executados
gh run list --limit 5

# Ver detalhes de um workflow especifico
gh run view <run-id>

# Ver logs de um workflow
gh run view <run-id> --log

# Monitorar deploy em tempo real
gh run watch
```

## Configuracao do GitHub Actions

### Workflow: `.github/workflows/deploy.yml`

O workflow possui 3 jobs:

| Job | Descricao |
|-----|-----------|
| `version` | Incrementa versao (1.92.2026 → 1.93.2026) |
| `build` | Compila frontend e prepara microservices |
| `deploy` | Envia para Digital Ocean e reinicia services |

### Secrets Necessarios no GitHub

Configurar em: **Settings > Secrets and variables > Actions**

| Secret | Descricao | Exemplo |
|--------|-----------|---------|
| `DO_HOST` | IP ou hostname do Droplet | `143.198.xxx.xxx` |
| `DO_USERNAME` | Usuario SSH | `root` ou `deploy` |
| `DO_SSH_KEY` | Chave privada SSH | `-----BEGIN OPENSSH...` |
| `DO_TARGET_PATH` | Pasta do frontend | `/var/www/html` |
| `VITE_SUPABASE_URL` | URL do Supabase | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Chave anonima Supabase | `eyJhbG...` |
| `VITE_OPENAI_API_KEY` | API Key OpenAI (TTS) | `sk-...` |

### Como Adicionar SSH Key

1. Gerar par de chaves (se nao existir):
```bash
ssh-keygen -t ed25519 -C "deploy@github"
```

2. Adicionar chave publica no servidor:
```bash
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
```

3. Adicionar chave privada no GitHub Secrets como `DO_SSH_KEY`

## Configuracao do Servidor (Digital Ocean)

### Estrutura de Diretorios

```
/var/www/html/                    # Frontend (servido pelo Nginx)
├── index.html
├── assets/
│   ├── index-*.css
│   └── index-*.js
└── favicon.ico

/opt/fia/                         # Microservices
├── comparacao-service/
│   ├── main.py
│   ├── requirements.txt
│   ├── venv/
│   └── comparacao-service.service
└── completude-service/
    ├── main.py
    ├── requirements.txt
    ├── venv/
    └── completude-service.service
```

### Nginx Configuration

Arquivo: `/etc/nginx/sites-available/fiscal`

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name fiscal.iconsai.ai;

    ssl_certificate /etc/letsencrypt/live/fiscal.iconsai.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fiscal.iconsai.ai/privkey.pem;

    root /var/www/html;
    index index.html;

    # Frontend (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API: Comparacao Service
    location /api/comparacao {
        proxy_pass http://127.0.0.1:8090;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API: Completude Service
    location /api/completude {
        proxy_pass http://127.0.0.1:8091;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Systemd Services

Os microservices rodam como systemd services:

```bash
# Status dos services
sudo systemctl status comparacao-service
sudo systemctl status completude-service

# Reiniciar services
sudo systemctl restart comparacao-service
sudo systemctl restart completude-service

# Ver logs
sudo journalctl -u comparacao-service -f
sudo journalctl -u completude-service -f
```

## Configuracao do DNS (Digital Ocean)

O DNS do dominio `iconsai.ai` esta hospedado no **Digital Ocean**.

### Acessar Configuracao DNS

1. Login em https://cloud.digitalocean.com
2. Ir para **Networking > Domains**
3. Selecionar dominio `iconsai.ai`

### Registros DNS Configurados

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| A | fiscal | `<IP_DO_DROPLET>` | 3600 |
| CNAME | www.fiscal | fiscal.iconsai.ai | 3600 |

### Verificar DNS

```bash
# Verificar registro A
dig +short fiscal.iconsai.ai A

# Verificar propagacao
nslookup fiscal.iconsai.ai 8.8.8.8

# Testar conectividade
curl -I https://fiscal.iconsai.ai
```

## SSL/HTTPS (Let's Encrypt)

O certificado SSL e gerenciado pelo **Certbot**:

```bash
# Renovar certificado
sudo certbot renew

# Verificar certificado
sudo certbot certificates

# Instalar novo certificado (se necessario)
sudo certbot --nginx -d fiscal.iconsai.ai
```

Renovacao automatica via cron:
```bash
# Verificar cron do certbot
sudo systemctl status certbot.timer
```

## Troubleshooting

### Deploy Falhou no GitHub Actions

```bash
# Ver logs do ultimo deploy
gh run view --log-failed

# Verificar build local
npm run build
```

### Frontend Nao Atualiza

1. Verificar se deploy completou no GitHub Actions
2. Limpar cache do navegador (Ctrl+Shift+R)
3. Verificar arquivos no servidor:
```bash
ssh user@fiscal.iconsai.ai "ls -la /var/www/html/"
```

### Microservice Nao Responde

```bash
# SSH no servidor
ssh user@fiscal.iconsai.ai

# Verificar status
sudo systemctl status comparacao-service

# Ver logs
sudo journalctl -u comparacao-service -n 50

# Reiniciar
sudo systemctl restart comparacao-service

# Testar endpoint local
curl http://127.0.0.1:8090/health
```

### Erro de Permissao SSH

1. Verificar se a chave SSH esta correta no GitHub Secrets
2. Verificar permissoes no servidor:
```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### Nginx Erro 502/504

```bash
# Verificar se services estao rodando
sudo systemctl status comparacao-service completude-service

# Verificar logs nginx
sudo tail -f /var/log/nginx/error.log

# Reiniciar nginx
sudo systemctl restart nginx
```

## Comandos Uteis

```bash
# Deploy manual (emergencia) - SSH no servidor
ssh user@fiscal.iconsai.ai
cd /var/www/html
# Upload manual dos arquivos dist/

# Verificar versao em producao
curl -s https://fiscal.iconsai.ai | grep -o 'v[0-9.]*'

# Monitorar recursos do servidor
ssh user@fiscal.iconsai.ai "htop"

# Verificar espaco em disco
ssh user@fiscal.iconsai.ai "df -h"
```

## Checklist Pre-Deploy

- [ ] Todas as alteracoes commitadas
- [ ] Build local funciona (`npm run build`)
- [ ] TypeScript sem erros (`npx tsc --noEmit`)
- [ ] Testes passando (se aplicavel)
- [ ] Branch main atualizada
- [ ] Secrets do GitHub configurados
- [ ] Servidor Digital Ocean acessivel

## URLs do Projeto

| Ambiente | URL |
|----------|-----|
| **Producao** | https://fiscal.iconsai.ai |
| **API Comparacao** | https://fiscal.iconsai.ai/api/comparacao |
| **API Completude** | https://fiscal.iconsai.ai/api/completude |
| **GitHub Actions** | https://github.com/arbachegit/orcamento-fiscal-municipios/actions |
| **Digital Ocean** | https://cloud.digitalocean.com |

## Versionamento

O sistema usa versionamento automatico:
- Formato: `MAJOR.MINOR.YEAR` (ex: 1.93.2026)
- Incrementado automaticamente a cada deploy
- Script: `.claude/skills/skill-versioning/script.py`
