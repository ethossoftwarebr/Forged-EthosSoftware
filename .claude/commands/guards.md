<!-- mustard:generated -->

# Guards — Ethos Forge

> Guards operacionais — **referência pura, sem duplicação**. Fonte canônica: `CLAUDE.md` raiz (seção "Sempre proibido" + "Regras operacionais") e `docs/00-FILOSOFIA.md` (princípios 1-7). Esse arquivo é cartão de consulta rápida.

## DON'T — proibições da Forge

| Regra                                                                          | Fonte canônica                 |
| ------------------------------------------------------------------------------ | ------------------------------ |
| Não usar bcrypt — sempre argon2id                                              | `CLAUDE.md` § Sempre proibido  |
| Não armazenar JWT em localStorage — sempre cookie httpOnly                     | `CLAUDE.md` § Sempre proibido  |
| `tenantId` NUNCA vem de body/query — só do JWT decodificado                    | `CLAUDE.md` § Sempre proibido  |
| Não usar CSS-in-JS (styled-components, emotion) — só Tailwind                  | `CLAUDE.md` § Sempre proibido  |
| Não adicionar libs UI prontas (MUI, Chakra, Mantine, Ant Design)               | `CLAUDE.md` § Sempre proibido  |
| Não usar cores fora da paleta Ethos                                            | `docs/02-IDENTIDADE-VISUAL.md` |
| Não usar polling onde poderia ser webhook                                      | `CLAUDE.md` § Sempre proibido  |
| Não fazer sync pesado no thread principal — sempre via BullMQ                  | `CLAUDE.md` § Sempre proibido  |
| Não armazenar credenciais externas em texto puro — sempre criptografar at rest | `CLAUDE.md` § Sempre proibido  |
| Não mudar stack sem antes atualizar `docs/01-STACK-DECISOES.md`                | `CLAUDE.md` § Sempre proibido  |

## DO — princípios

| Princípio                                                    | Fonte canônica                       |
| ------------------------------------------------------------ | ------------------------------------ |
| Open source primeiro, proprietário onde diferencia           | `docs/00-FILOSOFIA.md` § Princípio 1 |
| Código gerado = código que escreveríamos à mão               | `docs/00-FILOSOFIA.md` § Princípio 2 |
| Liberdade de customizar é sagrada (Modelo B)                 | `docs/00-FILOSOFIA.md` § Princípio 3 |
| Padrões fortes em estrutura, livre em domínio                | `docs/00-FILOSOFIA.md` § Princípio 4 |
| Multi-tenant nasce no DNA, mesmo em projetos single-tenant   | `docs/00-FILOSOFIA.md` § Princípio 5 |
| Identidade visual é diferencial competitivo (não-negociável) | `docs/00-FILOSOFIA.md` § Princípio 6 |
| IA não é módulo opcional, é capacidade transversal           | `docs/00-FILOSOFIA.md` § Princípio 7 |

## Critério de promoção pra Forge

Feature entra na Forge **só** se aparece em ≥3 projetos diferentes. Detalhe em `docs/00-FILOSOFIA.md` § "Como saber se uma feature deve entrar na Forge".

## Operação

- Antes de entregar: rodar `pnpm lint`, `pnpm typecheck`, `pnpm test` (`CLAUDE.md` § Antes de entregar).
- Conventional Commits obrigatórios (`feat:`, `fix:`, `chore:`, `docs:`).
- TypeScript strict — `any` proibido sem comentário justificando.
- Diff revisado por humano antes de commit.
