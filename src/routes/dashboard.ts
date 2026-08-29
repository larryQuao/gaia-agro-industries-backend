import { Router } from "express";
import prisma from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/stats", requireAuth, async (_req, res) => {
  const [totalProducts, totalOrders, revenueResult, recentOrders, lowStockProducts] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: { not: "CANCELLED" } } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { items: { include: { product: true } } },
    }),
    prisma.product.findMany({
      where: { stockQty: { lt: 20 } },
      orderBy: { stockQty: "asc" },
      take: 5,
    }),
  ]);

  const ordersByStatus = await prisma.order.groupBy({
    by: ["status"],
    _count: true,
  });

  res.json({
    totalProducts,
    totalOrders,
    totalRevenue: revenueResult._sum.totalAmount ?? 0,
    ordersByStatus: Object.fromEntries(ordersByStatus.map((o) => [o.status, o._count])),
    recentOrders,
    lowStockProducts,
  });
});

router.get("/analytics", requireAuth, async (_req, res) => {
  const orders = await prisma.order.findMany({
    where: { status: { not: "CANCELLED" } },
    select: { totalAmount: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const revenueByMonth: Record<string, number> = {};
  const ordersByMonth: Record<string, number> = {};

  for (const order of orders) {
    const key = order.createdAt.toISOString().slice(0, 7);
    revenueByMonth[key] = (revenueByMonth[key] || 0) + order.totalAmount;
    ordersByMonth[key] = (ordersByMonth[key] || 0) + 1;
  }

  const topProducts = await prisma.orderItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });

  const productIds = topProducts.map((p) => p.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

  const topProductsData = topProducts.map((tp) => {
    const product = products.find((p) => p.id === tp.productId);
    return { name: product?.name || "Unknown", sold: tp._sum.quantity || 0, image: product?.image || "" };
  });

  const ordersByRegion = await prisma.order.groupBy({
    by: ["region"],
    _count: true,
    _sum: { totalAmount: true },
    where: { status: { not: "CANCELLED" } },
    orderBy: { _count: { region: "desc" } },
  });

  res.json({
    revenueByMonth,
    ordersByMonth,
    topProducts: topProductsData,
    ordersByRegion: ordersByRegion.map((r) => ({
      region: r.region,
      orders: r._count,
      revenue: r._sum.totalAmount || 0,
    })),
  });
});

export default router;
