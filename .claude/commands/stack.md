<!-- mustard:generated -->

# Stack — Ethos Forge

> Cartão de visita da stack. **Fonte canônica é `docs/01-STACK-DECISOES.md`** — esse arquivo só resume e linka. Mudança de stack vai na doc canônica primeiro, nunca aqui.

## Estado atual

- Monorepo Turborepo 2.9.6 + pnpm 9 inicializado (prompt #1 concluído).
- 17 workspaces resolvendo: 1 playground + 1 starter + 15 packages — todos placeholders.
- `pnpm typecheck` passa (16 tasks); `docker compose config` valida YAML.
- Próximo passo: prompt #2 (tooling) — ver `recipes.md`.

## Stack canônica (resumo)

Tabela completa com justificativas em **`docs/01-STACK-DECISOES.md`**. Resumo das camadas mais consultadas:

| Camada   | Tecnologia                                                   | Versão alvo  |
| -------- | ------------------------------------------------------------ | ------------ |
| Backend  | NestJS + Prisma + PostgreSQL                                 | 10 / 5 / 16  |
| Frontend | Next.js (App Router) + TypeScript + Tailwind + shadcn custom | 14 / 5 / 3.4 |
| Hash     | argon2id (NÃO bcrypt)                                        | latest       |
| Banco    | PostgreSQL único — sem MongoDB/MySQL                         | 16+          |
| Monorepo | Turborepo + pnpm                                             | 2.x / 9      |

Para qualquer outra camada (estado, forms, IA, queue, mobile, deploy, observabilidade), consultar `docs/01-STACK-DECISOES.md`.

## Estrutura de packages

Layout completo em `docs/03-ESTRUTURA-MONOREPO.md`. Divisão fixa:

- **7 packages de infraestrutura** (sempre presentes): `ui`, `auth`, `database`, `api-base`, `config`, `types`, `utils`.
- **8 packages plugáveis** (sob demanda): `ai-chat`, `ai-rag`, `ocr`, `whatsapp`, `google`, `n8n`, `payments`, `erp-bridge`.
- **Generators em `tools/generators/`** — fora do workspace pnpm, não publicáveis.
- **Apps de produto em `templates/starter/apps/`** — NÃO em `apps/` da raiz da Forge.

## Divergências detectadas pelo scan

<!--
Protocolo: se um scan futuro detectar versão diferente do schema canônico
(ex: package.json com NestJS 11 quando docs/01 trava em 10), registra
aqui como divergência. NUNCA sobrescreve docs/01-STACK-DECISOES.md —
divergência é flag pra revisão humana, não auto-correção.

Formato sugerido:
- [YYYY-MM-DD] camada: detectado X em <path>, canônico Y em docs/01. Ação: ...
-->

_(nenhuma divergência registrada)_
