export interface OrderItemProps {
  sku: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
}

export class OrderItem {
  private constructor(private readonly props: OrderItemProps) {}

  static create(props: OrderItemProps): OrderItem {
    if (!props.sku.trim()) {
      throw new Error("Order item SKU is required");
    }
    if (!props.name.trim()) {
      throw new Error("Order item name is required");
    }
    if (!Number.isInteger(props.quantity) || props.quantity <= 0) {
      throw new Error("Order item quantity must be a positive integer");
    }
    if (!Number.isInteger(props.unitPriceCents) || props.unitPriceCents < 0) {
      throw new Error("Order item unit price must be a non-negative integer");
    }

    return new OrderItem({
      sku: props.sku.trim(),
      name: props.name.trim(),
      quantity: props.quantity,
      unitPriceCents: props.unitPriceCents,
    });
  }

  get sku(): string {
    return this.props.sku;
  }

  get name(): string {
    return this.props.name;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  get unitPriceCents(): number {
    return this.props.unitPriceCents;
  }

  get totalCents(): number {
    return this.props.quantity * this.props.unitPriceCents;
  }

  toPrimitives(): OrderItemProps {
    return { ...this.props };
  }
}
