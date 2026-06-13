/**
 * SimHash 模糊去重
 *
 * 解决精确 hash 去重去不掉的近似重复:
 * - 同一推文/文章的转发、截断变体
 * - 不同 URL 的同内容
 *
 * 无 API 成本, 纯计算。汉明距离 <= threshold 视为近似重复。
 */

const MASK64 = (1n << 64n) - 1n;

/** FNV-1a 64-bit 哈希 */
function fnv1a64(str: string): bigint {
    let hash = 0xcbf29ce484222325n;
    const prime = 0x100000001b3n;
    for (let i = 0; i < str.length; i++) {
        hash ^= BigInt(str.charCodeAt(i));
        hash = (hash * prime) & MASK64;
    }
    return hash;
}

/** 分词: 英文按词, 中文按 bigram */
function tokenize(text: string): string[] {
    const t = text.toLowerCase();
    const tokens: string[] = [];
    const en = t.match(/[a-z0-9]+/g) || [];
    tokens.push(...en);
    const cjk = t.match(/[一-鿿]/g) || [];
    if (cjk.length === 1) {
        tokens.push(cjk[0]);
    } else {
        for (let i = 0; i < cjk.length - 1; i++) tokens.push(cjk[i] + cjk[i + 1]);
    }
    return tokens;
}

/** 计算文本的 64-bit SimHash 指纹 */
export function simhash(text: string): bigint {
    const tokens = tokenize(text);
    if (tokens.length === 0) return 0n;

    const freq = new Map<string, number>();
    for (const tok of tokens) freq.set(tok, (freq.get(tok) || 0) + 1);

    const v = new Array<number>(64).fill(0);
    for (const [tok, w] of freq) {
        const h = fnv1a64(tok);
        for (let i = 0; i < 64; i++) {
            if ((h >> BigInt(i)) & 1n) v[i] += w;
            else v[i] -= w;
        }
    }

    let fingerprint = 0n;
    for (let i = 0; i < 64; i++) {
        if (v[i] > 0) fingerprint |= (1n << BigInt(i));
    }
    return fingerprint;
}

/** 两个指纹的汉明距离 (不同 bit 数) */
export function hammingDistance(a: bigint, b: bigint): number {
    let x = a ^ b;
    let count = 0;
    while (x) {
        count += Number(x & 1n);
        x >>= 1n;
    }
    return count;
}

export interface DedupResult<T> {
    kept: T[];
    dropped: Array<{ item: T; duplicateOf: T; distance: number }>;
}

/**
 * 对一批 item 做 SimHash 近似去重。
 * @param getText 从 item 提取用于比较的文本 (建议 title + text)
 * @param threshold 汉明距离阈值, <= 视为重复 (默认 3, 越小越严格)
 */
export function dedupeBySimHash<T>(
    items: T[],
    getText: (item: T) => string,
    threshold = 3
): DedupResult<T> {
    const kept: T[] = [];
    const keptHashes: bigint[] = [];
    const dropped: DedupResult<T>['dropped'] = [];

    for (const item of items) {
        const text = getText(item) || '';
        // 过短文本不参与模糊去重 (交给 L0/L1), 直接保留
        if (text.trim().length < 20) {
            kept.push(item);
            keptHashes.push(simhash(text));
            continue;
        }
        const h = simhash(text);
        let dupIdx = -1;
        let dupDist = Infinity;
        for (let i = 0; i < keptHashes.length; i++) {
            const d = hammingDistance(h, keptHashes[i]);
            if (d <= threshold && d < dupDist) {
                dupIdx = i;
                dupDist = d;
            }
        }
        if (dupIdx >= 0) {
            dropped.push({ item, duplicateOf: kept[dupIdx], distance: dupDist });
        } else {
            kept.push(item);
            keptHashes.push(h);
        }
    }

    return { kept, dropped };
}
