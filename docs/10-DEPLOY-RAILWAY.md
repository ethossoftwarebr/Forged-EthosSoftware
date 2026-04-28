# 10 — Deploy Railway

> Setup completo de deploy na Railway. Esse arquivo cobre criação do projeto, configuração de services, variáveis de ambiente, networking interno, preview deploys, custom domains, e quando considerar migrar fora do Railway.

---

## Por que Railway

A Forge padroniza Railway na v1 por:

- **Setup ridiculamente simples.** Cria projeto, conecta repo GitHub, escolhe service, deploya. Sem YAML complexo, sem AWS console labirintico.
- **Multi-service no mesmo projeto.** API (NestJS), Web (Next.js), Postgres, Redis — tudo em um lugar.
- **Networking interno gratuito.** Comunicação entre services via `service.railway.internal`. Sem custo de egress.
- **Preview deploys por PR.** Cada Pull Request ganha URL própria pro QA validar antes de merge.
- **Logs e métricas integrados.** UI razoável pra debug.
- **Custo previsível.** Pay-per-use, mas com cap. Projeto pequeno fica em ~$20-40/mês.
- **Custom domains com SSL automático.** Adiciona domínio, Railway gerencia certificado.

Trade-offs aceitos:

- **Não escala pra carga muito alta.** Pra projetos com >10k req/min sustentado, considerar Vercel (web) + AWS/Render (api).
- **Vendor lock-in moderado.** Mas como tudo roda em containers Docker, migrar é viável (não trivial, mas viável).
- **Sem regiões granulares.** Railway escolhe região automaticamente. Pra projetos que precisam multi-região, não serve.

---

## Estrutura padrão de um projeto Railway

Cada projeto cliente vira um **Railway Project** com 4 services:

```
Railway Project: [nome-cliente]
│
├── Service: api          (NestJS — apps/api)
├── Service: web          (Next.js — apps/web)
├── Service: postgres     (Postgres database)
└── Service: redis        (Redis cache + filas)
```

---

## Setup passo a passo

### 1. Criar projeto

1. Login no railway.app
2. **New Project** → **Empty Project**
3. Nome: `[nome-cliente]` (ex: `petshop-do-joao`)
4. Selecionar workspace da Ethos (não o pessoal)

### 2. Adicionar Postgres

1. Dentro do projeto: **+ New** → **Database** → **PostgreSQL**
2. Railway provisiona Postgres 16 com:
   - Variável `DATABASE_URL` automática
   - Backup diário automático no plano pago
   - Acesso via `postgres.railway.internal:5432` (interno) ou URL público com porta randômica

### 3. Adicionar Redis

1. **+ New** → **Database** → **Redis**
2. Variável `REDIS_URL` automática
3. Acesso via `redis.railway.internal:6379`

### 4. Adicionar service `api`

1. **+ New** → **GitHub Repo**
2. Selecionar repo do projeto
3. **Settings** do service:
   - **Service name:** `api`
   - **Root directory:** `/apps/api`
   - **Build command:** `pnpm install --frozen-lockfile && pnpm prisma generate && pnpm build`
   - **Start command:** `pnpm prisma migrate deploy && node dist/main.js`
   - **Watch paths:** `/apps/api/**` e `/packages/**` (pra trigger redeploy só nessas mudanças)
   - **Restart policy:** Always
   - **Health check path:** `/api/health`
   - **Health check timeout:** 30s

### 5. Adicionar service `web`

1. **+ New** → **GitHub Repo** (mesmo repo)
2. **Settings**:
   - **Service name:** `web`
   - **Root directory:** `/apps/web`
   - **Build command:** `pnpm install --frozen-lockfile && pnpm build`
   - **Start command:** `pnpm start`
   - **Watch paths:** `/apps/web/**` e `/packages/**`
   - **Health check path:** `/`
   - **Health check timeout:** 30s

### 6. Configurar variáveis de ambiente

Em cada service, configurar variáveis. Padrão:

#### Service `api`

```bash
# Database (automaticamente provisionada)
DATABASE_URL=${{ Postgres.DATABASE_URL }}

# Redis (automaticamente provisionada)
REDIS_URL=${{ Redis.REDIS_URL }}

# Auth
JWT_SECRET=<gerar com: openssl rand -base64 64>
JWT_REFRESH_SECRET=<gerar outro>

# URLs (referencia o service web)
WEB_URL=https://${{ web.RAILWAY_PUBLIC_DOMAIN }}

# Application
APP_NAME=[Nome do Cliente]
NODE_ENV=production
PORT=3001

# Pacotes plugáveis (preencher conforme uso)
ANTHROPIC_API_KEY=...
```

#### Service `web`

```bash
# URL do API (interno — sem custo de rede)
NEXT_PUBLIC_API_URL=https://${{ api.RAILWAY_PUBLIC_DOMAIN }}/api
INTERNAL_API_URL=http://api.railway.internal:3001/api

NODE_ENV=production
PORT=3000

# Auth (apenas o que o frontend precisa expor)
# JWT_SECRET NÃO vai aqui — só backend
```

### 7. Habilitar PgVector (se usar `@ethos/ai-rag`)

```sql
-- Conectar no Postgres via Railway "Connect" → "Query"
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### 8. Configurar custom domain (opcional)

1. No service `web`: **Settings** → **Domains** → **Add Custom Domain**
2. Inserir domínio (ex: `app.cliente.com.br`)
3. Railway dá CNAME pra apontar
4. Configurar DNS do cliente: CNAME `app` → `[valor].up.railway.app`
5. Aguardar propagação (5-60 min)
6. Railway emite SSL automaticamente via Let's Encrypt

Pra API geralmente não precisa custom domain — ela é consumida pelo web internamente.

### 9. Trigger primeiro deploy

Push pra `main` no GitHub. Railway detecta, builda, deploya os 4 services.

Tempo total do primeiro deploy: ~5-10 minutos.

---

## Networking interno

Railway permite services se comunicarem internamente via `[service].railway.internal`. Vantagens:

- **Sem custo de egress** (tráfego entre services no mesmo projeto é gratuito)
- **Mais rápido** (sem ida ao DNS público)
- **Mais seguro** (não passa pela internet)

Padrão de uso:

```bash
# Postgres
DATABASE_URL=postgresql://user:pass@postgres.railway.internal:5432/railway

# Redis
REDIS_URL=redis://default:pass@redis.railway.internal:6379

# API → Web ou Web → API (raramente usado, mas possível)
INTERNAL_API_URL=http://api.railway.internal:3001
```

**Cuidado:** internal URLs **não funcionam fora do Railway**. Em desenvolvimento local, usar URLs externas ou docker-compose.

---

## Preview deploys por PR

Configuração:

1. No projeto Railway: **Settings** → **Environments**
2. Adicionar environment "PR Previews"
3. Em cada service: **Settings** → **Environments** → habilitar PR previews
4. Configurar source: `pull_request` events do GitHub

Resultado: cada PR criado no GitHub ganha URL própria tipo `petshop-do-joao-pr-42-web.up.railway.app`. Permite QA validar feature antes de merge.

Custo: cada preview deploy custa como service rodando. Pra economizar, configura "auto-sleep" — preview hiberna após 30 min sem requests, reactiva no primeiro hit.

---

## Health checks e auto-restart

Railway pinga health check periodicamente. Se 3 falhas seguidas, restart automático do container.

### Endpoint de health no API

```typescript
// apps/api/src/health/health.controller.ts
import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    } catch (err) {
      throw new Error("Database unhealthy");
    }
  }
}
```

### No web (Next.js)

A própria página inicial serve. Mas pode-se criar `/api/health/route.ts`:

```typescript
// apps/web/src/app/api/health/route.ts
export async function GET() {
  return Response.json({ status: "ok", timestamp: new Date().toISOString() });
}
```

---

## Logs

Railway agrupa logs por service em tempo real. Acesso:

- **UI Railway** → Service → **Deployments** → **View Logs**
- **CLI:** `railway logs --service api --follow`

**Estrutura recomendada de logs no NestJS:**

```typescript
// apps/api/src/main.ts
import { Logger } from "@nestjs/common";

const logger = new Logger("Bootstrap");

// Em produção, usar logger estruturado
if (process.env.NODE_ENV === "production") {
  // Logs em JSON pra facilitar query no Railway
  app.useLogger(["error", "warn", "log"]);
}
```

Pra logs avançados (busca, alertas, dashboards), integrar com **Sentry** ou **Better Stack** (Logtail).

---

## Métricas e observabilidade

Railway expõe métricas básicas (CPU, memória, network) na UI. Pra observabilidade séria:

### Sentry pra erros

```bash
pnpm --filter api add @sentry/node
pnpm --filter web add @sentry/nextjs
```

```typescript
// apps/api/src/main.ts
import * as Sentry from "@sentry/node";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}
```

### OpenTelemetry pra traces (opcional na v1, recomendado v2)

Configura traces distribuídos. Útil quando o sistema crescer e precisar entender bottlenecks entre services.

---

## Backup e disaster recovery

### Postgres backup

Railway plano pago: backup automático diário com retenção de 7 dias.

Backup manual extra:

```bash
# Via Railway CLI
railway run --service postgres pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

Recomendado: cron job em service separado que faz dump diário e upload pra S3 ou Backblaze B2 (mais barato).

### Restore

```bash
# Importar backup
psql $DATABASE_URL < backup-20260101.sql
```

Pra disaster recovery completo: documentar processo de recriar projeto Railway do zero usando IaC (Terraform tem provider Railway).

---

## Custos esperados

Estimativas Railway (em USD/mês):

| Tipo de projeto | Postgres | Redis | API | Web | Total estimado |
|-----------------|----------|-------|-----|-----|----------------|
| MVP/dev | $5 | $5 | $5 | $5 | **~$20** |
| Pequeno em produção | $10 | $5 | $10 | $10 | **~$35** |
| Médio (50 users ativos) | $20 | $10 | $25 | $20 | **~$75** |
| Grande (500+ users) | $50 | $20 | $80 | $50 | **~$200** |

Acima de $200/mês, considerar migrar:

- **Web** → Vercel (CDN global, melhor performance)
- **API** → Render, Fly.io, ou AWS ECS
- **Postgres** → Neon, Supabase, ou RDS
- **Redis** → Upstash, ElastiCache

Mas pra v1 e v2 da Forge, Railway é recomendação default.

---

## Variáveis sensíveis: como gerenciar

**Nunca:**
- Commitar `.env` no git
- Compartilhar API keys via Slack/email em texto plano
- Usar mesmas keys em dev e prod

**Sempre:**
- Variáveis de produção apenas no Railway UI
- Rotacionar keys a cada 6-12 meses
- Usar variáveis diferentes por environment (dev, staging, prod)
- Revogar keys de devs que saíram do time

Pra time grande (>5 devs), considerar Doppler ou Infisical pra gerenciar secrets centralizadamente.

---

## Migrations em produção

Padrão Forge: migrations rodam **automaticamente no startup** do API service.

```bash
# Start command no Railway:
pnpm prisma migrate deploy && node dist/main.js
```

Vantagens:
- Sem step manual
- Zero downtime na maioria dos casos (Prisma migrate deploy é idempotente)

Cuidados:
- Migrations destrutivas (drop column, rename) precisam de planejamento. Padrão recomendado:
  1. Deploy 1: adicionar nova coluna/tabela mantendo a antiga
  2. Deploy 2: backfill de dados
  3. Deploy 3: usar a nova
  4. Deploy 4: remover a antiga

- Migrations de muitos dados (>1M rows) considerar fazer fora do startup pra evitar timeout

---

## Rollback de deploy

Cada deploy tem snapshot. Rollback via:

1. UI Railway → Service → **Deployments**
2. Encontra deploy bom anterior
3. **Redeploy** nele

Cuidado: rollback de código é fácil. Rollback de migrations destrutivas **não é**. Por isso o padrão de migrations não-destrutivas em sequência.

---

## Múltiplos environments

Padrão recomendado pra projetos sérios:

```
Railway Project: [cliente]
│
├── Environment: production
│   ├── api
│   ├── web
│   ├── postgres
│   └── redis
│
└── Environment: staging
    ├── api
    ├── web
    ├── postgres
    └── redis
```

- **production** deploya de `main`
- **staging** deploya de `staging` ou `develop`
- Cada environment tem variáveis próprias (ex: API keys diferentes)
- Cliente pode ter acesso ao staging pra validar antes de virar produção

Pra projetos pequenos, só `production` basta. Mas projetos críticos sempre têm staging.

---

## Quando NÃO usar Railway

Razões legítimas pra escolher outra solução:

- **Custo > $200/mês:** considerar AWS/Vercel/Neon combo
- **Compliance específico:** SOC2 do cliente exige AWS/Azure
- **Multi-região obrigatória:** Railway só roda em uma região por vez
- **Cargas serverless extremas:** projetos com tráfego muito picado se beneficiam de Lambda
- **Cliente já tem infra montada:** não inventar onde não precisa

Pra esses casos, ainda usamos Forge (template starter, geradores, packages) — só muda onde deploya. Tudo é portável.

---

## Checklist de deploy de novo projeto

Antes de marcar como entregue:

- [ ] Projeto Railway criado
- [ ] 4 services rodando: api, web, postgres, redis
- [ ] Variáveis de ambiente preenchidas (incluindo as dos pacotes plugáveis em uso)
- [ ] Custom domain configurado (se cliente forneceu)
- [ ] SSL ativo
- [ ] Health checks passando
- [ ] Sentry conectado e recebendo erros (se aplicável)
- [ ] Backups Postgres ativos
- [ ] Login de produção funcional
- [ ] Logs sendo gerados corretamente
- [ ] Preview deploys habilitados (se time de dev usa PRs)
- [ ] Documentação de credenciais entregue ao cliente (em vault seguro)
- [ ] Cliente tem acesso ao Railway (com role apropriado — geralmente "viewer")
- [ ] Plano de monitoramento ativo (alertas de downtime, erros)

---

## Troubleshooting comum

### Build falhando

- Verificar `Build command` e `Root directory` corretos no service
- Logs do build mostram qual step falhou
- Se for falta de cache: `pnpm install` sem `--frozen-lockfile` em desenvolvimento, mas com em CI/Railway

### API não conecta no Postgres

- Verificar se `DATABASE_URL` referencia `${{ Postgres.DATABASE_URL }}` corretamente
- Internal URL: `postgres.railway.internal` requer que ambos services estejam no mesmo project
- Testar via Railway shell: `railway run --service api psql $DATABASE_URL`

### Web não carrega API

- `NEXT_PUBLIC_API_URL` precisa apontar pro domínio público do API service
- CORS no API precisa permitir o domínio do web
- `WEB_URL` no API precisa estar configurado

### Migration não roda

- Logs do API mostram erro do prisma migrate
- Verificar se `prisma/migrations/` está commitado no git
- `prisma generate` precisa rodar antes do `migrate deploy`

### Custom domain não funciona

- Verificar CNAME apontando corretamente
- Aguardar propagação DNS (até 24h, geralmente <1h)
- SSL leva ~10 min após DNS propagar

---

## Comandos úteis Railway CLI

```bash
# Login
railway login

# Linkar pasta local ao projeto
railway link

# Logs de um service
railway logs --service api --follow

# Rodar comando dentro do ambiente do service (com env vars)
railway run --service api pnpm prisma studio

# Conectar ao Postgres
railway connect postgres

# Variáveis do service
railway variables --service api

# Trigger deploy manual
railway up --service api
```

---

## Referência rápida: arquivos críticos pra deploy

```
/apps/api/Dockerfile              # opcional, Railway auto-detecta
/apps/web/Dockerfile              # opcional, Railway auto-detecta
/apps/api/package.json            # scripts: build, start
/apps/web/package.json            # scripts: build, start
/turbo.json                       # task pipeline
/pnpm-workspace.yaml              # workspaces

# No Railway UI:
- Service config (root dir, build cmd, start cmd, watch paths)
- Environment variables
- Custom domains
- Health check paths
```

Toda a configuração crítica vive em código (no repo) ou na UI Railway. Nada de scripts mágicos escondidos.
