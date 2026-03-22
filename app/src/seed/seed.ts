import 'dotenv/config';
import dataSource from '../../data-source';
import { Order } from '../app-service/orders/entities/order.entity';
import { OrderItem } from '../app-service/orders/entities/order-item.entity';

type SeedOrderItem = {
  id: string;
  productTitle: string;
  quantity: number;
};

type SeedOrder = {
  id: string;
  items: SeedOrderItem[];
};

const ordersSeed: SeedOrder[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    items: [
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        productTitle: 'Coffee Mug',
        quantity: 2,
      },
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
        productTitle: 'Mechanical Keyboard',
        quantity: 1,
      },
    ],
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    items: [
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
        productTitle: 'Notebook',
        quantity: 3,
      },
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
        productTitle: 'Wireless Mouse',
        quantity: 1,
      },
    ],
  },
];

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seeding is disabled in production');
  }

  await dataSource.initialize();

  try {
    const ordersRepository = dataSource.getRepository(Order);
    const orderItemsRepository = dataSource.getRepository(OrderItem);

    const ordersToUpsert: Array<Partial<Order>> = [];
    const orderItemsToUpsert: Array<Partial<OrderItem>> = [];

    for (const orderSeed of ordersSeed) {
      ordersToUpsert.push({
        id: orderSeed.id,
      });

      for (const item of orderSeed.items) {
        orderItemsToUpsert.push({
          id: item.id,
          orderId: orderSeed.id,
          quantity: item.quantity,
          priceAtPurchase: '100.00',
        });
      }
    }

    if (ordersToUpsert.length > 0) {
      await ordersRepository.upsert(ordersToUpsert, ['id']);
    }

    if (orderItemsToUpsert.length > 0) {
      await orderItemsRepository.upsert(orderItemsToUpsert, ['id']);
    }
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
