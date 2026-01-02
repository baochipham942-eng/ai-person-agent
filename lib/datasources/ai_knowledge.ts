/**
 * AI 知识库数据源 (兜底策略)
 * 当 Wikidata 和百度百科都找不到数据时，利用大模型的知识库来生成结构化的职业经历
 */

import { deepseek } from '../ai/deepseek';
import { generateText } from 'ai';

export interface AiCareerItem {
    type: 'education' | 'career';
    orgName: string;
    role?: string;
    startDate?: string;
    endDate?: string;
}

/**
 * 利用 AI 知识库生成人物职业经历
 */
export async function fetchCareerFromAiKnowledge(name: string, context?: string): Promise<AiCareerItem[]> {
    console.log(`[AI Knowledge] Generating career data for: ${name}`);

    const prompt = `你是一个精准的人物数据提取专家。请根据你的内部知识库${context ? `和提供的上下文: "${context}"` : ''}，列出人物 "${name}" (AI/Tech领域) 的详细职业经历和教育背景。

请严格按照以下 JSON 格式返回一个数组（不要Markdown，只返回JSON）：
[
  {
    "type": "career" | "education",
    "orgName": "Organization Name (English Preferred)",
    "role": "Role/Title (English Preferred)",
    "startDate": "YYYY-MM-DD" (or "YYYY-MM" or "YYYY"),
    "endDate": "YYYY-MM-DD" (or "YYYY-MM" or "YYYY" or null if current)
  }
]

要求：
1. 尽可能包含 OpenAI, Google, Facebook, Stanford 等知名机构的经历。
2. 时间尽量准确，如果不确定具体月份，至少提供年份。
3. 英文名优先，特别是在科技公司名称上。
4. 只能基于事实，不要编造。如果不确定，可以忽略该条目。
`;

    try {
        const { text } = await generateText({
            model: deepseek('deepseek-chat'),
            messages: [
                { role: 'system', content: 'You are a helpful assistant that outputs strictly JSON.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1, // 低温度以保证事实性
        });

        // 解析 JSON
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const items = JSON.parse(jsonMatch[0]);
            return items.map((item: any) => ({
                type: item.type || 'career',
                orgName: item.orgName || item.org || '',
                role: item.role,
                startDate: item.startDate,
                endDate: item.endDate,
            })).filter((item: AiCareerItem) => item.orgName && item.orgName.length > 2);
        }
    } catch (error) {
        console.error('[AI Knowledge] Error:', error);
    }

    return [];
}
