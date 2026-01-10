'use client';

interface Quote {
  text: string;
  source: string;
  url?: string;
  year?: number;
}

interface CoreContributionProps {
  content: string;
  quotes?: Quote[] | null;
}

export function CoreContribution({ content, quotes }: CoreContributionProps) {
  const displayQuotes = (quotes || []).slice(0, 2);

  return (
    <section className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* 标题栏 */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
        <span className="text-base">💡</span>
        <h2 className="text-sm font-medium text-gray-900">为什么值得关注</h2>
      </div>

      <div className="p-5">
        {/* 推荐理由 */}
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {content}
        </p>

        {/* 代表语录 */}
        {displayQuotes.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            {displayQuotes.map((quote, idx) => (
              <a
                key={idx}
                href={quote.url || '#'}
                target={quote.url ? '_blank' : undefined}
                rel={quote.url ? 'noopener noreferrer' : undefined}
                className={`block border-l-2 border-blue-400 pl-4 py-2 rounded-r-lg transition-colors ${
                  quote.url ? 'hover:bg-gray-50 cursor-pointer' : ''
                }`}
              >
                <p className="text-sm text-gray-800 italic leading-relaxed">
                  "{quote.text}"
                </p>
                <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-500">
                  {quote.url && (
                    <span className="text-blue-500">🔗</span>
                  )}
                  <span>{quote.source}</span>
                  {quote.year && <span>· {quote.year}</span>}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
