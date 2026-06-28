/**
 * 统一 LLM Provider 抽象层
 *
 * 设计目标:
 * 1. 多 provider 统一入口 (deepseek / gemini / grok), 全走 AI SDK
 * 2. 降级链: 主 provider 失败/超时自动切 fallback, 记录降级日志
 * 3. 结构化输出: generateText + response_format json_object + zod 校验 + 一轮修复重试
 *    (不依赖 generateObject 的 schema 协商, 对中转站最稳健)
 *
 * 中转站说明 (2026-06-07 验证):
 * - gemini/grok 经中转站 jiuuij.de5.net/v1, 仅支持 OpenAI /chat/completions
 * - 必须 createOpenAI(...).chat(model) + compatibility:'compatible', 否则 SDK 默认走
 *   /responses API 导致 "Invalid JSON response"
 */

import { createDeepSeek } from '@ai-sdk/deepseek';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, type LanguageModel } from 'ai';
import type { ZodType } from 'zod';

export type ProviderName = 'deepseek' | 'gemini' | 'grok' | 'mimo' | 'minimax' | 'glm';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface GenerateOptions {
    /** 降级链, 按顺序尝试直到成功。默认 ['deepseek','gemini'] */
    chain?: ProviderName[];
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
}

export interface LlmUsage {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
}

const DEFAULT_CHAIN: ProviderName[] = ['deepseek', 'gemini'];
const DEFAULT_MIMO_BASE_URL = 'https://token-plan-sgp.xiaomimimo.com/v1';
const DEFAULT_MIMO_MODEL = 'mimo-v2.5-pro';
const DEFAULT_MINIMAX_BASE_URL = 'https://api.minimaxi.com/v1';
const DEFAULT_MINIMAX_MODEL = 'MiniMax-M2.7';
type GenerateTextParams = Parameters<typeof generateText>[0];

function requestTimeoutMs(options: GenerateOptions): number {
    const fromEnv = Number(process.env.LLM_TIMEOUT_MS || 0);
    return options.timeoutMs ?? (Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 90000);
}

// ============== Provider 模型实例 (懒加载缓存) ==============

let _models: Partial<Record<ProviderName, LanguageModel>> = {};

function getModel(name: ProviderName): LanguageModel {
    if (_models[name]) return _models[name]!;

    const relay = process.env.RELAY_BASE_URL;
    let model: LanguageModel;

    switch (name) {
        case 'deepseek':
            model = createDeepSeek({
                apiKey: process.env.DEEPSEEK_API_KEY,
                baseURL: process.env.DEEPSEEK_API_URL,
            })('deepseek-chat');
            break;
        case 'gemini':
            // 必须 .chat() 强制走 /chat/completions; 否则 SDK 默认 /responses API, 中转站不支持
            model = createOpenAI({
                apiKey: process.env.GEMINI_API_KEY,
                baseURL: relay,
            }).chat(process.env.GEMINI_MODEL || 'gemini-3-flash-preview');
            break;
        case 'grok':
            model = createOpenAI({
                apiKey: process.env.GROK_RELAY_API_KEY,
                baseURL: relay,
            }).chat(process.env.GROK_RELAY_MODEL || 'grok-4.3-medium');
            break;
        case 'mimo':
            model = createOpenAI({
                apiKey: process.env.XIAOMI_API_KEY,
                baseURL: process.env.XIAOMI_API_URL || process.env.XIAOMI_BASE_URL || DEFAULT_MIMO_BASE_URL,
                name: 'mimo',
            }).chat(process.env.MIMO_MODEL || DEFAULT_MIMO_MODEL);
            break;
        case 'minimax':
            model = createOpenAI({
                apiKey: process.env.MINIMAX_API_KEY,
                baseURL: process.env.MINIMAX_API_URL || process.env.MINIMAX_BASE_URL || DEFAULT_MINIMAX_BASE_URL,
                name: 'minimax',
            }).chat(process.env.MINIMAX_MODEL || process.env.MINIMAX_TOPIC_MODEL || DEFAULT_MINIMAX_MODEL);
            break;
        case 'glm':
            // 本地中转 GLM（OpenAI 兼容）。.chat() 强制走 /chat/completions。
            model = createOpenAI({
                apiKey: process.env.GLM_API_KEY,
                baseURL: process.env.GLM_BASE_URL || process.env.GLM_API_URL,
                name: 'glm',
            }).chat(process.env.GLM_MODEL || 'glm-4.6');
            break;
        default:
            throw new Error(`Unknown provider: ${name}`);
    }

    _models[name] = model;
    return model;
}

function isConfigured(name: ProviderName): boolean {
    switch (name) {
        case 'deepseek': return !!process.env.DEEPSEEK_API_KEY;
        case 'gemini': return !!process.env.GEMINI_API_KEY && !!process.env.RELAY_BASE_URL;
        case 'grok': return !!process.env.GROK_RELAY_API_KEY && !!process.env.RELAY_BASE_URL;
        case 'mimo': return !!process.env.XIAOMI_API_KEY;
        case 'minimax': return !!process.env.MINIMAX_API_KEY;
        case 'glm': return !!process.env.GLM_API_KEY && !!(process.env.GLM_BASE_URL || process.env.GLM_API_URL);
        default: return false;
    }
}

/** 仅用于测试: 重置模型缓存 (env 变更后) */
export function _resetModelsCache() { _models = {}; }

// ============== 文本生成 (带降级链) ==============

/**
 * 通用文本生成, 按降级链尝试。
 * @returns 生成的文本 + 实际使用的 provider
 */
export async function generate(
    messages: ChatMessage[],
    options: GenerateOptions = {}
): Promise<{ text: string; provider: ProviderName; usage?: LlmUsage }> {
    const chain = (options.chain || DEFAULT_CHAIN).filter(isConfigured);
    if (chain.length === 0) {
        throw new Error('No LLM provider configured (check DEEPSEEK_API_KEY / GEMINI_API_KEY / RELAY_BASE_URL / XIAOMI_API_KEY / MINIMAX_API_KEY)');
    }

    let lastErr: unknown;
    for (const name of chain) {
        try {
            const result = await generateText({
                model: getModel(name),
                messages: messages.map(m => ({ role: m.role, content: m.content })),
                allowSystemInMessages: true,
                temperature: options.temperature ?? 0.7,
                maxOutputTokens: options.maxTokens ?? 2000,
                abortSignal: AbortSignal.timeout(requestTimeoutMs(options)),
            } as GenerateTextParams);
            return { text: result.text, provider: name, usage: normalizeUsage(result.totalUsage || result.usage) };
        } catch (e) {
            lastErr = e;
            console.warn(`[provider] ${name} failed, ${chain.indexOf(name) < chain.length - 1 ? 'falling back' : 'no more fallback'}: ${(e as Error).message?.slice(0, 120)}`);
        }
    }
    throw new Error(`All providers in chain [${chain.join(', ')}] failed. Last error: ${(lastErr as Error)?.message}`);
}

// ============== 结构化输出 (json_object + zod + 修复重试) ==============

/** 从可能含 markdown 围栏/散文的文本里提取并解析 JSON */
export function extractJson(text: string): unknown {
    let s = text.trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/, '')
        .replace(/```\s*$/, '')
        .trim();
    // 提取最外层对象或数组
    const objStart = s.indexOf('{');
    const arrStart = s.indexOf('[');
    let start = -1, end = -1;
    if (arrStart >= 0 && (objStart < 0 || arrStart < objStart)) {
        start = arrStart; end = s.lastIndexOf(']');
    } else if (objStart >= 0) {
        start = objStart; end = s.lastIndexOf('}');
    }
    if (start >= 0 && end > start) s = s.slice(start, end + 1);
    return JSON.parse(s);
}

/**
 * 结构化生成: 强制 json_object 输出 + zod 校验 + 一轮修复重试 + 降级链。
 * @param schema zod schema, 校验并推断返回类型
 */
export async function generateStructured<T>(
    messages: ChatMessage[],
    schema: ZodType<T>,
    options: GenerateOptions = {}
): Promise<{ data: T; provider: ProviderName; usage?: LlmUsage }> {
    const chain = (options.chain || DEFAULT_CHAIN).filter(isConfigured);
    if (chain.length === 0) {
        throw new Error('No LLM provider configured');
    }

    const jsonHint: ChatMessage = {
        role: 'user',
        content: '请只输出一个有效的 JSON, 不要包含任何解释文字或 markdown 围栏。',
    };
    const baseMessages = [...messages, jsonHint];

    let lastErr: unknown;
    for (const name of chain) {
        try {
            const result = await generateText({
                model: getModel(name),
                messages: baseMessages.map(m => ({ role: m.role, content: m.content })),
                allowSystemInMessages: true,
                temperature: options.temperature ?? 0.3,
                maxOutputTokens: options.maxTokens ?? 2000,
                providerOptions: { openai: { response_format: { type: 'json_object' } } },
                abortSignal: AbortSignal.timeout(requestTimeoutMs(options)),
            } as GenerateTextParams);

            // 第一次尝试解析 + 校验
            try {
                return { data: schema.parse(extractJson(result.text)), provider: name, usage: normalizeUsage(result.totalUsage || result.usage) };
            } catch (parseErr) {
                // 一轮修复重试: 把错误反馈给模型
                const repair = await generateText({
                    model: getModel(name),
                    messages: [
                        ...baseMessages.map(m => ({ role: m.role, content: m.content })),
                        { role: 'assistant' as const, content: result.text },
                        { role: 'user' as const, content: `上面的 JSON 校验失败: ${(parseErr as Error).message?.slice(0, 300)}。请修正后只输出有效 JSON。` },
                    ],
                    allowSystemInMessages: true,
                    temperature: 0,
                    maxOutputTokens: options.maxTokens ?? 2000,
                    providerOptions: { openai: { response_format: { type: 'json_object' } } },
                    abortSignal: AbortSignal.timeout(requestTimeoutMs(options)),
                } as GenerateTextParams);
                const firstUsage = normalizeUsage(result.totalUsage || result.usage);
                const repairUsage = normalizeUsage(repair.totalUsage || repair.usage);
                return {
                    data: schema.parse(extractJson(repair.text)),
                    provider: name,
                    usage: sumUsage(firstUsage, repairUsage),
                };
            }
        } catch (e) {
            lastErr = e;
            console.warn(`[provider] structured ${name} failed: ${(e as Error).message?.slice(0, 120)}`);
        }
    }
    throw new Error(`All providers [${chain.join(', ')}] failed for structured output. Last: ${(lastErr as Error)?.message}`);
}

function normalizeUsage(usage: unknown): LlmUsage | undefined {
    if (!usage || typeof usage !== 'object') return undefined;
    const record = usage as Record<string, unknown>;
    const inputTokens = numberOrUndefined(record.inputTokens);
    const outputTokens = numberOrUndefined(record.outputTokens);
    const totalTokens = numberOrUndefined(record.totalTokens);
    if (inputTokens === undefined && outputTokens === undefined && totalTokens === undefined) return undefined;
    return { inputTokens, outputTokens, totalTokens };
}

function sumUsage(left?: LlmUsage, right?: LlmUsage): LlmUsage | undefined {
    if (!left) return right;
    if (!right) return left;
    return {
        inputTokens: sumOptional(left.inputTokens, right.inputTokens),
        outputTokens: sumOptional(left.outputTokens, right.outputTokens),
        totalTokens: sumOptional(left.totalTokens, right.totalTokens),
    };
}

function sumOptional(left?: number, right?: number): number | undefined {
    if (left === undefined && right === undefined) return undefined;
    return (left ?? 0) + (right ?? 0);
}

function numberOrUndefined(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

// ============== 向后兼容层 (deepseek.ts 的旧签名) ==============

/** @deprecated 用 generate() */
export async function chatCompletion(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
    const { text } = await generate(messages, options);
    return text;
}

/** @deprecated 用 generateStructured() + zod schema */
export async function chatStructuredCompletion<T>(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number }
): Promise<T> {
    // 无 schema 的旧调用: 退化为纯 JSON 解析 (不校验)
    const { text } = await generate(
        [...messages, { role: 'user', content: '请确保你的回复是有效的 JSON 格式, 不要包含其他文字。' }],
        options
    );
    return extractJson(text) as T;
}
