import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

const isProduction = process.env.NODE_ENV === "production";
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  options: isProduction ? { ssl: { rejectUnauthorized: false } } : undefined,
});
const prisma = new PrismaClient({ adapter });

export default prisma;
