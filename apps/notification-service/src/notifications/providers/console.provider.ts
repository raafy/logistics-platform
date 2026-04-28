import { Injectable, Logger } from "@nestjs/common";
import {
  NotificationChannel,
  type NotificationDeliveryRecord,
  type NotificationProvider,
} from "../notification.types.js";

@Injectable()
export class ConsoleProvider implements NotificationProvider {
  readonly name = "console";
  readonly supports = [NotificationChannel.Email, NotificationChannel.Sms];

  private readonly logger = new Logger(ConsoleProvider.name);

  async send(delivery: NotificationDeliveryRecord): Promise<void> {
    this.logger.log(
      `Console notification sent id=${delivery.id} channel=${delivery.channel} recipient=${delivery.recipient}`,
    );
  }
}
