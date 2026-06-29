import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, menuItemsTable } from "@workspace/db";
import {
  ListMenuItemsParams,
  CreateMenuItemParams,
  CreateMenuItemBody,
  UpdateMenuItemParams,
  UpdateMenuItemBody,
  DeleteMenuItemParams,
} from "@workspace/api-zod";
import { getAuthRestaurantId } from "./auth";

const router: IRouter = Router();

function formatItem(item: typeof menuItemsTable.$inferSelect) {
  return {
    id: item.id,
    restaurantId: item.restaurantId,
    name: item.name,
    price: parseFloat(item.price as string),
    category: item.category,
    isAvailable: item.isAvailable,
  };
}

router.get("/restaurants/:restaurantId/menu", async (req, res): Promise<void> => {
  const params = ListMenuItemsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const items = await db
    .select()
    .from(menuItemsTable)
    .where(eq(menuItemsTable.restaurantId, params.data.restaurantId));

  res.json(items.map(formatItem));
});

router.post("/restaurants/:restaurantId/menu", async (req, res): Promise<void> => {
  const restaurantId = getAuthRestaurantId(req as any);
  if (!restaurantId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = CreateMenuItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (params.data.restaurantId !== restaurantId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const body = CreateMenuItemBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [item] = await db
    .insert(menuItemsTable)
    .values({
      restaurantId: params.data.restaurantId,
      name: body.data.name,
      price: String(body.data.price),
      category: body.data.category,
      isAvailable: body.data.isAvailable ?? true,
    })
    .returning();

  res.status(201).json(formatItem(item));
});

router.patch("/menu-items/:itemId", async (req, res): Promise<void> => {
  const restaurantId = getAuthRestaurantId(req as any);
  if (!restaurantId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = UpdateMenuItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateMenuItemBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updates: Partial<typeof menuItemsTable.$inferInsert> = {};
  if (body.data.name !== undefined) updates.name = body.data.name;
  if (body.data.price !== undefined) updates.price = String(body.data.price);
  if (body.data.category !== undefined) updates.category = body.data.category;
  if (body.data.isAvailable !== undefined) updates.isAvailable = body.data.isAvailable;

  const [item] = await db
    .update(menuItemsTable)
    .set(updates)
    .where(
      and(
        eq(menuItemsTable.id, params.data.itemId),
        eq(menuItemsTable.restaurantId, restaurantId)
      )
    )
    .returning();

  if (!item) {
    res.status(404).json({ error: "Menu item not found" });
    return;
  }

  res.json(formatItem(item));
});

router.delete("/menu-items/:itemId", async (req, res): Promise<void> => {
  const restaurantId = getAuthRestaurantId(req as any);
  if (!restaurantId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = DeleteMenuItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .delete(menuItemsTable)
    .where(
      and(
        eq(menuItemsTable.id, params.data.itemId),
        eq(menuItemsTable.restaurantId, restaurantId)
      )
    )
    .returning();

  if (!item) {
    res.status(404).json({ error: "Menu item not found" });
    return;
  }

  res.json({ success: true });
});

export default router;
