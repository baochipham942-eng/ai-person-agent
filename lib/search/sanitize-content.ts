/**
 * 清洗泄漏到可检索内容里的「来源替换/引用补救」策展脚手架。
 *
 * 背景：历史上有一次未提交的来源替换补救运行，把 RawPoolItem.text 写成了
 * 合成 blob —— `Evidence quote: … Selection reason: … Source preview: …`，
 * 其中 preview 里还夹带了来源筛选 prompt（`Prefer official profile…`、
 * `replace_source`、`Do not use search pages…`）。这些脚手架既不该被索引（污染
 * FTS / embedding / chunk），也不该展示给用户。
 *
 * 本函数对干净文本是 no-op：不含 `Evidence quote:` 标记且无 prompt 噪声时原样返回。
 * 索引层（materialize_search_index）和展示层（ContentSearchPanel）共用它，保证一致。
 */

/** prompt 噪声段（来源筛选指令）的判定关键词，命中即整段丢弃。 */
const SELECTION_PROMPT_KEYWORDS = /(replace_source|Prefer official|Do not use|authoritative replacement|institution\/company page|login walls)/i;

/** 内部策展标签，剥成空白。 */
const CURATION_LABELS = /\b(Evidence quote|Selection reason|Source preview|Source queries)\s*[:：]/gi;

function stripSelectionPromptNoise(value: string): string {
  return value
    // blob 里各段以 " | " 分隔，丢掉含 prompt 指令的段
    .split(/\s*\|\s*/)
    .filter(segment => !SELECTION_PROMPT_KEYWORDS.test(segment))
    .join(' ')
    // "Source queries: …" 往后是检索词回显，整体丢弃
    .replace(/\bSource queries\s*[:：][\s\S]*$/i, '')
    .replace(CURATION_LABELS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeIndexedText(raw: string | null | undefined): string {
  if (!raw) return '';
  let text = raw;

  // "Repair reason: <一句话>." 前缀 = 引用补救理由，剥掉只留真实正文。
  // 非贪婪匹配到首个「句点+空白」，跳过 "Ernie 4.0" 这类点后无空格的小数点。
  text = text.replace(/^\s*Repair reason\s*[:：]\s*[\s\S]*?\.\s+/i, '');

  // 结构化 blob：保留真实的证据引文 + 来源预览正文，丢弃内部 selection reason 与 prompt 噪声。
  if (/Evidence quote\s*[:：]/i.test(text)) {
    const quote =
      text
        .match(/Evidence quote\s*[:：]\s*([\s\S]*?)(?=\s*(?:Selection reason|Source preview|Source queries)\s*[:：]|$)/i)?.[1]
        ?.trim() || '';
    const previewRaw =
      text
        .match(/Source preview\s*[:：]\s*([\s\S]*?)(?=\s*Source queries\s*[:：]|$)/i)?.[1]
        ?.trim() || '';
    const preview = stripSelectionPromptNoise(previewRaw);
    text = [quote, preview].filter(Boolean).join('\n\n');
  }

  return stripSelectionPromptNoise(text);
}
