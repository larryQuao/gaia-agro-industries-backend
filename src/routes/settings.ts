import { Router } from "express";
import prisma from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (_req, res) => {
  const settings = await prisma.storeSetting.findMany();
  const obj: Record<string, string> = {};
  for (const s of settings) {
    obj[s.key] = s.value;
  }
  res.json(obj);
});

router.put("/", requireAuth, async (req, res) => {
  const entries = Object.entries(req.body) as [string, string][];

  for (const [key, value] of entries) {
    await prisma.storeSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
  }

  res.json({ success: true });
});

export default router;
