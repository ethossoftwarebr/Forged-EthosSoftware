# 14 — Roadmap V1.0 Travado

> **Documento de visibilidade, não de execução.** As specs reais ficam em `.claude/spec/active/` e são geradas **incrementalmente** (1 por vez, ao fechar a anterior). Este doc só lista o que entra na v1, em que ordem, e por quê — pra você nunca perder o panorama.
>
> **Escopo travado em:** 2026-05-13
> **Total:** 15 prompts (contando #11.6 e #11.7 como 2)
> **Estimativa:** ~5-6 semanas de trabalho corrido (~22-30 sessões a 1-2/dia)
> **Memória de referência:** [project_v1_scope_lock](../../../.claude/projects/C--Users-Dell-Latitude-Projeto-Ethos-Ethos-Forge/memory/project_v1_scope_lock.md)

---

## Princípio operacional

Nenhuma spec é criada antes da hora. Cada uma nasce com o contexto fresco do código no momento. Ao fechar uma sessão (pipeline CLOSE), a spec do próximo prompt é gerada e fica em `.claude/spec/active/`. Sem batch, sem pré-aprovação. O `/mustard:approve` continua sendo gate humano por spec.

Specs envelhecem rápido — decisões de um prompt afetam o seguinte. Manter o pattern incremental preserva qualidade.

---

## Ordem fixa

A ordem foi escolhida pra: (1) limpar débito técnico cedo, (2) fechar auth como bloco contíguo, (3) destravar integrações críticas pro produto #1 (barbearia/salão/estética) antes das menos críticas, (4) deixar ferramentas (white-label, wizard) no fim porque dependem do conjunto maduro.

---

### 1. #14 — @ethos/ai-rag _(em curso)_

- **Entrega:** RAG com pgvector + embeddings + ingestão assíncrona via queue
- **Depende de:** #13 ai-chat (✅), Postgres com pgvector, BullMQ
- **Paths:** `packages/ai-rag/` (server + client + shared, igual ao ai-chat)
- **Spec:** `spec=2026-05-13-ethos-ai-rag` (já criada)

### 2. #11.6 + #11.7 — Concerns dos geradores _(bundle)_

- **Entrega:** pluralize concat fix no `controller.hbs` + compat Node 24 ESM nos generators
- **Depende de:** nada (limpeza)
- **Paths:** `tools/generators/forge-controller/`, `tools/generators/forge-page/`
- **Por que agora:** débito técnico que apodrece se ficar — limpa antes de empilhar #15-#20 em cima

### 3. #8.5 — Auth OAuth+PKCE (Google + Microsoft)

- **Entrega:** OAuth real plugado no `AuthAdapter`, fluxo PKCE, decisão de tenant resolution (subdomain/path/custom domain)
- **Depende de:** #8 (✅) — schema-ready via D12, interface pronta
- **Paths:** `templates/starter/apps/api/src/modules/auth/oauth/`, novo provider config
- **Decisão crítica:** como resolver tenant (subdomain vs path vs custom domain) — impacta white-label #12 deste roadmap
- **Memória:** [project_oauth_strategy](../../../.claude/projects/C--Users-Dell-Latitude-Projeto-Ethos-Ethos-Forge/memory/project_oauth_strategy.md)

### 4. #8.6 — Auth Magic Link

- **Entrega:** Fluxo passwordless (token gerado → email → validate → session)
- **Depende de:** #8.5 (decisão de tenant resolution), email transacional configurado
- **Paths:** `templates/starter/apps/api/src/modules/auth/magic-link/`
- **Nota:** Schema-ready em #8 (D14)

### 5. #8.7 — Auth MFA (TOTP)

- **Entrega:** TOTP (Google Authenticator/Authy compatible), endpoints enable/verify/disable, recovery codes
- **Depende de:** #8.5 (auth completo desbloqueado)
- **Paths:** `templates/starter/apps/api/src/modules/auth/mfa/`
- **Nota:** Schema-ready em #8 (D14)

### 6. #16 — @ethos/whatsapp

- **Entrega:** Adapter pattern (Z-API default + WABA Meta oficial), send/receive, webhooks com validação de assinatura, multi-tenant com credenciais criptografadas
- **Depende de:** #14 ai-rag (✅ até aqui), schema multi-tenant (✅)
- **Paths:** `packages/whatsapp/`
- **Crítico pro produto #1:** confirmação + lembrete de agendamento via WhatsApp é a feature âncora do SaaS de barbearia/salão

### 7. #17 — @ethos/google

- **Entrega:** OAuth2 + Calendar (sync agenda profissional), Drive, Sheets, Gmail; tokens criptografados
- **Depende de:** padrão OAuth de #8.5
- **Paths:** `packages/google/`
- **Crítico pro produto #1:** sync da agenda do barbeiro/cabeleireiro com Google Calendar pessoal

### 8. #15 — @ethos/ocr

- **Entrega:** Extração via Claude vision (NF, RG, comprovantes, boletos), schemas Zod pré-prontos, storage S3-compatible (R2 default)
- **Depende de:** #13 ai-chat (Anthropic SDK já wired)
- **Paths:** `packages/ocr/`
- **Útil pra:** produtos pet shop (NF de fornecedor), loja de roupas (NF entrada), advocacia (digitalização)

### 9. #19 — @ethos/payments

- **Entrega:** Adapters Mercado Pago (default BR — PIX + cartão + boleto) + Stripe + PagSeguro, webhooks com validação, assinatura recorrente, schema Payment/Subscription/Plan
- **Depende de:** schema multi-tenant (✅)
- **Paths:** `packages/payments/`
- **Crítico pro SaaS:** cobrar mensalidade dos donos de barbearia/salão; também: cliente final paga sinal de reserva online

### 10. #18 — @ethos/n8n

- **Entrega:** Wrapper pra triggerar workflows + receber callbacks via webhook reverso + SSE pro frontend
- **Depende de:** API base (✅), pode rodar n8n self-hosted via docker-compose
- **Paths:** `packages/n8n/`
- **Não crítico pra produto #1**, mas habilita automações customizadas

### 11. #20 — @ethos/erp-bridge

- **Entrega:** Adapters Bling v3 + Tiny + Omie, sync bidirecional via queue, mapeamento via `ProductExternalId`
- **Depende de:** queue (BullMQ ✅)
- **Paths:** `packages/erp-bridge/`
- **Crítico pra:** produto loja de roupas (NF-e + estoque); irrelevante pra barbearia inicial

### 12. Módulo Settings/White-label

- **Entrega:** Tela de configurações por tenant (logo, brandColor, appName, locale), backend endpoints, theme provider que injeta CSS variables, suporte a 3 níveis (light/medium/premium)
- **Depende de:** decisão de tenant resolution de #8.5, @ethos/ui maduro (✅)
- **Paths:** `templates/starter/apps/api/src/modules/tenant-settings/`, `templates/starter/apps/web/src/app/(dashboard)/settings/`, novos componentes em `packages/ui/`
- **Schema:** já preparado em #8 via D15 (`Tenant.brandColor/logoUrl/appName/locale`)
- **Memória:** [project_whitelabel_module](../../../.claude/projects/C--Users-Dell-Latitude-Projeto-Ethos-Ethos-Forge/memory/project_whitelabel_module.md)

### 13. Wizard CLI `create-ethos-app`

- **Entrega:** CLI de bootstrap multi-select (auth combo, i18n, UI lib, queue, packages, infra, deploy) + comandos `forge add/remove/list/upgrade` reversíveis
- **Depende de:** todos os packages estáveis (precisa do conjunto maduro pra oferecer opções)
- **Paths:** `tools/create-ethos-app/` (novo), templating sobre `templates/starter/`
- **Por que no fim:** só faz sentido quando o catálogo de packages tá fechado
- **Memória:** [project_wizard_cli](../../../.claude/projects/C--Users-Dell-Latitude-Projeto-Ethos-Ethos-Forge/memory/project_wizard_cli.md)

### 14. #21 — Deploy Railway pilot

- **Entrega:** Template starter rodando em Railway (Postgres+pgvector, Redis, API, Web), custom domains, preview deploys via PR, custo documentado
- **Depende de:** tudo acima
- **Paths:** `templates/starter/railway.json`, GitHub Actions, Dockerfiles
- **Validação final:** registro → login → CRUD → WhatsApp → pagamento end-to-end no ambiente real

---

## Diferido pra v1.1+

Nada. Tudo que estava em discussão foi puxado pra v1.0 por decisão do dev em 2026-05-13.

## Pós-v1: produto #1

Após #21 fechar, **NÃO** voltar pro Forge. Atacar:

- **SaaS barbearia + salão feminino + estética** (3 marcas/landings separadas no mesmo codebase: BarberFlow / SalonFlow / EsteticaFlow ou similar)
- Stack: clone do `templates/starter/` + schema do nicho + plug dos packages whatsapp/google/payments/ai-chat
- Estimativa: 2-4 semanas de produto, dependendo de quanto feedback de usuários reais você quer incorporar antes do launch

Roadmap dos 6 produtos verticais (ordem sugerida): barbearia → salão+estética → pet shop → academia → loja de roupas → advocacia.

---

## Como atualizar este doc

Quando fechar cada prompt, o snapshot vai pra memória (`project_status_YYYY-MM-DD-*.md`) — **não** vem editar este doc. Este doc só muda se:

1. Escopo for renegociado (precisa atualizar a memória `project_v1_scope_lock` junto)
2. Ordem mudar por descoberta de dependência forte
3. Algum prompt for split em 2 ou consolidado

Caso contrário, este doc é estático até v1.0 fechar.
