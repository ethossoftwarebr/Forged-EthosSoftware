import { type OnModuleDestroy } from '@nestjs/common';
import { Queue, type Job } from 'bullmq';

import type { QueueAdapter, QueueJob } from '../../shared/adapters';
import {
  DEFAULT_INGEST_RETRY_ATTEMPTS,
  DEFAULT_INGEST_RETRY_BACKOFF_MS,
} from '../../shared/constants';
import { JobStatus } from '../../shared/types';

/**
 * BullMQQueueAdapter — implementação default (D#14.4).
 *
 * Cria Queue por nome (cache em Map) usando `ioredis` via `connection`. Retry
 * policy padrão: 3 attempts + exponential backoff 2s. NestJS chama
 * `onModuleDestroy` no shutdown → fecha todas queues.
 *
 * O shape `enqueue(name, payload)` retorna o `job.id` (BullMQ gera CUID-like).
 * `getStatus(jobId)` busca em todas queues do Map; em produção, considere
 * indexar `jobId → queueName` se houver muitas queues.
 */
export class BullMQQueueAdapter implements QueueAdapter, OnModuleDestroy {
  readonly name = 'bullmq';
  private readonly queues = new Map<string, Queue>();
  private readonly connection: { url: string };

  constructor(redisUrl: string) {
    if (!redisUrl) {
      throw new Error('BullMQQueueAdapter: redisUrl is required');
    }
    // BullMQ aceita string URL via `connection` direto em v5+; alternativamente
    // poderíamos instanciar `new IORedis(redisUrl)` e passar a instância.
    this.connection = { url: redisUrl };
  }

  private getOrCreateQueue(queueName: string): Queue {
    let q = this.queues.get(queueName);
    if (!q) {
      q = new Queue(queueName, {
        connection: { url: this.connection.url } as unknown as Queue['opts']['connection'],
        defaultJobOptions: {
          attempts: DEFAULT_INGEST_RETRY_ATTEMPTS,
          backoff: { type: 'exponential', delay: DEFAULT_INGEST_RETRY_BACKOFF_MS },
          removeOnComplete: 500,
          removeOnFail: false,
        },
      });
      this.queues.set(queueName, q);
    }
    return q;
  }

  async enqueue<TPayload>(queueName: string, payload: TPayload): Promise<string> {
    const queue = this.getOrCreateQueue(queueName);
    const job = await queue.add(queueName, payload as unknown as object);
    if (!job.id) {
      throw new Error(`BullMQQueueAdapter: job.id missing after add on queue ${queueName}`);
    }
    return job.id;
  }

  async getStatus(jobId: string): Promise<QueueJob | null> {
    for (const queue of this.queues.values()) {
      const job = (await queue.getJob(jobId)) as Job<unknown> | undefined;
      if (job) {
        const state = await job.getState();
        return {
          id: jobId,
          status: this.mapState(state),
          payload: job.data,
          ...(job.failedReason ? { error: job.failedReason } : {}),
          retries: job.attemptsMade ?? 0,
        };
      }
    }
    return null;
  }

  private mapState(state: string): JobStatus {
    switch (state) {
      case 'completed':
        return JobStatus.COMPLETED;
      case 'failed':
        return JobStatus.FAILED;
      case 'active':
        return JobStatus.ACTIVE;
      case 'waiting':
      case 'waiting-children':
      case 'delayed':
      case 'paused':
      default:
        return JobStatus.WAITING;
    }
  }

  /** Cleanup — NestJS lifecycle hook. */
  async onModuleDestroy(): Promise<void> {
    await Promise.all([...this.queues.values()].map((q) => q.close()));
    this.queues.clear();
  }
}
