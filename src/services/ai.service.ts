import Groq from "groq-sdk";
import Book from "../modules/book/book.model";
import { Order } from "../modules/order/order.model";
import User from "../modules/user/user.model";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.1-8b-instant";

interface RecommendationParams {
  userId: string;
  type?: "free" | "paid" | "all";
  genre?: string;
  limit?: number;
}

export const getSmartRecommendations = async ({
  userId,
  type = "all",
  genre,
  limit = 10,
}: RecommendationParams) => {
  try {
    const filter: any = { status: "approved" };
    if (type === "free") filter.type = "free";
    if (type === "paid") filter.type = { $in: ["physical", "second-hand"] };
    if (genre) filter.genre = { $regex: genre, $options: "i" };

    const allBooks = await Book.find(filter)
      .select("title author category genre description price rating type")
      .limit(100)
      .lean();

    const userOrders = await Order.find({ customerId: userId, status: "delivered" })
      .select("items").lean();

    const purchasedTitles =
      userOrders.flatMap((o: any) => o.items.map((i: any) => i.title)).join(", ") ||
      "No history yet";

    const bookContext = allBooks
      .map((b: any) =>
        `Title: ${b.title} | Author: ${b.author} | Category: ${b.category} | Rating: ${b.rating || 0}/5 | Price: Rs ${b.price || "Free"} | Type: ${b.type}`,
      ).join("\n");

    const response = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 1000,
      messages: [
        {
          role: "system",
          content: "You are BookSansar's AI recommendation engine. Always return valid JSON only, no extra text.",
        },
        {
          role: "user",
          content: `Available books on BookSansar:\n${bookContext}\n\nUser has previously read: ${purchasedTitles}\n\nRecommend ${limit} books from the list above only.\nReturn ONLY a JSON array:\n[{"title": "", "author": "", "reason": "", "category": ""}]`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content?.replace(/```json|```/g, "").trim() || "[]";
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Recommendation error:", error.message);
    return [];
  }
};

export const getTrendingBooks = async (
  type: "free" | "paid" | "all" = "all",
  limit: number = 10,
) => {
  const filter: any = { status: "approved" };
  if (type === "free") filter.type = "free";
  if (type === "paid") filter.type = { $in: ["physical", "second-hand"] };

  return await Book.find(filter)
    .sort({ rating: -1, reviewsCount: -1 })
    .select("title author category price rating coverImage type")
    .limit(limit)
    .lean();
};

export const chatWithBookSansarAI = async (
  userMessage: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[] = [],
  userId?: string,
) => {
  try {

    const searchWords = userMessage
      .toLowerCase()
      .split(" ")
      .filter((w) => w.length > 2)
      .slice(0, 5)
      .join("|");

    const [relevantBooks, topBooks] = await Promise.all([
      Book.find({
        status: "approved",
        ...(searchWords
          ? {
            $or: [
              { title: { $regex: searchWords, $options: "i" } },
              { author: { $regex: searchWords, $options: "i" } },
              { category: { $regex: searchWords, $options: "i" } },
              { description: { $regex: searchWords, $options: "i" } },
            ],
          }
          : {}),
      })
        .select("title author category genre description price rating type")
        .limit(15)
        .lean(),

      Book.find({ status: "approved" })
        .sort({ rating: -1 })
        .select("title author category price rating type")
        .limit(30)
        .lean(),
    ]);

    let userContext = "Guest user — no purchase history available.";

    if (userId) {
      const [user, orders] = await Promise.all([
        User.findById(userId).select("name").lean() as any,
        Order.find({ customerId: userId })
          .select("items status")
          .sort({ createdAt: -1 })
          .limit(20)
          .lean(),
      ]);

      const purchasedBooks = orders
        .filter((o: any) => o.status === "delivered")
        .flatMap((o: any) => o.items.map((i: any) => i.title));

      const allOrderedBooks = orders
        .flatMap((o: any) => o.items.map((i: any) => `${i.title} (${o.status})`));

      userContext = `
User name: ${user?.name || "Unknown"}
Books purchased/delivered: ${purchasedBooks.length > 0 ? purchasedBooks.join(", ") : "None yet"}
All ordered books: ${allOrderedBooks.length > 0 ? allOrderedBooks.join(", ") : "None yet"}
Total orders: ${orders.length}`.trim();
    }

    const relevantContext =
      relevantBooks.length > 0
        ? relevantBooks
          .map(
            (b: any) =>
              `- "${b.title}" by ${b.author} | ${b.category} | ${b.rating || 0}/5 stars | ${b.price ? `Rs ${b.price}` : "FREE"} | ${b.type}`,
          )
          .join("\n")
        : "No specific matches in catalog for this query.";

    const topContext = topBooks
      .map(
        (b: any) =>
          `- "${b.title}" by ${b.author} | ${b.category} | ${b.rating || 0}/5 | ${b.price ? `Rs ${b.price}` : "FREE"}`,
      )
      .join("\n");

    const messages: any[] = [
      {
        role: "system",
        content: `You are BookSansar AI — the intelligent assistant for BookSansar, Nepal's digital book platform.

═══ USER PROFILE (loaded automatically) ═══
${userContext}

═══ BOOKSANSAR REAL CATALOG ═══
Books matching this query:
${relevantContext}

Top rated books available right now:
${topContext}

═══ PLATFORM INFO ═══
- Free PDFs available for online reading
- Physical books delivered across Nepal
- Payment via eSewa only
- Delivery: Rs 80 inside Kathmandu valley, Rs 150 outside
- Second-hand books available at lower prices

═══ STRICT RULES — MUST FOLLOW ═══
1. NEVER mention books that are not in the catalog above — ever
2. NEVER ask the user for their history — you already have it above
3. NEVER say "please provide your preferences" — you can see their order history
4. If the catalog has no relevant books, say "We don't have that in stock yet"
5. Be friendly, concise, and helpful
6. Use the user's name when you know it
7. Answer in the same language as the user (English or Nepali)
8. Base recommendations on the user's actual purchase history shown above`,
      },

      ...conversationHistory.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: userMessage },
    ];

    const response = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 800,
      temperature: 0.3,
      messages,
    });

    return (
      response.choices[0]?.message?.content ||
      "Sorry, I could not process that. Please try again!"
    );
  } catch (error: any) {
    console.error("Chat error:", error.message);
    throw error;
  }
};

export const aiSearch = async (query: string) => {
  try {
    const allBooks = await Book.find({ status: "approved" })
      .select("title author category genre description price rating type _id")
      .limit(150)
      .lean();

    const bookList = allBooks
      .map((b: any) => `ID:${b._id}|${b.title} by ${b.author}|${b.category}|${b.genre || ""}`)
      .join("\n");

    const response = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 300,
      messages: [
        { role: "system", content: "You return only JSON arrays of IDs. No other text ever." },
        {
          role: "user",
          content: `From this BookSansar catalog, find books matching: "${query}"\n${bookList}\nReturn ONLY a JSON array of matching IDs (max 8): ["id1","id2"]\nIf nothing matches: []`,
        },
      ],
    });

    const text =
      response.choices[0]?.message?.content?.replace(/```json|```/g, "").trim() || "[]";
    const ids = JSON.parse(text);
    return await Book.find({ _id: { $in: ids }, status: "approved" }).lean();
  } catch {
    return [];
  }
};