import { Router } from "express";
import prisma from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (_req, res) => {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  res.json(coupons);
});

router.post("/", requireAuth, async (req, res) => {
  const { code, type, value, minOrder, maxUses, expiresAt } = req.body;

  try {
    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase().trim(),
        type,
        value,
        minOrder: minOrder ?? 0,
        maxUses: maxUses || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    res.status(201).json(coupon);
  } catch (err: any) {
    if (err.code === "P2002") {
      res.status(409).json({ error: "A coupon with this code already exists" });
      return;
    }
    throw err;
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  const { code, type, value, minOrder, maxUses, active, expiresAt } = req.body;

  try {
    const coupon = await prisma.coupon.update({
      where: { id: req.params.id },
      data: {
        code: code.toUpperCase().trim(),
        type,
        value,
        minOrder: minOrder ?? 0,
        maxUses: maxUses || null,
        active,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    res.json(coupon);
  } catch (err: any) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Coupon not found" });
      return;
    }
    if (err.code === "P2002") {
      res.status(409).json({ error: "A coupon with this code already exists" });
      return;
    }
    throw err;
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await prisma.coupon.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Coupon not found" });
      return;
    }
    throw err;
  }
});

router.post("/validate", async (req, res) => {
  const { code, orderTotal } = req.body;

  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase().trim() } });

  if (!coupon || !coupon.active) {
    res.status(404).json({ error: "Invalid coupon code" });
    return;
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    res.status(400).json({ error: "This coupon has expired" });
    return;
  }

  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    res.status(400).json({ error: "This coupon has reached its usage limit" });
    return;
  }

  if (orderTotal < coupon.minOrder) {
    res.status(400).json({ error: `Minimum order of GH₵ ${coupon.minOrder.toFixed(2)} required` });
    return;
  }

  const discount =
    coupon.type === "PERCENTAGE"
      ? (orderTotal * coupon.value) / 100
      : coupon.value;

  res.json({ coupon, discount: Math.min(discount, orderTotal) });
});

export default router;
