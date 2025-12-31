import Link from 'next/link';
import Image from 'next/image';

interface Person {
    id: string;
    name: string;
    avatarUrl: string | null;
    occupation: string[];
    description: string | null;
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
    // Use first occupation or default text
    const occupation = person.occupation?.[0] || '知名人物';
    // Truncate description if needed (handled by CSS line-clamp generally, but simple slice here is safer for server/client match)
    const description = person.description || '暂无简介';

    return (
        <Link
            href={`/person/${person.id}`}
            className="block group h-full"
        >
            <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 h-full flex flex-col items-center text-center group-hover:-translate-y-1">
                <div className="relative w-16 h-16 mb-3 rounded-2xl overflow-hidden bg-gray-100 shadow-inner">
                    {person.avatarUrl ? (
                        <Image
                            src={person.avatarUrl}
                            alt={person.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 64px, 64px"
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

                <h3 className="text-base font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    {person.name}
                </h3>

                <div className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mb-2">
                    {occupation}
                </div>

                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                    {description}
                </p>
            </div>
        </Link>
    );
}
