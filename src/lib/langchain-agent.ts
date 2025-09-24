// app/api/business-intelligence/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db"; // Adjust import path as needed
import { BusinessIntelligenceAgent } from "@/app/api/agent/route";

interface BusinessContext {
  category: string;
  analytics: {
    totalEvents: number;
    recentEvents: Array<any>;
    trends?: any;
    categoryMetrics?: any;
  };
  timeframe: string;
  location?: string;
}

export async function POST(req: Request) {
  try {
    const { category, userId, timeframe = "30d" } = await req.json();

    if (!category || !userId) {
      return NextResponse.json(
        { error: "Category and userId are required" },
        { status: 400 }
      );
    }

    // Check for required environment variables
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    console.log(`Fetching data for category: ${category}, userId: ${userId}`);

    // 1. Retrieve enhanced dashboard data from DB
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
          take: 50, // More data for better analysis
        },
      },
    });

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

    console.log(`Analytics prepared: ${analytics.totalEvents} events`);

    // 3. Initialize and run the AI agent
    let insights: string;
    try {
      const agent = new BusinessIntelligenceAgent();
      await agent.initialize();

      const businessContext: BusinessContext = {
        category,
        analytics,
        timeframe,
      };

      // 4. Generate comprehensive business insights
      insights = await agent.generateBusinessInsights(businessContext);
    } catch (agentError) {
      console.error("AI Agent failed, providing fallback analysis:", agentError);
      // Fallback analysis if AI agent fails
      insights = generateFallbackAnalysis(category, analytics);
    }

    // 5. Return structured response
    return NextResponse.json({
      success: true,
      category,
      analytics,
      insights,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Business intelligence analysis failed:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate business intelligence", 
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// ...existing code...