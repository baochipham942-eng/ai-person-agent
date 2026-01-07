/**
 * Perplexity API Wrapper
 * 
 * ROLE: Sniper (High Precision, Cost Sensitive)
 * PURPOSE: specialized Q&A, gap filling, and identity verification.
 * 
 * COST CONTROL:
 * - Model: sonar-small-online (Cost effective: ~$0.005/req)
 * - Usage: MUST be manually confirmed by the user before calling in most contexts.
 */

interface PerplexityMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface PerplexityOptions {
    temperature?: number;
    max_tokens?: number;
    // PPLX specific
    return_citations?: boolean;
}

export interface PerplexityResponse {
    content: string;
    citations: string[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

const PPLX_API_URL = 'https://api.perplexity.ai/chat/completions';
const MODEL = 'sonar'; // Cost-effective model with search

export async function searchPerplexity(
    query: string,
    systemPrompt: string = 'You are a helpful research assistant. Be precise and concise.',
    options: PerplexityOptions = {}
): Promise<PerplexityResponse> {
    const apiKey = process.env.PERPLEXITY_API_KEY;

    if (!apiKey) {
        throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    try {
        const messages: PerplexityMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query }
        ];

        const response = await fetch(PPLX_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                messages,
                temperature: options.temperature || 0.1,
                // max_tokens: options.max_tokens, // Let model decide or default
                return_citations: options.return_citations ?? true,
                stream: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Perplexity API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const choice = data.choices?.[0];

        return {
            content: choice?.message?.content || '',
            citations: data.citations || [],
            usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
        };

    } catch (error) {
        console.error('Perplexity search error:', error);
        throw error;
    }
}
