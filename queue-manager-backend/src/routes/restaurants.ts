import { Router, type IRouter } from "express";
import { eq, and, inArray, sql } from "drizzle-orm";
import { db, restaurantsTable, queueEntriesTable, ordersTable } from "@workspace/db";
import {
  GetRestaurantParams,
  UpdateRestaurantSettingsParams,
  UpdateRestaurantSettingsBody,
  GetRestaurantStatsParams,
} from "@workspace/api-zod";
import { getAuthRestaurantId } from "./auth";

const router: IRouter = Router();

function calcEstimatedWait(queueLength: number, avgWaitPerTableMins: number): number {
  return queueLength * avgWaitPerTableMins;
}

async function getRestaurantPublic(restaurant: typeof restaurantsTable.$inferSelect) {
  const activeEntries = await db
    .select({ id: queueEntriesTable.id })
    .from(queueEntriesTable)
    .where(
      and(
        eq(queueEntriesTable.restaurantId, restaurant.id),
        inArray(queueEntriesTable.status, ["waiting", "called"])
      )
    );

  const queueLength = activeEntries.length;
  const estimatedWaitMins = calcEstimatedWait(queueLength, restaurant.avgWaitPerTableMins);

  return {
    id: restaurant.id,
    name: restaurant.name,
    address: restaurant.address,
    cuisineType: restaurant.cuisineType,
    photo: restaurant.photo ?? null,
    avgWaitPerTableMins: restaurant.avgWaitPerTableMins,
    queueOpen: restaurant.queueOpen,
    preOrderThreshold: restaurant.preOrderThreshold,
    queueLength,
    estimatedWaitMins,
  };
}

router.get("/restaurants", async (req, res): Promise<void> => {
  const cuisineType = req.query.cuisine_type as string | undefined;

  let query = db.select().from(restaurantsTable);
  if (cuisineType) {
    const rows = await db
      .select()
      .from(restaurantsTable)
      .where(eq(restaurantsTable.cuisineType, cuisineType));
    const results = await Promise.all(rows.map(getRestaurantPublic));
    res.json(results);
    return;
  }

  const rows = await query;
  const results = await Promise.all(rows.map(getRestaurantPublic));
  res.json(results);
});

router.get("/restaurants/:restaurantId", async (req, res): Promise<void> => {
  const params = GetRestaurantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [restaurant] = await db
    .select()
    .from(restaurantsTable)
    .where(eq(restaurantsTable.id, params.data.restaurantId));

  if (!restaurant) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }

  res.json(await getRestaurantPublic(restaurant));
});

router.patch("/restaurants/:restaurantId/settings", async (req, res): Promise<void> => {
  const restaurantId = getAuthRestaurantId(req as any);
  if (!restaurantId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = UpdateRestaurantSettingsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (params.data.restaurantId !== restaurantId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const body = UpdateRestaurantSettingsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updates: Partial<typeof restaurantsTable.$inferInsert> = {};
  if (body.data.avgWaitPerTableMins !== undefined) updates.avgWaitPerTableMins = body.data.avgWaitPerTableMins;
  if (body.data.queueOpen !== undefined) updates.queueOpen = body.data.queueOpen;
  if (body.data.preOrderThreshold !== undefined) updates.preOrderThreshold = body.data.preOrderThreshold;
  if (body.data.photo !== undefined) updates.photo = body.data.photo;

  const [restaurant] = await db
    .update(restaurantsTable)
    .set(updates)
    .where(eq(restaurantsTable.id, restaurantId))
    .returning();

  res.json({
    id: restaurant.id,
    name: restaurant.name,
    ownerName: restaurant.ownerName,
    email: restaurant.email,
    phone: restaurant.phone,
    address: restaurant.address,
    cuisineType: restaurant.cuisineType,
    photo: restaurant.photo ?? null,
    avgWaitPerTableMins: restaurant.avgWaitPerTableMins,
    queueOpen: restaurant.queueOpen,
    preOrderThreshold: restaurant.preOrderThreshold,
    createdAt: restaurant.createdAt.toISOString(),
  });
});

router.get("/restaurants/:restaurantId/stats", async (req, res): Promise<void> => {
  const restaurantId = getAuthRestaurantId(req as any);
  if (!restaurantId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = GetRestaurantStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayEntries = await db
    .select()
    .from(queueEntriesTable)
    .where(
      and(
        eq(queueEntriesTable.restaurantId, params.data.restaurantId),
        eq(queueEntriesTable.status, "seated"),
        sql`${queueEntriesTable.joinedAt} >= ${today}`
      )
    );

  const todayOrders = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.restaurantId, params.data.restaurantId),
        sql`${ordersTable.createdAt} >= ${today}`
      )
    );

  const totalRevenueToday = todayOrders.reduce(
    (sum, o) => sum + parseFloat(o.totalAmount as string),
    0
  );

  const waitDurations: number[] = [];
  for (const entry of todayEntries) {
    const joined = entry.joinedAt.getTime();
    const now = Date.now();
    waitDurations.push((now - joined) / 1000 / 60);
  }
  const avgWaitMins =
    waitDurations.length > 0
      ? waitDurations.reduce((a, b) => a + b, 0) / waitDurations.length
      : 0;

  res.json({
    customersServedToday: todayEntries.length,
    totalOrdersToday: todayOrders.length,
    totalRevenueToday: Math.round(totalRevenueToday * 100) / 100,
    avgWaitMins: Math.round(avgWaitMins * 10) / 10,
  });
});

export default router;
