import type { Metadata } from 'next';
import { WatchlistClient } from '@/components/watchlist/WatchlistClient';

export const metadata: Metadata = {
  title: '我的关注 | AI 人物库',
  description: '查看已关注人物、话题和机构的近期动态。',
};

export default function WatchlistPage() {
  return <WatchlistClient />;
}
