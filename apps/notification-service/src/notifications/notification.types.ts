export const NotificationChannel = {
  Email: "EMAIL",
  Sms: "SMS",
} as const;

export type NotificationChannelValue =
  (typeof NotificationChannel)[keyof typeof NotificationChannel];

export const NotificationStatus = {
  Pending: "PENDING",
  Sent: "SENT",
  Failed: "FAILED",
} as const;

export type NotificationStatusValue =
  (typeof NotificationStatus)[keyof typeof NotificationStatus];

export interface NotificationDeliveryRecord {
  id: string;
  eventId: string;
  eventType: string;
  channel: string;
  recipient: string;
  content: string;
  status: string;
  provider: string;
  sentAt: Date | null;
  createdAt: Date;
}

export interface NotificationProvider {
  readonly name: string;
  readonly supports: NotificationChannelValue[];
  send(delivery: NotificationDeliveryRecord): Promise<void>;
}

export interface NotificationProviderResolverPort {
  resolve(channel: NotificationChannelValue): NotificationProvider;
}
