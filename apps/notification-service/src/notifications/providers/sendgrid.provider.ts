import { Injectable } from "@nestjs/common";
import {
  NotificationChannel,
  type NotificationDeliveryRecord,
  type NotificationProvider,
} from "../notification.types.js";

@Injectable()
export class SendGridProvider implements NotificationProvider {
  readonly name = "sendgrid";
  readonly supports = [NotificationChannel.Email];

  async send(_delivery: NotificationDeliveryRecord): Promise<void> {
    // TODO: integrate SendGrid transport for email delivery.
  }
}
