/**
 * Language Filter Skill
 *
 * 语言检测和过滤能力：
 * - 检测中英文内容
 * - 过滤非目标语言内容
 * - 支持批量过滤
 */

// ============== 类型定义 ==============

export interface LanguageDetectionResult {
    isChinese: boolean;
    isEnglish: boolean;
    isChineseOrEnglish: boolean;
    hasJapanese: boolean;
    hasKorean: boolean;
    hasCyrillic: boolean;
}

// ============== Skill 实现 ==============

export class LanguageFilterSkill {
    /**
     * 检测文本语言
     */
    detect(text: string): LanguageDetectionResult {
        if (!text || text.trim().length === 0) {
            return {
                isChinese: false,
                isEnglish: false,
                isChineseOrEnglish: true,
                hasJapanese: false,
                hasKorean: false,
                hasCyrillic: false,
            };
        }

        // 日文假名 (排除 \u30fb 中点)
        const hasJapanese = /[\u3040-\u30fa\u30fc-\u30ff]/.test(text);
        // 韩文谚文
        const hasKorean = /[\uac00-\ud7af]/.test(text);
        // 西里尔字母
        const hasCyrillic = /[\u0400-\u04ff]/.test(text);
        // 中文汉字
        const hasChinese = /[\u4e00-\u9fff]/.test(text);
        // 英文字母
        const hasEnglish = /[a-zA-Z]/.test(text);

        return {
            isChinese: hasChinese && !hasJapanese,
            isEnglish: hasEnglish && !hasChinese && !hasJapanese && !hasKorean && !hasCyrillic,
            isChineseOrEnglish: !(hasJapanese || hasKorean || hasCyrillic),
            hasJapanese,
            hasKorean,
            hasCyrillic,
        };
    }

    /**
     * 检测是否为中英文内容
     */
    isChineseOrEnglish(text: string): boolean {
        return this.detect(text).isChineseOrEnglish;
    }

    /**
     * 检测是否为中文
     */
    isChinese(text: string): boolean {
        return this.detect(text).isChinese;
    }

    /**
     * 检测是否为英文
     */
    isEnglish(text: string): boolean {
        return this.detect(text).isEnglish;
    }

    /**
     * 过滤数组，只保留中英文内容
     */
    filterChineseOrEnglish<T>(
        items: T[],
        getText: (item: T) => string
    ): T[] {
        return items.filter(item => this.isChineseOrEnglish(getText(item)));
    }

    /**
     * 过滤数组，只保留中文内容
     */
    filterChinese<T>(
        items: T[],
        getText: (item: T) => string
    ): T[] {
        return items.filter(item => this.isChinese(getText(item)));
    }

    /**
     * 过滤数组，只保留英文内容
     */
    filterEnglish<T>(
        items: T[],
        getText: (item: T) => string
    ): T[] {
        return items.filter(item => this.isEnglish(getText(item)));
    }

    /**
     * 检测是否为简体中文
     */
    isSimplifiedChinese(text: string): boolean {
        if (!text) return true;

        const traditionalChars = /[東說車馬時寵藝國華開發電創業務機會語學圖書館製構編輯議區際網傳統]/;
        return !traditionalChars.test(text);
    }

    /**
     * 检测主要语言
     */
    detectPrimaryLanguage(text: string): 'chinese' | 'english' | 'japanese' | 'korean' | 'russian' | 'other' {
        const result = this.detect(text);

        if (result.hasJapanese) return 'japanese';
        if (result.hasKorean) return 'korean';
        if (result.hasCyrillic) return 'russian';
        if (result.isChinese) return 'chinese';
        if (result.isEnglish) return 'english';

        return 'other';
    }
}

// 导出默认实例
export const languageFilter = new LanguageFilterSkill();
