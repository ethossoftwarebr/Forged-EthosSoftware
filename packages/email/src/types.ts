/**
 * @ethos/email — types
 *
 * Tipos compartilhados entre adapters. Sem dependências de runtime
 * (consumers que só usam `EmailAdapter` como type pagam zero import-time).
 */

export interface TransactionalEmailTag {
  name: string;
  value: string;
}

/**
 * Payload de envio transacional — superset compatível com Resend, Postmark,
 * SendGrid e SMTP genérico. Adapters mapeiam pros campos do provider.
 */
export interface TransactionalEmailParams {
  /** Destinatário único. Adapters multi-destinatário não são suportados na v1. */
  to: string;
  /** Remetente — convencionalmente lido de `EMAIL_FROM`. Deve estar em domain verificado. */
  from: string;
  subject: string;
  /** HTML body — sempre obrigatório (texto puro pode ser derivado, mas é melhor explícito). */
  html: string;
  /** Plain-text fallback opcional pra clientes que não renderizam HTML. */
  text?: string;
  /** Reply-To opcional — útil pra magic links ("não-responda" vs caixa real). */
  replyTo?: string;
  /** Tags livres pra observabilidade no painel do provider (Resend: `tags`, etc.). */
  tags?: TransactionalEmailTag[];
}

/**
 * Contrato plugável de envio de email transacional.
 *
 * Implementações:
 *  - `ResendAdapter` (default, este package)
 *  - `SmtpAdapter` (pós-v1, package separado)
 *  - `PostmarkAdapter` (pós-v1, package separado)
 *
 * **Idempotência:** este contrato NÃO garante dedupe. Dois `sendTransactional`
 * idênticos disparam dois emails. Caller é responsável por dedupe se precisar
 * (ex.: gravar `MagicLinkToken.id` antes de enviar e ignorar duplicados).
 *
 * **Erros:** implementações DEVEM lançar `Error` em falha do provider. Caller
 * decide retry/log. Erros transitórios (rate limit, 5xx) não são retentados
 * automaticamente — fica a critério do caller usar BullMQ ou similar.
 */
export interface EmailAdapter {
  sendTransactional(params: TransactionalEmailParams): Promise<void>;
}
