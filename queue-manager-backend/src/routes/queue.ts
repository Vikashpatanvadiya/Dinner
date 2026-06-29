import { Router, type IRouter } from "express";
import { eq, and, inArray, asc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db, restaurantsTable, queueEntriesTable, ordersTable, menuItemsTable } from "../../lib/db/src/index.js";
import {
  JoinQueueParams,
  JoinQueueBody,
  GetRestaurantQueueParams,
  GetQueueEntryParams,
  LeaveQueueParams,
  CallQueueEntryParams,
  SeatQueueEntryParams,
  RemoveQueueEntryParams,
} from "../../lib/api-zod/src/index.js";
import { getAuthRestaurantId } from "./auth";

const router: IRouter = Router();

function formatEntry(entry: typeof queueEntriesTable.$inferSelect) {
  return {
    id: entry.id,
    restaurantId: entry.restaurantId,
    queueNumber: entry.queueNumber,
    customerName: entry.customerName,
    customerPhone: entry.customerPhone,
    partySize: entry.partySize,
    status: entry.status,
    joinedAt: entry.joinedAt.toISOString(),
    sessionToken: entry.sessionToken,
    orderId: entry.orderId ?? null,
  };
}

async function getRestaurantPublicData(restaurantId: number) {
  const [restaurant] = await db
    .select()
    .from(restaurantsTable)
    .where(eq(restaurantsTable.id, restaurantId));

  if (!restaurant) return null;

  const activeEntries = await db
    .select({ id: queueEntriesTable.id })
    .from(queueEntriesTable)
    .where(
      and(
        eq(queueEntriesTable.restaurantId, restaurantId),
        inArray(queueEntriesTable.status, ["waiting", "called"])
      )
    );

  const queueLength = activeEntries.length;
  const estimatedWaitMins = queueLength * restaurant.avgWaitPerTableMins;

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

// Get all queue entries for a restaurant (restaurant dashboard)
router.get("/restaurants/:restaurantId/queue", async (req, res): Promise<void> => {
  const restaurantId = getAuthRestaurantId(req as any);
  if (!restaurantId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = GetRestaurantQueueParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (params.data.restaurantId !== restaurantId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const entries = await db
    .select()
    .from(queueEntriesTable)
    .where(
      and(
        eq(queueEntriesTable.restaurantId, params.data.restaurantId),
        inArray(queueEntriesTable.status, ["waiting", "called"])
      )
    )
    .orderBy(asc(queueEntriesTable.queueNumber));

  res.json(entries.map(formatEntry));
});

// Customer joins queue
router.post("/restaurants/:restaurantId/queue", async (req, res): Promise<void> => {
  const params = JoinQueueParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = JoinQueueBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
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

  if (!restaurant.queueOpen) {
    res.status(400).json({ error: "Queue is currently closed" });
    return;
  }

  // Get next queue number
  const existing = await db
    .select({ queueNumber: queueEntriesTable.queueNumber })
    .from(queueEntriesTable)
    .where(eq(queueEntriesTable.restaurantId, params.data.restaurantId))
    .orderBy(asc(queueEntriesTable.queueNumber));

  const lastNumber = existing.length > 0 ? existing[existing.length - 1].queueNumber : 0;
  const queueNumber = lastNumber + 1;
  const sessionToken = uuidv4();

  const [entry] = await db
    .insert(queueEntriesTable)
    .values({
      restaurantId: params.data.restaurantId,
      queueNumber,
      customerName: body.data.customerName,
      customerPhone: body.data.customerPhone,
      partySize: body.data.partySize,
      status: "waiting",
      sessionToken,
    })
    .returning();

  res.status(201).json(formatEntry(entry));
});

// Get queue entry by session token (customer polling)
router.get("/queue/:sessionToken", async (req, res): Promise<void> => {
  const params = GetQueueEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [entry] = await db
    .select()
    .from(queueEntriesTable)
    .where(eq(queueEntriesTable.sessionToken, params.data.sessionToken));

  if (!entry) {
    res.status(404).json({ error: "Queue entry not found" });
    return;
  }

  const restaurantData = await getRestaurantPublicData(entry.restaurantId);
  if (!restaurantData) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }

  // Count how many people are ahead
  const ahead = await db
    .select({ id: queueEntriesTable.id })
    .from(queueEntriesTable)
    .where(
      and(
        eq(queueEntriesTable.restaurantId, entry.restaurantId),
        inArray(queueEntriesTable.status, ["waiting", "called"]),
        eq(queueEntriesTable.status, "waiting")
      )
    );

  // More precise: count entries with lower queue number still waiting
  const aheadEntries = await db
    .select({ id: queueEntriesTable.id })
    .from(queueEntriesTable)
    .where(
      and(
        eq(queueEntriesTable.restaurantId, entry.restaurantId),
        inArray(queueEntriesTable.status, ["waiting", "called"])
      )
    )
    .orderBy(asc(queueEntriesTable.queueNumber));

  const myIndex = aheadEntries.findIndex((e) => e.id === entry.id);
  const position = myIndex === -1 ? 0 : myIndex;
  const estimatedWaitMins = position * restaurantData.avgWaitPerTableMins;
  const canPreOrder =
    entry.status === "waiting" && position < restaurantData.preOrderThreshold;

  // Get order if any
  let order = null;
  if (entry.orderId) {
    const [o] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, entry.orderId));
    if (o) {
      order = {
        id: o.id,
        queueEntryId: o.queueEntryId,
        restaurantId: o.restaurantId,
        customerName: entry.customerName,
        queueNumber: entry.queueNumber,
        items: o.items as Array<{ menuItemId: number; name: string; qty: number; price: number }>,
        status: o.status,
        totalAmount: parseFloat(o.totalAmount as string),
        paymentStatus: o.paymentStatus,
        createdAt: o.createdAt.toISOString(),
      };
    }
  }

  res.json({
    entry: formatEntry(entry),
    position,
    estimatedWaitMins,
    restaurant: restaurantData,
    canPreOrder,
    order,
  });
});

// Customer leaves queue
router.post("/queue/:sessionToken/leave", async (req, res): Promise<void> => {
  const params = LeaveQueueParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [entry] = await db
    .select()
    .from(queueEntriesTable)
    .where(eq(queueEntriesTable.sessionToken, params.data.sessionToken));

  if (!entry) {
    res.status(404).json({ error: "Queue entry not found" });
    return;
  }

  await db
    .update(queueEntriesTable)
    .set({ status: "removed" })
    .where(eq(queueEntriesTable.id, entry.id));

  res.json({ success: true });
});

// Restaurant: call customer
router.post("/queue-entries/:entryId/call", async (req, res): Promise<void> => {
  const restaurantId = getAuthRestaurantId(req as any);
  if (!restaurantId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = CallQueueEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [entry] = await db
    .update(queueEntriesTable)
    .set({ status: "called" })
    .where(
      and(
        eq(queueEntriesTable.id, params.data.entryId),
        eq(queueEntriesTable.restaurantId, restaurantId)
      )
    )
    .returning();

  if (!entry) {
    res.status(404).json({ error: "Queue entry not found" });
    return;
  }

  res.json(formatEntry(entry));
});

// Restaurant: seat customer
router.post("/queue-entries/:entryId/seat", async (req, res): Promise<void> => {
  const restaurantId = getAuthRestaurantId(req as any);
  if (!restaurantId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = SeatQueueEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [entry] = await db
    .update(queueEntriesTable)
    .set({ status: "seated" })
    .where(
      and(
        eq(queueEntriesTable.id, params.data.entryId),
        eq(queueEntriesTable.restaurantId, restaurantId)
      )
    )
    .returning();

  if (!entry) {
    res.status(404).json({ error: "Queue entry not found" });
    return;
  }

  res.json(formatEntry(entry));
});

// Restaurant: remove no-show
router.post("/queue-entries/:entryId/remove", async (req, res): Promise<void> => {
  const restaurantId = getAuthRestaurantId(req as any);
  if (!restaurantId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = RemoveQueueEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [entry] = await db
    .update(queueEntriesTable)
    .set({ status: "removed" })
    .where(
      and(
        eq(queueEntriesTable.id, params.data.entryId),
        eq(queueEntriesTable.restaurantId, restaurantId)
      )
    )
    .returning();

  if (!entry) {
    res.status(404).json({ error: "Queue entry not found" });
    return;
  }

  res.json(formatEntry(entry));
});

export default router;
