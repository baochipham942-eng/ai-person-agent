/**
 * DeepSeek AI 集成 (兼容层)
 *
 * 历史上所有 LLM 调用都走这里。现已迁移到统一 provider 抽象 (lib/ai/provider.ts):
 * - `deepseek` provider 对象保留, 供直接 generateText({model: deepseek('deepseek-chat')}) 使用
 * - chatCompletion / chatStructuredCompletion 委托给 provider 层,
 *   自动获得 deepseek -> gemini 降级链 + 更健壮的 JSON 解析
 *
 * 新代码请直接用 lib/ai/provider.ts 的 generate() / generateStructured()(带 zod 校验)。
 */

import { createDeepSeek } from '@ai-sdk/deepseek';
import {
    chatCompletion as _chatCompletion,
    chatStructuredCompletion as _chatStructuredCompletion,
    type ChatMessage,
} from './provider';

// DeepSeek provider 对象 (向后兼容: 部分脚本直接用 deepseek('deepseek-chat'))
export const deepseek = createDeepSeek({
    apiKey: process.env.DEEPSEEK_API_KEY,
});

export type { ChatMessage };

/**
 * 通用文本补全 (已带降级链)
 * @deprecated 新代码用 provider.ts 的 generate()
 */
export const chatCompletion = _chatCompletion;

/**
 * 结构化 JSON 输出 (已带降级链 + 健壮解析)
 * @deprecated 新代码用 provider.ts 的 generateStructured() + zod schema
 */
export const chatStructuredCompletion = _chatStructuredCompletion;
