import { GoogleGenerativeAI } from "@google/generative-ai";
import Book from "../modules/book/book.model";
import { Order } from "../modules/order/order.model";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// ── Match the object signature your controller already uses ──
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

    const purchasedTitles = userOrders
      .flatMap((o: any) => o.items.map((i: any) => i.title))
      .join(", ") || "No history yet";

    const bookContext = allBooks
      .map((b: any) =>
        `Title: ${b.title} | Author: ${b.author} | Category: ${b.category} | Rating: ${b.rating || 0}/5 | Price: Rs ${b.price || "Free"} | Type: ${b.type}`
      ).join("\n");

    const prompt = `You are BookSansar's AI recommendation engine for Nepal's book platform.

Available books on BookSansar:
${bookContext}

User has previously read: ${purchasedTitles}

Recommend ${limit} books from the list above that the user would enjoy.
Only recommend books from the list above — never suggest books not listed.
Return ONLY a JSON array, no other text:
[{"title": "", "author": "", "reason": "", "category": ""}]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Recommendation error:", error.message);
    return [];
  }
};

// ── Match the signature: getTrendingBooks(type, limit) ───────
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

// ── AI Chat ─────────────────────────────────────────────────
export const chatWithBookSansarAI = async (
  userMessage: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[] = [],
) => {
  try {
    const searchWords = userMessage.toLowerCase()
      .split(" ").filter((w) => w.length > 2).slice(0, 5).join("|");

    const relevantBooks = await Book.find({
      status: "approved",
      $or: [
        { title: { $regex: searchWords, $options: "i" } },
        { author: { $regex: searchWords, $options: "i" } },
        { category: { $regex: searchWords, $options: "i" } },
        { description: { $regex: searchWords, $options: "i" } },
      ],
    }).select("title author category genre description price rating type").limit(15).lean();

    const topBooks = await Book.find({ status: "approved" })
      .sort({ rating: -1 })
      .select("title author category price rating type").limit(20).lean();

    const relevantContext = relevantBooks.length > 0
      ? relevantBooks.map((b: any) =>
        `"${b.title}" by ${b.author} | ${b.category} | ${b.rating || 0}/5 | ${b.price ? `Rs ${b.price}` : "FREE"} | ${b.type}${b.description ? ` | ${b.description.slice(0, 80)}` : ""}`
      ).join("\n")
      : "No specific matches found.";

    const topContext = topBooks.map((b: any) =>
      `"${b.title}" by ${b.author} (${b.category}, ${b.rating || 0}/5, ${b.price ? `Rs ${b.price}` : "FREE"})`
    ).join("\n");

    const chatHistory = conversationHistory.slice(-8).map((m) => ({
      role: m.role === "assistant" ? "model" as const : "user" as const,
      parts: [{ text: m.content }],
    }));

    const fullPrompt = `You are BookSansar AI — the smart assistant for BookSansar, Nepal's digital book platform.

BOOKSANSAR CATALOG (your knowledge base):
Relevant books:
${relevantContext}

Top rated books:
${topContext}

PLATFORM INFO:
- Free books for online reading
- Physical books delivered across Nepal
- Payment via eSewa
- Delivery: Rs 80 inside valley, Rs 150 outside
- Second-hand books also available

RULES:
- Only recommend books from the catalog above
- Be friendly and helpful
- Answer in same language as user (English or Nepali)
- Keep answers concise

User question: ${userMessage}`;

    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(fullPrompt);
    return result.response.text();
  } catch (error: any) {
    console.error("Chat error:", error.message);
    throw error;
  }
};

// ── AI Smart Search ──────────────────────────────────────────
export const aiSearch = async (query: string) => {
  try {
    const allBooks = await Book.find({ status: "approved" })
      .select("title author category genre description price rating type _id")
      .limit(150).lean();

    const bookList = allBooks
      .map((b: any) =>
        `ID:${b._id}|${b.title} by ${b.author}|${b.category}|${b.genre || ""}`
      ).join("\n");

    const prompt = `From this BookSansar catalog, find books matching: "${query}"
${bookList}
Return ONLY a JSON array of matching book IDs (max 8): ["id1","id2"]
If nothing matches, return: []`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    const ids = JSON.parse(text);
    return await Book.find({ _id: { $in: ids }, status: "approved" }).lean();
  } catch {
    return [];
  }
};