import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMPANY_BLOGS, pickArticleFetch, parseFeed } from '../../lib/datasources/company-blogs';

test('Hugging Face 走 html 直连抓正文', () => {
  const hf = COMPANY_BLOGS.find(c => c.name === 'Hugging Face')!;
  assert.ok(hf, 'HF 应在清单');
  assert.equal(pickArticleFetch(hf), 'html');
});

test('其它源默认走 jina（未声明 articleFetch）', () => {
  const openai = COMPANY_BLOGS.find(c => c.name === 'OpenAI')!;
  assert.equal(pickArticleFetch(openai), 'jina');
});

test('pickArticleFetch 缺省即 jina', () => {
  assert.equal(pickArticleFetch({ name: 'X', org: 'X', method: 'rss', url: 'https://x' }), 'jina');
});

test('parseFeed 解码 &apos; / &amp; 等标题实体', () => {
  const xml = `<rss><channel>
    <item><title>How to build apps with OpenAI&apos;s Privacy &amp; Tools</title><link>https://e.x/a</link></item>
  </channel></rss>`;
  const [it] = parseFeed(xml);
  assert.equal(it.title, "How to build apps with OpenAI's Privacy & Tools");
});
