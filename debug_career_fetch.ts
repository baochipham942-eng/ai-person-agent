
import { getPersonCareer } from './lib/datasources/career';

async function main() {
    console.log('Fetching career for Andrew Ng (Q2846695)...');
    try {
        const items = await getPersonCareer('Q2846695');
        console.log('Items found:', items.length);
        console.log(JSON.stringify(items, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
}

main();
