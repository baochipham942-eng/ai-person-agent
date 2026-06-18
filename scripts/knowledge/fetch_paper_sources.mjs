#!/usr/bin/env node
import {
  SOURCE_ROLES,
  buildPack,
  fetchText,
  inferOwnerFromUrl,
  makeKnowledgeSource,
  normalizeUrl,
  parseArgs,
  readInputList,
  uniqueByUrl,
  writeJson,
} from './common.mjs';

const SCRIPT = 'fetch_paper_sources';
const OPENALEX_WORKS_URL = 'https://api.openalex.org/works';

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const options = parsePaperArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const accessIssues = [];
  const candidates = collectPaperCandidates(options);
  const sources = [];

  for (const query of options.query.slice(0, options.limit)) {
    const result = await searchOpenAlex(query, options);
    accessIssues.push(...result.accessIssues);
    candidates.push(...result.sources);
  }

  for (const candidate of uniqueByUrl(candidates).slice(0, options.limit)) {
    if (candidate.openalexWork) {
      sources.push(sourceFromOpenAlexWork(candidate.openalexWork, options));
    } else {
      sources.push(makeKnowledgeSource({
        sourceKind: 'paper',
        sourceOwner: inferOwnerFromUrl(candidate.url),
        title: candidate.title || candidate.doi || candidate.url,
        url: candidate.url,
        text: candidate.text || candidate.title || '',
        publishedAt: candidate.publishedAt || null,
        role: SOURCE_ROLES.paper,
        maxChars: options.maxChars,
        metadata: {
          doi: candidate.doi || null,
          inputOnly: true,
        },
      }));
    }
  }

  writeJson(buildPack({
    script: SCRIPT,
    inputs: {
      query: options.query,
      doi: options.doi,
      url: options.url,
      input: options.input,
      limit: options.limit,
    },
    sources,
    stats: {
      candidates: candidates.length,
      accessIssues: accessIssues.length,
    },
    accessIssues,
    notes: [
      'Dry-run only. OpenAlex is a free public API and does not require a key.',
      'Most publisher full text is not fetched here; abstract/landing-page metadata is enough for P0 review.',
    ],
  }), options.output);
}

function parsePaperArgs(argv) {
  const options = parseArgs(argv);
  options.query = [];
  options.doi = [];
  options.mailto = process.env.OPENALEX_MAILTO || 'ai-person-agent@example.com';

  for (const arg of argv) {
    if (arg.startsWith('--query=')) options.query.push(arg.slice('--query='.length));
    else if (arg.startsWith('--doi=')) options.doi.push(arg.slice('--doi='.length));
    else if (arg.startsWith('--mailto=')) options.mailto = arg.slice('--mailto='.length);
  }

  return options;
}

function collectPaperCandidates(options) {
  const inputItems = readInputList(options.input);
  const candidates = [];

  for (const url of options.url) {
    candidates.push({ url, title: url });
  }
  for (const doi of options.doi) {
    candidates.push({
      doi: normalizeDoi(doi),
      url: `https://doi.org/${normalizeDoi(doi)}`,
      title: doi,
    });
  }
  for (const item of inputItems) {
    if (typeof item === 'string') candidates.push({ url: item, title: item });
    else candidates.push({
      url: item.url || (item.doi ? `https://doi.org/${normalizeDoi(item.doi)}` : null),
      doi: item.doi || null,
      title: item.title || null,
      text: item.text || item.abstract || null,
      publishedAt: item.publishedAt || item.publicationDate || null,
    });
  }

  return candidates.filter(item => item.url);
}

async function searchOpenAlex(query, options) {
  try {
    const params = new URLSearchParams({
      search: query,
      per_page: String(Math.min(options.limit, 25)),
      mailto: options.mailto,
    });
    const response = await fetchText(`${OPENALEX_WORKS_URL}?${params}`, {
      timeoutMs: options.timeoutMs,
      accept: 'application/json',
    });
    if (!response.ok) {
      return {
        sources: [],
        accessIssues: [{ url: OPENALEX_WORKS_URL, status: response.status, reason: 'openalex_fetch_failed', query }],
      };
    }

    const data = JSON.parse(response.text);
    return {
      sources: (data.results || []).map(work => ({
        url: workUrl(work),
        openalexWork: work,
      })),
      accessIssues: [],
    };
  } catch (error) {
    return {
      sources: [],
      accessIssues: [{ url: OPENALEX_WORKS_URL, status: null, reason: error.message || String(error), query }],
    };
  }
}

function sourceFromOpenAlexWork(work, options) {
  const url = workUrl(work);
  return makeKnowledgeSource({
    sourceKind: 'paper',
    sourceOwner: work.primary_location?.source?.display_name || inferOwnerFromUrl(url),
    title: work.title || url,
    url,
    text: invertedIndexToText(work.abstract_inverted_index) || work.title || '',
    publishedAt: work.publication_date || null,
    role: SOURCE_ROLES.paper,
    maxChars: options.maxChars,
    metadata: {
      openalexId: work.id || null,
      doi: work.doi || null,
      venue: work.primary_location?.source?.display_name || null,
      citationCount: work.cited_by_count || 0,
      authors: (work.authorships || [])
        .slice(0, 8)
        .map(item => item.author?.display_name)
        .filter(Boolean),
      concepts: (work.concepts || [])
        .slice(0, 8)
        .map(item => item.display_name)
        .filter(Boolean),
      landingPageUrl: normalizeUrl(work.primary_location?.landing_page_url) || null,
      pdfUrl: normalizeUrl(work.primary_location?.pdf_url) || null,
    },
  });
}

function workUrl(work) {
  if (work.doi) return `https://doi.org/${normalizeDoi(work.doi)}`;
  return work.primary_location?.landing_page_url || work.id;
}

function normalizeDoi(value) {
  return String(value || '').replace(/^https?:\/\/doi\.org\//i, '').trim();
}

function invertedIndexToText(invertedIndex) {
  if (!invertedIndex) return '';
  const words = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const position of positions) words.push([word, position]);
  }
  words.sort((left, right) => left[1] - right[1]);
  return words.map(([word]) => word).join(' ');
}

function printHelp() {
  console.log(`
Usage:
  node scripts/knowledge/fetch_paper_sources.mjs --query="tool use agents coding evaluation" --limit=5
  node scripts/knowledge/fetch_paper_sources.mjs --doi=10.48550/arXiv.2303.11366

Options:
  --query=TEXT      Search OpenAlex free API. Repeatable.
  --doi=DOI         Normalize a known DOI. Repeatable.
  --url=URL         Normalize a known paper URL. Repeatable.
  --input=PATH      txt or JSON source list.
  --output=PATH     Write JSON to file instead of stdout.
  --limit=N         Max candidates.
  --mailto=EMAIL    OpenAlex polite pool email.
`);
}
