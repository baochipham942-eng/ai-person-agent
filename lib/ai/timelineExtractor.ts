import { generateText } from 'ai';
import { deepseek } from './deepseek';

export interface ExtractedTimelineEvent {
    title: string;           // Company or school name
    role?: string;           // Position or degree
    startDate?: string;      // ISO date (YYYY-MM-DD or YYYY)
    endDate?: string;        // ISO date or "present"
    type: 'career' | 'education' | 'founding' | 'award';
    confidence: number;      // 0-1 confidence score
}

/**
 * Extract structured timeline events from unstructured text using AI.
 * Useful for enriching career data with missing dates from biographical content.
 */
export async function extractTimelineFromText(
    personName: string,
    text: string
): Promise<ExtractedTimelineEvent[]> {
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
            model: deepseek('deepseek-chat'),
            prompt,
            temperature: 0.1,
            maxTokens: 2000,
        } as any);

        const content = result.text?.trim() || '[]';

        // Parse JSON, handling markdown code blocks
        let jsonStr = content;
        if (content.startsWith('```')) {
            jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        }

        const events = JSON.parse(jsonStr) as ExtractedTimelineEvent[];

        // Filter and validate
        return events.filter(e =>
            e.title &&
            typeof e.confidence === 'number' &&
            e.confidence >= 0.5  // Only keep reasonably confident extractions
        );

    } catch (error) {
        console.error('Timeline extraction error:', error);
        return [];
    }
}

/**
 * Batch extract timeline events from multiple text sources.
 * Merges and deduplicates results.
 */
export async function extractTimelineFromSources(
    personName: string,
    sources: { title: string; text: string }[]
): Promise<ExtractedTimelineEvent[]> {
    const allEvents: ExtractedTimelineEvent[] = [];

    // Limit sources to avoid too many API calls
    const limitedSources = sources.slice(0, 5);

    // Process sequentially to avoid rate limits
    for (const source of limitedSources) {
        const events = await extractTimelineFromText(personName, `${source.title}\n\n${source.text}`);
        allEvents.push(...events);
    }

    // Deduplicate by organization+role combination
    const seen = new Map<string, ExtractedTimelineEvent>();

    for (const event of allEvents) {
        const key = `${event.title.toLowerCase()}-${(event.role || '').toLowerCase()}`;
        const existing = seen.get(key);

        if (!existing || event.confidence > existing.confidence) {
            // Keep the higher confidence version, or merge dates
            if (existing) {
                // Merge: prefer event with dates
                event.startDate = event.startDate || existing.startDate;
                event.endDate = event.endDate || existing.endDate;
            }
            seen.set(key, event);
        }
    }

    return Array.from(seen.values())
        .sort((a, b) => {
            // Sort by start date descending
            if (!a.startDate) return 1;
            if (!b.startDate) return -1;
            return b.startDate.localeCompare(a.startDate);
        });
}
