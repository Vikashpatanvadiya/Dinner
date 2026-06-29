import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db, restaurantsTable } from "../../lib/db/src/index.js";
import {
  SignupRestaurantBody,
  LoginRestaurantBody,
  SignupRestaurantResponse,
  LoginRestaurantResponse,
  GetMeResponse,
} from "../../lib/api-zod/src/index.js";

const router: IRouter = Router();

const JWT_SECRET = process.env.SESSION_SECRET ?? "fallback-secret-change-me";

export function signToken(restaurantId: number): string {
  return jwt.sign({ restaurantId }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { restaurantId: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { restaurantId: number };
  } catch {
    return null;
  }
}

export function getAuthRestaurantId(req: Express.Request): number | null {
  const authHeader = (req as any).headers?.authorization as string | undefined;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  return payload?.restaurantId ?? null;
}

router.post("/auth/signup", async (req, res): Promise<void> => {
  const parsed = SignupRestaurantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, ownerName, email, password, phone, address, cuisineType } = parsed.data;

  const existing = await db
    .select({ id: restaurantsTable.id })
    .from(restaurantsTable)
    .where(eq(restaurantsTable.email, email));

  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [restaurant] = await db
    .insert(restaurantsTable)
    .values({ name, ownerName, email, passwordHash, phone, address, cuisineType })
    .returning();

  const token = signToken(restaurant.id);

  res.status(201).json(
    SignupRestaurantResponse.parse({
      token,
      restaurant: {
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
      },
    })
  );
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginRestaurantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [restaurant] = await db
    .select()
    .from(restaurantsTable)
    .where(eq(restaurantsTable.email, email));

  if (!restaurant) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, restaurant.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken(restaurant.id);

  res.json(
    LoginRestaurantResponse.parse({
      token,
      restaurant: {
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
      },
    })
  );
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ success: true });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const restaurantId = getAuthRestaurantId(req as any);
  if (!restaurantId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [restaurant] = await db
    .select()
    .from(restaurantsTable)
    .where(eq(restaurantsTable.id, restaurantId));

  if (!restaurant) {
    res.status(401).json({ error: "Restaurant not found" });
    return;
  }

  res.json(
    GetMeResponse.parse({
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
    })
  );
});

export default router;
