
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const people = await prisma.people.findMany({
        select: {
            id: true,
            name: true,
            officialLinks: true
        }
    });

    console.log(`总人数: ${people.length}`);

    let hasXLinkCount = 0;
    let hasBioCount = 0;
    const noXLinkNames: string[] = [];
    const hasXLinkButNoBioNames: string[] = [];

    for (const person of people) {
        const links = (person.officialLinks as any[]) || [];
        const xLink = links.find(l =>
            l.platform === 'twitter' ||
            l.type === 'twitter' ||
            l.type === 'x' ||
            (l.url && (l.url.includes('twitter.com') || l.url.includes('x.com')))
        );

        if (xLink) {
            hasXLinkCount++;
            if (xLink.bio) {
                hasBioCount++;
            } else {
                hasXLinkButNoBioNames.push(person.name);
            }
        } else {
            noXLinkNames.push(person.name);
        }
    }

    console.log(`有 X 链接的人数: ${hasXLinkCount}`);
    console.log(`已获取 X Bio 的人数: ${hasBioCount}`);
    console.log(`有 X 链接但未抓取到的 Bio 人数: ${hasXLinkButNoBioNames.length}`);
    console.log(`没有 X 链接的人数: ${noXLinkNames.length}`);

    console.log('\n=== 有 X 链接但未抓取到 Bio 的名单 ===');
    console.log(hasXLinkButNoBioNames.join(', '));

    console.log('\n=== 没有 X 链接的名单 (Top 20) ===');
    console.log(noXLinkNames.slice(0, 20).join(', '));
    if (noXLinkNames.length > 20) console.log(`... 以及其他 ${noXLinkNames.length - 20} 人`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
