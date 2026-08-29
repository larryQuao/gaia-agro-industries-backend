import { Router } from "express";
import prisma from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/", async (req, res) => {
  const { fullName, email, phone, address, city, region, notes, items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "Order must have at least one item" });
    return;
  }

  const productIds = items.map((i: any) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

  if (products.length !== productIds.length) {
    res.status(400).json({ error: "One or more products not found" });
    return;
  }

  const totalAmount = items.reduce((sum: number, item: any) => {
    const product = products.find((p) => p.id === item.productId);
    return sum + (product!.priceValue * item.quantity);
  }, 0);

  const order = await prisma.order.create({
    data: {
      fullName,
      email,
      phone,
      address,
      city,
      region,
      notes,
      totalAmount,
      items: {
        create: items.map((item: any) => {
          const product = products.find((p) => p.id === item.productId);
          return {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: product!.priceValue,
          };
        }),
      },
    },
    include: { items: { include: { product: true } } },
  });

  res.status(201).json(order);
});

router.get("/", requireAuth, async (_req, res) => {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: true } }, _count: { select: { items: true } } },
  });
  res.json(orders);
});

router.get("/:id", requireAuth, async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { product: true } } },
  });

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(order);
});

router.patch("/:id/status", requireAuth, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  try {
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: { items: { include: { product: true } } },
    });
    res.json(order);
  } catch (err: any) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    throw err;
  }
});

export default router;
