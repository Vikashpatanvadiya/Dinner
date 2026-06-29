import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, queueEntriesTable, ordersTable, menuItemsTable } from "@workspace/db";
import {
  CreateOrderBody,
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
  ListRestaurantOrdersParams,
} from "@workspace/api-zod";
import { getAuthRestaurantId } from "./auth";

const router: IRouter = Router();

function formatOrder(
  order: typeof ordersTable.$inferSelect,
  customerName?: string,
  queueNumber?: number
) {
  return {
    id: order.id,
    queueEntryId: order.queueEntryId,
    restaurantId: order.restaurantId,
    customerName: customerName ?? "",
    queueNumber: queueNumber ?? 0,
    items: order.items as Array<{ menuItemId: number; name: string; qty: number; price: number }>,
    status: order.status,
    totalAmount: parseFloat(order.totalAmount as string),
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt.toISOString(),
  };
}

router.post("/orders", async (req, res): Promise<void> => {
  const body = CreateOrderBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [entry] = await db
    .select()
    .from(queueEntriesTable)
    .where(eq(queueEntriesTable.sessionToken, body.data.sessionToken));

  if (!entry) {
    res.status(400).json({ error: "Queue entry not found" });
    return;
  }

  if (entry.status !== "waiting" && entry.status !== "called") {
    res.status(400).json({ error: "Cannot place order — not in active queue" });
    return;
  }

  // Fetch menu items for the restaurant to get names and prices
  const menuItems = await db
    .select()
    .from(menuItemsTable)
    .where(eq(menuItemsTable.restaurantId, entry.restaurantId));

  const menuMap = new Map(menuItems.map((m) => [m.id, m]));

  let total = 0;
  const orderItems: Array<{ menuItemId: number; name: string; qty: number; price: number }> = [];

  for (const item of body.data.items) {
    const menuItem = menuMap.get(item.menuItemId);
    if (!menuItem) {
      res.status(400).json({ error: `Menu item ${item.menuItemId} not found` });
      return;
    }
    const price = parseFloat(menuItem.price as string);
    total += price * item.qty;
    orderItems.push({
      menuItemId: item.menuItemId,
      name: menuItem.name,
      qty: item.qty,
      price,
    });
  }

  const [order] = await db
    .insert(ordersTable)
    .values({
      queueEntryId: entry.id,
      restaurantId: entry.restaurantId,
      items: orderItems,
      totalAmount: String(Math.round(total * 100) / 100),
      status: "placed",
      paymentStatus: "pending",
    })
    .returning();

  // Link order to queue entry
  await db
    .update(queueEntriesTable)
    .set({ orderId: order.id })
    .where(eq(queueEntriesTable.id, entry.id));

  res.status(201).json(formatOrder(order, entry.customerName, entry.queueNumber));
});

router.get("/orders/:orderId", async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, params.data.orderId));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const [entry] = await db
    .select({ customerName: queueEntriesTable.customerName, queueNumber: queueEntriesTable.queueNumber })
    .from(queueEntriesTable)
    .where(eq(queueEntriesTable.id, order.queueEntryId));

  res.json(formatOrder(order, entry?.customerName, entry?.queueNumber));
});

router.patch("/orders/:orderId/status", async (req, res): Promise<void> => {
  const restaurantId = getAuthRestaurantId(req as any);
  if (!restaurantId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateOrderStatusBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updates: Partial<typeof ordersTable.$inferInsert> = { status: body.data.status };
  if (body.data.paymentStatus !== undefined) updates.paymentStatus = body.data.paymentStatus;

  const [order] = await db
    .update(ordersTable)
    .set(updates)
    .where(
      and(
        eq(ordersTable.id, params.data.orderId),
        eq(ordersTable.restaurantId, restaurantId)
      )
    )
    .returning();

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const [entry] = await db
    .select({ customerName: queueEntriesTable.customerName, queueNumber: queueEntriesTable.queueNumber })
    .from(queueEntriesTable)
    .where(eq(queueEntriesTable.id, order.queueEntryId));

  res.json(formatOrder(order, entry?.customerName, entry?.queueNumber));
});

router.get("/restaurants/:restaurantId/orders", async (req, res): Promise<void> => {
  const restaurantId = getAuthRestaurantId(req as any);
  if (!restaurantId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = ListRestaurantOrdersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (params.data.restaurantId !== restaurantId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.restaurantId, params.data.restaurantId));

  const result = await Promise.all(
    orders.map(async (o) => {
      const [entry] = await db
        .select({ customerName: queueEntriesTable.customerName, queueNumber: queueEntriesTable.queueNumber })
        .from(queueEntriesTable)
        .where(eq(queueEntriesTable.id, o.queueEntryId));
      return formatOrder(o, entry?.customerName, entry?.queueNumber);
    })
  );

  res.json(result);
});

export default router;
