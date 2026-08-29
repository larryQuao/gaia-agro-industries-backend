import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  await prisma.adminUser.upsert({
    where: { email: "admin@gaiaagro.com" },
    update: {},
    create: {
      email: "admin@gaiaagro.com",
      password: hashedPassword,
      name: "Gaia Admin",
    },
  });

  const categoryNames = ["Herb", "Citrus", "Flower", "Root", "Spice"];
  const categoryMap: Record<string, string> = {};

  for (const name of categoryNames) {
    const slug = name.toLowerCase();
    const cat = await prisma.category.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
    categoryMap[name] = cat.id;
  }

  console.log(`Seeded ${categoryNames.length} categories`);

  const products = [
    {
      slug: "parsley",
      name: "Parsley",
      category: "Herb",
      tagline: "Fresh & Vibrant",
      description: "Our organically grown parsley brings a bright, clean flavor to any tea blend. Rich in vitamins A, C, and K, parsley tea has been cherished for centuries as a natural digestive aid and breath freshener.",
      uses: ["Digestive support tea", "Detox blends", "Green smoothie infusions", "Garnish for culinary dishes"],
      price: "GH₵ 25.00",
      priceValue: 25,
      image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&h=400&fit=crop",
      bgImage: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1200&h=800&fit=crop",
    },
    {
      slug: "oregano",
      name: "Oregano",
      category: "Herb",
      tagline: "Bold & Aromatic",
      description: "Sun-dried oregano with an intense, earthy aroma. Packed with antioxidants and antimicrobial properties, oregano tea is a powerhouse for immune support and respiratory health.",
      uses: ["Immune-boosting tea", "Cold & flu remedy", "Mediterranean cooking", "Essential oil extraction"],
      price: "GH₵ 30.00",
      priceValue: 30,
      image: "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=600&h=400&fit=crop",
      bgImage: "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=1200&h=800&fit=crop",
    },
    {
      slug: "lemon",
      name: "Lemon",
      category: "Citrus",
      tagline: "Zesty & Refreshing",
      description: "Hand-picked lemons dried to perfection, preserving their vibrant citrus flavor and vitamin C content. Lemon tea is the ultimate refresher — energizing, cleansing, and naturally uplifting.",
      uses: ["Morning energizer tea", "Honey-lemon soothing blend", "Iced tea infusions", "Baking & dessert flavoring"],
      price: "GH₵ 20.00",
      priceValue: 20,
      image: "https://images.unsplash.com/photo-1590502593747-42a996133562?w=600&h=400&fit=crop",
      bgImage: "https://images.unsplash.com/photo-1590502593747-42a996133562?w=1200&h=800&fit=crop",
    },
    {
      slug: "mint",
      name: "Peppermint",
      category: "Herb",
      tagline: "Cool & Soothing",
      description: "Crisp, cooling peppermint leaves harvested at peak freshness. Peppermint tea calms the stomach, clears the mind, and leaves a refreshing tingle with every sip.",
      uses: ["After-meal digestive tea", "Stress relief blend", "Iced mint tea", "Mojito & cocktail garnish"],
      price: "GH₵ 22.00",
      priceValue: 22,
      image: "https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=600&h=400&fit=crop",
      bgImage: "https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=1200&h=800&fit=crop",
    },
    {
      slug: "chamomile",
      name: "Chamomile",
      category: "Flower",
      tagline: "Calm & Gentle",
      description: "Delicate chamomile blossoms, sun-dried to capture their honey-sweet, apple-like fragrance. The world's most beloved bedtime tea — a gentle embrace in every cup.",
      uses: ["Bedtime relaxation tea", "Anxiety & stress relief", "Skin-soothing compress", "Baby-safe herbal blend"],
      price: "GH₵ 35.00",
      priceValue: 35,
      image: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=600&h=400&fit=crop",
      bgImage: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=1200&h=800&fit=crop",
    },
    {
      slug: "ginger",
      name: "Ginger",
      category: "Root",
      tagline: "Warm & Spicy",
      description: "Premium dried ginger root with a fiery kick and warming depth. Ginger tea has been a cornerstone of traditional medicine for millennia — it warms, heals, and invigorates.",
      uses: ["Anti-nausea remedy", "Winter warming tea", "Ginger-turmeric golden milk", "Stir-fry & curry base"],
      price: "GH₵ 28.00",
      priceValue: 28,
      image: "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=600&h=400&fit=crop",
      bgImage: "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=1200&h=800&fit=crop",
    },
    {
      slug: "cinnamon",
      name: "Cinnamon",
      category: "Spice",
      tagline: "Sweet & Warm",
      description: "Hand-rolled Ceylon cinnamon sticks with a delicate, layered sweetness. Cinnamon tea is nature's dessert — comforting, blood-sugar friendly, and beautifully fragrant.",
      uses: ["Chai spice blends", "Blood sugar support tea", "Apple-cinnamon infusion", "Baking & pastry spice"],
      price: "GH₵ 32.00",
      priceValue: 32,
      image: "https://images.unsplash.com/photo-1587132137056-bfbf0166836e?w=600&h=400&fit=crop",
      bgImage: "https://images.unsplash.com/photo-1587132137056-bfbf0166836e?w=1200&h=800&fit=crop",
    },
    {
      slug: "turmeric",
      name: "Turmeric",
      category: "Root",
      tagline: "Golden & Healing",
      description: "Vibrant golden turmeric root, dried and ground to unleash its powerful curcumin. Turmeric tea — the golden elixir — is celebrated worldwide for its anti-inflammatory and healing properties.",
      uses: ["Golden milk / turmeric latte", "Anti-inflammatory blend", "Immunity booster tea", "Natural food coloring"],
      price: "GH₵ 30.00",
      priceValue: 30,
      image: "https://images.unsplash.com/photo-1607438747763-a7cf896e0483?w=600&h=400&fit=crop",
      bgImage: "https://images.unsplash.com/photo-1607438747763-a7cf896e0483?w=1200&h=800&fit=crop",
    },
  ];

  for (const p of products) {
    const categoryId = categoryMap[p.category];
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: { ...p, categoryId },
      create: { ...p, categoryId },
    });
  }

  console.log("Seeded admin user: admin@gaiaagro.com / admin123");
  console.log(`Seeded ${products.length} products`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
