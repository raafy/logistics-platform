import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationDispatchService } from "../src/notifications/notification-dispatch.service.js";
import { NotificationChannel, NotificationStatus } from "../src/notifications/notification.types.js";

describe("NotificationDispatchService", () => {
  const delivery = {
    id: "delivery-1",
    eventId: "event-1",
    eventType: "order.created",
    channel: NotificationChannel.Email,
    recipient: "customer:123",
    content: "hello",
    status: NotificationStatus.Pending,
    provider: "console",
    sentAt: null,
    createdAt: new Date(),
  };

  const deliveryRepository = {
    create: vi.fn(),
    updateStatus: vi.fn(),
  };

  const provider = {
    name: "console",
    supports: [NotificationChannel.Email, NotificationChannel.Sms],
    send: vi.fn(),
  };

  const providerResolver = {
    resolve: vi.fn(),
  };

  let service: NotificationDispatchService;

  beforeEach(() => {
    vi.clearAllMocks();
    deliveryRepository.create.mockResolvedValue(delivery);
    deliveryRepository.updateStatus.mockImplementation(
      async (_id: string, status: string, sentAt?: Date) => ({
        ...delivery,
        status,
        sentAt: sentAt ?? null,
      }),
    );
    providerResolver.resolve.mockReturnValue(provider);
    provider.send.mockResolvedValue(undefined);

    service = new NotificationDispatchService(
      deliveryRepository,
      providerResolver,
    );
  });

  it("creates a delivery and marks it sent when provider succeeds", async () => {
    const result = await service.dispatch({
      eventId: delivery.eventId,
      eventType: delivery.eventType,
      channel: NotificationChannel.Email,
      recipient: delivery.recipient,
      content: delivery.content,
    });

    expect(providerResolver.resolve).toHaveBeenCalledWith(NotificationChannel.Email);
    expect(deliveryRepository.create).toHaveBeenCalledWith({
      eventId: delivery.eventId,
      eventType: delivery.eventType,
      channel: NotificationChannel.Email,
      recipient: delivery.recipient,
      content: delivery.content,
      status: NotificationStatus.Pending,
      provider: provider.name,
    });
    expect(provider.send).toHaveBeenCalledWith(delivery);
    expect(deliveryRepository.updateStatus).toHaveBeenCalledWith(
      delivery.id,
      NotificationStatus.Sent,
      expect.any(Date),
    );
    expect(result.status).toBe(NotificationStatus.Sent);
  });

  it("marks a delivery failed when provider throws", async () => {
    provider.send.mockRejectedValueOnce(new Error("boom"));

    await expect(
      service.dispatch({
        eventId: delivery.eventId,
        eventType: delivery.eventType,
        channel: NotificationChannel.Email,
        recipient: delivery.recipient,
        content: delivery.content,
      }),
    ).rejects.toThrow("boom");

    expect(deliveryRepository.updateStatus).toHaveBeenCalledWith(
      delivery.id,
      NotificationStatus.Failed,
    );
  });
});
