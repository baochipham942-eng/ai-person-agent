type JsonRecord = Record<string, unknown>;

export interface OfficialLinkJson {
  type: string;
  url: string;
  handle?: string;
  label?: string;
}

export interface HighlightJson {
  icon: string;
  text: string;
}

export interface QuoteJson {
  text: string;
  source: string;
  url?: string;
  year?: number;
  importance?: number;
}

export interface ProductJson {
  name: string;
  description: string;
  org?: string;
  year?: string | number;
  url?: string;
  icon?: string;
  logo?: string;
  category?: string;
  type?: string;
  stats?: Record<string, string>;
}

export interface EducationJson {
  school: string;
  degree?: string;
  field?: string;
  year?: string;
  advisor?: string;
}

export interface TopicDetailJson {
  topic: string;
  rank: number;
  reason?: string;
  description?: string;
  paperCount?: number;
  citations?: number;
  quote?: {
    text: string;
    source: string;
    url?: string;
  };
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function asStringOrNumber(value: unknown): string | number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return asString(value);
}

function compact<T>(items: Array<T | null>): T[] {
  return items.filter((item): item is T => item !== null);
}

function arrayFromJson(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function flattenRecordValues(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [];

  return Object.values(value).flatMap((entry) => Array.isArray(entry) ? entry : [entry]);
}

export function normalizeOfficialLinks(value: unknown): OfficialLinkJson[] {
  return compact(flattenRecordValues(value).map((entry) => {
    if (!isRecord(entry)) return null;

    const type = asString(entry.type);
    const url = asString(entry.url);
    if (!type || !url) return null;

    return {
      type,
      url,
      handle: asString(entry.handle),
      label: asString(entry.label),
    };
  }));
}

export function normalizeHighlights(value: unknown): HighlightJson[] | null {
  const highlights = compact(arrayFromJson(value).map((entry) => {
    if (!isRecord(entry)) return null;

    const text = asString(entry.text);
    if (!text) return null;

    return {
      icon: asString(entry.icon) ?? '',
      text,
    };
  }));

  return highlights.length > 0 ? highlights : null;
}

export function normalizeTopicRanks(value: unknown): Record<string, number> | null {
  if (!isRecord(value)) return null;

  const ranks: Record<string, number> = {};
  for (const [topic, rankValue] of Object.entries(value)) {
    const rank = asNumber(rankValue);
    if (rank !== undefined) {
      ranks[topic] = rank;
    }
  }

  return Object.keys(ranks).length > 0 ? ranks : null;
}

function normalizeQuoteObject(value: unknown): TopicDetailJson['quote'] | undefined {
  if (!isRecord(value)) return undefined;

  const text = asString(value.text);
  const source = asString(value.source);
  if (!text || !source) return undefined;

  return {
    text,
    source,
    url: asString(value.url),
  };
}

export function normalizeTopicDetails(value: unknown): TopicDetailJson[] | null {
  const details = compact(arrayFromJson(value).map((entry) => {
    if (!isRecord(entry)) return null;

    const topic = asString(entry.topic);
    if (!topic) return null;

    return {
      topic,
      rank: asNumber(entry.rank) ?? 99,
      reason: asString(entry.reason),
      description: asString(entry.description),
      paperCount: asNumber(entry.paperCount),
      citations: asNumber(entry.citations),
      quote: normalizeQuoteObject(entry.quote),
    };
  }));

  return details.length > 0 ? details : null;
}

export function normalizeQuotes(value: unknown): QuoteJson[] | null {
  const quotes = compact(arrayFromJson(value).map((entry) => {
    if (!isRecord(entry)) return null;

    const text = asString(entry.text);
    if (!text) return null;

    return {
      text,
      source: asString(entry.source) ?? '',
      url: asString(entry.url),
      year: asNumber(entry.year),
      importance: asNumber(entry.importance),
    };
  }));

  return quotes.length > 0 ? quotes : null;
}

function normalizeStats(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined;

  const stats: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(value)) {
    const stringValue = typeof rawValue === 'number' && Number.isFinite(rawValue)
      ? String(rawValue)
      : asString(rawValue);
    if (stringValue) {
      stats[key] = stringValue;
    }
  }

  return Object.keys(stats).length > 0 ? stats : undefined;
}

export function normalizeProducts(value: unknown): ProductJson[] | null {
  const products = compact(arrayFromJson(value).map((entry) => {
    if (!isRecord(entry)) return null;

    const name = asString(entry.name);
    if (!name) return null;

    return {
      name,
      description: asString(entry.description) ?? '',
      org: asString(entry.org),
      year: asStringOrNumber(entry.year),
      url: asString(entry.url),
      icon: asString(entry.icon),
      logo: asString(entry.logo),
      category: asString(entry.category),
      type: asString(entry.type),
      stats: normalizeStats(entry.stats),
    };
  }));

  return products.length > 0 ? products : null;
}

export function normalizeEducation(value: unknown): EducationJson[] | null {
  const education = compact(arrayFromJson(value).map((entry) => {
    if (!isRecord(entry)) return null;

    const school = asString(entry.school);
    if (!school) return null;

    return {
      school,
      degree: asString(entry.degree),
      field: asString(entry.field),
      year: asString(entry.year),
      advisor: asString(entry.advisor),
    };
  }));

  return education.length > 0 ? education : null;
}

export function normalizeMetadata(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}
