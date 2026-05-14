import type { EmailAdapter, TransactionalEmailParams } from './types';

/**
 * Adapter default — usa `resend` npm pkg via lazy dynamic import.
 *
 * Por que lazy? Consumers que só importam `EmailAdapter` (interface) não pagam
 * o cold start do SDK do Resend. O `import('resend')` só acontece quando
 * `sendTransactional` é chamado pela primeira vez.
 *
 * Setup:
 *  1. `pnpm add resend` no app consumer (ou já está como peer dep)
 *  2. `new ResendAdapter(process.env.RESEND_API_KEY)`
 *  3. Domain do `from` precisa estar verificado no painel do Resend
 *
 * Free tier: 100 emails/dia + 3.000/mês. Acima → upgrade ou switch adapter.
 *
 * @see https://resend.com/docs/api-reference/emails/send-email
 */
export class ResendAdapter implements EmailAdapter {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('ResendAdapter: apiKey required');
    }
    this.apiKey = apiKey;
  }

  async sendTransactional(params: TransactionalEmailParams): Promise<void> {
    // Lazy import — preserva cold start de quem só usa o type/interface
    const { Resend } = await import('resend');
    const client = new Resend(this.apiKey);

    const { data, error } = await client.emails.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
      tags: params.tags,
    });

    if (error) {
      // Resend retorna `{ name, message }` em erro. Encapsulamos em Error
      // pra caller não precisar conhecer o shape do SDK.
      throw new Error(`Resend send failed: ${error.name}: ${error.message}`);
    }

    // `data` pode ser `null` em raros casos (SDK retorna ambos opcionais).
    // Sem `error` E sem `data` é estado inválido — falha rápida.
    if (!data) {
      throw new Error('Resend send failed: no data returned and no error');
    }
  }
}
