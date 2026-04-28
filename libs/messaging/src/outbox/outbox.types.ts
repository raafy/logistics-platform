export interface OutboxRecord {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  routingKey: string;
  payload: unknown;
  headers: Record<string, string | number> | null;
  attempts: number;
  createdAt: Date;
  publishedAt: Date | null;
  deadAt: Date | null;
  lastError: string | null;
}

export interface OutboxStore {
  claimBatch(limit: number): Promise<OutboxRecord[]>;
  markPublished(id: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  markDead(id: string, error: string): Promise<void>;
  hasPending(): Promise<boolean>;
}
