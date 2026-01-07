/**
 * 语言检测工具
 * 用于过滤非中英文内容
 */

/**
 * 检测文本是否主要为中文或英文
 * @param text 待检测的文本
 * @returns true 如果文本主要是中文或英文，false 如果检测到日文假名、韩文谚文或俄文西里尔字母
 */
export function isChineseOrEnglish(text: string): boolean {
    if (!text || text.trim().length === 0) {
        return true; // 空文本默认通过
    }

    // 检测非目标语言的脚本
    // 日文假名 (排除 \u30fb 中点，因为常用于中文人名)
    const hasKana = /[\u3040-\u30fa\u30fc-\u30ff]/.test(text);
    // 韩文谚文
    const hasHangul = /[\uac00-\ud7af]/.test(text);
    // 西里尔字母 (俄文等)
    const hasCyrillic = /[\u0400-\u04ff]/.test(text);

    // 如果包含任何非目标语言脚本，返回 false
    if (hasKana || hasHangul || hasCyrillic) {
        return false;
    }

    return true;
}

/**
 * 过滤数组，只保留中英文内容
 * @param items 待过滤的数组
 * @param getText 从数组元素中提取文本的函数
 * @returns 过滤后的数组
 */
export function filterChineseOrEnglish<T>(
    items: T[],
    getText: (item: T) => string
): T[] {
    return items.filter(item => isChineseOrEnglish(getText(item)));
}
