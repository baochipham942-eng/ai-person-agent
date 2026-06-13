import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import net from 'node:net';
import WebSocket from 'ws';

const DEFAULT_PAGES = [
  { name: 'home', path: '/', expectText: ['AI 人物库'] },
  { name: 'topic-agent', path: '/topic/Agent', expectText: ['Agent 方向关键人物'] },
  { name: 'org-openai', path: '/org/OpenAI', expectText: ['OpenAI AI 关键人物'] },
  { name: 'digest', path: '/digest', expectText: ['本周动态'] },
  { name: 'graph', path: '/graph', expectText: ['人物关系'] },
  { name: 'watchlist', path: '/watchlist', expectText: ['我的关注'] },
  { name: 'compare', path: '/compare', expectText: ['人物对比'] },
  { name: 'quality', path: '/admin/quality', expectText: ['质量复核队列'] },
  { name: 'operations', path: '/admin/operations', expectText: ['上线准备度'] },
];

const DEFAULT_VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 720, mobile: false },
  { name: 'mobile', width: 390, height: 844, mobile: true },
];

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const chromePath = await findChrome(options.chromePath);
  const port = await getFreePort();
  const userDataDir = await mkdtemp(join(tmpdir(), 'ai-person-responsive-smoke-'));
  const chrome = launchChrome({ chromePath, port, userDataDir });
  const chromeState = watchChrome(chrome);

  try {
    const pageWsUrl = await openBlankPage(port, chromeState, options.timeoutMs);
    const cdp = await CdpClient.connect(pageWsUrl);
    const results = await runSmoke(cdp, options);
    await cdp.close();

    printSummary(results, options);
    if (results.some(result => result.status !== 'pass')) {
      process.exitCode = 1;
    }
  } finally {
    chrome.kill('SIGTERM');
    await rm(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

async function runSmoke(cdp, options) {
  const results = [];
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');

  let currentErrors = [];
  cdp.on('Runtime.exceptionThrown', params => {
    currentErrors.push(formatRuntimeException(params.exceptionDetails));
  });
  cdp.on('Runtime.consoleAPICalled', params => {
    if (params.type === 'error') {
      currentErrors.push(params.args?.map(arg => arg.value || arg.description || arg.type).join(' ') || 'console.error');
    }
  });
  cdp.on('Log.entryAdded', params => {
    if (params.entry?.level === 'error') {
      currentErrors.push(params.entry.text || 'log error');
    }
  });

  if (!options.noScreenshots) {
    await mkdir(options.screenshotDir, { recursive: true });
  }

  for (const viewport of options.viewports) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.mobile,
    });

    for (const page of options.pages) {
      currentErrors = [];
      const targetUrl = new URL(page.path, options.baseUrl).toString();
      const loadResult = await navigateAndWait(cdp, targetUrl, options.timeoutMs);
      const state = await waitForPageState(cdp, page.expectText, options.timeoutMs);
      await delay(options.hydrationSettleMs);
      const errors = [...currentErrors];
      const screenshotPath = options.noScreenshots
        ? null
        : await captureScreenshot(cdp, options.screenshotDir, `${viewport.name}-${page.name}.png`);
      const failures = collectFailures({ page, viewport, loadResult, state, errors, options });

      results.push({
        name: page.name,
        path: page.path,
        viewport: viewport.name,
        url: state.url,
        status: failures.length === 0 ? 'pass' : 'fail',
        failures,
        consoleErrors: errors,
        screenshotPath,
        metrics: {
          title: state.title,
          h1: state.h1,
          clientWidth: state.clientWidth,
          scrollWidth: state.scrollWidth,
          overflowX: state.overflowX,
          widestOverflow: state.widestOverflow,
        },
      });
    }
  }

  await cdp.send('Emulation.clearDeviceMetricsOverride');
  return results;
}

async function navigateAndWait(cdp, url, timeoutMs) {
  const loadPromise = cdp.waitFor('Page.loadEventFired', timeoutMs);
  const response = await cdp.send('Page.navigate', { url });
  await loadPromise.catch(() => null);
  return response;
}

async function waitForPageState(cdp, expectText, timeoutMs) {
  const startedAt = Date.now();
  let latest = null;
  while (Date.now() - startedAt < timeoutMs) {
    latest = await readPageState(cdp, expectText);
    if (latest.readyState === 'complete' && latest.expectedTextFound) return latest;
    await delay(250);
  }
  return latest || await readPageState(cdp, expectText);
}

async function readPageState(cdp, expectText) {
  const expression = `(() => {
    const expected = ${JSON.stringify(expectText)};
    const bodyText = document.body ? document.body.textContent || '' : '';
    const clientWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    let widest = { overflow: 0, tag: '', text: '', className: '' };
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      if (isInsideHorizontalScroller(el)) continue;
      const overflow = Math.max(0, Math.ceil(rect.right - clientWidth), Math.ceil(-rect.left));
      if (overflow > widest.overflow) {
        widest = {
          overflow,
          tag: el.tagName,
          text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 120),
          className: el.getAttribute('class') || ''
        };
      }
    }
    function isInsideHorizontalScroller(el) {
      let current = el.parentElement;
      while (current && current !== document.body) {
        const style = getComputedStyle(current);
        if ((style.overflowX === 'auto' || style.overflowX === 'scroll') && current.scrollWidth > current.clientWidth + 1) {
          return true;
        }
        current = current.parentElement;
      }
      return false;
    }
    return {
      url: location.href,
      title: document.title,
      h1: document.querySelector('h1')?.textContent || '',
      readyState: document.readyState,
      expectedTextFound: expected.every(text => bodyText.includes(text)),
      missingText: expected.filter(text => !bodyText.includes(text)),
      clientWidth,
      scrollWidth,
      overflowX: Math.max(0, scrollWidth - clientWidth),
      widestOverflow: widest
    };
  })()`;
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return result.result.value;
}

function collectFailures({ page, viewport, loadResult, state, errors, options }) {
  const failures = [];
  if (loadResult.errorText) failures.push(`navigation failed: ${loadResult.errorText}`);
  if (!state.expectedTextFound) failures.push(`missing text: ${state.missingText.join(', ')}`);
  if (state.overflowX > options.overflowTolerancePx) {
    failures.push(`horizontal overflow ${state.overflowX}px at ${viewport.width}px`);
  }
  if (state.widestOverflow?.overflow > options.overflowTolerancePx) {
    failures.push(`element overflow ${state.widestOverflow.overflow}px: ${state.widestOverflow.text || state.widestOverflow.tag}`);
  }
  if (options.failOnConsoleError && errors.length > 0) {
    failures.push(`console errors: ${errors.length}`);
  }
  if (!state.h1 && page.requireH1) failures.push('missing h1');
  return failures;
}

function formatRuntimeException(details) {
  if (!details) return 'runtime exception';
  const parts = [];
  const description = details.exception?.description || details.exception?.value || '';
  if (description) parts.push(String(description));
  else if (details.text) parts.push(String(details.text));

  const frames = details.stackTrace?.callFrames || [];
  if (frames.length > 0) {
    parts.push(frames
      .slice(0, 3)
      .map(frame => {
        const location = `${frame.url || '<anonymous>'}:${frame.lineNumber + 1}:${frame.columnNumber + 1}`;
        return `${frame.functionName || '<anonymous>'} (${location})`;
      })
      .join(' <- '));
  }
  return parts.join(' | ') || 'runtime exception';
}

async function captureScreenshot(cdp, screenshotDir, filename) {
  const response = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });
  const filePath = resolve(screenshotDir, filename);
  await writeFile(filePath, Buffer.from(response.data, 'base64'));
  return filePath;
}

function launchChrome({ chromePath, port, userDataDir }) {
  return spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    'about:blank',
  ], {
    stdio: ['ignore', 'ignore', 'pipe'],
  });
}

function watchChrome(chrome) {
  const state = {
    stderr: '',
    exit: null,
  };
  chrome.stderr?.on('data', chunk => {
    state.stderr = `${state.stderr}${chunk.toString()}`.slice(-4000);
  });
  chrome.on('exit', (code, signal) => {
    state.exit = { code, signal };
  });
  return state;
}

async function openBlankPage(port, chromeState, timeoutMs) {
  await waitForChrome(port, chromeState, timeoutMs);
  const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
  if (!response.ok) {
    throw new Error(`Chrome target creation failed: HTTP ${response.status}`);
  }
  const target = await response.json();
  if (!target.webSocketDebuggerUrl) throw new Error('Chrome target has no webSocketDebuggerUrl');
  return target.webSocketDebuggerUrl;
}

async function waitForChrome(port, chromeState, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (chromeState.exit) {
      throw new Error(`Chrome exited before DevTools was ready: ${JSON.stringify(chromeState.exit)}\n${chromeState.stderr}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch {
      // Chrome is still starting.
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for Chrome DevTools endpoint\n${chromeState.stderr}`);
}

class CdpClient {
  static connect(wsUrl) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const client = new CdpClient(ws);
      ws.once('open', () => resolve(client));
      ws.once('error', reject);
    });
  }

  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();

    ws.on('message', data => {
      const message = JSON.parse(data.toString());
      if (message.id && this.pending.has(message.id)) {
        const { resolve: resolvePromise, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message || JSON.stringify(message.error)));
        else resolvePromise(message.result || {});
        return;
      }

      const handlers = this.handlers.get(message.method) || [];
      for (const handler of handlers) handler(message.params || {});
    });

    ws.on('close', () => {
      for (const { reject } of this.pending.values()) {
        reject(new Error('CDP socket closed'));
      }
      this.pending.clear();
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolvePromise, reject) => {
      this.pending.set(id, { resolve: resolvePromise, reject });
      setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        reject(new Error(`CDP command timed out: ${method}`));
      }, 15000);
    });
  }

  on(method, handler) {
    const handlers = this.handlers.get(method) || [];
    handlers.push(handler);
    this.handlers.set(method, handlers);
  }

  waitFor(method, timeoutMs) {
    return new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timed out waiting for ${method}`));
      }, timeoutMs);
      this.on(method, params => {
        clearTimeout(timer);
        resolvePromise(params);
      });
    });
  }

  close() {
    return new Promise(resolvePromise => {
      this.ws.once('close', resolvePromise);
      this.ws.close();
      setTimeout(resolvePromise, 250);
    });
  }
}

async function findChrome(explicitPath) {
  const candidates = [
    explicitPath,
    process.env.CHROME_PATH,
    join(process.env.HOME || '', 'Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell'),
    join(process.env.HOME || '', 'Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error('Chrome executable not found. Set CHROME_PATH or pass --chrome=/path/to/chrome.');
}

function getFreePort() {
  return new Promise((resolvePromise, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolvePromise(address.port));
    });
    server.on('error', reject);
  });
}

function parseArgs(args) {
  const options = {
    baseUrl: 'http://127.0.0.1:4001',
    pages: DEFAULT_PAGES,
    viewports: DEFAULT_VIEWPORTS,
    screenshotDir: join(tmpdir(), 'ai-person-responsive-smoke'),
    noScreenshots: false,
    jsonOnly: false,
    failOnConsoleError: true,
    overflowTolerancePx: 1,
    hydrationSettleMs: 1200,
    timeoutMs: 20000,
    chromePath: null,
  };

  for (const arg of args) {
    if (arg === '--no-screenshots') options.noScreenshots = true;
    if (arg === '--json-only') options.jsonOnly = true;
    if (arg === '--allow-console-errors') options.failOnConsoleError = false;
    if (arg.startsWith('--base-url=')) options.baseUrl = ensureTrailingSlash(arg.slice('--base-url='.length));
    if (arg.startsWith('--screenshot-dir=')) options.screenshotDir = resolve(arg.slice('--screenshot-dir='.length));
    if (arg.startsWith('--chrome=')) options.chromePath = arg.slice('--chrome='.length);
    if (arg.startsWith('--timeout-ms=')) options.timeoutMs = clampInteger(arg.slice('--timeout-ms='.length), 1000, 60000, options.timeoutMs);
    if (arg.startsWith('--hydration-settle-ms=')) options.hydrationSettleMs = clampInteger(arg.slice('--hydration-settle-ms='.length), 0, 10000, options.hydrationSettleMs);
    if (arg.startsWith('--overflow-tolerance=')) options.overflowTolerancePx = clampInteger(arg.slice('--overflow-tolerance='.length), 0, 100, options.overflowTolerancePx);
    if (arg.startsWith('--pages=')) options.pages = parsePages(arg.slice('--pages='.length));
    if (arg.startsWith('--viewports=')) options.viewports = parseViewports(arg.slice('--viewports='.length));
  }

  return options;
}

function parsePages(value) {
  return value.split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      const [namePart, pathPart, expectPart] = item.split(':');
      const path = pathPart || namePart;
      return {
        name: slugify(namePart.replace(/^\//, '') || 'page'),
        path,
        expectText: expectPart ? expectPart.split('|').filter(Boolean) : [],
      };
    });
}

function parseViewports(value) {
  return value.split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      const [namePart, sizePart] = item.split(':');
      const [width, height] = (sizePart || namePart).split('x').map(Number);
      if (!Number.isFinite(width) || !Number.isFinite(height)) {
        throw new Error(`Invalid viewport: ${item}`);
      }
      const name = sizePart ? namePart : `${width}x${height}`;
      return { name, width, height, mobile: width < 700 };
    });
}

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`;
}

function slugify(value) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '') || 'page';
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function delay(ms) {
  return new Promise(resolvePromise => setTimeout(resolvePromise, ms));
}

function printSummary(results, options) {
  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    baseUrl: options.baseUrl,
    screenshotDir: options.noScreenshots ? null : options.screenshotDir,
    total: results.length,
    passed: results.filter(result => result.status === 'pass').length,
    failed: results.filter(result => result.status === 'fail').length,
    results,
  }, null, 2));

  if (options.jsonOnly) return;

  console.table(results.map(result => ({
    status: result.status,
    viewport: result.viewport,
    page: result.name,
    overflow: result.metrics.overflowX,
    h1: result.metrics.h1,
    failures: result.failures.join(' | '),
  })));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
