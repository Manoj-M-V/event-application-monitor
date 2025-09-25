import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { DynamicTool } from "@langchain/core/tools";
import { AgentExecutor, createReactAgent } from "langchain/agents";
import { PromptTemplate } from "@langchain/core/prompts";
import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

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
  const trends = analytics.trends;
  const metrics = analytics.categoryMetrics;
  let analysis = `# Business Analysis for ${category}\n\n`;
  analysis += `## Current Status\n`;
  analysis += `Your ${category} business has recorded ${analytics.totalEvents} total events.\n\n`;
  if (trends) {
    analysis += `## Activity Trends\n`;
    analysis += `- Last 7 days: ${trends.last7Days} events\n`;
    analysis += `- Last 30 days: ${trends.last30Days} events\n`;
    analysis += `- Daily average: ${trends.dailyAverage.toFixed(1)} events\n`;
    analysis += `- Weekly trend: ${trends.weeklyTrend === 'up' ? '📈 Increasing' : '📉 Decreasing'}\n\n`;
  }
  if (metrics) {
    analysis += `## Performance Metrics\n`;
    analysis += `- Success rate: ${metrics.successRate.toFixed(1)}%\n`;
    analysis += `- Successful events: ${metrics.totalSuccessful}\n`;
    analysis += `- Failed events: ${metrics.totalFailed}\n\n`;
  }
  analysis += `## General Recommendations\n`;
  analysis += `- Monitor seasonal trends that affect your ${category} business\n`;
  analysis += `- Keep track of local events and festivals that might increase demand\n`;
  analysis += `- Analyze your recent customer activity patterns\n`;
  analysis += `- Consider promotional strategies during peak periods\n\n`;
  if (metrics && metrics.failureRate > 10) {
    analysis += `⚠️ **Action Required**: Your failure rate is ${metrics.failureRate.toFixed(1)}%. Consider investigating delivery issues.\n\n`;
  }
  analysis += `*Basic analysis provided. For AI-powered insights, ensure GEMINI_API_KEY and GOOGLE_SERP_API_KEY are configured.*`;
  return analysis;
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
      temperature: 0.3,
    });
    
    this.ragSystem = new BusinessRAGSystem();
  }

  async initialize() {
    try {
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

      const prompt = createReactPrompt();
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
      // 1. Enhanced SERP search with business description
      const businessQuery = context.businessDescription
        ? `${context.category} business trends market analysis ${context.businessDescription}`
        : `${context.category} business trends market analysis`;

      const [generalTrends, specificTrends] = await Promise.all([
        searchCurrentEvents(businessQuery, context.category),
        context.businessDescription
          ? searchCurrentEvents(
              `${context.businessDescription} industry insights market analysis`,
              context.category
            )
          : Promise.resolve({ results: [] })
      ]);

      const serpResults = {
        results: [
          ...(generalTrends.results || []),
          ...(specificTrends.results || [])
        ].sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      };

      if (!serpResults.results.length) {
        console.warn("SERP search failed or returned no results");
      }

      const documents = await this.ragSystem.prepareDocuments(
        context.analytics,
        serpResults.results || [],
        context.category
      );

      // Add business description as a document if available
      if (context.businessDescription) {
        documents.unshift(new Document({
          pageContent: `Business Description: ${context.businessDescription}`,
          metadata: { source: "business_profile", type: "context" }
        }));
      }

      await this.ragSystem.initializeVectorStore(documents);

      const query = `
      As a business intelligence analyst, analyze the following business context and provide actionable insights:
      
      Business Category: ${context.category}
      ${context.businessDescription ? `Business Description: ${context.businessDescription}\n` : ''}
      Total Events: ${context.analytics.totalEvents}
      Timeframe: ${context.timeframe}
      
      Consider the specific nature of this business while analyzing:
      1. Current business performance in the context of their specific market
      2. Industry-specific trends and patterns
      3. Actionable recommendations tailored to their business model
      4. Seasonal opportunities and market insights relevant to their sector
      5. Competitive analysis based on market research
      
      Format your response as a comprehensive business intelligence report with specific, contextualized recommendations.
      `;

      if (this.agent) {
        const result = await this.agent.invoke({ input: query });
        return this.formatBusinessReport(result.output, context);
      } else {
        throw new Error("Agent not initialized");
      }
    } catch (error) {
      console.error("Agent execution failed:", error);
      return this.fallbackAnalysis(context);
    }
  }

  private formatBusinessReport(agentOutput: string, context: BusinessContext): string {
    return `
# Business Intelligence Report for ${context.category}

${context.businessDescription ? `## Business Context\n${context.businessDescription}\n\n` : ''}

## Executive Summary
${agentOutput}

## Key Metrics
- Total Events: ${context.analytics.totalEvents}
- Analysis Period: ${context.timeframe || 'Recent activity'}
- Category: ${context.category}
${context.analytics.trends ? `- Trend: ${context.analytics.trends.weeklyTrend === 'up' ? '📈 Increasing' : '📉 Decreasing'}` : ''}
${context.analytics.categoryMetrics ? `- Success Rate: ${context.analytics.categoryMetrics.successRate.toFixed(1)}%` : ''}

## Market Analysis & Recommendations
Based on your specific business context and current market analysis, here are the key action items:

${this.extractRecommendations(agentOutput)}

---
*Report generated on ${new Date().toLocaleDateString()} using AI-powered business intelligence*
    `.trim();
  }

  private extractRecommendations(output: string): string {
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