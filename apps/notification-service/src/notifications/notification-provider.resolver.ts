import { Injectable } from "@nestjs/common";
import type {
  NotificationChannelValue,
  NotificationProvider,
  NotificationProviderResolverPort,
} from "./notification.types.js";
import { NotificationChannel } from "./notification.types.js";
import { ConsoleProvider } from "./providers/console.provider.js";
import { SendGridProvider } from "./providers/sendgrid.provider.js";
import { TwilioProvider } from "./providers/twilio.provider.js";

@Injectable()
export class NotificationProviderResolver
  implements NotificationProviderResolverPort
{
  constructor(
    private readonly consoleProvider: ConsoleProvider,
    private readonly sendGridProvider: SendGridProvider,
    private readonly twilioProvider: TwilioProvider,
  ) {}

  resolve(channel: NotificationChannelValue): NotificationProvider {
    const forcedProvider = process.env.NOTIFICATION_PROVIDER;
    if (forcedProvider === this.consoleProvider.name) {
      return this.consoleProvider;
    }
    if (forcedProvider === this.sendGridProvider.name) {
      return this.sendGridProvider;
    }
    if (forcedProvider === this.twilioProvider.name) {
      return this.twilioProvider;
    }

    if (process.env.NODE_ENV !== "production") {
      return this.consoleProvider;
    }

    return channel === NotificationChannel.Email
      ? this.sendGridProvider
      : this.twilioProvider;
  }
}
