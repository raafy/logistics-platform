export const EventTypes = {
  OrderCreated: "order.created",
  OrderCancelled: "order.cancelled",
  ShipmentStatusChanged: "shipment.status_changed",
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];
