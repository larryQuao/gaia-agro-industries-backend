import { Router } from "express";
import prisma from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (_req, res) => {
  const orders = await prisma.order.findMany({
    select: {
      email: true,
      fullName: true,
      phone: true,
      city: true,
      region: true,
      totalAmount: true,
      createdAt: true,
      status: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const customerMap = new Map<
    string,
    { email: string; fullName: string; phone: string; city: string; region: string; orderCount: number; totalSpent: number; lastOrder: string }
  >();

  for (const order of orders) {
    const existing = customerMap.get(order.email);
    if (existing) {
      existing.orderCount++;
      existing.totalSpent += order.totalAmount;
    } else {
      customerMap.set(order.email, {
        email: order.email,
        fullName: order.fullName,
        phone: order.phone,
        city: order.city,
        region: order.region,
        orderCount: 1,
        totalSpent: order.totalAmount,
        lastOrder: order.createdAt.toISOString(),
      });
    }
  }

  const customers = Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  res.json(customers);
});

export default router;
