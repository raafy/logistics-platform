export interface ShipmentLocation {
  lat: number;
  lng: number;
  label: string | null;
}

export interface TrackingEventRecord {
  id: string;
  shipmentId: string;
  status: string;
  occurredAt: Date;
  location: ShipmentLocation | null;
}

export interface ShipmentRecord {
  id: string;
  orderId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  events: TrackingEventRecord[];
}

export interface CreatePendingShipmentInput {
  orderId: string;
  occurredAt: Date;
}

export interface UpdateShipmentStatusInput {
  shipmentId: string;
  status: string;
  occurredAt?: Date;
  location?: ShipmentLocation | null;
}
