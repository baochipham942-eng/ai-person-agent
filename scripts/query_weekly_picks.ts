import { prisma } from '@/lib/db/prisma';

async function main() {
  const ids = ['cmjxmgs83000011y3v2qj1z51', 'cmqkvnoy90000ykt7p08njh7g'];
  const people = await prisma.people.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      currentTitle: true,
      topics: true,
      avatarUrl: true,
      organization: true,
    },
  });
  console.log(JSON.stringify(people, null, 2));
  
  // Also fetch recent activity events
  const events = await prisma.rawPoolItem.findMany({
    where: {
      personId: { in: ids },
    },
    select: {
      id: true,
      personId: true,
      sourceType: true,
      url: true,
      title: true,
      publishedAt: true,
    },
    take: 20,
    orderBy: { publishedAt: 'desc' },
  });
  console.log('\nRecent activity events:');
  console.log(JSON.stringify(events, null, 2));
  
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
