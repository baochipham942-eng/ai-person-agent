import type { ProviderName } from '@/lib/ai/provider';

export const DEFAULT_PAPER_LLM_CHAIN: ProviderName[] = ['mimo', 'minimax'];

export function paperLlmChain(): ProviderName[] {
  const configured = (process.env.PAPER_LLM_CHAIN || '')
    .split(',')
    .map(item => item.trim())
    .filter((item): item is ProviderName => (
      item === 'deepseek'
      || item === 'gemini'
      || item === 'grok'
      || item === 'mimo'
      || item === 'minimax'
      || item === 'glm'
    ));
  return configured.length > 0 ? configured : DEFAULT_PAPER_LLM_CHAIN;
}
