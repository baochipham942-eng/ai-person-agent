import Link from 'next/link';
import Image from 'next/image';
import { getBestOccupation } from '@/lib/constants/occupationMap';

interface Person {
    id: string;
    name: string;
    avatarUrl: string | null;
    occupation: string[];
    description: string | null;
    whyImportant: string | null;
}

// 根据名字生成一致的颜色
function getAvatarColor(name: string): string {
    const colors = [
        '#4F46E5', '#7C3AED', '#2563EB', '#0891B2',
        '#059669', '#D97706', '#DC2626', '#DB2777'
    ];
    const charCode = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
    return colors[charCode % colors.length];
}

export function PersonCard({ person }: { person: Person }) {
    // 获取优化后的职业标签
    const occupation = getBestOccupation(person.occupation) || '人物';

    // 简介处理：优先显示 whyImportant (AI贡献)，否则显示 description (通用简介)
    // 简介处理：优先显示 whyImportant (AI贡献)，否则显示 description (通用简介)
    const hasWhyImportant = !!person.whyImportant;
    const sourceText = person.whyImportant || person.description;

    // 截断处理
    const truncatedText = sourceText
        ? (sourceText.length > 60   // 增加截断长度，避免意思不完整
            ? sourceText.slice(0, 60) + '...'
            : sourceText)
        : '暂无简介';

    // 如果是 whyImportant，添加 emoji 前缀 (不放在 tooltip，直接显式展示)
    const displayContent = hasWhyImportant ? `💡 ${truncatedText}` : truncatedText;

    return (
        <Link
            href={`/person/${person.id}`}
            className="block group"
        >
            <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 flex flex-col items-center text-center group-hover:-translate-y-1 min-h-[200px]">
                {/* Avatar - 使用 object-top 保留头部 */}
                <div className="relative w-16 h-16 mb-3 rounded-2xl overflow-hidden bg-gray-100 shadow-inner flex-shrink-0">
                    {person.avatarUrl ? (
                        <Image
                            src={person.avatarUrl}
                            alt={person.name}
                            fill
                            className="object-cover object-top"
                            sizes="64px"
                            unoptimized
                        />
                    ) : (
                        <div
                            className="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
                            style={{
                                backgroundColor: getAvatarColor(person.name)
                            }}
                        >
                            {person.name.charAt(0)}
                        </div>
                    )}
                </div>

                {/* Name */}
                <h3 className="text-base font-bold text-gray-900 mb-1.5 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {person.name}
                </h3>

                {/* Occupation Tag */}
                <div className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full mb-2">
                    {occupation}
                </div>

                {/* Description */}
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed flex-1">
                    {displayContent}
                </p>
            </div>
        </Link>
    );
}
