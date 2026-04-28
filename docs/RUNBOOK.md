# Runbook

## Local Development

### First-time setup

```bash
pnpm install
cp .env.example .env
pnpm infra:up
pnpm prisma:generate
```

### Run services (all three in parallel)

```bash
pnpm dev
```

**Endpoints:**

- http://localhost:3001/docs (Order-Service Swagger)
- http://localhost:3002/docs (Tracking-Service Swagger)
- http://localhost:3003/health (Notification-Service — consumer only)
- http://localhost:15672 (RabbitMQ Management UI, guest/guest)

### Happy-path test

```bash
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "a3f1c2b4-5e6d-4c7b-9a8f-1d2e3c4b5a6f",
    "currency": "USD",
    "shippingAddress": {
      "line1": "1 Market St",
      "city": "San Francisco",
      "region": "CA",
      "postalCode": "94103",
      "country": "US"
    },
    "items": [
      { "sku": "SKU-001", "name": "Widget", "quantity": 2, "unitPriceCents": 1999 }
    ]
  }'
```

Within ~500ms:
1. `order.created` event appears in RabbitMQ
2. Tracking-Service creates a Shipment (`PENDING`)
3. Notification-Service logs a console notification

Verify via:
```bash
curl http://localhost:3001/orders/<order-id>
curl http://localhost:3002/orders/<order-id>/shipment
curl http://localhost:3001/orders/<order-id>/shipment  # circuit-breaker endpoint
```

## Operations

### DLQ Management

```bash
pnpm dlq:redrive list
pnpm dlq:redrive peek -q tracking.order.created.dlq -n 5
pnpm dlq:redrive redrive -q tracking.order.created.dlq -n 10
```

### Outbox Monitoring

```sql
SELECT
  COUNT(*) FILTER (WHERE publishedAt IS NULL AND deadAt IS NULL) AS pending,
  COUNT(*) FILTER (WHERE deadAt IS NOT NULL) AS dead,
  COUNT(*) FILTER (WHERE attempts > 0 AND publishedAt IS NULL) AS retrying
FROM outbox;
```

### Common Issues

| Symptom                               | Likely Cause                              | Fix                                                |
| ------------------------------------- | ----------------------------------------- | -------------------------------------------------- |
| Outbox rows stuck `publishedAt=NULL`  | RabbitMQ down / consumer crashed          | Check `docker compose logs rabbitmq`               |
| Consumer acks duplicates              | Expected — idempotency working            | Check `processed_messages` row exists              |
| Circuit breaker stuck open            | Tracking-Service down / slow              | Check Tracking `/ready`; wait 10s for half-open    |
| DLQ depth growing                     | Handler throwing on every retry           | Peek DLQ message, fix handler, re-drive            |

## Testing

```bash
pnpm test                      # Unit + integration
pnpm test:e2e                  # Full stack E2E (requires Docker)
pnpm --filter order-service test --watch  # Per-service watch
```

## Production Considerations (NOT implemented in v1)

- Replace `order_db`/`tracking_db`/`notification_db` logical split with 3 physical Postgres instances
- Enable OpenTelemetry with real collector (Tempo + Grafana)
- Add Prometheus scrape config for `/metrics` endpoints
- Add `NOTIFICATION_PROVIDER=sendgrid` env to switch away from console adapter
- Add K8s HPA based on outbox lag metric
- Enable RabbitMQ quorum queues for cluster HA
