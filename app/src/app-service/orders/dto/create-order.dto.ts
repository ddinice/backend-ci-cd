export class CreateOrderDto {
  items: CreateOrderItemDto[];
}

type CreateOrderItemDto = {
  quantity: number;
  priceAtPurchase: number;
};
