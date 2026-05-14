import {
  BACKUP_CODE_ALPHABET,
  BACKUP_CODE_COUNT,
  BACKUP_CODE_LENGTH,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
} from '../backup-codes';

// Tests usam params argon2 reduzidos pra não estourar 30s no jest (D8.7 risk).
// Aplicado via env antes do hash module carregar — backup-codes importa de '../hash'.
beforeAll(() => {
  process.env.ARGON_MEMORY_COST = '4096';
  process.env.ARGON_TIME_COST = '1';
  process.env.ARGON_PARALLELISM = '1';
});

describe('backup-codes (D8.7.2/D8.7.3)', () => {
  describe('generateBackupCodes', () => {
    it('retorna 10 codes por default (BACKUP_CODE_COUNT)', () => {
      const codes = generateBackupCodes();
      expect(codes).toHaveLength(BACKUP_CODE_COUNT);
      expect(codes).toHaveLength(10);
    });

    it('retorna N codes únicos quando count é especificado', () => {
      const codes = generateBackupCodes(5);
      expect(codes).toHaveLength(5);
      expect(new Set(codes).size).toBe(5);
    });

    it('todos os codes têm exatamente 8 chars (BACKUP_CODE_LENGTH)', () => {
      const codes = generateBackupCodes(20);
      for (const code of codes) {
        expect(code).toHaveLength(BACKUP_CODE_LENGTH);
        expect(code).toHaveLength(8);
      }
    });

    it('todos os codes usam apenas alfabeto Crockford base32 (sem 0/1/I/L/O/U)', () => {
      const codes = generateBackupCodes(20);
      const allowedPattern = new RegExp(`^[${BACKUP_CODE_ALPHABET}]+$`);
      for (const code of codes) {
        expect(code).toMatch(allowedPattern);
        // Defesa em profundidade: garantir que chars ambíguos não aparecem
        expect(code).not.toMatch(/[01ILOU]/);
      }
    });

    it('codes são únicos entre si (Set size == count)', () => {
      const codes = generateBackupCodes(10);
      expect(new Set(codes).size).toBe(10);
    });

    it('chamadas consecutivas retornam codes distintos (CSPRNG)', () => {
      const first = generateBackupCodes(10);
      const second = generateBackupCodes(10);
      // intersecção esperada ~0 (espaço de 30^8 ≈ 6.5e11)
      const intersect = first.filter((c) => second.includes(c));
      expect(intersect).toHaveLength(0);
    });

    it('alphabet tem 30 chars (sem 0/1/I/L/O/U)', () => {
      expect(BACKUP_CODE_ALPHABET).toHaveLength(30);
      expect(BACKUP_CODE_ALPHABET).not.toMatch(/[01ILOU]/);
    });
  });

  describe('hashBackupCode / verifyBackupCode', () => {
    it('hashBackupCode retorna string argon2id válida (começa com $argon2id$)', async () => {
      const hash = await hashBackupCode('ABCDEFGH');
      expect(hash).toMatch(/^\$argon2id\$/);
    });

    it('verifyBackupCode retorna true pra hash correspondente', async () => {
      const code = 'XYZABC23';
      const hash = await hashBackupCode(code);
      expect(await verifyBackupCode(code, hash)).toBe(true);
    });

    it('verifyBackupCode retorna false pra code errado', async () => {
      const hash = await hashBackupCode('CORRECT1');
      expect(await verifyBackupCode('WRONG456', hash)).toBe(false);
    });

    it('hashes diferentes pra mesmo code (salt random embedded)', async () => {
      const code = 'SAMECODE';
      const h1 = await hashBackupCode(code);
      const h2 = await hashBackupCode(code);
      expect(h1).not.toBe(h2);
      // Mas ambos verify true
      expect(await verifyBackupCode(code, h1)).toBe(true);
      expect(await verifyBackupCode(code, h2)).toBe(true);
    });

    it('case-sensitive: code em lowercase não bate hash de uppercase', async () => {
      const hash = await hashBackupCode('ABCD2345');
      expect(await verifyBackupCode('abcd2345', hash)).toBe(false);
    });
  });
});
