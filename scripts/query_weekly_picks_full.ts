import { resolveWeeklyPicks } from '@/lib/home/weekly-picks';

async function main() {
  const cards = await resolveWeeklyPicks({
    limit: 8,
  });
  
  console.log('Total cards:', cards.length);
  console.log('\n=== All Weekly Picks Cards ===\n');
  
  cards.forEach((card, idx) => {
    console.log(`\n[${idx + 1}] ${card.kind.toUpperCase()}`);
    console.log(`   ID: ${card.id}`);
    console.log(`   Title: ${card.title}`);
    if (card.person) {
      console.log(`   Person: ${card.person.name} (${card.person.currentTitle || 'N/A'})`);
    }
    console.log(`   WhyNow: ${card.whyNow}`);
    console.log(`   URL: ${card.href}`);
    console.log(`   Topics: ${card.topics.join(', ')}`);
    console.log(`   Source: ${card.sourceLabel}`);
    console.log(`   Occurred: ${card.occurredAt}`);
    console.log(`   Note: ${card.note}`);
    console.log(`   Pinned: ${card.pinned}`);
    console.log(`   Rank Score: ${card.rankScore}`);
  });
  
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
