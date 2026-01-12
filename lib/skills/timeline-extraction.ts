/**
 * Timeline Extraction Skill
 *
 * 从非结构化文本中提取时间线事件：
 * - 职业经历
 * - 教育经历
 * - 创业/获奖事件
 */

import { generateText } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';

// ============== 类型定义 ==============

export interface TimelineEvent {
    title: string;           // 组织名称
    role?: string;           // 职位或学位
    startDate?: string;      // YYYY-MM-DD 或 YYYY
    endDate?: string;        // YYYY-MM-DD 或 "present"
    type: 'career' | 'education' | 'founding' | 'award';
    confidence: number;      // 0-1 置信度
}

export interface TimelineExtractionConfig {
    apiKey?: string;
    model?: string;
    minConfidence?: number;
}

export interface TextSource {
    title: string;
    text: string;
}

// ============== 默认配置 ==============

const DEFAULT_CONFIG: Required<Omit<TimelineExtractionConfig, 'apiKey'>> & { apiKey?: string } = {
    apiKey: undefined,
    model: 'deepseek-chat',
    minConfidence: 0.5,
};

// ============== Skill 实现 ==============

export class TimelineExtractionSkill {
    private config: typeof DEFAULT_CONFIG;
    private provider: ReturnType<typeof createDeepSeek>;

    constructor(config: TimelineExtractionConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.provider = createDeepSeek({
            apiKey: this.config.apiKey || process.env.DEEPSEEK_API_KEY,
        });
    }

    /**
     * 从文本中提取时间线事件
     */
    async extractFromText(
        personName: string,
        text: string
    ): Promise<TimelineEvent[]> {
        try {
            const prompt = `Extract career and education timeline events for "${personName}" from this text.

For each event, extract:
- title: Organization name (company, university)
- role: Position or degree (if mentioned)
- startDate: Start date as YYYY or YYYY-MM-DD (if mentioned)
- endDate: End date as YYYY or YYYY-MM-DD, or "present" (if mentioned)
- type: One of "career", "education", "founding", "award"
- confidence: Your confidence 0.0-1.0

Only extract events with at least an organization name. Prefer explicit dates.

TEXT:
${text.slice(0, 4000)}

Return ONLY a JSON array, no explanation. Example:
[{"title": "OpenAI", "role": "CEO", "startDate": "2019", "endDate": "present", "type": "career", "confidence": 0.95}]

If no events found, return: []`;

            const result = await generateText({
                model: this.provider(this.config.model),
                prompt,
                temperature: 0.1,
                maxTokens: 2000,
            } as any);

            const content = result.text?.trim() || '[]';

            let jsonStr = content;
            if (content.startsWith('```')) {
                jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
            }

            const events = JSON.parse(jsonStr) as TimelineEvent[];

            return events.filter(e =>
                e.title &&
                typeof e.confidence === 'number' &&
                e.confidence >= this.config.minConfidence
            );
        } catch (error) {
            console.error('[TimelineExtraction] Error:', error);
            return [];
        }
    }

    /**
     * 从多个来源提取并合并时间线
     */
    async extractFromSources(
        personName: string,
        sources: TextSource[]
    ): Promise<TimelineEvent[]> {
        const allEvents: TimelineEvent[] = [];

        const limitedSources = sources.slice(0, 5);

        for (const source of limitedSources) {
            const events = await this.extractFromText(
                personName,
                `${source.title}\n\n${source.text}`
            );
            allEvents.push(...events);
        }

        // 去重和合并
        const seen = new Map<string, TimelineEvent>();

        for (const event of allEvents) {
            const key = `${event.title.toLowerCase()}-${(event.role || '').toLowerCase()}`;
            const existing = seen.get(key);

            if (!existing || event.confidence > existing.confidence) {
                if (existing) {
                    event.startDate = event.startDate || existing.startDate;
                    event.endDate = event.endDate || existing.endDate;
                }
                seen.set(key, event);
            }
        }

        return Array.from(seen.values())
            .sort((a, b) => {
                if (!a.startDate) return 1;
                if (!b.startDate) return -1;
                return b.startDate.localeCompare(a.startDate);
            });
    }

    /**
     * 提取教育经历
     */
    async extractEducation(
        personName: string,
        text: string
    ): Promise<TimelineEvent[]> {
        const allEvents = await this.extractFromText(personName, text);
        return allEvents.filter(e => e.type === 'education');
    }

    /**
     * 提取职业经历
     */
    async extractCareer(
        personName: string,
        text: string
    ): Promise<TimelineEvent[]> {
        const allEvents = await this.extractFromText(personName, text);
        return allEvents.filter(e => e.type === 'career' || e.type === 'founding');
    }
}

// 导出默认实例
export const timelineExtraction = new TimelineExtractionSkill();
