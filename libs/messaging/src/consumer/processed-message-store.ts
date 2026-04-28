export interface ProcessedMessageStore {
  markProcessed(
    consumerName: string,
    eventId: string,
    eventType: string,
    handler: () => Promise<void>,
  ): Promise<ProcessResult>;
}

export type ProcessResult =
  | { status: "processed" }
  | { status: "duplicate" }
  | { status: "failed"; error: Error };
