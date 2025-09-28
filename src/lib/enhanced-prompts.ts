import { PromptTemplate } from "@langchain/core/prompts";
import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts";

// Define analytical frameworks that will be randomly selected to ensure diverse analysis
export const ANALYTICAL_FRAMEWORKS = [
  {
    name: "SWOT",
    structure: ["Strengths", "Weaknesses", "Opportunities", "Threats"]
  },
  {
    name: "PESTLE",
    structure: ["Political", "Economic", "Social", "Technological", "Legal", "Environmental"]
  },
  {
    name: "Porter's Five Forces",
    structure: [
      "Competitive Rivalry",
      "Supplier Power",
      "Buyer Power",
      "Threat of Substitution",
      "Threat of New Entry"
    ]
  },
  {
    name: "4Ps Marketing Mix",
    structure: ["Product", "Price", "Place", "Promotion"]
  }
];

// Business health indicators for structured analysis
export const BUSINESS_HEALTH_INDICATORS = [
  "Customer Engagement Rate",
  "Market Share Trajectory",
  "Seasonal Performance Variance",
  "Competitive Position",
  "Operational Efficiency",
  "Growth Potential",
  "Risk Exposure Level"
];

export const ENHANCED_SYSTEM_PROMPT = `You are an elite business intelligence analyst with exceptional expertise in data-driven decision making and market analysis. Your analyses are known for being:

1. Highly Specific: Never generic, always tailored to the exact business context
2. Data-Driven: Backing claims with numerical evidence and trends
3. Actionable: Providing concrete, implementable steps
4. Strategic: Considering both immediate and long-term implications
5. Contextual: Deeply integrated with seasonal, cultural, and market factors

Your expertise includes:
- Advanced market trend analysis
- Seasonal business optimization
- Festival-driven market dynamics
- Regional consumer behavior patterns
- Competitive landscape assessment
- Risk management and mitigation
- Growth opportunity identification

CRITICAL GUIDELINES:

1. AVOID GENERIC STATEMENTS:
   ❌ "Business is showing growth"
   ✅ "Sales increased 23% during festival season, with peak performance during evening hours (5-8 PM)"

2. MANDATE SPECIFIC METRICS:
   ❌ "Consider improving marketing"
   ✅ "Allocate 30% of marketing budget to Instagram ads based on 45% higher engagement rates"

3. CONTEXTUAL RECOMMENDATIONS:
   ❌ "Prepare for upcoming festivals"
   ✅ "Stock 40% more inventory for Diwali (Oct 15-19) based on last year's 67% surge in sweet box orders"

4. COMPETITIVE INSIGHTS:
   ❌ "Stay competitive in the market"
   ✅ "Undercut competitor festival pack prices by 5-10% while maintaining 25% margin through bulk purchasing"

Remember: Each analysis must be unique, drawing from current data and specific business context.`;

export function createEnhancedAnalysisPrompt(
  category: string,
  businessDescription: string,
  location: string,
  analytics: any,
  seasonalContext: any,
  marketResearch: any
): string {
  // Randomly select two analytical frameworks
  const selectedFrameworks = ANALYTICAL_FRAMEWORKS
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);

  const currentDate = new Date();
  const dateContext = `Analysis Date: ${currentDate.toLocaleDateString()}
Time Context: ${currentDate.getHours() < 12 ? "Morning" : currentDate.getHours() < 17 ? "Afternoon" : "Evening"}
Day of Week: ${currentDate.toLocaleDateString('en-US', { weekday: 'long' })}`;

  return `
BUSINESS INTELLIGENCE ANALYSIS REQUEST
${dateContext}

BUSINESS PROFILE:
Category: ${category}
Description: ${businessDescription}
Location: ${location}

ANALYTICAL FRAMEWORKS TO APPLY:
${selectedFrameworks.map(framework => `
${framework.name} Analysis:
${framework.structure.map(element => `${element}:`).join('\n')}`).join('\n\n')}

KEY METRICS TO ANALYZE:
${BUSINESS_HEALTH_INDICATORS.map(indicator => `${indicator}:`).join('\n')}

DATA SOURCES:
1. Historical Performance:
${JSON.stringify(analytics, null, 2)}

2. Seasonal Context:
${JSON.stringify(seasonalContext, null, 2)}

3. Market Research:
${JSON.stringify(marketResearch, null, 2)}

REQUIRED ANALYSIS COMPONENTS:

1. Performance Deep Dive:
   - YoY comparison with specific growth rates
   - Peak performance periods with exact timestamps
   - Bottom periods with identified causes

2. Market Position Analysis:
   - Share of market with percentage
   - Competitor price comparison (specific numbers)
   - Unique selling propositions (quantified)

3. Consumer Behavior Patterns:
   - Peak buying hours (time-specific)
   - Product preferences (ranked list)
   - Price sensitivity threshold

4. Seasonal Strategy:
   - Festival-specific inventory recommendations
   - Pricing strategy with exact margins
   - Marketing budget allocation

5. Risk Assessment:
   - Probability-weighted risks
   - Impact quantification
   - Mitigation strategies with costs

6. Growth Opportunities:
   - Market expansion potential (%)
   - New product viability scores
   - Revenue impact projections

FORMAT YOUR RESPONSE AS:

1. Executive Summary (2-3 key insights with specific metrics)

2. Detailed Analysis:
   - Framework 1 (${selectedFrameworks[0].name})
   - Framework 2 (${selectedFrameworks[1].name})
   - Business Health Scorecard

3. Strategic Recommendations:
   - Immediate Actions (Next 7 days)
   - Short-term Strategy (30 days)
   - Long-term Opportunities (90+ days)

4. Risk Mitigation Plan:
   - High Priority Risks
   - Mitigation Steps
   - Resource Requirements

5. Implementation Roadmap:
   - Timeline
   - Budget Allocation
   - Success Metrics

REMEMBER:
- Every metric must be specific and numerical
- Every recommendation must be actionable
- Every insight must be contextual
- Every projection must be justified with data`;
}

export function createSeasonalStrategyPrompt(
  businessType: string,
  season: string,
  festivals: string[],
  location: string,
  historicalData: any
): string {
  return `
SEASONAL BUSINESS STRATEGY ANALYSIS

Business Type: ${businessType}
Current Season: ${season}
Upcoming Festivals: ${festivals.join(", ")}
Location: ${location}

Historical Performance:
${JSON.stringify(historicalData, null, 2)}

REQUIRED ANALYSIS:

1. Seasonal Performance Optimization:
   - Compare current performance with last season
   - Identify specific peak days and hours
   - Calculate optimal inventory levels
   - Project demand variations

2. Festival Readiness Assessment:
   - Historical festival performance metrics
   - Product-specific demand patterns
   - Pricing optimization opportunities
   - Marketing campaign timing

3. Operational Recommendations:
   - Staffing requirements (specific numbers)
   - Inventory management plan
   - Supply chain optimization
   - Quality control measures

4. Marketing Strategy:
   - Channel-specific ROI data
   - Timing optimization
   - Budget allocation
   - Message effectiveness metrics

5. Competitive Analysis:
   - Market share during festivals
   - Pricing strategy comparison
   - Product mix analysis
   - Service level benchmarking

FORMAT REQUIREMENTS:
- Include specific numbers and percentages
- Provide exact dates and times
- Calculate ROI for each recommendation
- Include implementation timeline
- Define success metrics`;
}

export function createCustomerInsightPrompt(
  businessType: string,
  customerData: any,
  seasonalTrends: any
): string {
  return `
CUSTOMER BEHAVIOR ANALYSIS

Business Type: ${businessType}
Time Period: ${new Date().toLocaleDateString()}

Customer Data:
${JSON.stringify(customerData, null, 2)}

Seasonal Trends:
${JSON.stringify(seasonalTrends, null, 2)}

ANALYSIS REQUIREMENTS:

1. Buying Pattern Analysis:
   - Peak purchase times (hourly breakdown)
   - Product preference correlation
   - Price sensitivity thresholds
   - Order size patterns

2. Seasonal Variations:
   - Festival impact on preferences
   - Weather impact on sales
   - Event-driven behavior changes
   - Promotional response rates

3. Customer Segmentation:
   - Value-based segments
   - Frequency-based segments
   - Product preference segments
   - Seasonal behavior segments

4. Loyalty Analysis:
   - Repeat purchase patterns
   - Customer lifetime value
   - Churn risk indicators
   - Reactivation opportunities

DELIVERABLES:
- Segment-specific strategies
- Personalization recommendations
- Retention tactics
- Growth opportunities

FORMAT:
- Use specific numbers
- Include time-based patterns
- Provide segment-specific insights
- Calculate impact metrics`;
}

export const INSIGHT_VALIDATION_PROMPT = `
Validate and enhance the following business insights:

{insights}

VALIDATION CRITERIA:
1. Specificity Check:
   - Are all metrics numerical?
   - Are recommendations actionable?
   - Are timelines specific?

2. Context Validation:
   - Seasonal relevance
   - Cultural appropriateness
   - Market reality check

3. Implementation Feasibility:
   - Resource requirements
   - Timeline practicality
   - Budget considerations

4. Impact Assessment:
   - Expected ROI
   - Risk factors
   - Success metrics

Enhance or correct any insights that don't meet these criteria.`;

export const OUTPUT_ENHANCEMENT_PROMPT = `
Enhance the following business analysis output:

{output}

ENHANCEMENT REQUIREMENTS:

1. Specificity Enhancement:
   - Add specific numbers
   - Include exact timelines
   - Define precise targets

2. Actionability Improvement:
   - Break down into steps
   - Add resource requirements
   - Include success metrics

3. Contextual Enrichment:
   - Add seasonal factors
   - Include cultural context
   - Consider local market dynamics

4. Strategic Depth:
   - Long-term implications
   - Competitive considerations
   - Risk mitigation steps

FORMAT:
Provide enhanced output with clearly marked improvements in each section.`;