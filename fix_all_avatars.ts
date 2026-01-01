import { prisma } from './lib/db/prisma';
import { downloadAndStoreAvatar } from './lib/storage/avatarStorage';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

// 手动指定的头像 URL（从 Google Images、百度百科等来源）
const MANUAL_AVATARS: Record<string, string> = {
    // OpenAI / Anthropic
    'Mira Murati': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Mira_Murati_at_TED_%282024%29.jpg/220px-Mira_Murati_at_TED_%282024%29.jpg',
    'Noam Shazeer': 'https://pbs.twimg.com/profile_images/1735442706254532608/RDhJd_Cf_400x400.jpg', // Twitter
    'Shane Legg': 'https://pbs.twimg.com/profile_images/1645119989538869248/fMPJnKQ4_400x400.jpg', // Twitter
    'Daniela Amodei': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR0lMqvWDg7tz-m-t-oPf6oaQ_oGn1J_P8iHA&s',

    // 学术界
    'John Schulman': 'https://pbs.twimg.com/profile_images/993892650498596864/K-2MJZ9z_400x400.jpg',
    'Jan Leike': 'https://pbs.twimg.com/profile_images/1654567115972984833/y9g9bIyV_400x400.jpg',
    'Oriol Vinyals': 'https://pbs.twimg.com/profile_images/2811179223/b7a2d1e8e4e7a49faaee75e45ab5c1e1_400x400.jpeg',
    'Quoc Le': 'https://pbs.twimg.com/profile_images/687704858/quoc_le_400x400.jpg',
    'Percy Liang': 'https://pbs.twimg.com/profile_images/1166823802682761216/VpHEvAMW_400x400.jpg',
    'Christopher Manning': 'https://nlp.stanford.edu/~manning/images/ChristopherManning.jpg',
    'Guillaume Lample': 'https://pbs.twimg.com/profile_images/1642545073371222016/h7I2r_Fa_400x400.jpg',
    'Jason Wei': 'https://pbs.twimg.com/profile_images/1512245247694258181/XcZ1sMfX_400x400.jpg',
    'Hyung Won Chung': 'https://pbs.twimg.com/profile_images/1515816037891137536/MF7A8mVU_400x400.jpg',

    // 中国
    '王小川': 'https://img.36krcdn.com/hsossms/20230618/v2_9b8b2c8aa0ac4b0d890f75c9e9e71b19@000000_oswg118750oswg900oswg900_img_000',
};

async function downloadImage(url: string, filename: string): Promise<string | null> {
    const avatarsDir = path.join(process.cwd(), 'public', 'avatars');
    const filePath = path.join(avatarsDir, filename);

    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;

        const request = protocol.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept': 'image/*',
            }
        }, (response) => {
            // 处理重定向
            if (response.statusCode === 301 || response.statusCode === 302) {
                const redirectUrl = response.headers.location;
                if (redirectUrl) {
                    downloadImage(redirectUrl, filename).then(resolve).catch(reject);
                    return;
                }
            }

            if (response.statusCode !== 200) {
                resolve(null);
                return;
            }

            const file = fs.createWriteStream(filePath);
            response.pipe(file);

            file.on('finish', () => {
                file.close();
                resolve(`/avatars/${filename}`);
            });

            file.on('error', (err) => {
                fs.unlink(filePath, () => { });
                reject(err);
            });
        });

        request.on('error', (err) => {
            reject(err);
        });

        request.setTimeout(10000, () => {
            request.destroy();
            reject(new Error('Timeout'));
        });
    });
}

async function main() {
    console.log('=== 修复缺失头像 ===\n');

    // 获取所有无头像的人物
    const people = await prisma.people.findMany({
        where: { avatarUrl: null },
        select: { id: true, name: true }
    });

    console.log(`找到 ${people.length} 个无头像人物\n`);

    let fixedCount = 0;

    for (const person of people) {
        const manualUrl = MANUAL_AVATARS[person.name];

        if (!manualUrl) {
            console.log(`✗ ${person.name}: 无手动指定的头像 URL`);
            continue;
        }

        console.log(`+ ${person.name}: 下载头像...`);

        try {
            const ext = manualUrl.includes('.png') ? 'png' : 'jpg';
            const filename = `${person.id.slice(-8)}.${ext}`;
            const localPath = await downloadImage(manualUrl, filename);

            if (localPath) {
                await prisma.people.update({
                    where: { id: person.id },
                    data: { avatarUrl: localPath }
                });
                console.log(`  ✓ 已保存: ${localPath}`);
                fixedCount++;
            } else {
                console.log(`  ✗ 下载失败`);
            }
        } catch (error) {
            console.log(`  ✗ 错误: ${error}`);
        }

        await new Promise(r => setTimeout(r, 500));
    }

    console.log(`\n=== 完成 ===`);
    console.log(`修复了 ${fixedCount} 个头像`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
