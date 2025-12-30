import { generateText } from 'ai';
import { deepseek } from './deepseek';

/**
 * 使用 DeepSeek 将文本翻译为简体中文
 */
export async function translateToSimplifiedChinese(text: string): Promise<string> {
    if (!text || text.trim() === '') return text;

    // 检查是否已经是简体中文（简单判断）
    if (isSimplifiedChinese(text)) {
        return text;
    }

    try {
        const result = await generateText({
            model: deepseek('deepseek-chat'),
            system: `你是一个专业翻译，将任何语言翻译成简体中文。
规则：
1. 人名翻译要符合中文习惯（如 Elon Musk → 埃隆·马斯克）
2. 公司/组织名保留官方中文名（如 Tesla → 特斯拉，OpenAI → OpenAI）
3. 如果已经是繁体中文，转换为简体中文
4. 保持原意，不要添加解释
5. 只返回翻译结果，不要其他内容`,
            prompt: text,
            temperature: 0.3,
            maxTokens: 500,
        } as any);

        return result.text.trim() || text;
    } catch (error) {
        console.error('Translation error:', error);
        return text;
    }
}

/**
 * 批量翻译多个文本
 */
export async function translateBatch(texts: string[]): Promise<string[]> {
    if (texts.length === 0) return [];

    // 过滤空文本，合并翻译以节省 API 调用
    const nonEmpty = texts.filter(t => t && t.trim());
    if (nonEmpty.length === 0) return texts;

    try {
        const result = await generateText({
            model: deepseek('deepseek-chat'),
            system: `你是一个专业翻译，将每行文本翻译成简体中文。
规则：
1. 每行输入对应一行输出
2. 人名翻译要符合中文习惯
3. 公司/组织名保留官方中文名
4. 繁体中文转换为简体中文
5. 保持行数一致，不要添加解释`,
            prompt: nonEmpty.join('\n'),
            temperature: 0.3,
            maxTokens: 1000,
        } as any);

        const translated = result.text.trim().split('\n');

        // 重新映射到原始数组
        let idx = 0;
        return texts.map(original => {
            if (!original || !original.trim()) return original;
            return translated[idx++] || original;
        });
    } catch (error) {
        console.error('Batch translation error:', error);
        return texts;
    }
}

/**
 * 翻译人物信息对象
 */
export async function translatePersonInfo(info: {
    name: string;
    description: string | null;
    occupation: string[];
    organization: string[];
}): Promise<{
    name: string;
    description: string | null;
    occupation: string[];
    organization: string[];
}> {
    try {
        // 合并所有需要翻译的文本
        const textsToTranslate = [
            info.name,
            info.description || '',
            ...info.occupation,
            ...info.organization,
        ];

        const translated = await translateBatch(textsToTranslate);

        let idx = 0;
        return {
            name: translated[idx++] || info.name,
            description: info.description ? (translated[idx++] || info.description) : null,
            occupation: info.occupation.map(() => translated[idx++] || ''),
            organization: info.organization.map(() => translated[idx++] || ''),
        };
    } catch (error) {
        console.error('Person info translation error:', error);
        return info;
    }
}

/**
 * 简单判断是否为简体中文（通过常见繁体字检测）
 */
function isSimplifiedChinese(text: string): boolean {
    // 常见繁体字
    const traditionalChars = /[東說車馬時寵藝國華開發電創業務機會語學圖書館製構編輯議區際網傳統]/;
    return !traditionalChars.test(text);
}
