<!-- mustard:generated -->

# Patterns — Ethos Forge

> Padrões de código emergentes do repo. **Vazio até prompt #3+** — repo só tem placeholders hoje, então não há código real pra extrair pattern. Não inventar pattern antes de existir código que o demonstre.

## Padrões já decididos (não-emergentes)

Decisões arquiteturais que precedem a implementação. Cada uma tem doc canônica como fonte.

| Padrão                                                    | Resumo                                                                                                                                                  | Doc canônica                   |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **Modelo B do CRUD**                                      | Generator cospe `BaseClientService`; dev cria `ClientService extends BaseClientService` quando precisa custom. Re-rodar generator nunca destrói custom. | `docs/05-GERADORES-BACKEND.md` |
| **Multi-tenant via AsyncLocalStorage + Prisma extension** | `tenantId` propagado por ALS no contexto da request; Prisma extension injeta `where: { tenantId }` em toda query. `tenantId` NUNCA vem de body/query.   | `docs/07-AUTH-MULTI-TENANT.md` |
| **RBAC com 5 roles**                                      | Hierarquia `owner > admin > manager > member > viewer`. Endpoints anotam `@Roles(...)` explicitamente; permissão negada por padrão.                     | `docs/07-AUTH-MULTI-TENANT.md` |

## Padrões a popular conforme prompts executados

Lista do que vai virar pattern detectável após cada prompt. Esse arquivo é regenerado a cada `/mustard:scan`; depois do prompt #3 a tabela acima cresce com patterns extraídos do código real.

| Pattern emergirá quando                                                          | Após prompt | Doc-âncora                                                     |
| -------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------- |
| UI component shape (cva + forwardRef + displayName + Tailwind tokens)            | #3          | `docs/04-BIBLIOTECA-UI.md`                                     |
| NestJS module shape (controller + service + repository + module + DTO)           | #7–8        | `docs/05-GERADORES-BACKEND.md`, `docs/07-AUTH-MULTI-TENANT.md` |
| Generator backend (Handlebars + Modelo B + `/// @forge.generate` directive)      | #9          | `docs/05-GERADORES-BACKEND.md`                                 |
| Generator frontend (App Router list/create/edit/view + bloco AUTOGEN no sidebar) | #11         | `docs/06-GERADORES-FRONTEND.md`                                |
| Pacote plugável (server + client + shared, exports condicionais)                 | #13+        | `docs/08-PACOTES-PLUGAVEIS.md`                                 |
