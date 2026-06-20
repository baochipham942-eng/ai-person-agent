import { fetchActivityEvents } from '@/lib/activity';

async function main() {
  const events = await fetchActivityEvents({
    limit: 15,
    days: 30,
    eventTypes: ['video', 'paper', 'article', 'podcast'],
    sourceTypes: ['x', 'exa', 'company_source', 'openalex', 'youtube', 'podcast'],
  });
  
  console.log('Total events fetched:', events.length);
  console.log('\nFirst 5 events with importance reason:');
  events.slice(0, 5).forEach((event, idx) => {
    console.log(`\n[${idx + 1}] ${event.eventType.toUpperCase()} - ${event.sourceType}`);
    console.log(`   Person: ${event.personName}`);
    console.log(`   Title: ${event.title}`);
    console.log(`   URL: ${event.url}`);
    console.log(`   Importance: ${event.importanceReason}`);
    console.log(`   Topics: ${event.topics.join(', ')}`);
  });
  
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
