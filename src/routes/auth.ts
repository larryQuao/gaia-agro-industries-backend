import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = jwt.sign({ id: admin.id }, process.env.JWT_SECRET!, { expiresIn: "7d" });

  res.json({
    token,
    admin: { id: admin.id, email: admin.email, name: admin.name },
  });
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const admin = await prisma.adminUser.findUnique({
    where: { id: req.adminId },
    select: { id: true, email: true, name: true },
  });

  if (!admin) {
    res.status(404).json({ error: "Admin not found" });
    return;
  }

  res.json(admin);
});

export default router;
