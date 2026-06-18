#!/usr/bin/env node
import {
  SOURCE_ROLES,
  buildPack,
  cleanText,
  extractCanonicalUrl,
  extractCodeSnippets,
  extractHtmlTitle,
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

const SCRIPT = 'fetch_implementation_sources';
const GITHUB_API = 'https://api.github.com';

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const options = parseImplementationArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const accessIssues = [];
  const candidates = collectCandidates(options);

  for (const query of options.githubSearch) {
    const result = await searchGitHubRepositories(query, options);
    candidates.push(...result.candidates);
    accessIssues.push(...result.accessIssues);
  }

  const selected = uniqueByUrl(candidates).slice(0, options.limit);
  const sources = [];

  for (const candidate of selected) {
    if (candidate.kind === 'github_repo') {
      const result = await fetchGitHubRepo(candidate, options);
      if (!result.ok) accessIssues.push({ url: candidate.url, status: result.status, reason: result.reason });
      sources.push(sourceFromImplementationCandidate(candidate, result, options));
      continue;
    }

    const result = await fetchDocsOrExample(candidate, options);
    if (!result.ok) accessIssues.push({ url: candidate.url, status: result.status, reason: result.reason });
    sources.push(sourceFromImplementationCandidate(candidate, result, options));
  }

  writeJson(buildPack({
    script: SCRIPT,
    inputs: {
      url: options.url,
      repo: options.repo,
      docsUrl: options.docsUrl,
      exampleUrl: options.exampleUrl,
      githubSearch: options.githubSearch,
      input: options.input,
      limit: options.limit,
    },
    sources,
    stats: {
      candidates: selected.length,
      accessIssues: accessIssues.length,
    },
    accessIssues,
    notes: [
      'Dry-run only. This script does not write KnowledgeSource.',
      'GitHub public API is used without a token; provide exact repo URLs when rate-limited.',
      'Implementation sources should support productized_as or implementation_signal edges, not replace official definitions.',
    ],
  }), options.output);
}

function parseImplementationArgs(argv) {
  const options = parseArgs(argv);
  options.repo = [];
  options.docsUrl = [];
  options.exampleUrl = [];
  options.githubSearch = [];

  for (const arg of argv) {
    if (arg.startsWith('--repo=')) options.repo.push(arg.slice('--repo='.length));
    else if (arg.startsWith('--docs-url=')) options.docsUrl.push(arg.slice('--docs-url='.length));
    else if (arg.startsWith('--example-url=')) options.exampleUrl.push(arg.slice('--example-url='.length));
    else if (arg.startsWith('--github-search=')) options.githubSearch.push(arg.slice('--github-search='.length));
  }

  return options;
}

function collectCandidates(options) {
  const candidates = [];
  for (const repo of options.repo) candidates.push(repoCandidate(repo));
  for (const url of options.url) candidates.push(classifyUrlCandidate(url));
  for (const url of options.docsUrl) candidates.push({ ...classifyUrlCandidate(url), kind: 'docs_snippet', sourceKind: 'implementation_docs' });
  for (const url of options.exampleUrl) candidates.push({ ...classifyUrlCandidate(url), kind: 'example_page', sourceKind: 'implementation_example' });

  for (const item of readInputList(options.input)) {
    if (item?.role && item.role !== SOURCE_ROLES.implementation) continue;
    if (typeof item === 'string') {
      candidates.push(classifyUrlCandidate(item));
    } else if (item.repo) {
      candidates.push({ ...repoCandidate(item.repo), title: item.title || item.repo });
    } else if (item.url) {
      candidates.push({
        ...classifyUrlCandidate(item.url),
        title: item.title || item.url,
        text: item.text || [item.whyRelevant, item.evidenceQuote].filter(Boolean).join('\n\n') || null,
        publishedAt: item.publishedAt || null,
        sourceKind: item.sourceKind || classifyUrlCandidate(item.url).sourceKind,
        candidateMetadata: {
          id: item.id || null,
          whyRelevant: item.whyRelevant || null,
          evidenceQuote: item.evidenceQuote || null,
          confidence: item.confidence || null,
          reviewNotes: item.reviewNotes || null,
        },
      });
    }
  }

  return candidates.filter(candidate => candidate.url);
}

function classifyUrlCandidate(url) {
  const repo = parseGitHubRepo(url);
  if (repo) return repoCandidate(repo.fullName);
  const lower = url.toLowerCase();
  if (lower.includes('/examples') || lower.includes('example')) {
    return {
      kind: 'example_page',
      sourceKind: 'implementation_example',
      url,
      title: url,
    };
  }
  return {
    kind: 'docs_snippet',
    sourceKind: 'implementation_docs',
    url,
    title: url,
  };
}

function repoCandidate(value) {
  const parsed = parseGitHubRepo(value);
  const fullName = parsed?.fullName || String(value).replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
  return {
    kind: 'github_repo',
    sourceKind: 'github_repo',
    owner: fullName.split('/')[0],
    repo: fullName.split('/')[1],
    fullName,
    url: `https://github.com/${fullName}`,
    title: fullName,
  };
}

async function searchGitHubRepositories(query, options) {
  try {
    const params = new URLSearchParams({
      q: query,
      sort: 'stars',
      order: 'desc',
      per_page: String(Math.min(options.limit, 20)),
    });
    const response = await fetchText(`${GITHUB_API}/search/repositories?${params}`, {
      timeoutMs: options.timeoutMs,
      accept: 'application/vnd.github+json',
      userAgent: 'ai-person-agent knowledge dry-run',
    });
    if (!response.ok) {
      return {
        candidates: [],
        accessIssues: [{ url: `${GITHUB_API}/search/repositories`, status: response.status, reason: 'github_search_failed', query }],
      };
    }

    const data = JSON.parse(response.text);
    return {
      candidates: (data.items || []).map(repo => ({
        kind: 'github_repo',
        sourceKind: 'github_repo',
        owner: repo.owner?.login,
        repo: repo.name,
        fullName: repo.full_name,
        url: repo.html_url,
        title: repo.full_name,
        text: repo.description || '',
        publishedAt: repo.pushed_at || repo.updated_at || null,
        repoMetadata: {
          stars: repo.stargazers_count || 0,
          forks: repo.forks_count || 0,
          language: repo.language || null,
          topics: repo.topics || [],
        },
      })),
      accessIssues: [],
    };
  } catch (error) {
    return {
      candidates: [],
      accessIssues: [{ url: `${GITHUB_API}/search/repositories`, status: null, reason: error.message || String(error), query }],
    };
  }
}

async function fetchGitHubRepo(candidate, options) {
  if (!candidate.owner || !candidate.repo) {
    return { ok: false, status: null, reason: 'invalid_github_repo' };
  }

  const repoApiUrl = `${GITHUB_API}/repos/${candidate.owner}/${candidate.repo}`;
  const readmeApiUrl = `${repoApiUrl}/readme`;

  try {
    const [repoResponse, readmeResponse] = await Promise.all([
      fetchText(repoApiUrl, {
        timeoutMs: options.timeoutMs,
        accept: 'application/vnd.github+json',
        userAgent: 'ai-person-agent knowledge dry-run',
      }),
      fetchText(readmeApiUrl, {
        timeoutMs: options.timeoutMs,
        accept: 'application/vnd.github.raw',
        userAgent: 'ai-person-agent knowledge dry-run',
      }),
    ]);

    let repoJson = {};
    if (repoResponse.ok) repoJson = JSON.parse(repoResponse.text);

    const readmeText = readmeResponse.ok ? readmeResponse.text : '';
    const text = cleanText([
      repoJson.description || candidate.text || '',
      readmeText,
    ].filter(Boolean).join('\n\n'));

    return {
      ok: repoResponse.ok || readmeResponse.ok,
      status: repoResponse.ok ? repoResponse.status : readmeResponse.status,
      reason: repoResponse.ok || readmeResponse.ok ? null : 'github_repo_fetch_failed',
      title: repoJson.full_name || candidate.title,
      finalUrl: repoJson.html_url || candidate.url,
      text,
      publishedAt: repoJson.pushed_at || repoJson.updated_at || candidate.publishedAt || null,
      metadata: {
        stars: repoJson.stargazers_count ?? candidate.repoMetadata?.stars ?? null,
        forks: repoJson.forks_count ?? candidate.repoMetadata?.forks ?? null,
        language: repoJson.language || candidate.repoMetadata?.language || null,
        topics: repoJson.topics || candidate.repoMetadata?.topics || [],
        readmeFetched: readmeResponse.ok,
      },
    };
  } catch (error) {
    return { ok: false, status: null, reason: error.message || String(error) };
  }
}

async function fetchDocsOrExample(candidate, options) {
  if (candidate.text) {
    return {
      ok: true,
      status: 200,
      finalUrl: candidate.url,
      title: candidate.title,
      text: candidate.text,
      publishedAt: candidate.publishedAt || null,
      metadata: { inputOnly: true },
    };
  }

  try {
    const response = await fetchText(candidate.url, { timeoutMs: options.timeoutMs });
    if (!response.ok) return { ok: false, status: response.status, reason: 'page_fetch_failed' };

    const title = extractHtmlTitle(response.text) || candidate.title;
    const codeSnippets = extractCodeSnippets(response.text, 12);
    const prose = htmlToText(response.text);
    const text = cleanText([
      prose,
      codeSnippets.length ? `Code snippets:\n${codeSnippets.join('\n\n')}` : '',
    ].filter(Boolean).join('\n\n'));

    return {
      ok: true,
      status: response.status,
      finalUrl: response.finalUrl,
      title,
      text,
      metadata: {
        contentType: response.contentType,
        codeSnippetCount: codeSnippets.length,
        canonicalUrl: extractCanonicalUrl(response.text, candidate.url),
      },
    };
  } catch (error) {
    return { ok: false, status: null, reason: error.message || String(error) };
  }
}

function sourceFromImplementationCandidate(candidate, result, options) {
  return makeKnowledgeSource({
    sourceKind: candidate.sourceKind,
    sourceOwner: candidate.fullName || candidate.owner || inferOwnerFromUrl(candidate.url),
    title: result.title || candidate.title,
    url: result.finalUrl || candidate.url,
    text: result.text || candidate.text || candidate.title,
    publishedAt: normalizeDate(result.publishedAt || candidate.publishedAt),
    role: SOURCE_ROLES.implementation,
    maxChars: options.maxChars,
    metadata: {
      implementationKind: candidate.kind,
      githubOwner: candidate.owner || null,
      githubRepo: candidate.repo || null,
      fetched: result.ok === true,
      ...candidate.repoMetadata,
      ...candidate.candidateMetadata,
      ...result.metadata,
    },
  });
}

function parseGitHubRepo(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const direct = raw.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (direct) return { owner: direct[1], repo: direct[2], fullName: `${direct[1]}/${direct[2]}` };

  try {
    const parsed = new URL(raw);
    if (parsed.hostname.replace(/^www\./, '') !== 'github.com') return null;
    const [owner, repo] = parsed.pathname.split('/').filter(Boolean);
    if (!owner || !repo) return null;
    return { owner, repo, fullName: `${owner}/${repo}` };
  } catch {
    return null;
  }
}

function printHelp() {
  console.log(`
Usage:
  node scripts/knowledge/fetch_implementation_sources.mjs --repo=anthropics/anthropic-cookbook
  node scripts/knowledge/fetch_implementation_sources.mjs --docs-url=https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview
  node scripts/knowledge/fetch_implementation_sources.mjs --github-search='claude code agent examples'

Options:
  --repo=OWNER/REPO        Fetch GitHub repo metadata and README. Repeatable.
  --github-search=QUERY    Search public GitHub repositories without a token. Repeatable.
  --docs-url=URL           Fetch implementation docs page and code snippets. Repeatable.
  --example-url=URL        Fetch examples page and code snippets. Repeatable.
  --url=URL                Auto-classify URL as GitHub repo or docs/example page.
  --input=PATH             txt or JSON source list.
  --output=PATH            Write JSON to file instead of stdout.
  --limit=N                Max candidates.
  --max-chars=N            Max text chars per source.
`);
}
