type AnalyticsType = {
  totalEvents: number;
  recentEvents: Array<any>;
};
type SerpType = {
  results?: Array<any>;
  error?: string;
};
async function fetchGeminiSuggestion({ analytics, serp, category }: { analytics: AnalyticsType; serp: SerpType; category: string }) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return "Missing Gemini API key"
  const prompt = `You are a business assistant. Here is the dashboard data: ${JSON.stringify(analytics)}.\nHere are current events/news: ${JSON.stringify(serp.results)}.\nCategory: ${category}.\nBased on this, suggest a business decision for the user.`
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    })
    const data = await res.json()
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No suggestion returned."
  } catch (err) {
    return "Error: " + String(err)
  }
}
import { NextResponse } from "next/server"

import { db } from "@/db"

async function fetchSerpResults(query: string) {
  const apiKey = process.env.GOOGLE_SERP_API_KEY
  if (!apiKey) return { error: "Missing SERP API key" }
  const serpUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${apiKey}`
  try {
    const res = await fetch(serpUrl)
    const data = await res.json()
    // Extract top results (e.g., news, organic results)
    const results = (data.news_results || data.organic_results || []).slice(0, 5)
    return { results }
  } catch (err) {
    return { error: String(err) }
  }
}

export async function POST(req: Request) {
  try {
    const { category, userId } = await req.json()

    // 1. Retrieve dashboard data from DB (Prisma)
    const categoryData = await db.eventCategory.findUnique({
      where: {
        name_userId: {
          name: category,
          userId,
        },
      },
      include: {
        events: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    })

    // Prepare analytics from events
    const analytics = {
      totalEvents: categoryData?.events.length || 0,
      recentEvents: categoryData?.events.map(e => ({
        id: e.id,
        createdAt: e.createdAt,
        deliveryStatus: e.deliveryStatus,
        fields: e.fields,
      })) || [],
    }

    // 2. Query Google SERP API for current events/news
    const serp = await fetchSerpResults(category)

    // 3. Pass both to Gemini LLM and get suggestion
    const suggestion = await fetchGeminiSuggestion({ analytics, serp, category })

    // 4. Return analytics, SERP, and LLM suggestion
    return NextResponse.json({
      analytics,
      serp,
      suggestion
    })
  } catch (err) {
    return NextResponse.json({ message: "Error processing agent request", error: String(err) }, { status: 500 })
  }
}
