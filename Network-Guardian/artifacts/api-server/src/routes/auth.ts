import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "ddos_salt_2024").digest("hex");
}

function generateToken(userId: number, username: string, role: string): string {
  const payload = { userId, username, role, exp: Date.now() + 86400000 };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function parseToken(token: string): { userId: number; username: string; role: string; exp: number } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64url").toString("utf-8"));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = parseToken(token);
  if (!payload) {
    res.status(401).json({ error: "Token expired or invalid" });
    return;
  }
  (req as unknown as Record<string, unknown>)["user"] = payload;
  next();
}

router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  const users = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);

  if (users.length === 0) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const user = users[0];
  const hash = hashPassword(password);

  if (user.passwordHash !== hash) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = generateToken(user.id, user.username, user.role);

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.post("/logout", requireAuth, (_req: Request, res: Response): void => {
  res.json({ message: "Logged out successfully" });
});

router.get("/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userPayload = (req as unknown as Record<string, unknown>)["user"] as { userId: number };
  const users = await db.select().from(usersTable).where(eq(usersTable.id, userPayload.userId)).limit(1);

  if (users.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const user = users[0];
  res.json({
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
