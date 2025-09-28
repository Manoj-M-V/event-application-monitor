import { NextResponse } from "next/server";
import { db } from "@/db";
import { BusinessIntelligenceAgent, calculateTrends, calculateCategoryMetrics, generateFallbackAnalysis, BusinessContext } from "../agent/agent";

export async function POST(req: Request) {
  try {
    const { category, userId, timeframe = "30d" } = await req.json();

    if (!category || !userId) {
      return NextResponse.json(
        { error: "Category and userId are required" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    // 1. Retrieve enhanced dashboard data and user context from DB
    const [categoryData, userData] = await Promise.all([
      db.eventCategory.findUnique({
        where: {
          name_userId: {
            name: category,
            userId,
          },
        },
        include: {
          events: {
            orderBy: { createdAt: "desc" },
            take: 50,
          },
        },
      }),
      db.user.findUnique({
        where: { id: userId },
        select: { businessDescription: true }
      })
    ]);

    if (!categoryData) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // 2. Prepare enhanced analytics data
    const events = categoryData.events;
    const analytics = {
      totalEvents: events.length,
      recentEvents: events.map(e => ({
        id: e.id,
        createdAt: e.createdAt,
        deliveryStatus: e.deliveryStatus,
        fields: e.fields,
      })),
      trends: calculateTrends(events),
      categoryMetrics: calculateCategoryMetrics(events),
    };

    // 3. Initialize and run the AI agent
    let insights: string;
    try {
      // Verify required API keys
      if (!process.env.GEMINI_API_KEY || !process.env.GOOGLE_SERP_API_KEY) {
        throw new Error(
          `Missing required API keys: ${[
            !process.env.GEMINI_API_KEY && "GEMINI_API_KEY",
            !process.env.GOOGLE_SERP_API_KEY && "GOOGLE_SERP_API_KEY",
          ]
            .filter(Boolean)
            .join(", ")}`
        );
      }

      const agent = new BusinessIntelligenceAgent();
      await agent.initialize();

      const businessContext: BusinessContext = {
        category,
        analytics,
        timeframe,
        businessDescription: userData?.businessDescription ?? undefined,
      };

      insights = await agent.generateBusinessInsights(businessContext);
    } catch (agentError) {
      console.error("Agent Error:", agentError);
      
      if (agentError instanceof Error && 
          agentError.message.includes("API key")) {
        return NextResponse.json({
          error: "Configuration Error",
          message: agentError.message,
          details: "Please ensure both GEMINI_API_KEY and GOOGLE_SERP_API_KEY are configured in your environment."
        }, { status: 500 });
      }
      
      insights = generateFallbackAnalysis(category, analytics);
    }

    // 4. Return structured response
    return NextResponse.json({
      success: true,
      category,
      analytics,
      insights,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: "Failed to generate business intelligence", 
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
