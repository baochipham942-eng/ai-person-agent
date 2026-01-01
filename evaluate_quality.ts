
import 'dotenv/config';
import { prisma } from './lib/db/prisma';
import { calculateQualityScore, QualityScoreResult } from './lib/utils/qualityScore';

async function main() {
    console.log('Starting Quality Evaluation...');

    const people = await prisma.people.findMany({
        include: {
            rawPoolItems: {
                select: { sourceType: true }
            },
            cards: {
                select: { id: true }
            }
        }
    });

    console.log(`Evaluated ${people.length} people.\n`);

    const results: { name: string; score: number; grade: string; missing: string[] }[] = [];
    const gradeCounts = { A: 0, B: 0, C: 0, D: 0, F: 0 };

    for (const person of people) {
        const result = calculateQualityScore(person);
        results.push({
            name: person.name,
            score: result.total,
            grade: result.grade,
            missing: result.missingFields
        });
        gradeCounts[result.grade]++;
    }

    // Sort by score (descending)
    results.sort((a, b) => b.score - a.score);

    console.log('--- Grade Distribution ---');
    console.log(`A: ${gradeCounts.A}`);
    console.log(`B: ${gradeCounts.B}`);
    console.log(`C: ${gradeCounts.C}`);
    console.log(`D: ${gradeCounts.D}`);
    console.log(`F: ${gradeCounts.F}`);

    console.log('\n--- Top 10 High Quality ---');
    results.slice(0, 10).forEach((r, i) => {
        console.log(`${i + 1}. ${r.name}: ${r.score} (${r.grade})`);
    });

    console.log('\n--- Bottom 10 Low Quality ---');
    results.slice(-10).reverse().forEach((r, i) => {
        console.log(`${i + 1}. ${r.name}: ${r.score} (${r.grade}) - Missing: ${r.missing.join(', ')}`);
    });

    // Special check for recently added Chinese AI leaders
    const targets = ['张鹏', '何恺明', '颜水成', '贾佳亚', '周伯文', '李彦宏', '马化腾', '张一鸣'];
    console.log('\n--- New Chinese AI Leaders Status ---');
    for (const name of targets) {
        const found = results.find(r => r.name.includes(name));
        if (found) {
            console.log(`${name}: ${found.score} (${found.grade}) - Missing: ${found.missing.join(', ')}`);
        } else {
            // Try strict match or partial
            const strict = results.find(r => r.name === name);
            if (strict) {
                console.log(`${name} (Strict): ${strict.score} (${strict.grade})`);
            } else {
                console.log(`${name}: Not Found`);
            }
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
