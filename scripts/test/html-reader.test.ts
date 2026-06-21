import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractArticleText } from '../../lib/datasources/html-reader';

// HF 官方博客页形态：顶部站点导航 + script + blog-content prose 正文容器 + 底部 footer
const HF_PAGE = `
<!doctype html><html><head>
<script>window.__DATA__ = {trackingId: "TRACKING_SCRIPT_SHOULD_NOT_APPEAR"};</script>
<style>.x{color:red}</style>
</head><body>
<nav><a href="/models">Models</a><a href="/datasets">Datasets</a><a href="/blog">Blog</a></nav>
<div class="blog-content copiable-code-container [&amp;_h1]:mr-0! prose mx-auto mb-8 lg:prose-lg">
  <h1>Beyond LoRA &amp; Friends</h1>
  <p>This is the real article body. We compare LoRA against full fine-tuning across several
  benchmarks and report that the gap is smaller than commonly believed. The post walks through
  the experimental setup, the datasets used, and the compute budget required to reproduce these
  numbers on a single GPU node. Quotes &quot;like this&quot; should decode cleanly.</p>
  <pre><code>model.fit(data)</code></pre>
</div>
<footer><a href="/about">FOOTER_JUNK_LINK</a></footer>
</body></html>`;

test('从 blog-content 容器抽出正文，解实体', () => {
  const text = extractArticleText(HF_PAGE);
  assert.ok(text.includes('Beyond LoRA & Friends'), '应含解实体后的标题');
  assert.ok(text.includes('real article body'), '应含正文');
  assert.ok(text.includes('"like this"'), '应解 &quot;');
  assert.ok(text.length >= 200, `正文应 ≥200 字，实际 ${text.length}`);
});

test('剥掉 script / style / 顶部 nav / 底部 footer 噪声', () => {
  const text = extractArticleText(HF_PAGE);
  assert.ok(!text.includes('TRACKING_SCRIPT_SHOULD_NOT_APPEAR'), '不应含 script 内容');
  assert.ok(!text.includes('color:red'), '不应含 style 内容');
  assert.ok(!text.includes('FOOTER_JUNK_LINK'), '不应含 footer');
});

test('无 blog-content 时回退 <article>', () => {
  const html = `<body><nav>NAVJUNK</nav><article><h1>Title</h1><p>${'word '.repeat(60)}</p></article></body>`;
  const text = extractArticleText(html);
  assert.ok(text.includes('Title'));
  assert.ok(text.startsWith('Title') || !text.includes('NAVJUNK'), '应只取 article 内文，剥掉 nav');
  assert.ok(text.length >= 200);
});

test('无 blog-content/article 时回退 <main>', () => {
  const html = `<body><main><p>${'body content here '.repeat(20)}</p></main></body>`;
  const text = extractArticleText(html);
  assert.ok(text.includes('body content here'));
  assert.ok(text.length >= 200);
});

test('类名含 > 的 Tailwind 任意值(如 [&>a]:hidden)不破坏去标签', () => {
  // HF 真实页面用 [&>a]:hidden 这类任意值类名，class 里的 > 会把朴素去标签正则截断
  const html = `<body><div class="blog-content prose"><h1 class="[&>a]:hidden mr-0!">Real Title Here</h1><p>${'clean body text '.repeat(20)}</p></div></body>`;
  const text = extractArticleText(html);
  assert.ok(!text.includes(']:hidden'), `不应残留类名碎片，实际开头: ${text.slice(0, 40)}`);
  assert.ok(text.includes('Real Title Here'));
  assert.ok(text.startsWith('Real Title Here'), `应以标题开头，实际: ${text.slice(0, 30)}`);
});

test('空/无效输入返回空串，不抛错', () => {
  assert.equal(extractArticleText(''), '');
  assert.equal(extractArticleText('   '), '');
});
