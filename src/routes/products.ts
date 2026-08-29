import { Router } from "express";
import prisma from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", async (_req, res) => {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
  res.json(products);
});

router.get("/:idOrSlug", async (req, res) => {
  const { idOrSlug } = req.params;
  const product = await prisma.product.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
  });
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(product);
});

router.post("/", requireAuth, async (req, res) => {
  const { name, slug, category, tagline, description, uses, price, priceValue, image, bgImage, stockQty } = req.body;

  try {
    const product = await prisma.product.create({
      data: { name, slug, category, tagline, description, uses, price, priceValue, image, bgImage, stockQty: stockQty ?? 100 },
    });
    res.status(201).json(product);
  } catch (err: any) {
    if (err.code === "P2002") {
      res.status(409).json({ error: "A product with this slug already exists" });
      return;
    }
    throw err;
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  const { name, slug, category, tagline, description, uses, price, priceValue, image, bgImage, inStock, stockQty } = req.body;

  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { name, slug, category, tagline, description, uses, price, priceValue, image, bgImage, inStock, stockQty },
    });
    res.json(product);
  } catch (err: any) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    throw err;
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    throw err;
  }
});

export default router;
