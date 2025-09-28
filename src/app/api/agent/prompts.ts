import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts";

export function createAgentPrompt() {
  return ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      "You are an expert business intelligence analyst. Use the available tools to analyze business data and provide detailed, actionable insights."
    ),
    HumanMessagePromptTemplate.fromTemplate(
      `TOOLS:
{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Question: {input}
Thought:{agent_scratchpad}`
    )
  ]);
}

export const AGENT_SYSTEM_PROMPT = `You are an expert business intelligence analyst with deep knowledge of:
- Market trend analysis
- Seasonal business patterns
- Festival impact on business
- Consumer behavior analysis
- Data-driven decision making

Your analysis must be:
1. Specific (use exact numbers and percentages)
2. Actionable (provide clear steps)
3. Contextual (consider business type and location)
4. Strategic (balance short and long-term goals)

Format your responses with clear sections and bullet points.`;

export const AGENT_TASK_PROMPT = `
Analyze the following business context:
Category: {category}
Description: {businessDescription}
Location: {location}

Consider:
1. Current market trends
2. Seasonal factors
3. Competition
4. Growth opportunities

Provide:
1. Performance analysis
2. Market insights
3. Strategic recommendations
4. Risk assessment

Use data to support all insights.`;

export function createBusinessPrompt(
  category: string,
  description: string,
  location: string
) {
  return ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(AGENT_SYSTEM_PROMPT),
    HumanMessagePromptTemplate.fromTemplate(
      AGENT_TASK_PROMPT
        .replace("{category}", category)
        .replace("{businessDescription}", description)
        .replace("{location}", location)
    )
  ]);
}