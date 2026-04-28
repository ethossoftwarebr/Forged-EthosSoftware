<!-- mustard:generated -->

# Recipes — Ethos Forge

> Índice operacional das 23 receitas de construção da Forge. **Fonte canônica: `docs/12-PROMPTS-CLAUDE-CODE.md`** — cada receita lá tem `[CONTEXTO]/[OBJETIVO]/[TAREFAS]/[CRITÉRIO DE ACEITE]/[NÃO FAZER]` completo. Esse arquivo é índice + status, não duplicação.

## Como usar

1. Identificar a receita aplicável na tabela abaixo.
2. Abrir `docs/12-PROMPTS-CLAUDE-CODE.md` na seção correspondente e ler o prompt completo.
3. Seguir o protocolo de 7 passos definido em `.claude/commands/notes.md` § 8 (ler docs referenciadas → plano em ≤8 bullets → aguardar OK → executar em fases → validar → reportar → commit Conventional separado por fase).

## Index das 23 receitas

| #   | Receita                                                     | Status       |
| --- | ----------------------------------------------------------- | ------------ |
| 1   | Setup do monorepo                                           | ✅ Concluído |
| 2   | Configuração de tooling (ESLint, Prettier, Husky, CI)       | ⏭️ Próximo   |
| 3   | @ethos/ui — Fundação (Button, Input, Card + tokens)         | Pendente     |
| 4   | @ethos/ui — Primitivos (~30 componentes Radix-based)        | Pendente     |
| 5   | @ethos/ui — Compostos (DataTablePro, FormBuilder, KpiCard…) | Pendente     |
| 6   | @ethos/ui — Layouts (Dashboard, Auth, Settings)             | Pendente     |
| 7   | Setup do app API (NestJS em `templates/starter/apps/api/`)  | Pendente     |
| 8   | Auth + Multi-tenant                                         | Pendente     |
| 9   | Geradores Backend (em `tools/generators/forge-controller/`) | Pendente     |
| 10  | Setup do app Web (Next.js em `templates/starter/apps/web/`) | Pendente     |
| 11  | Geradores Frontend (em `tools/generators/forge-page/`)      | Pendente     |
| 12  | Consolidação template starter                               | Pendente     |
| 13  | Pacote @ethos/ai-chat                                       | Pendente     |
| 14  | Pacote @ethos/ai-rag                                        | Pendente     |
| 15  | Pacote @ethos/ocr                                           | Pendente     |
| 16  | Pacote @ethos/whatsapp                                      | Pendente     |
| 17  | Pacote @ethos/google                                        | Pendente     |
| 18  | Pacote @ethos/n8n                                           | Pendente     |
| 19  | Pacote @ethos/payments                                      | Pendente     |
| 20  | Pacote @ethos/erp-bridge                                    | Pendente     |
| 21  | Deploy inicial Railway                                      | Pendente     |
| 22  | Code review automatizado                                    | Pendente     |
| 23  | Debugging                                                   | Pendente     |

Status atualizado conforme prompts concluem. Detalhes do estado em `.claude/commands/notes.md`.
