import { AnalyticsType, BusinessContext } from '../app/api/agent/agent';
import { ANALYTICAL_FRAMEWORKS, BUSINESS_HEALTH_INDICATORS } from './enhanced-prompts';
import { SeasonalContext } from './seasonal-analysis';

interface EnhancedAnalysis {
  categoryInsights: string;
  technicalMetrics: string;
  trendAnalysis: string;
  recommendations: string[];
  riskFactors: string[];
}

function analyzeTrends(analytics: AnalyticsType): string {
  const recentActivity = analytics.trends?.last7Days || 0;
  const totalEvents = analytics.totalEvents || 0;
  const dailyAverage = analytics.trends?.dailyAverage || 0;
  const weeklyTrend = analytics.trends?.weeklyTrend || 'stable';

  if (totalEvents === 0) {
    return "No activity recorded yet. This is an opportunity to establish baseline metrics.";
  }

  const recentPercentage = totalEvents > 0 ? ((recentActivity / totalEvents) * 100).toFixed(1) : 0;
  let trendAnalysis = '';

  if (recentActivity > 0) {
    trendAnalysis += `Recent activity shows significant engagement with ${recentActivity} events (${recentPercentage}% of total) in the last 7 days. `;
    if (weeklyTrend === 'up') {
      trendAnalysis += `The upward trend suggests growing system usage or increasing issue detection rate. `;
    }
  }

  trendAnalysis += `Daily average of ${dailyAverage.toFixed(1)} events indicates ${
    dailyAverage < 1 ? 'sporadic' : dailyAverage < 3 ? 'consistent' : 'high'
  } activity levels.`;

  return trendAnalysis;
}

function generateTechnicalMetrics(analytics: AnalyticsType): string {
  const metrics = analytics.categoryMetrics || {};
  const successRate = metrics.successRate || 0;
  const failureRate = metrics.failureRate || 0;
  const totalSuccessful = metrics.totalSuccessful || 0;
  const totalFailed = metrics.totalFailed || 0;

  let analysis = '';

  if (totalSuccessful === 0 && totalFailed === 0) {
    return "No completed events recorded. System reliability metrics pending.";
  }

  analysis += `System Performance Metrics:\n`;
  analysis += `• Success Rate: ${successRate.toFixed(1)}% (${totalSuccessful} successful events)\n`;
  analysis += `• Failure Rate: ${failureRate.toFixed(1)}% (${totalFailed} failed events)\n`;

  if (successRate < 50) {
    analysis += `\nCritical Alert: Low success rate indicates potential systemic issues requiring immediate attention.`;
  } else if (successRate < 80) {
    analysis += `\nWarning: Moderate success rate suggests room for reliability improvements.`;
  } else if (totalSuccessful > 0) {
    analysis += `\nPositive: Good success rate demonstrates system stability.`;
  }

  return analysis;
}

function generateCategorySpecificInsights(category: string, analytics: AnalyticsType): string {
  let insights = '';
  
  if (category.toLowerCase() === 'bug') {
    insights += `Bug Tracking Analysis:\n`;
    insights += `• Event Volume: ${analytics.totalEvents} total reported issues\n`;
    if (analytics.trends) {
      insights += `• Recent Activity: ${analytics.trends.last7Days} issues in last 7 days\n`;
      insights += `• Detection Rate: ${analytics.trends.dailyAverage.toFixed(1)} issues per day\n`;
    }
    
    const metrics = analytics.categoryMetrics;
    if (metrics) {
      insights += `\nIssue Resolution Metrics:\n`;
      insights += `• Resolution Rate: ${metrics.successRate.toFixed(1)}%\n`;
      insights += `• Resolved Issues: ${metrics.totalSuccessful}\n`;
      insights += `• Pending/Failed: ${metrics.totalFailed}\n`;
    }
  }

  return insights;
}

function generateActionableRecommendations(
  category: string,
  analytics: AnalyticsType,
  seasonalContext?: SeasonalContext
): string[] {
  const recommendations: string[] = [];
  const metrics = analytics.categoryMetrics || {};

  // Technical recommendations
  if (metrics.successRate < 50) {
    recommendations.push("🔴 URGENT: Implement comprehensive error logging and monitoring to identify failure patterns");
    recommendations.push("🔴 Consider establishing an incident response team for rapid issue resolution");
  } else if (metrics.successRate < 80) {
    recommendations.push("🟡 Enhance error tracking with detailed stack traces and context information");
    recommendations.push("🟡 Review and optimize error handling mechanisms");
  }

  // Volume-based recommendations
  if (analytics.trends?.dailyAverage && analytics.trends.dailyAverage > 3) {
    recommendations.push("📊 Consider implementing automated triage and categorization systems");
    recommendations.push("📊 Set up priority-based routing for high-volume issue management");
  }

  // Success rate recommendations
  if (metrics.totalSuccessful === 0 && metrics.totalFailed > 0) {
    recommendations.push("⚠️ Conduct immediate system health check and debugging session");
    recommendations.push("⚠️ Review and update error handling protocols");
  }

  return recommendations;
}

function identifyRiskFactors(analytics: AnalyticsType): string[] {
  const risks: string[] = [];
  const metrics = analytics.categoryMetrics || {};

  if (metrics.successRate < 50) {
    risks.push("🚨 Critical system reliability issues detected");
  }

  if (analytics.trends?.weeklyTrend === 'up' && metrics.failureRate > 20) {
    risks.push("⚠️ Increasing failure rate with growing usage - potential scalability issues");
  }

  if (analytics.totalEvents === 0) {
    risks.push("⚠️ No event data - system monitoring may be insufficient");
  }

  if (metrics.totalFailed > metrics.totalSuccessful) {
    risks.push("🔥 Failed events exceed successful ones - immediate attention required");
  }

  return risks;
}

export function generateEnhancedAnalysis(context: BusinessContext): string {
  const { category, analytics } = context;
  
  // Generate comprehensive analysis
  const trendAnalysis = analyzeTrends(analytics);
  const technicalMetrics = generateTechnicalMetrics(analytics);
  const categoryInsights = generateCategorySpecificInsights(category, analytics);
  const recommendations = generateActionableRecommendations(category, analytics);
  const risks = identifyRiskFactors(analytics);

  // Compile the enhanced report
  let report = `# Enhanced Business Intelligence Report for ${category}\n\n`;
  
  report += `## System Status Overview\n${categoryInsights}\n\n`;
  
  report += `## Trend Analysis\n${trendAnalysis}\n\n`;
  
  report += `## Technical Performance\n${technicalMetrics}\n\n`;
  
  if (recommendations.length > 0) {
    report += `## Priority Recommendations\n`;
    recommendations.forEach(rec => {
      report += `${rec}\n`;
    });
    report += '\n';
  }
  
  if (risks.length > 0) {
    report += `## Risk Assessment\n`;
    risks.forEach(risk => {
      report += `${risk}\n`;
    });
    report += '\n';
  }

  // Add generation timestamp
  report += `\n_Report generated on ${new Date().toLocaleString()}_\n`;
  report += `_Category: ${category}_\n`;

  return report;
}