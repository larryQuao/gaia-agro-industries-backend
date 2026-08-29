import { Router } from "express";
import prisma from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  res.json(categories);
});

router.get("/:id", async (req, res) => {
  const category = await prisma.category.findFirst({
    where: { OR: [{ id: req.params.id }, { slug: req.params.id }] },
    include: { _count: { select: { products: true } } },
  });
  if (!category) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  res.json(category);
});

router.post("/", requireAuth, async (req, res) => {
  const { name } = req.body;
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  try {
    const category = await prisma.category.create({ data: { name, slug } });
    res.status(201).json(category);
  } catch (err: any) {
    if (err.code === "P2002") {
      res.status(409).json({ error: "A category with this name already exists" });
      return;
    }
    throw err;
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  const { name } = req.body;
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  try {
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: { name, slug },
    });
    res.json(category);
  } catch (err: any) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    if (err.code === "P2002") {
      res.status(409).json({ error: "A category with this name already exists" });
      return;
    }
    throw err;
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    throw err;
  }
});

export default router;
