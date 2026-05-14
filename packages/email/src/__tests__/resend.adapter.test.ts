/**
 * resend.adapter.test.ts
 *
 * Cobre o `ResendAdapter`:
 *  1. Constructor guard — apiKey vazia/whitespace lança
 *  2. Happy path — chama `Resend(apiKey).emails.send(...)` com payload correto
 *  3. Error path — `{ error: {...} }` do SDK vira `Error` descritivo
 *  4. Bonus: `{ data: null, error: null }` (shape inválido) também lança
 *
 * Estratégia de mock: `jest.mock('resend', ...)` com factory que expõe um
 * `sendMock` reabilitável via `beforeEach`. Lazy import dentro do adapter
 * funciona normalmente — o jest intercepta antes do resolve.
 */

const sendMock = jest.fn();
const ResendCtorMock = jest.fn();

jest.mock('resend', () => ({
  Resend: ResendCtorMock,
}));

// Import depois do mock — garante que o adapter resolva `resend` mockado
// quando fizer `await import('resend')`.
import { ResendAdapter } from '../resend.adapter';
import type { TransactionalEmailParams } from '../types';

describe('ResendAdapter', () => {
  beforeEach(() => {
    sendMock.mockReset();
    ResendCtorMock.mockReset();
    ResendCtorMock.mockImplementation(() => ({
      emails: { send: sendMock },
    }));
  });

  describe('constructor', () => {
    it('lança quando apiKey é string vazia', () => {
      expect(() => new ResendAdapter('')).toThrow(/apiKey required/i);
    });

    it('lança quando apiKey é só whitespace', () => {
      expect(() => new ResendAdapter('   ')).toThrow(/apiKey required/i);
    });

    it('aceita apiKey não-vazia', () => {
      expect(() => new ResendAdapter('re_test_123')).not.toThrow();
    });
  });

  describe('sendTransactional — happy path', () => {
    it('chama Resend.emails.send com payload completo + resolve sem throw', async () => {
      sendMock.mockResolvedValueOnce({ data: { id: 'email_abc' }, error: null });

      const adapter = new ResendAdapter('re_test_123');
      const params: TransactionalEmailParams = {
        to: 'user@example.com',
        from: 'noreply@app.example.com',
        subject: 'Seu link de acesso',
        html: '<p>Clique aqui</p>',
        text: 'Clique aqui',
        replyTo: 'support@app.example.com',
        tags: [{ name: 'category', value: 'magic-link' }],
      };

      await expect(adapter.sendTransactional(params)).resolves.toBeUndefined();

      // Constructor recebe apiKey
      expect(ResendCtorMock).toHaveBeenCalledTimes(1);
      expect(ResendCtorMock).toHaveBeenCalledWith('re_test_123');

      // Payload é forwarded 1:1
      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(sendMock).toHaveBeenCalledWith({
        to: 'user@example.com',
        from: 'noreply@app.example.com',
        subject: 'Seu link de acesso',
        html: '<p>Clique aqui</p>',
        text: 'Clique aqui',
        replyTo: 'support@app.example.com',
        tags: [{ name: 'category', value: 'magic-link' }],
      });
    });

    it('campos opcionais ausentes viram undefined no payload (sem default mágico)', async () => {
      sendMock.mockResolvedValueOnce({ data: { id: 'email_xyz' }, error: null });

      const adapter = new ResendAdapter('re_test_123');
      await adapter.sendTransactional({
        to: 'a@b.com',
        from: 'noreply@c.com',
        subject: 's',
        html: '<p>x</p>',
      });

      const call = sendMock.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(call.text).toBeUndefined();
      expect(call.replyTo).toBeUndefined();
      expect(call.tags).toBeUndefined();
    });
  });

  describe('sendTransactional — error path', () => {
    it('lança Error descritivo quando SDK retorna { error: {...} }', async () => {
      sendMock.mockResolvedValueOnce({
        data: null,
        error: { name: 'invalid_api_key', message: 'API key is invalid' },
      });

      const adapter = new ResendAdapter('re_test_123');

      await expect(
        adapter.sendTransactional({
          to: 'user@example.com',
          from: 'noreply@app.com',
          subject: 's',
          html: '<p>x</p>',
        }),
      ).rejects.toThrow(/Resend send failed: invalid_api_key: API key is invalid/);
    });

    it('lança quando SDK retorna data null E error null (shape inválido)', async () => {
      sendMock.mockResolvedValueOnce({ data: null, error: null });

      const adapter = new ResendAdapter('re_test_123');

      await expect(
        adapter.sendTransactional({
          to: 'user@example.com',
          from: 'noreply@app.com',
          subject: 's',
          html: '<p>x</p>',
        }),
      ).rejects.toThrow(/no data returned/i);
    });

    it('propaga rejection do SDK (ex.: erro de rede)', async () => {
      sendMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const adapter = new ResendAdapter('re_test_123');

      await expect(
        adapter.sendTransactional({
          to: 'user@example.com',
          from: 'noreply@app.com',
          subject: 's',
          html: '<p>x</p>',
        }),
      ).rejects.toThrow(/ECONNREFUSED/);
    });
  });
});
