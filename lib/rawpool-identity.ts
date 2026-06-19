import crypto from 'node:crypto';

type MetadataLike = Record<string, unknown> | null | undefined;

export interface RawPoolIdentityInput {
  personId: string;
  sourceType: string;
  url: string;
  metadata?: MetadataLike;
}

export interface RawPoolIdentity {
  canonicalKey: string;
  supportKind: string;
  urlHash: string;
}

export function buildRawPoolIdentity(input: RawPoolIdentityInput): RawPoolIdentity {
  const supportKind = supportKindForRawPool(input.sourceType, input.metadata);
  const canonicalKey = canonicalRawPoolKey(input);
  const urlHash = sha256([
    input.personId,
    input.sourceType,
    supportKind,
    canonicalKey,
  ].join('\t'));

  return { canonicalKey, supportKind, urlHash };
}

function supportKindForRawPool(sourceType: string, metadata: MetadataLike): string {
  const sourceKind = stringValue(metadata, 'sourceKind').toLowerCase();
  if (sourceType.toLowerCase() === 'youtube' && sourceKind === 'youtube_caption') {
    return sourceKind;
  }
  return '';
}

export function canonicalRawPoolKey(input: Pick<RawPoolIdentityInput, 'sourceType' | 'url' | 'metadata'>): string {
  const sourceType = input.sourceType.toLowerCase();
  const url = input.url || '';
  const videoId = videoIdFromMetadataOrUrl(input.metadata, url);
  if (videoId) return `youtube:${videoId}`;

  if (sourceType === 'x') {
    const postId = stringValue(input.metadata, 'postId') || xPostIdFromUrl(url);
    if (postId) return `x:${postId}`;
  }

  if (sourceType === 'podcast') {
    const episodeKey = stringValue(input.metadata, 'episodeId') || stringValue(input.metadata, 'guid');
    if (episodeKey) return `podcast:${episodeKey.toLowerCase()}`;
  }

  if (sourceType === 'github') {
    const repoKey = githubRepoKey(url);
    if (repoKey) return `github:${repoKey}`;
  }

  return `url:${normalizeUrlForRawPool(url)}`;
}

export function normalizeUrlForRawPool(url: string): string {
  const raw = (url || '').trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw.startsWith('//') ? `https:${raw}` : raw);
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    parsed.hash = '';

    for (const key of [...parsed.searchParams.keys()]) {
      if (isTrackingParam(key)) parsed.searchParams.delete(key);
    }
    parsed.searchParams.sort();

    if (parsed.pathname !== '/') {
      parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    }

    return parsed.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return raw.replace(/\/+$/, '').toLowerCase();
  }
}

export function contentHash(text: string | null | undefined): string {
  return crypto.createHash('md5').update((text || '').slice(0, 1000)).digest('hex');
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stringValue(metadata: MetadataLike, key: string): string {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return '';
  const value = metadata[key];
  return typeof value === 'string' ? value.trim() : '';
}

function videoIdFromMetadataOrUrl(metadata: MetadataLike, url: string): string {
  const fromMetadata = cleanVideoId(stringValue(metadata, 'videoId'));
  if (fromMetadata) return fromMetadata;

  const normalized = (url || '').trim();
  if (!normalized) return '';

  try {
    const parsed = new URL(normalized.startsWith('//') ? `https:${normalized}` : normalized);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    if (host === 'youtu.be') {
      return cleanVideoId(parsed.pathname.split('/').filter(Boolean)[0] || '');
    }

    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const queryVideo = cleanVideoId(parsed.searchParams.get('v') || '');
      if (queryVideo) return queryVideo;

      const parts = parsed.pathname.split('/').filter(Boolean);
      if (['embed', 'shorts', 'live', 'v'].includes(parts[0]) && parts[1]) {
        return cleanVideoId(parts[1]);
      }
    }
  } catch {
    // Fall through to regex extraction.
  }

  const match = normalized.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{6,})/);
  return cleanVideoId(match?.[1] || '');
}

function cleanVideoId(value: string): string {
  const match = value.match(/[A-Za-z0-9_-]{6,}/);
  return match?.[0] || '';
}

function xPostIdFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (!['x.com', 'twitter.com'].includes(host)) return '';
    const parts = parsed.pathname.split('/').filter(Boolean);
    const statusIndex = parts.findIndex(part => part === 'status' || part === 'statuses');
    return statusIndex >= 0 ? parts[statusIndex + 1] || '' : '';
  } catch {
    const match = url.match(/(?:x|twitter)\.com\/[^/]+\/status(?:es)?\/(\d+)/i);
    return match?.[1] || '';
  }
}

function githubRepoKey(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host !== 'github.com') return '';
    const [owner, repo] = parsed.pathname.split('/').filter(Boolean);
    if (!owner || !repo) return '';
    return `${owner}/${repo.replace(/\.git$/i, '')}`.toLowerCase();
  } catch {
    const match = url.match(/github\.com\/([^/\s]+)\/([^/\s?#]+)/i);
    return match ? `${match[1]}/${match[2].replace(/\.git$/i, '')}`.toLowerCase() : '';
  }
}

function isTrackingParam(key: string): boolean {
  const lower = key.toLowerCase();
  return lower.startsWith('utm_')
    || ['fbclid', 'gclid', 'mc_cid', 'mc_eid', 'igshid', 'ref', 'ref_src'].includes(lower);
}
