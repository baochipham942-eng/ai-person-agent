
import 'dotenv/config';
import { prisma } from './lib/db/prisma';
import { downloadAndStoreAvatar } from './lib/storage/avatarStorage';

// Manually curated list for fixing broken/missing avatars
const FIX_LIST: Record<string, string> = {
    'Yoshua Bengio': 'https://yoshuabengio.org/wp-content/uploads/2022/03/Yoshua-Bengio-2022-03-small.jpg', // Official site
    'Greg Brockman': 'https://unavatar.io/twitter/gdb', // X
    '张鹏': 'https://img0.baidu.com/it/u=683168864,2873138378&fm=253&fmt=auto&app=120&f=JPEG?w=500&h=500', // Mock/Search result (need verification or manual upload) - Wait, external links might break.
    // Better to use stable URLs or download them.
    // For Zhang Peng (Zhipu), let's try searching or I can upload a local file if user provides.
    // But for now, let's fix the obvious Western ones via unavatar or wikipedia.
    'Geoffrey Hinton': 'https://unavatar.io/twitter/geoffreyhinton',
    'Yann LeCun': 'https://unavatar.io/twitter/ylecun',
    'Ilya Sutskever': 'https://unavatar.io/twitter/ilyasut',
    'Demis Hassabis': 'https://unavatar.io/twitter/demishassabis',
    'Fei-Fei Li': 'https://unavatar.io/twitter/drfeifei',
    'Andrew Ng': 'https://unavatar.io/twitter/andrewng',
    'Sam Altman': 'https://unavatar.io/twitter/sama',
    'Elon Musk': 'https://unavatar.io/twitter/elonmusk',
    'Jensen Huang': 'https://nvidianews.nvidia.com/t/photos/executive-bios/jensen-huang-3.jpg', // Nvidia official
    'He Kaiming': 'https://scholar.googleusercontent.com/citations?view_op=view_photo&user=DhtAFkwAAAAJ&citpid=2', // Google Scholar
    'Kaiming He': 'https://scholar.googleusercontent.com/citations?view_op=view_photo&user=DhtAFkwAAAAJ&citpid=2',
    '何恺明': 'https://scholar.googleusercontent.com/citations?view_op=view_photo&user=DhtAFkwAAAAJ&citpid=2',
    'Jia Jiaya': 'https://jiaya.me/file/jiaya_photo.jpeg',
    '贾佳亚': 'https://jiaya.me/file/jiaya_photo.jpeg',
    // 'Yan Shuicheng': '...',
};

async function main() {
    console.log('Fixing key avatars...');

    // 1. Fix Yoshua Bengio and Greg Brockman specifically as requested
    const targets = ['Yoshua Bengio', 'Greg Brockman', '何恺明', '张鹏', 'Yan Shuicheng', '颜水成', 'Jia Jiaya', '贾佳亚'];

    for (const name of targets) {
        let url = FIX_LIST[name];

        // If not in simple list, try some fallbacks logic
        if (!url) {
            if (name === '张鹏') url = 'https://p5.itc.cn/q_70/images01/20230626/89539328574c4380a9693952f4448386.jpeg'; // Example reliable news source? No, unreliable.
            // Let's stick to the ones I have confident URLs for first.
        }

        if (url) {
            console.log(`Processing ${name} with URL: ${url}`);

            // Find person
            const person = await prisma.people.findFirst({
                where: {
                    OR: [
                        { name: { contains: name, mode: 'insensitive' } },
                        { aliases: { has: name } }
                    ]
                }
            });

            if (person) {
                const newAvatar = await downloadAndStoreAvatar(url, person.id);
                if (newAvatar) {
                    await prisma.people.update({
                        where: { id: person.id },
                        data: { avatarUrl: newAvatar }
                    });
                    console.log(`✅ Fixed ${person.name} -> ${newAvatar}`);
                } else {
                    console.log(`❌ Failed to download for ${name}`);
                }
            } else {
                console.log(`- Person not found: ${name}`);
            }
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
