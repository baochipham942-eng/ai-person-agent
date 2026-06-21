import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMPANY_BLOGS, pickArticleFetch } from '../../lib/datasources/company-blogs';

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
