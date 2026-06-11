'use client';

import { LinkedText } from '@/components/common/LinkedText';

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
    <section className="card-base overflow-hidden">
      {/* 标题栏 */}
      <div className="px-5 py-3 border-b border-stone-100 flex items-center gap-2">
        <span className="text-base">💡</span>
        <h2 className="text-sm font-medium text-stone-900">为什么值得关注</h2>
      </div>

      <div className="p-5">
        {/* 推荐理由 - 支持人物内链 */}
        <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
          <LinkedText text={content} />
        </p>

        {/* 代表语录 */}
        {displayQuotes.length > 0 && (
          <div className="mt-5 pt-5 border-t border-stone-100 space-y-3">
            {displayQuotes.map((quote, idx) => (
              <a
                key={idx}
                href={quote.url || '#'}
                target={quote.url ? '_blank' : undefined}
                rel={quote.url ? 'noopener noreferrer' : undefined}
                className={`block pl-4 py-3 rounded-xl transition-all ${
                  quote.url ? 'hover:bg-orange-50/50 cursor-pointer' : ''
                }`}
                style={{ borderLeft: '3px solid', borderImage: 'linear-gradient(135deg, #f97316, #ec4899, #8b5cf6) 1' }}
              >
                <p className="text-sm text-stone-700 italic leading-relaxed">
                  &ldquo;<LinkedText text={quote.text} />&rdquo;
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-stone-500">
                  {quote.url && (
                    <span className="text-orange-500">🔗</span>
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
