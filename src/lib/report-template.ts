interface ReportSections {
  summary: string;
  marketAnalysis: string;
  seasonalInsights: string;
  competitionAnalysis: string;
  riskAnalysis: string;
}

interface ReportRecommendations {
  immediate: string;
  shortTerm: string;
  longTerm: string;
  roadmap: string;
}

export function createReportTemplate(
  businessName: string,
  category: string,
  sections: ReportSections,
  recommendations: ReportRecommendations
): string {
  return `
# Business Intelligence Report for ${businessName} (${category})

## Executive Summary
${sections.summary}

## Market Analysis
${sections.marketAnalysis}

## Seasonal Insights
${sections.seasonalInsights}

## Competition Analysis
${sections.competitionAnalysis}

## Risk Assessment
${sections.riskAnalysis}

## Recommendations

### Immediate Actions
${recommendations.immediate}

### Short-Term Strategy (Next 90 Days)
${recommendations.shortTerm}

### Long-Term Vision (6-12 Months)
${recommendations.longTerm}

## Implementation Roadmap
${recommendations.roadmap}

---
Report generated on ${new Date().toLocaleString()}
`.trim();
}