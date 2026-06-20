import OpenAI from 'openai';

export type EmbeddingProvider = 'openai' | 'gemini';

const FALLBACK_OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';
const FALLBACK_GEMINI_EMBEDDING_MODEL = 'gemini-embedding-2';
const FALLBACK_EMBEDDING_DIMENSIONS = 512;

export interface EmbeddingConfig {
  provider?: EmbeddingProvider;
  apiKey?: string;
  baseURL?: string;
  model?: string;
  dimensions?: number;
}

export function defaultEmbeddingProvider(): EmbeddingProvider {
  const configured = process.env.SEARCH_EMBEDDING_PROVIDER;
  if (configured === 'openai' || configured === 'gemini') return configured;
  if (process.env.SEARCH_EMBEDDING_API_KEY) return 'openai';
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) return 'gemini';
  return 'openai';
}

export function defaultEmbeddingModel(provider = defaultEmbeddingProvider()): string {
  if (process.env.SEARCH_EMBEDDING_MODEL) return process.env.SEARCH_EMBEDDING_MODEL;
  return provider === 'gemini' ? FALLBACK_GEMINI_EMBEDDING_MODEL : FALLBACK_OPENAI_EMBEDDING_MODEL;
}

export function defaultEmbeddingDimensions(): number {
  return readBoundedInt(process.env.SEARCH_EMBEDDING_DIMENSIONS, 1, 3072, FALLBACK_EMBEDDING_DIMENSIONS);
}

export function resolveEmbeddingConfig(overrides: EmbeddingConfig = {}): Required<Pick<EmbeddingConfig, 'model' | 'dimensions'>> & EmbeddingConfig {
  const provider = overrides.provider || defaultEmbeddingProvider();
  return {
    provider,
    apiKey: overrides.apiKey || readProviderApiKey(provider),
    baseURL: overrides.baseURL || process.env.SEARCH_EMBEDDING_BASE_URL || (provider === 'openai' ? process.env.OPENAI_BASE_URL : undefined),
    model: overrides.model || defaultEmbeddingModel(provider),
    dimensions: overrides.dimensions || defaultEmbeddingDimensions(),
  };
}

export async function createQueryEmbedding(query: string, config: EmbeddingConfig = {}): Promise<number[]> {
  const embeddings = await createTextEmbeddings([query], config);
  return embeddings[0];
}

export async function createTextEmbeddings(texts: string[], config: EmbeddingConfig = {}): Promise<number[][]> {
  const resolved = resolveEmbeddingConfig(config);
  if (!resolved.apiKey) {
    throw new Error('SEARCH_EMBEDDING_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, or GOOGLE_API_KEY is required for embeddings.');
  }
  if (texts.length === 0) return [];
  if (resolved.provider === 'gemini') {
    const keys = config.apiKey ? [config.apiKey] : readProviderApiKeys('gemini');
    return createGeminiTextEmbeddings(texts, resolved, keys);
  }

  const client = new OpenAI({
    apiKey: resolved.apiKey,
    baseURL: resolved.baseURL,
  });
  const response = await client.embeddings.create({
    model: resolved.model,
    input: texts,
    dimensions: resolved.dimensions,
  });

  return response.data
    .sort((left, right) => left.index - right.index)
    .map(item => {
      if (!item.embedding || item.embedding.length !== resolved.dimensions) {
        throw new Error(`Embedding provider returned a vector with unexpected dimensions for ${resolved.model}.`);
      }
      return item.embedding;
    });
}

async function createGeminiTextEmbeddings(
  texts: string[],
  config: Required<Pick<EmbeddingConfig, 'model' | 'dimensions'>> & EmbeddingConfig,
  apiKeys: string[],
): Promise<number[][]> {
  let lastError: unknown;
  for (const apiKey of apiKeys) {
    try {
      return await createGeminiTextEmbeddingsWithKey(texts, config, apiKey);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('All Gemini embedding API keys failed.');
}

async function createGeminiTextEmbeddingsWithKey(
  texts: string[],
  config: Required<Pick<EmbeddingConfig, 'model' | 'dimensions'>> & EmbeddingConfig,
  apiKey: string,
): Promise<number[][]> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:batchEmbedContents`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      requests: texts.map(text => ({
        model: `models/${config.model}`,
        content: { parts: [{ text }] },
        output_dimensionality: config.dimensions,
      })),
    }),
  });

  const body = await response.json().catch(() => null) as GeminiBatchEmbeddingResponse | GeminiErrorResponse | null;
  if (!response.ok) {
    throw geminiRequestError(response.status, body);
  }

  const embeddings = 'embeddings' in (body || {}) && Array.isArray((body as GeminiBatchEmbeddingResponse).embeddings)
    ? (body as GeminiBatchEmbeddingResponse).embeddings
    : [];
  if (embeddings.length !== texts.length) {
    throw new Error(`Gemini returned ${embeddings.length} embeddings for ${texts.length} inputs.`);
  }

  return embeddings.map(item => {
    const values = item.values;
    if (!Array.isArray(values) || values.length !== config.dimensions) {
      throw new Error(`Gemini returned a vector with unexpected dimensions for ${config.model}.`);
    }
    return values;
  });
}

interface GeminiBatchEmbeddingResponse {
  embeddings: Array<{ values: number[] }>;
}

interface GeminiErrorResponse {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

function geminiRequestError(status: number, body: GeminiErrorResponse | GeminiBatchEmbeddingResponse | null): Error & {
  status?: number;
  code?: string;
  type?: string;
} {
  const errorBody = body && 'error' in body ? body.error : undefined;
  const error = new Error(errorBody?.message || `Gemini embedding request failed with HTTP ${status}`) as Error & {
    status?: number;
    code?: string;
    type?: string;
  };
  error.status = status;
  error.code = errorBody?.status || String(errorBody?.code || status);
  error.type = 'gemini_api_error';
  return error;
}

export function toPgVectorLiteral(values: number[], dimensions = FALLBACK_EMBEDDING_DIMENSIONS): string {
  if (values.length !== dimensions) {
    throw new Error(`Expected ${dimensions}-dimensional embedding, got ${values.length}`);
  }
  return `[${values.map(value => {
    if (!Number.isFinite(value)) throw new Error('Embedding contains a non-finite value');
    return Number(value).toFixed(8);
  }).join(',')}]`;
}

export function formatSafeEmbeddingError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return { message: redactSecretText(String(error)) };
  }
  const record = error as Record<string, unknown>;
  const message = typeof record.message === 'string'
    ? redactSecretText(record.message)
    : 'Unknown embedding error';
  return {
    message,
    status: typeof record.status === 'number' ? record.status : undefined,
    code: typeof record.code === 'string' ? record.code : undefined,
    type: typeof record.type === 'string' ? record.type : undefined,
    requestId: typeof record.requestID === 'string' ? record.requestID : undefined,
  };
}

export function redactSecretText(value: string): string {
  return value
    .replace(/sk-[A-Za-z0-9_*.-]+/g, '[redacted-api-key]')
    .replace(/AIza[0-9A-Za-z_-]+/g, '[redacted-google-api-key]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted-token]');
}

function readProviderApiKey(provider: EmbeddingProvider): string | undefined {
  return readProviderApiKeys(provider)[0];
}

function readProviderApiKeys(provider: EmbeddingProvider): string[] {
  if (provider === 'gemini') {
    return [
      process.env.SEARCH_EMBEDDING_API_KEY,
      process.env.GEMINI_API_KEY,
      process.env.GOOGLE_API_KEY,
    ].filter((value): value is string => Boolean(value));
  }
  return [
    process.env.SEARCH_EMBEDDING_API_KEY,
    process.env.OPENAI_API_KEY,
  ].filter((value): value is string => Boolean(value));
}

function readBoundedInt(value: string | undefined, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}
