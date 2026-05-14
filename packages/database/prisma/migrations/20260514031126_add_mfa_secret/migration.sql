-- D8.7.9: Adiciona MfaSecret pra substituir User.totpSecret (deprecated V1.1).
-- NOTA: Prisma sugeriu DROP INDEX "DocumentChunk_embedding_hnsw_idx" — REMOVIDO
-- manualmente pra preservar HNSW (vector_ip_ops, D#14.14). Prisma não consegue
-- representar índices custom; cada migration nova sugere o drop. Sempre revisar.

-- CreateTable
CREATE TABLE "MfaSecret" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "secretEnc" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MfaSecret_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MfaSecret_userId_idx" ON "MfaSecret"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MfaSecret_userId_tenantId_key" ON "MfaSecret"("userId", "tenantId");

-- AddForeignKey
ALTER TABLE "MfaSecret" ADD CONSTRAINT "MfaSecret_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
