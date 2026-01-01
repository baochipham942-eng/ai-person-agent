
import 'dotenv/config';
import { prisma } from './lib/db/prisma';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Massive consolidated map of Correct URLs
// STRATEGY: Use Unavatar for everyone with X (Twitter). Use Weserv proxy for others.
const VIP_AVATARS: Record<string, string> = {
    // === Verified X Handles (via Unavatar) ===
    'Sam Altman': 'https://unavatar.io/twitter/sama',
    'Elon Musk': 'https://unavatar.io/twitter/elonmusk',
    'Geoffrey Hinton': 'https://unavatar.io/twitter/geoffreyhinton',
    'Yann LeCun': 'https://unavatar.io/twitter/ylecun',
    'Yoshua Bengio': 'https://unavatar.io/twitter/yoshuabengio',
    'Demis Hassabis': 'https://unavatar.io/twitter/demishassabis',
    'Greg Brockman': 'https://unavatar.io/twitter/gdb',
    'Ilya Sutskever': 'https://unavatar.io/twitter/ilyasut',
    'Andrew Ng': 'https://unavatar.io/twitter/AndrewYNg',
    'Fei-Fei Li': 'https://unavatar.io/twitter/drfeifei',
    '李飞飞': 'https://unavatar.io/twitter/drfeifei',
    'Jeremy Howard': 'https://unavatar.io/twitter/jeremyphoward',
    'Mira Murati': 'https://unavatar.io/twitter/miramurati',
    'Mustafa Suleyman': 'https://unavatar.io/twitter/mustafasuleyman',
    'Jeff Dean': 'https://unavatar.io/twitter/jeffdean',
    'Tang Jie': 'https://unavatar.io/twitter/jietang',
    'Richard Socher': 'https://unavatar.io/twitter/RichardSocher',
    'Kai-Fu Lee': 'https://unavatar.io/twitter/kaifulee',
    '李开复': 'https://unavatar.io/twitter/kaifulee',
    'Shen Xiangyang': 'https://unavatar.io/twitter/harryshum',
    '沈向洋': 'https://unavatar.io/twitter/harryshum',
    'Andrej Karpathy': 'https://unavatar.io/twitter/karpathy',
    'Emad Mostaque': 'https://unavatar.io/twitter/emostaque',
    'Lilian Weng': 'https://unavatar.io/twitter/lilianweng',
    'Jim Fan': 'https://unavatar.io/twitter/DrJimFan',
    'Mark Zuckerberg': 'https://unavatar.io/twitter/finkd',
    'Kevin Weil': 'https://unavatar.io/twitter/kevinweil',
    'Bob McGrew': 'https://unavatar.io/twitter/bobmcgrewai',
    'Amit Kukreja': 'https://unavatar.io/twitter/amitkukreja',
    'Rob Bensinger': 'https://unavatar.io/twitter/rbensinger',
    'Matthew Berman': 'https://unavatar.io/twitter/MatthewBerman',
    'Zoubin Ghahramani': 'https://unavatar.io/twitter/zoubin',
    'Shane Legg': 'https://unavatar.io/twitter/shanelegg',
    'Chip Huyen': 'https://unavatar.io/twitter/chipro',
    'Allie K. Miller': 'https://unavatar.io/twitter/alliekmiller',
    'Rachel Thomas': 'https://unavatar.io/twitter/math_rachel',
    'Ethan Mollick': 'https://unavatar.io/twitter/emollick',
    'Amanda Askell': 'https://unavatar.io/twitter/AmandaAskell',
    'Scott Wu': 'https://unavatar.io/twitter/ScottWu46',
    'Santiago Valdarrama': 'https://unavatar.io/twitter/svpino',
    'Ahmet Alp Balkan': 'https://unavatar.io/twitter/ahmet',
    'David Ha': 'https://unavatar.io/twitter/hardmaru',
    'James Manyika': 'https://unavatar.io/twitter/jamesmanyika',
    'Joanne Jang': 'https://unavatar.io/twitter/jikibot',
    'Ji Yichao': 'https://unavatar.io/twitter/jiyichao',
    'Yang Zhilin': 'https://unavatar.io/twitter/YangZhilin', // Hope this works
    'Chamath Palihapitiya': 'https://unavatar.io/twitter/chamath',
    'Richard Ngo': 'https://unavatar.io/twitter/RichardMCNgo',
    'Quoc Le': 'https://unavatar.io/twitter/quocleix',
    'Tom Brown': 'https://unavatar.io/twitter/_tombrown_',
    'Jared Kaplan': 'https://unavatar.io/twitter/JaredKaplan3',
    'Eric Horvitz': 'https://unavatar.io/twitter/erichorvitz',
    'Mike Schroepfer': 'https://unavatar.io/twitter/schrep',
    'Daniela Amodei': 'https://unavatar.io/twitter/DanielaAmodei',
    'Dario Amodei': 'https://unavatar.io/twitter/DarioAmodei',
    'Zhou Ming': 'https://unavatar.io/twitter/zhouming_nlp',
    'Noam Shazeer': 'https://unavatar.io/twitter/NoamShazeer',
    'Christopher Manning': 'https://unavatar.io/twitter/chrmanning',
    'Percy Liang': 'https://unavatar.io/twitter/percyliang',
    'Hyung Won Chung': 'https://unavatar.io/twitter/hwchung27',
    'Jason Wei': 'https://unavatar.io/twitter/jasonwei',
    'Oriol Vinyals': 'https://unavatar.io/twitter/oriolvinyalsml',
    'Ashish Vaswani': 'https://unavatar.io/twitter/ashVaswani',
    'Alec Radford': 'https://unavatar.io/twitter/AlecRad',
    'Marc Andreessen': 'https://unavatar.io/twitter/pmarca',
    'Cat Wu': 'https://unavatar.io/twitter/catxwu',
    'Jakob Uszkoreit': 'https://unavatar.io/twitter/kyosu',
    'Lukasz Kaiser': 'https://unavatar.io/twitter/lukaszkaiser',
    'Haider Khan': 'https://unavatar.io/twitter/haiderkhanai',
    'Yao Shunyu': 'https://unavatar.io/twitter/yaoshunyu',
    'Bryan Catanzaro': 'https://unavatar.io/twitter/ctnzr',
    'Aidan Gomez': 'https://unavatar.io/twitter/aidangomezzz',
    'Arthur Mensch': 'https://unavatar.io/twitter/arthurmensch',
    'Dylan Field': 'https://unavatar.io/twitter/zoink',
    'Kevin Scott': 'https://unavatar.io/twitter/kevinalscott',
    'David Silver': 'https://unavatar.io/twitter/davidsilver',
    'Jan Leike': 'https://unavatar.io/twitter/janleike',
    'John Schulman': 'https://unavatar.io/twitter/johnschulman2',
    'Guillaume Lample': 'https://unavatar.io/twitter/guillaumelample',
    'Alexandr Wang': 'https://unavatar.io/twitter/alexandr_wang',
    'Wojciech Zaremba': 'https://unavatar.io/twitter/woj_z',
    'Han Xiao': 'https://unavatar.io/twitter/hxiao',
    'Llion Jones': 'https://unavatar.io/twitter/llionj',
    'Chris Olah': 'https://unavatar.io/twitter/ch402',

    // === Wesley Proxy for Others (Baidu, Tsinghua, Academic, etc) ===
    'Zhou Bowen': 'https://images.weserv.nl/?url=img0.baidu.com/it/u=2273010777,3302097332&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500',
    'Zhu Jun': 'https://images.weserv.nl/?url=ml.cs.tsinghua.edu.cn/~jun/images/jun.jpg',
    '朱军': 'https://images.weserv.nl/?url=ml.cs.tsinghua.edu.cn/~jun/images/jun.jpg',
    'Liu Zhiyuan': 'https://images.weserv.nl/?url=nlp.csai.tsinghua.edu.cn/~lzy/images/lzy.jpg',
    '刘知远': 'https://images.weserv.nl/?url=nlp.csai.tsinghua.edu.cn/~lzy/images/lzy.jpg',
    'Joelle Pineau': 'https://images.weserv.nl/?url=www.cs.mcgill.ca/~jpineau/jpineau-photo.jpg',
    '乔尔·皮诺': 'https://images.weserv.nl/?url=www.cs.mcgill.ca/~jpineau/jpineau-photo.jpg',

    // === Wiki via Weserv or Unavatar? (Unavatar covers most. Wiki specific fallback) ===
    'Jeff Bezos': 'https://unavatar.io/twitter/jeffbezos',
    'Bill Gates': 'https://unavatar.io/twitter/billgates',
    'Satya Nadella': 'https://unavatar.io/twitter/satyanadella',
    'Sundar Pichai': 'https://unavatar.io/twitter/sundarpichai',
    'Tim Cook': 'https://unavatar.io/twitter/tim_cook',
    'Jensen Huang': 'https://images.weserv.nl/?url=nvidianews.nvidia.com/t/photos/executive-bios/jensen-huang-3.jpg',
    'Lisa Su': 'https://unavatar.io/twitter/LisaSu',
    'Robin Li': 'https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/9/91/Robin_Li_2014.jpg/800px-Robin_Li_2014.jpg',
    'Larry Page': 'https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Larry_Page_in_the_European_Parliament%2C_17.06.2009_%28cropped%29.jpg/800px-Larry_Page_in_the_European_Parliament%2C_17.06.2009_%28cropped%29.jpg',
    'Sergey Brin': 'https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Sergey_Brin_cropped.jpg/800px-Sergey_Brin_cropped.jpg',
    'Jack Ma': 'https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Jack_Ma_2018.jpg/800px-Jack_Ma_2018.jpg',
    'Pony Ma': 'https://images.weserv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/3/30/Pony_Ma_2015.jpg/800px-Pony_Ma_2015.jpg',
    'Zhang Yiming': 'https://images.weserv.nl/?url=p3-dy-tos.byteimg.com/obj/tos-cn-p-0015/05001717ba9345099238319f6d499426',
    'Zhang Peng': 'https://images.weserv.nl/?url=img0.baidu.com/it/u=683168864,2873138378&fm=253&fmt=auto&app=120&f=JPEG?w=500&h=500',
    'Xu Li': 'https://images.weserv.nl/?url=img2.baidu.com/it/u=3926839304,3835639644&fm=253&fmt=auto&app=120&f=JPEG?w=500&h=500',
    'Yin Qi': 'https://images.weserv.nl/?url=img0.baidu.com/it/u=3438887431,2737604314&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=667',
    'Wang Xiaochuan': 'https://images.weserv.nl/?url=img1.baidu.com/it/u=2369677843,2649065691&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500',
};

async function downloadAvatarCurl(url: string, personId: string): Promise<string | null> {
    const ext = url.includes('.png') ? 'png' : 'jpg'; // Simple assumption
    const filename = `${crypto.createHash('md5').update(personId + url).digest('hex').substring(0, 8)}.${ext}`;
    const relativePath = `/avatars/${filename}`;
    const absolutePath = path.join(process.cwd(), 'public', relativePath);

    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    try {
        console.log(`  Downloading ${url} -> ${filename}...`);
        const cmd = `curl -L -k -A "Mozilla/5.0" --max-time 30 -o "${absolutePath}" "${url}"`;
        await execAsync(cmd);

        // Verify file
        if (fs.existsSync(absolutePath)) {
            const stats = fs.statSync(absolutePath);
            if (stats.size < 500) { // Too small
                fs.unlinkSync(absolutePath);
                console.log(`  ❌ Too small (${stats.size} bytes).`);
                return null;
            }

            // Magic bytes check (Reject HTML)
            const fd = fs.openSync(absolutePath, 'r');
            const buffer = Buffer.alloc(4);
            fs.readSync(fd, buffer, 0, 4, 0);
            fs.closeSync(fd);
            const hex = buffer.toString('hex');

            // Detect HTML (<...)
            if (hex.startsWith('3c') || buffer.toString().includes('<!D')) {
                fs.unlinkSync(absolutePath);
                console.log(`  ❌ Detected HTML content (Access Denied).`);
                return null;
            }

            return relativePath;
        } else {
            console.log(`  ❌ File not created.`);
            return null;
        }
    } catch (e) {
        console.log(`  ❌ Download failed: ${e}`);
        return null;
    }
}

async function cleanBrokenLinks() {
    console.log('\nCleaning broken links...');
    const people = await prisma.people.findMany({ select: { id: true, avatarUrl: true } });
    let cleaned = 0;
    for (const p of people) {
        if (p.avatarUrl?.startsWith('/avatars/')) {
            const absPath = path.join(process.cwd(), 'public', p.avatarUrl);
            if (!fs.existsSync(absPath)) {
                await prisma.people.update({
                    where: { id: p.id },
                    data: { avatarUrl: null }
                });
                cleaned++;
            }
        }
    }
    console.log(`Cleaned ${cleaned} broken local links.`);
}

async function main() {
    console.log('--- Massive Avatar Repair V4 (Unavatar/Weserv) ---\n');

    // First, sync DB: remove references to deleted files
    await cleanBrokenLinks();

    const people = await prisma.people.findMany({
        select: { id: true, name: true, aliases: true, avatarUrl: true }
    });

    let fixedCount = 0;

    for (const p of people) {
        let targetUrl: string | undefined;

        // 1. Look up in VIP Map
        if (VIP_AVATARS[p.name]) {
            targetUrl = VIP_AVATARS[p.name];
        } else {
            for (const alias of p.aliases || []) {
                if (VIP_AVATARS[alias]) {
                    targetUrl = VIP_AVATARS[alias];
                    break;
                }
            }
        }

        // 2. Logic: Force download for VIPs (to fix corruption)
        if (targetUrl) {
            console.log(`Processing ${p.name}...`);
            const localPath = await downloadAvatarCurl(targetUrl, p.id);
            if (localPath) {
                await prisma.people.update({
                    where: { id: p.id },
                    data: { avatarUrl: localPath }
                });
                console.log(`  ✅ Updated to ${localPath}`);
                fixedCount++;
            } else {
                console.log(`  ⚠️ Failed to process ${p.name}. Keeping existing/null.`);
                // If failed and existing was broken (deleted), update to null
                if (p.avatarUrl?.startsWith('/avatars/')) { // We know it's broken because we ran cleanBrokenLinks, UNLESS it's a new failure?
                    // cleanBrokenLinks ran before. So p.avatarUrl is null if it was broken.
                    // So we don't need to do anything.
                }
            }
        }
    }

    console.log(`\nFinished. Fixed ${fixedCount} profiles.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
