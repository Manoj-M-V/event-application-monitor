import { PromptTemplate } from "@langchain/core/prompts";
import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts";

export const MARKET_ANALYSIS_SYSTEM_PROMPT = `You are an expert business intelligence analyst with deep knowledge of Indian markets, festivals, and consumer behavior. Your task is to analyze business data and market research to provide actionable insights.

Key Responsibilities:
1. Analyze seasonal and festival impacts on business
2. Identify market trends and consumer behavior patterns
3. Provide data-driven recommendations
4. Consider regional and cultural factors
5. Focus on actionable insights

Guidelines:
- Always consider the specific business context and description
- Integrate seasonal and festival data into analysis
- Focus on region-specific insights
- Provide concrete, actionable recommendations
- Support insights with data when available
- Consider both immediate and long-term strategies`;

export const BUSINESS_ANALYSIS_TEMPLATE = `
Business Context:
Category: {category}
Description: {businessDescription}
Location: {location}

Current Analytics:
{analytics}

Seasonal Context:
{seasonalContext}

Market Research:
{marketResearch}

Tasks:
1. Analyze current business performance considering:
   - Historical data
   - Seasonal factors
   - Festival impact
   - Market trends

2. Identify key patterns in:
   - Consumer behavior
   - Sales trends
   - Seasonal variations
   - Festival-related changes

3. Provide specific recommendations for:
   - Immediate actions (next 30 days)
   - Short-term strategy (next 90 days)
   - Long-term planning (6-12 months)

4. Consider:
   - Regional factors
   - Cultural events
   - Competition
   - Market opportunities

Format your response as a structured business intelligence report with clear sections and actionable insights.`;

export const SEASONAL_ANALYSIS_TEMPLATE = `
Analyzing seasonal and festival impact for {businessType} business:

Current Season: {season}
Upcoming Festivals: {festivals}
Region: {location}

Consider:
1. Historical seasonal patterns
2. Festival-specific consumer behavior
3. Regional variations
4. Cultural factors
5. Weather impact

Provide insights on:
1. Expected demand changes
2. Pricing strategies
3. Inventory planning
4. Marketing opportunities`;

export const COMPETITION_ANALYSIS_TEMPLATE = `
Analyzing market competition for {businessType} in {location}:

Current Market Position:
{marketPosition}

Consider:
1. Direct competitors
2. Indirect competitors
3. Market share
4. Competitive advantages
5. Threat analysis

Provide insights on:
1. Competitive positioning
2. Market opportunities
3. Threat mitigation
4. Differentiation strategies`;

export function createAnalysisPrompt(
  category: string,
  businessDescription: string,
  location: string,
  analytics: any,
  seasonalContext: any,
  marketResearch: any
): string {
  return PromptTemplate.fromTemplate(BUSINESS_ANALYSIS_TEMPLATE)
    .format({
      category,
      businessDescription,
      location,
      analytics: JSON.stringify(analytics, null, 2),
      seasonalContext: JSON.stringify(seasonalContext, null, 2),
      marketResearch: JSON.stringify(marketResearch, null, 2)
    });
}

export function createSeasonalPrompt(
  businessType: string,
  season: string,
  festivals: string[],
  location: string
): string {
  return PromptTemplate.fromTemplate(SEASONAL_ANALYSIS_TEMPLATE)
    .format({
      businessType,
      season,
      festivals: festivals.join(", "),
      location
    });
}

export function createCompetitionPrompt(
  businessType: string,
  location: string,
  marketPosition: any
): string {
  return PromptTemplate.fromTemplate(COMPETITION_ANALYSIS_TEMPLATE)
    .format({
      businessType,
      location,
      marketPosition: JSON.stringify(marketPosition, null, 2)
    });
}

export const ANALYSIS_CHAIN_PROMPT = ChatPromptTemplate.fromPromptMessages([
  SystemMessagePromptTemplate.fromTemplate(MARKET_ANALYSIS_SYSTEM_PROMPT),
  HumanMessagePromptTemplate.fromTemplate(BUSINESS_ANALYSIS_TEMPLATE)
]);

// Validation and enhancement prompts
export const RECOMMENDATION_VALIDATION_PROMPT = `
Validate and enhance the following business recommendations:

Recommendations:
{recommendations}

Consider:
1. Feasibility
2. ROI potential
3. Implementation timeline
4. Resource requirements
5. Risk factors

Provide:
1. Validated recommendations
2. Implementation steps
3. Success metrics
4. Risk mitigation strategies`;

export const INSIGHT_ENHANCEMENT_PROMPT = `
Enhance the following business insights with actionable details:

Insights:
{insights}

Enhance with:
1. Specific action items
2. Timeline recommendations
3. Expected outcomes
4. Required resources
5. Success metrics
6. Risk considerations`;

// Helper function to create final report template
export function createReportTemplate(
  businessName: string,
  category: string,
  analysis: any,
  recommendations: any
): string {
  return `
# Business Intelligence Report for ${businessName}
## Category: ${category}
Generated: ${new Date().toLocaleDateString()}

## Executive Summary
${analysis.summary}

## Market Analysis
${analysis.marketAnalysis}

## Seasonal Insights
${analysis.seasonalInsights}

## Competition Analysis
${analysis.competitionAnalysis}

## Recommendations
### Immediate Actions (Next 30 Days)
${recommendations.immediate}

### Short-term Strategy (90 Days)
${recommendations.shortTerm}

### Long-term Planning (6-12 Months)
${recommendations.longTerm}

## Risk Analysis
${analysis.riskAnalysis}

## Implementation Roadmap
${recommendations.roadmap}`;
}