import { pgTable, text, serial, timestamp, integer, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  queueEntryId: integer("queue_entry_id").notNull(),
  restaurantId: integer("restaurant_id").notNull(),
  items: jsonb("items").notNull().$type<Array<{ menuItemId: number; name: string; qty: number; price: number }>>(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("placed"), // placed | preparing | ready | served
  paymentStatus: text("payment_status").notNull().default("pending"), // pending | paid_cash | paid_online
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
