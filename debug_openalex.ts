
import { searchOpenAlexAuthor, getAuthorWorks } from './lib/datasources/openalex';

async function main() {
    const names = ['Elon Musk', 'Sam Altman'];

    for (const name of names) {
        console.log(`\nSearching for: ${name}...`);
        const authors = await searchOpenAlexAuthor(name);
        console.log(`Found ${authors.length} authors.`);

        if (authors.length > 0) {
            console.log('Top author:', JSON.stringify(authors[0], null, 2));
            const works = await getAuthorWorks(authors[0].id, 5);
            console.log(`Found ${works.length} works for top author.`);
            if (works.length > 0) {
                console.log('First work:', works[0].title);
            }
        } else {
            console.log('No authors found.');
        }
    }
}

main();
