
import { prisma } from '../lib/db/prisma';
import * as fs from 'fs';
import * as path from 'path';


async function main() {
    console.log('Refining data...');

    // 1. Fix Names (Non-Chinese -> English)
    const nameUpdates = [
        { target: '克里斯·奥拉', newName: 'Chris Olah' },
        { target: 'Arthur Mensch', newName: 'Arthur Mensch' }, // Ensuring it's correct
        { target: 'Mustafa Suleyman', newName: 'Mustafa Suleyman' },
        { target: 'Jeremy Howard', newName: 'Jeremy Howard' },
        { target: 'Aidan Gomez', newName: 'Aidan Gomez' },
    ];

    for (const update of nameUpdates) {
        const p = await prisma.people.findFirst({ where: { name: update.target } });
        if (p && p.name !== update.newName) {
            await prisma.people.update({
                where: { id: p.id },
                data: { name: update.newName }
            });
            console.log(`Updated name: ${update.target} -> ${update.newName}`);
        }
    }

    // 2. Refine Descriptions (Chinese content)
    const descUpdates = [
        {
            name: 'Jeremy Howard',
            description: 'fast.ai 联合创始人，致力于深度学习的民主化。Kaggle 前总裁。',
            whyImportant: '作为fast.ai联合创始人，通过提供免费实践课程与开源库（fastai），显著降低了深度学习门槛，推动了AI技术的普及与应用。'
        },
        {
            name: 'Mustafa Suleyman',
            description: 'DeepMind 和 Inflection AI 联合创始人，现任微软人工智能 CEO。',
            // whyImportant seems okay from previous logs but let's ensure it's polished if needed
        },
        {
            name: 'Arthur Mensch',
            description: 'Mistral AI 联合创始人兼 CEO，前 DeepMind 研究员。',
        },
        {
            name: 'Aidan Gomez',
            description: 'Cohere 联合创始人兼 CEO，Transformer 论文作者之一。'
        }
    ];

    for (const update of descUpdates) {
        const p = await prisma.people.findFirst({ where: { name: update.name } });
        if (p) {
            await prisma.people.update({
                where: { id: p.id },
                data: {
                    description: update.description,
                    ...(update.whyImportant ? { whyImportant: update.whyImportant } : {})
                }
            });
            console.log(`Updated description for ${update.name}`);
        }
    }

    // 3. Fix Aidan Gomez Avatar (Extension Fix)
    const aidan = await prisma.people.findFirst({ where: { name: 'Aidan Gomez' } });
    if (aidan && aidan.avatarUrl && aidan.avatarUrl.endsWith('.png')) {
        const oldPath = path.join(process.cwd(), 'public', aidan.avatarUrl);
        const newPath = oldPath.replace('.png', '.jpg');

        if (fs.existsSync(oldPath)) {
            // Rename file
            fs.renameSync(oldPath, newPath);
            console.log(`Renamed avatar file: ${oldPath} -> ${newPath}`);

            // Update DB
            const newUrl = aidan.avatarUrl.replace('.png', '.jpg');
            await prisma.people.update({
                where: { id: aidan.id },
                data: { avatarUrl: newUrl }
            });
            console.log(`Updated Aidan Gomez avatarUrl -> ${newUrl}`);
        }
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
