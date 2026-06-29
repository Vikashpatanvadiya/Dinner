import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const queueEntriesTable = pgTable("queue_entries", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull(),
  queueNumber: integer("queue_number").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  partySize: integer("party_size").notNull().default(1),
  status: text("status").notNull().default("waiting"), // waiting | called | seated | removed
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  sessionToken: text("session_token").notNull().unique(),
  orderId: integer("order_id"),
});

export const insertQueueEntrySchema = createInsertSchema(queueEntriesTable).omit({
  id: true,
  joinedAt: true,
});
export type InsertQueueEntry = z.infer<typeof insertQueueEntrySchema>;
export type QueueEntry = typeof queueEntriesTable.$inferSelect;
