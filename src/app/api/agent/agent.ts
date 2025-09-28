import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { DynamicTool } from "@langchain/core/tools";
import { AgentExecutor, createReactAgent } from "langchain/agents";
import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { createAgentPrompt, createBusinessPrompt } from "./prompts";
import { analyzeSeasonalContext, extractLocation } from "@/lib/seasonal-analysis";
import { generateMarketQueries, aggregateMarketResearch } from "@/lib/market-research";
import { generateEnhancedAnalysis } from "@/lib/business-intelligence";
import { createReportTemplate } from "@/lib/report-template";
import { 
  ENHANCED_SYSTEM_PROMPT,
  createEnhancedAnalysisPrompt,
  createSeasonalStrategyPrompt,
  createCustomerInsightPrompt,
  INSIGHT_VALIDATION_PROMPT,
  OUTPUT_ENHANCEMENT_PROMPT
} from "@/lib/enhanced-prompts";

// Types
export interface AnalyticsType {
  totalEvents: number;
  recentEvents: Array<any>;
  trends?: any;
  categoryMetrics?: any;
}

export interface BusinessContext {
  category: string;
  analytics: AnalyticsType;
  timeframe: string;
  location?: string;
  businessDescription?: string;
}

interface SerpResult {
  title: string;
  snippet: string;
  link: string;
  date?: string;
  source: string;
  relevanceScore?: number;
}

interface SerpResponse {
  results?: SerpResult[];
  error?: string;
}

// Helper functions for analytics
export function calculateTrends(events: any[]) {
  if (events.length === 0) return null;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = events.filter(e => new Date(e.createdAt) > thirtyDaysAgo);
  const last7Days = events.filter(e => new Date(e.createdAt) > sevenDaysAgo);
  return {
    last30Days: last30Days.length,
    last7Days: last7Days.length,
    dailyAverage: last7Days.length / 7,
    weeklyTrend: last7Days.length > (last30Days.length - last7Days.length) / 3 ? 'up' : 'down'
  };
}

export function calculateCategoryMetrics(events: any[]) {
  const successfulEvents = events.filter(e => e.deliveryStatus === 'delivered');
  const failedEvents = events.filter(e => e.deliveryStatus === 'failed');
  return {
    successRate: events.length > 0 ? (successfulEvents.length / events.length) * 100 : 0,
    failureRate: events.length > 0 ? (failedEvents.length / events.length) * 100 : 0,
    totalSuccessful: successfulEvents.length,
    totalFailed: failedEvents.length,
  };
}

export function generateFallbackAnalysis(category: string, analytics: any): string {
  const businessContext: BusinessContext = {
    category,
    analytics,
    timeframe: '30d'
  };
  
  // Use the enhanced analysis from our new module
  return generateEnhancedAnalysis(businessContext);
}

// Utility functions
function calculateRelevanceScore(result: any, category: string): number {
  let score = 0;
  const text = `${result.title} ${result.snippet}`.toLowerCase();
  const categoryLower = category.toLowerCase();
  
  // Business relevance keywords
  const businessKeywords = ['market', 'sales', 'revenue', 'customer', 'demand', 'trend', 'growth', 'economy'];
  const seasonalKeywords = ['festival', 'holiday', 'season', 'celebration', 'event'];
  
  // Score based on category match
  if (text.includes(categoryLower)) score += 3;
  
  // Score based on business keywords
  businessKeywords.forEach(keyword => {
    if (text.includes(keyword)) score += 1;
  });
  
  // Score based on seasonal/event keywords
  seasonalKeywords.forEach(keyword => {
    if (text.includes(keyword)) score += 2;
  });
  
  return score;
}

async function searchCurrentEvents(query: string, category: string): Promise<SerpResponse> {
  const apiKey = process.env.GOOGLE_SERP_API_KEY;
  if (!apiKey) {
    console.warn("GOOGLE_SERP_API_KEY not found, skipping web search");
    return { error: "Missing SERP API key" };
  }

  const enhancedQuery = `${query} ${category} business trends market news 2025`;
  const serpUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(enhancedQuery)}&api_key=${apiKey}&num=10&tbm=nws`;
  
  try {
    const res = await fetch(serpUrl);
    const data = await res.json();
    
    const results = [
      ...(data.news_results || []).slice(0, 5),
      ...(data.organic_results || []).slice(0, 3)
    ].map(result => ({
      title: result.title,
      snippet: result.snippet,
      link: result.link,
      date: result.date,
      source: result.source,
      relevanceScore: calculateRelevanceScore(result, category)
    })).sort((a, b) => b.relevanceScore - a.relevanceScore);

    return { results };
  } catch (err) {
    console.warn("SERP API failed:", err);
    return { error: String(err) };
  }
}

// Create a simple prompt template
function createReactPrompt() {
  return PromptTemplate.fromTemplate(`
You are an expert business intelligence analyst specializing in providing data-driven insights and recommendations. Your analysis should be specifically tailored to the business context and industry trends.

BUSINESS CONTEXT:
Category: {category}
Business Description: {businessDescription}
Timeframe: {timeframe}

TOOLS:
{tools}

When analyzing:
1. Consider the specific business context and description
2. Use real-world market data from SERP results
3. Combine historical analytics with current market trends
4. Provide actionable recommendations
5. Consider seasonality and industry-specific factors

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do, considering the business context
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question, with context-aware insights

Question: {input}
Thought:{agent_scratchpad}
`);
}

// RAG System Implementation
class BusinessRAGSystem {
  private vectorStore?: MemoryVectorStore;
  private embeddings: GoogleGenerativeAIEmbeddings;
  
  constructor() {
    this.embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GEMINI_API_KEY!,
      modelName: "embedding-001",
    });
  }

  public async initializeVectorStore(documents: Document[]): Promise<void> {
    try {
      this.vectorStore = await MemoryVectorStore.fromDocuments(documents, this.embeddings);
    } catch (error) {
      console.error("Failed to initialize vector store:", error);
      throw error;
    }
  }

  private async searchIndustryTrends(category: string, businessDescription?: string): Promise<Document[]> {
    const query = businessDescription 
      ? `${category} business trends ${businessDescription}`
      : `${category} business market trends`;
      
    const serpResults = await searchCurrentEvents(query, category);
    
    if (serpResults.error || !serpResults.results) {
      console.warn("Failed to fetch SERP results:", serpResults.error);
      return [];
    }

    // Convert SERP results to documents for RAG
    return serpResults.results.map(result => new Document({
      pageContent: `${result.title}\n${result.snippet}`,
      metadata: {
        source: result.source,
        date: result.date,
        relevanceScore: result.relevanceScore,
        url: result.link
      }
    }));
  }

  public async retrieveRelevantContext(query: string, k = 5): Promise<Document[]> {
    if (!this.vectorStore) {
      throw new Error("Vector store not initialized");
    }
    return await this.vectorStore.similaritySearch(query, k);
  }

  public async prepareDocuments(analytics: AnalyticsType, serpResults: SerpResult[], category: string): Promise<Document[]> {
    const documents: Document[] = [];

    documents.push(new Document({
      pageContent: `Business Category: ${category}
      Total Events: ${analytics.totalEvents}
      Recent Activity: ${JSON.stringify(analytics.recentEvents.slice(0, 5))}
      Business Metrics: ${JSON.stringify(analytics.categoryMetrics || {})}`,
      metadata: { source: "analytics", type: "business_data" }
    }));

    serpResults.forEach((result, index) => {
      documents.push(new Document({
        pageContent: `Title: ${result.title}
        Content: ${result.snippet}
        Source: ${result.source}
        Date: ${result.date}
        Relevance Score: ${result.relevanceScore}`,
        metadata: { 
          source: "serp", 
          type: "current_events",
          url: result.link,
          index: index
        }
      }));
    });

    return documents;
  }
}

// Main Agent Implementation
export class BusinessIntelligenceAgent {
  private llm: ChatGoogleGenerativeAI;
  private ragSystem: BusinessRAGSystem;
  private agent?: AgentExecutor;

  constructor() {
    this.llm = new ChatGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY!,
      model: "gemini-pro",
      temperature: 0.7,  // Increased for more creative responses
      maxOutputTokens: 2048,  // Increased for more detailed responses
      topP: 0.9,  // More diverse token selection
      topK: 40,   // Broader token consideration
    });
    
    this.ragSystem = new BusinessRAGSystem();
  }

  async initialize() {
    try {
      // Verify API keys are present
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured");
      }
      
      if (!process.env.GOOGLE_SERP_API_KEY) {
        throw new Error("GOOGLE_SERP_API_KEY is not configured");
      }

      const tools = [
        new DynamicTool({
          name: "search_current_events",
          description: "Search for current events and market trends relevant to the business category",
          func: async (query: string) => {
            const [searchQuery, category] = query.split('|');
            const results = await searchCurrentEvents(searchQuery, category || '');
            return JSON.stringify(results);
          },
        }),
        
        new DynamicTool({
          name: "analyze_business_data",
          description: "Analyze business analytics data for trends and patterns",
          func: async (analyticsData: string) => {
            const analytics = JSON.parse(analyticsData);
            return this.analyzeBusinessTrends(analytics);
          },
        }),
        
        new DynamicTool({
          name: "retrieve_context",
          description: "Retrieve relevant context from RAG system based on query",
          func: async (query: string) => {
            try {
              const relevantDocs = await this.ragSystem.retrieveRelevantContext(query);
              return relevantDocs.map(doc => doc.pageContent).join('\n\n');
            } catch (error) {
              return "RAG system not ready. Please initialize with data first.";
            }
          },
        })
      ];

      const prompt = createAgentPrompt();
      const agent = await createReactAgent({
        llm: this.llm,
        tools,
        prompt,
      });

      this.agent = new AgentExecutor({
        agent,
        tools,
        verbose: true,
        maxIterations: 3,
      });
    } catch (error) {
      console.error("Failed to initialize agent:", error);
      throw error;
    }
  }

  private analyzeBusinessTrends(analytics: AnalyticsType): string {
    const trends = [];
    
    if (analytics.totalEvents > 0) {
      const recentEvents = analytics.recentEvents.slice(0, 5);
      const timeSpan = this.calculateTimeSpan(recentEvents);
      trends.push(`Recent activity: ${analytics.totalEvents} total events over ${timeSpan}`);
    }
    
    if (analytics.trends) {
      trends.push(`Weekly trend: ${analytics.trends.weeklyTrend}`);
      trends.push(`Daily average: ${analytics.trends.dailyAverage.toFixed(1)} events`);
    }
    
    if (analytics.categoryMetrics) {
      trends.push(`Success rate: ${analytics.categoryMetrics.successRate.toFixed(1)}%`);
    }
    
    return trends.join('. ');
  }

  private calculateTimeSpan(events: any[]): string {
    if (events.length === 0) return "no recent activity";
    
    const newest = new Date(events[0].createdAt);
    const oldest = new Date(events[events.length - 1].createdAt);
    const diffDays = Math.ceil((newest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24));
    
    return `${diffDays} days`;
  }

  async generateBusinessInsights(context: BusinessContext): Promise<string> {
    try {
      // 1. Extract location and analyze seasonal context
      const location = context.businessDescription 
        ? extractLocation(context.businessDescription)
        : "All India";

      const seasonalContext = analyzeSeasonalContext(
        context.category,
        location
      );

      // 2. Generate targeted market research queries
      const marketQueries = generateMarketQueries(
        context.category,
        context.businessDescription || "",
        seasonalContext,
        location
      );

      // 3. Execute market research queries in parallel
      const searchResults = await Promise.all(
        marketQueries.map(query => searchCurrentEvents(query.query, context.category))
      );

      // 4. Aggregate and analyze market research
      const marketResearch = aggregateMarketResearch(
        searchResults.flatMap(result => result.results || []),
        seasonalContext
      );

      // 5. Prepare RAG documents
      const documents: Document[] = [];

      // Add business profile
      if (context.businessDescription) {
        documents.push(new Document({
          pageContent: `Business Description: ${context.businessDescription}`,
          metadata: { source: "business_profile", type: "context" }
        }));
      }

      // Add seasonal context
      documents.push(new Document({
        pageContent: `Seasonal Analysis:\n${JSON.stringify(seasonalContext, null, 2)}`,
        metadata: { source: "seasonal_analysis", type: "context" }
      }));

      // Add market research
      documents.push(new Document({
        pageContent: `Market Research:\n${JSON.stringify(marketResearch, null, 2)}`,
        metadata: { source: "market_research", type: "context" }
      }));

      // Add analytics
      documents.push(new Document({
        pageContent: `Business Analytics:\n${JSON.stringify(context.analytics, null, 2)}`,
        metadata: { source: "analytics", type: "data" }
      }));

      // Initialize vector store
      await this.ragSystem.initializeVectorStore(documents);

      // 6. Generate enhanced analysis prompts
      const mainAnalysisPrompt = createEnhancedAnalysisPrompt(
        context.category,
        context.businessDescription || "",
        location,
        context.analytics,
        seasonalContext,
        marketResearch
      );

      const seasonalPrompt = createSeasonalStrategyPrompt(
        context.category,
        seasonalContext.currentSeason?.name || "No specific season",
        seasonalContext.upcomingFestivals.map(f => f.name),
        location,
        context.analytics
      );

      const customerPrompt = createCustomerInsightPrompt(
        context.category,
        context.analytics,
        seasonalContext
      );

      if (!this.agent) {
        throw new Error("Agent not initialized");
      }

      // 7. Generate multi-perspective analysis
      const [mainAnalysis, seasonalAnalysis, customerAnalysis] = await Promise.all([
        this.agent.invoke({ input: mainAnalysisPrompt }),
        this.agent.invoke({ input: seasonalPrompt }),
        this.agent.invoke({ input: customerPrompt })
      ]);

      // 8. Combine and enhance insights
      const combinedAnalysis = `
      MAIN BUSINESS ANALYSIS:
      ${mainAnalysis.output}

      SEASONAL STRATEGY:
      ${seasonalAnalysis.output}

      CUSTOMER INSIGHTS:
      ${customerAnalysis.output}`;

      // 9. Validate insights
      const validationResult = await this.agent.invoke({
        input: INSIGHT_VALIDATION_PROMPT.replace("{insights}", combinedAnalysis)
      });

      // 10. Final enhancement pass
      const enhancedResult = await this.agent.invoke({
        input: OUTPUT_ENHANCEMENT_PROMPT.replace("{output}", validationResult.output)
      });

      // 9. Format final report
      return createReportTemplate(
        context.businessDescription?.split(' ')[0] || context.category,
        context.category,
        {
          summary: mainAnalysis.output,
          marketAnalysis: marketResearch.trends.join("\n"),
          seasonalInsights: seasonalContext.seasonalTrends.join("\n"),
          competitionAnalysis: marketResearch.competitiveAnalysis.join("\n"),
          riskAnalysis: this.extractRiskAnalysis(enhancedResult.output)
        },
        {
          immediate: this.extractRecommendations(enhancedResult.output, "immediate"),
          shortTerm: this.extractRecommendations(enhancedResult.output, "short-term"),
          longTerm: this.extractRecommendations(enhancedResult.output, "long-term"),
          roadmap: this.generateImplementationRoadmap(enhancedResult.output)
        }
      );
    } catch (error) {
      console.error("Agent execution failed:", error);
      return generateFallbackAnalysis(context.category, context.analytics);
    }
  }

  private extractRiskAnalysis(output: string): string {
    // Implementation for extracting risk analysis from the output
    return output
      .split("\n")
      .filter(line => line.toLowerCase().includes("risk") || line.toLowerCase().includes("challenge"))
      .join("\n");
  }

  private extractRecommendations(output: string, timeframe?: "immediate" | "short-term" | "long-term"): string {
    if (timeframe) {
      const lines = output.split("\n");
      let collecting = false;
      const recommendations: string[] = [];
  
      for (const line of lines) {
        if (line.toLowerCase().includes(timeframe)) {
          collecting = true;
          continue;
        }
        if (collecting && line.trim() && !line.toLowerCase().includes("term")) {
          recommendations.push(line.trim());
        }
        if (collecting && (line.toLowerCase().includes("term") || line.startsWith("#"))) {
          break;
        }
      }
  
      return recommendations.join("\n");
    } else {
      const sentences = output.split(/[.!?]+/);
      const recommendations = sentences
        .filter(sentence => 
          sentence.toLowerCase().includes('should') ||
          sentence.toLowerCase().includes('recommend') ||
          sentence.toLowerCase().includes('suggest') ||
          sentence.toLowerCase().includes('consider')
        )
        .map(rec => `• ${rec.trim()}`)
        .join('\n');
      
      return recommendations || "• Continue monitoring your business metrics\n• Stay updated with market trends\n• Consider seasonal opportunities";
    }
  }

  private generateImplementationRoadmap(output: string): string {
    return `Implementation Roadmap:
1. Immediate Actions (Next 30 Days)
${this.extractRecommendations(output, "immediate")}

2. Short-term Goals (90 Days)
${this.extractRecommendations(output, "short-term")}

3. Long-term Strategy (6-12 Months)
${this.extractRecommendations(output, "long-term")}`;
  }

  private fallbackAnalysis(context: BusinessContext): string {
    return `
# Business Analysis for ${context.category}

## Current Status
Your ${context.category} business has recorded ${context.analytics.totalEvents} events. 

## General Recommendations
- Monitor seasonal trends that affect your business category
- Keep track of local events and festivals that might increase demand
- Analyze your recent customer activity patterns
- Consider promotional strategies during peak periods

*This is a basic analysis. For detailed insights, please ensure all required API keys are configured.*
    `;
  }
}