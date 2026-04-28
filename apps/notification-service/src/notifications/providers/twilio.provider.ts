import { Injectable } from "@nestjs/common";
import {
  NotificationChannel,
  type NotificationDeliveryRecord,
  type NotificationProvider,
} from "../notification.types.js";

@Injectable()
export class TwilioProvider implements NotificationProvider {
  readonly name = "twilio";
  readonly supports = [NotificationChannel.Sms];

  async send(_delivery: NotificationDeliveryRecord): Promise<void> {
    // TODO: integrate Twilio transport for SMS delivery.
  }
}
