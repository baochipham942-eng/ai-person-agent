#!/usr/bin/env node
import {
  SOURCE_ROLES,
  buildPack,
  cleanText,
  extractCanonicalUrl,
  extractHtmlTitle,
  extractMetaContent,
  extractTagText,
  extractTimeValue,
  fetchText,
  htmlToText,
  inferOwnerFromUrl,
  makeKnowledgeSource,
  normalizeDate,
  normalizeUrl,
  parseArgs,
  readInputList,
  uniqueByUrl,
  writeJson,
} from './common.mjs';

const SCRIPT = 'fetch_official_sources';

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const accessIssues = [];
  const directUrls = collectDirectUrls(options);
  const indexUrls = [];

  for (const rssUrl of options.rss) {
    const result = await collectFromFeed(rssUrl, options);
    indexUrls.push(...result.urls);
    accessIssues.push(...result.accessIssues);
  }

  for (const sitemapUrl of options.sitemap) {
    const result = await collectFromSitemap(sitemapUrl, options);
    indexUrls.push(...result.urls);
    accessIssues.push(...result.accessIssues);
  }

  const candidates = uniqueByUrl([...directUrls, ...indexUrls]).slice(0, options.limit);
  const sources = [];

  for (const candidate of candidates) {
    const url = typeof candidate === 'string' ? candidate : candidate.url;
    const seedMetadata = typeof candidate === 'string' ? {} : candidate.metadata || {};
    const fetched = await fetchArticle(url, options);
    if (!fetched.ok) {
      accessIssues.push({
        url,
        status: fetched.status,
        reason: fetched.reason || 'fetch_failed',
      });
      continue;
    }

    sources.push(makeKnowledgeSource({
      sourceKind: classifyOfficialKind(url),
      sourceOwner: inferOwnerFromUrl(url),
      title: fetched.title || seedMetadata.title || url,
      url: fetched.finalUrl || url,
      text: fetched.text || seedMetadata.description || '',
      publishedAt: fetched.publishedAt || seedMetadata.publishedAt || null,
      role: SOURCE_ROLES.official,
      maxChars: options.maxChars,
      metadata: {
        description: seedMetadata.description || null,
        sourceIndexUrl: seedMetadata.sourceIndexUrl || null,
        contentType: fetched.contentType || null,
        canonicalUrl: fetched.canonicalUrl || null,
      },
    }));
  }

  writeJson(buildPack({
    script: SCRIPT,
    inputs: {
      url: directUrls.map(item => typeof item === 'string' ? item : item.url),
      rss: options.rss,
      sitemap: options.sitemap,
      input: options.input,
      limit: options.limit,
      maxChars: options.maxChars,
    },
    sources,
    stats: {
      candidates: candidates.length,
      accessIssues: accessIssues.length,
    },
    accessIssues,
    notes: [
      'Dry-run only. This script does not write KnowledgeSource.',
      'RSS and sitemap entries are followed as public pages; JS-only content may need manual export.',
    ],
  }), options.output);
}

function collectDirectUrls(options) {
  const fromInput = readInputList(options.input).map(item => {
    if (typeof item === 'string') return item;
    return {
      url: item.url,
      metadata: {
        title: item.title || null,
        description: item.description || item.text || null,
        publishedAt: item.publishedAt || null,
      },
    };
  });
  return uniqueByUrl([...options.url, ...fromInput].filter(item => typeof item === 'string' ? item : item.url));
}

async function collectFromFeed(feedUrl, options) {
  try {
    const response = await fetchText(feedUrl, {
      timeoutMs: options.timeoutMs,
      accept: 'application/rss+xml,application/atom+xml,application/xml,text/xml,*/*',
    });
    if (!response.ok) {
      return {
        urls: [],
        accessIssues: [{ url: feedUrl, status: response.status, reason: 'feed_fetch_failed' }],
      };
    }

    const urls = [];
    for (const entry of extractXmlBlocks(response.text, ['item', 'entry'])) {
      const link = cleanText(extractXmlAttr(entry, 'link', 'href') || extractXmlText(entry, 'link'));
      const normalized = normalizeUrl(link, feedUrl);
      if (!normalized) continue;
      urls.push({
        url: normalized,
        metadata: {
          title: cleanText(extractXmlText(entry, 'title')),
          description: cleanText(extractXmlText(entry, 'description') || extractXmlText(entry, 'summary') || extractXmlText(entry, 'content')),
          publishedAt: normalizeDate(extractXmlText(entry, 'pubDate') || extractXmlText(entry, 'published') || extractXmlText(entry, 'updated')),
          sourceIndexUrl: feedUrl,
        },
      });
    }
    return { urls, accessIssues: [] };
  } catch (error) {
    return {
      urls: [],
      accessIssues: [{ url: feedUrl, status: null, reason: error.message || String(error) }],
    };
  }
}

async function collectFromSitemap(sitemapUrl, options) {
  try {
    const response = await fetchText(sitemapUrl, {
      timeoutMs: options.timeoutMs,
      accept: 'application/xml,text/xml,*/*',
    });
    if (!response.ok) {
      return {
        urls: [],
        accessIssues: [{ url: sitemapUrl, status: response.status, reason: 'sitemap_fetch_failed' }],
      };
    }

    const urls = [];
    for (const block of extractXmlBlocks(response.text, ['url', 'sitemap'])) {
      const loc = normalizeUrl(extractXmlText(block, 'loc'), sitemapUrl);
      if (!loc) continue;
      urls.push({
        url: loc,
        metadata: {
          publishedAt: normalizeDate(extractXmlText(block, 'lastmod')),
          sourceIndexUrl: sitemapUrl,
        },
      });
    }
    return { urls, accessIssues: [] };
  } catch (error) {
    return {
      urls: [],
      accessIssues: [{ url: sitemapUrl, status: null, reason: error.message || String(error) }],
    };
  }
}

async function fetchArticle(url, options) {
  try {
    const response = await fetchText(url, { timeoutMs: options.timeoutMs });
    if (!response.ok) {
      return { ok: false, status: response.status, reason: 'page_fetch_failed' };
    }

    const title = extractHtmlTitle(response.text);
    const publishedAt = normalizeDate(
      extractMetaContent(response.text, 'property', 'article:published_time')
      || extractMetaContent(response.text, 'name', 'date')
      || extractTimeValue(response.text),
    );
    const canonicalUrl = extractCanonicalUrl(response.text, url);
    const text = htmlToText(response.text);

    return {
      ok: true,
      status: response.status,
      finalUrl: response.finalUrl,
      contentType: response.contentType,
      title,
      publishedAt,
      canonicalUrl,
      text,
    };
  } catch (error) {
    return { ok: false, status: null, reason: error.message || String(error) };
  }
}

function extractXmlBlocks(xml, tagNames) {
  const blocks = [];
  for (const tagName of tagNames) {
    const pattern = new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}>`, 'gi');
    blocks.push(...String(xml || '').match(pattern) || []);
  }
  return blocks;
}

function extractXmlText(xml, tagName) {
  return cleanText(extractTagText(xml, tagName).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'));
}

function extractXmlAttr(xml, tagName, attrName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*${attrName}=["']([^"']+)["'][^>]*\\/?>(?:<\\/${tagName}>)?`, 'i');
  const match = String(xml || '').match(pattern);
  return match ? match[1] : null;
}

function classifyOfficialKind(url) {
  const lower = url.toLowerCase();
  if (lower.includes('/docs') || lower.includes('docs.')) return 'official_docs';
  if (lower.includes('changelog') || lower.includes('release')) return 'official_changelog';
  if (lower.includes('blog') || lower.includes('/news') || lower.includes('/articles')) return 'official_blog';
  return 'official_page';
}

function printHelp() {
  console.log(`
Usage:
  node scripts/knowledge/fetch_official_sources.mjs --url=https://example.com/post --limit=5
  node scripts/knowledge/fetch_official_sources.mjs --rss=https://example.com/rss.xml --sitemap=https://example.com/sitemap.xml

Options:
  --url=URL          Fetch one official URL. Repeatable.
  --rss=URL          Read RSS/Atom item URLs and fetch their pages. Repeatable.
  --sitemap=URL      Read sitemap loc URLs and fetch their pages. Repeatable.
  --input=PATH       txt URL list or JSON array/{ "urls": [] }.
  --output=PATH      Write JSON to file instead of stdout.
  --limit=N          Max source candidates.
  --max-chars=N      Max text chars per source.
  --timeout-ms=N     Fetch timeout.
`);
}
